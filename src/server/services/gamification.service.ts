import { NotificationType, PointSourceType, Prisma, SubmissionStatus } from '@prisma/client';
import { calculateLevelInfo } from '../../shared/constants.js';
import { prisma } from '../lib/prisma.js';
import { broadcastRankingRefresh, emitToUser } from '../lib/socket.js';
import { recordAuditLog } from './audit.service.js';
import { createNotification } from './notification.service.js';

export async function awardPointsSecurely(params: {
  userId: string;
  delta: number;
  sourceType: PointSourceType;
  sourceId: string;
  reason: string;
  actorId?: string | null;
  allowUpdateDelta?: boolean;
}) {
  const result = await prisma.$transaction(async (tx) => {
    // Proteção contra duplicidade de pontos para a mesma fonte (exceto quando explicitamente recalculando nota)
    if (!params.allowUpdateDelta && params.sourceId) {
      const existingEntry = await tx.pointLedger.findFirst({
        where: {
          userId: params.userId,
          sourceType: params.sourceType,
          sourceId: params.sourceId,
        },
      });
      if (existingEntry) {
        const currentUser = await tx.user.findUniqueOrThrow({ where: { id: params.userId } });
        return {
          alreadyAwarded: true,
          user: currentUser,
          ledgerEntry: existingEntry,
        };
      }
    }

    const user = await tx.user.findUniqueOrThrow({
      where: { id: params.userId },
    });

    const newTotal = Math.max(0, user.totalPoints + params.delta);
    const levelInfo = calculateLevelInfo(newTotal);

    const updatedUser = await tx.user.update({
      where: { id: params.userId },
      data: {
        totalPoints: newTotal,
        level: levelInfo.level,
      },
    });

    const ledgerEntry = await tx.pointLedger.create({
      data: {
        userId: params.userId,
        delta: params.delta,
        balanceAfter: newTotal,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        reason: params.reason,
        actorId: params.actorId || null,
      },
    });

    return {
      alreadyAwarded: false,
      user: updatedUser,
      ledgerEntry,
      leveledUp: levelInfo.level > user.level ? levelInfo : null,
    };
  });

  if (!result.alreadyAwarded && params.delta !== 0) {
    emitToUser(params.userId, 'points:updated', {
      totalPoints: result.user.totalPoints,
      level: result.user.level,
      delta: params.delta,
      reason: params.reason,
    });

    if (params.delta > 0) {
      await createNotification({
        userId: params.userId,
        type: NotificationType.POINTS_EARNED,
        title: `+${params.delta} pontos conquistados!`,
        message: params.reason,
        linkUrl: '/app/conquistas',
      });
    }

    await evaluateAndGrantBadges(params.userId);
    broadcastRankingRefresh('points_awarded');
  }

  return result;
}

export async function adjustUserPointsManually(params: {
  targetUserId: string;
  delta: number;
  reason: string;
  actorId: string;
  actorRole: string;
  ipAddress?: string | null;
}) {
  if (!params.reason || params.reason.trim().length < 5) {
    throw new Error('Justificativa obrigatória com no mínimo 5 caracteres para alteração manual de pontos.');
  }
  if (!Number.isInteger(params.delta) || params.delta === 0 || Math.abs(params.delta) > 1000) {
    throw new Error('Quantidade de pontos inválida (deve ser inteiro diferente de zero entre -1000 e +1000).');
  }

  const manualSourceId = `manual:${Date.now()}:${params.actorId}`;
  const res = await awardPointsSecurely({
    userId: params.targetUserId,
    delta: params.delta,
    sourceType: PointSourceType.MANUAL_ADJUSTMENT,
    sourceId: manualSourceId,
    reason: `Ajuste administrativo: ${params.reason.trim()}`,
    actorId: params.actorId,
    allowUpdateDelta: true,
  });

  await recordAuditLog({
    actorId: params.actorId,
    actorRole: params.actorRole,
    targetUserId: params.targetUserId,
    action: 'POINTS_MANUAL_ADJUSTMENT',
    entityType: 'User',
    entityId: params.targetUserId,
    reason: params.reason.trim(),
    metadata: {
      delta: params.delta,
      balanceAfter: res.user.totalPoints,
      ledgerId: res.ledgerEntry.id,
    },
    ipAddress: params.ipAddress,
  });

  if (params.delta < 0) {
    await createNotification({
      userId: params.targetUserId,
      type: NotificationType.POINTS_EARNED,
      title: `Ajuste de pontuação (${params.delta} pts)`,
      message: `Motivo registrado pela coordenação: ${params.reason.trim()}`,
      linkUrl: '/app/historico',
    });
    broadcastRankingRefresh('manual_adjustment');
  }

  return res;
}

/**
 * Avalia automaticamente os critérios de conquistas e concede medalhas inéditas ao participante
 */
export async function evaluateAndGrantBadges(userId: string) {
  const [user, allBadges, earnedBadges, approvedSubmissions, quizAttempts] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.badge.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
    prisma.missionSubmission.findMany({
      where: { userId, status: SubmissionStatus.APPROVED },
      include: { mission: { select: { slug: true, submissionType: true } } },
    }),
    prisma.quizAttempt.findMany({
      where: { userId, completedAt: { not: null } },
    }),
  ]);

  if (!user) return [];

  const earnedSet = new Set(earnedBadges.map((b) => b.badgeId));
  const approvedCount = approvedSubmissions.length;
  const riskHuntApprovedCount = approvedSubmissions.filter(
    (s) => s.mission.slug === 'caca-aos-riscos' || s.mission.submissionType === 'RISK_HUNT'
  ).length;

  // Distintos quizzes com nota >= 80%
  const highScoreQuizIds = new Set(
    quizAttempts.filter((a) => a.scorePercent >= 80).map((a) => a.quizId)
  );
  const perfectQuizCount = quizAttempts.filter((a) => a.scorePercent >= 100).length;

  const newlyUnlocked: string[] = [];

  for (const badge of allBadges) {
    if (earnedSet.has(badge.id)) continue;

    let eligible = false;
    switch (badge.criteriaType) {
      case 'RISK_HUNT_APPROVED':
        eligible = riskHuntApprovedCount >= badge.criteriaThreshold;
        break;
      case 'FIRST_EXCELLENCE':
        eligible = approvedCount >= 1 || perfectQuizCount >= 1;
        break;
      case 'APPROVED_MISSIONS':
        eligible = approvedCount >= badge.criteriaThreshold;
        break;
      case 'HIGH_SCORE_QUIZZES':
        eligible = highScoreQuizIds.size >= badge.criteriaThreshold;
        break;
      case 'TOTAL_POINTS':
        eligible = user.totalPoints >= badge.criteriaThreshold;
        break;
      default:
        eligible = false;
    }

    if (eligible) {
      try {
        await prisma.userBadge.create({
          data: {
            userId,
            badgeId: badge.id,
            reason: `Conquista automática desbloqueada: ${badge.name}`,
          },
        });
        newlyUnlocked.push(badge.name);

        if (badge.bonusPoints > 0) {
          await awardPointsSecurely({
            userId,
            delta: badge.bonusPoints,
            sourceType: PointSourceType.BADGE_BONUS,
            sourceId: `badge:${badge.id}`,
            reason: `Bônus da medalha "${badge.name}"`,
          });
        }

        await createNotification({
          userId,
          type: NotificationType.BADGE_UNLOCKED,
          title: `Nova Medalha Desbloqueada: ${badge.name}!`,
          message: badge.description,
          linkUrl: '/app/conquistas',
        });

        emitToUser(userId, 'badge:unlocked', {
          id: badge.id,
          slug: badge.slug,
          name: badge.name,
          description: badge.description,
          iconName: badge.iconName,
          accentColor: badge.accentColor,
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          // Já concedida em requisição concorrente
        } else {
          console.error('[BADGE GRANT ERROR]', err);
        }
      }
    }
  }

  return newlyUnlocked;
}
