import { Router } from 'express';
import QRCode from 'qrcode';
import { ActivityStatus } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { getInitials, maskParticipantName } from '../../shared/constants.js';
import { isWebPushEnabled } from '../services/notification.service.js';
import {
  buildPublicOverviewData,
  buildPublicRankingData,
  getSystemConfigSafe,
} from '../services/ranking.service.js';

export const publicRouter = Router();

function resolveBaseUrl(req: any): string {
  if (env.PUBLIC_APP_URL && !env.PUBLIC_APP_URL.includes('localhost')) {
    return env.PUBLIC_APP_URL.replace(/\/+$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

publicRouter.get('/config', async (req, res, next) => {
  try {
    const [config, activeQr, classes, featuredMissions, badges] = await Promise.all([
      getSystemConfigSafe(),
      prisma.qrRegistrationToken.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.classGroup.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, code: true, name: true, courseArea: true, shift: true },
      }),
      prisma.mission.findMany({
        where: { status: { in: [ActivityStatus.PUBLISHED, ActivityStatus.SCHEDULED] } },
        select: {
          id: true,
          title: true,
          summary: true,
          category: true,
          difficulty: true,
          eventDay: true,
          eventDateLabel: true,
          points: true,
          status: true,
          opensAt: true,
        },
        orderBy: [{ eventDay: 'asc' }, { sortOrder: 'asc' }],
      }),
      prisma.badge.findMany({
        orderBy: { sortOrder: 'asc' },
        select: { slug: true, name: true, description: true, iconName: true, accentColor: true },
      }),
    ]);

    const now = new Date();
    const withinGlobalWindow =
      config.registrationEnabled &&
      (!config.registrationStart || now >= config.registrationStart) &&
      (!config.registrationEnd || now <= config.registrationEnd);

    const qrValid =
      Boolean(activeQr?.isActive) &&
      (!activeQr?.validFrom || now >= activeQr.validFrom) &&
      (!activeQr?.validUntil || now <= activeQr.validUntil);

    const baseUrl = resolveBaseUrl(req);
    const registrationUrl = activeQr
      ? `${baseUrl}/inscricao?code=${encodeURIComponent(activeQr.code)}`
      : `${baseUrl}/inscricao`;

    let qrDataUrl: string | null = null;
    if (activeQr && withinGlobalWindow && qrValid) {
      qrDataUrl = await QRCode.toDataURL(registrationUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#002B5C', light: '#FFFFFF' },
      });
    }

    res.json({
      schoolName: config.schoolName,
      eventTitle: config.eventTitle,
      eventTheme: config.eventTheme,
      eventSlogan: config.eventSlogan,
      eventStartDate: config.eventStartDate,
      eventEndDate: config.eventEndDate,
      officialLogoUrl: config.officialLogoUrl ? '/api/media/brand' : null,
      registrationOpen: withinGlobalWindow && qrValid,
      activeQrCode: activeQr && withinGlobalWindow && qrValid ? activeQr.code : null,
      registrationUrl,
      qrDataUrl,
      classes,
      programPreview: featuredMissions,
      badges,
      vapidPublicKey: isWebPushEnabled() ? env.VAPID_PUBLIC_KEY : null,
    });
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/qr/:code', async (req, res, next) => {
  try {
    const code = String(req.params.code || '').trim();
    const [config, qrToken] = await Promise.all([
      getSystemConfigSafe(),
      prisma.qrRegistrationToken.findUnique({ where: { code } }),
    ]);

    if (!qrToken) {
      res.status(404).json({
        valid: false,
        reason: 'Código QR de inscrição não encontrado ou substituído.',
      });
      return;
    }

    const now = new Date();
    if (!config.registrationEnabled || !qrToken.isActive) {
      res.status(403).json({
        valid: false,
        reason: 'As inscrições por este QR Code encontram-se temporariamente desativadas pela coordenação.',
      });
      return;
    }

    if (
      (config.registrationStart && now < config.registrationStart) ||
      (qrToken.validFrom && now < qrToken.validFrom)
    ) {
      res.status(403).json({
        valid: false,
        reason: 'O período oficial de inscrições ainda não foi iniciado.',
      });
      return;
    }

    if (
      (config.registrationEnd && now > config.registrationEnd) ||
      (qrToken.validUntil && now > qrToken.validUntil)
    ) {
      res.status(403).json({
        valid: false,
        reason: 'O período de inscrições para este QR Code já foi encerrado.',
      });
      return;
    }

    await prisma.qrRegistrationToken
      .update({
        where: { id: qrToken.id },
        data: { scansCount: { increment: 1 } },
      })
      .catch(() => {});

    res.json({
      valid: true,
      code: qrToken.code,
      label: qrToken.label,
      schoolName: config.schoolName,
      eventTitle: config.eventTitle,
    });
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/classes', async (_req, res, next) => {
  try {
    const classes = await prisma.classGroup.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, courseArea: true, shift: true },
    });
    res.json({ classes });
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/ranking', async (_req, res, next) => {
  try {
    const data = await buildPublicRankingData();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/overview', async (_req, res, next) => {
  try {
    const data = await buildPublicOverviewData();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export interface SocialFeedItem {
  id: string;
  authorName: string;
  authorInitials: string;
  avatarUrl: string | null;
  classCode: string;
  className: string;
  courseArea: string;
  missionTitle: string;
  missionCategory: string;
  eventDay: number;
  eventDateLabel: string;
  textResponse: string;
  mediaUrl: string | null;
  mediaMime?: string | null;
  hasVideo?: boolean;
  awardedPoints: number;
  feedback: string | null;
  reactionsCount: number;
  commentsCount: number;
  submittedAt: string;
}

/**
 * Vitrine pública (página inicial / TV): mostra SOMENTE publicações reais que a equipe marcou
 * como "Destaque" na avaliação e cujo autor autorizou uso de imagem.
 * Curtir e comentar acontece dentro da rede social (/app), com login — 1 curtida por pessoa.
 */
publicRouter.get('/feed', async (_req, res, next) => {
  try {
    const config = await getSystemConfigSafe();
    const highlights = await prisma.missionSubmission.findMany({
      where: {
        status: 'APPROVED',
        isPublicHighlight: true,
        hiddenFromFeed: false,
        user: { isActive: true, anonymizedAt: null, imageConsent: true },
      },
      take: 12,
      orderBy: { evaluatedAt: 'desc' },
      include: {
        mission: { select: { title: true, category: true, eventDay: true, eventDateLabel: true } },
        user: {
          select: {
            id: true,
            fullName: true,
            avatarKey: true,
            classGroup: { select: { code: true, name: true, courseArea: true } },
          },
        },
        _count: { select: { likes: true, comments: { where: { isHidden: false } } } },
      },
    });

    const feed: SocialFeedItem[] = highlights.map((s) => ({
      id: s.id,
      authorName: maskParticipantName(s.user.fullName, config.namePrivacyMode),
      authorInitials: getInitials(s.user.fullName),
      avatarUrl: s.user.avatarKey && config.showAvatarsInPublic ? `/api/media/avatar/${s.user.id}` : null,
      classCode: s.user.classGroup?.code || 'SENAI',
      className: s.user.classGroup?.name || 'Turma SENAI',
      courseArea: s.user.classGroup?.courseArea || 'Formação Técnica',
      missionTitle: s.mission.title,
      missionCategory: s.mission.category,
      eventDay: s.mission.eventDay,
      eventDateLabel: s.mission.eventDateLabel,
      textResponse: s.textResponse || 'Atividade de segurança concluída!',
      mediaUrl: s.mediaKey ? `/api/media/evidence/${s.id}` : null,
      mediaMime: s.mediaMime,
      hasVideo: Boolean(s.mediaMime?.startsWith('video/')),
      awardedPoints: s.awardedPoints,
      feedback: s.feedback,
      reactionsCount: s._count.likes,
      commentsCount: s._count.comments,
      submittedAt: (s.evaluatedAt || s.submittedAt).toISOString(),
    }));

    res.json({ feed, totalCount: feed.length });
  } catch (err) {
    next(err);
  }
});

// Endpoint público de verificação de autenticidade de certificados
publicRouter.get('/certificate/verify/:code', async (req, res, next) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    const config = await getSystemConfigSafe();

    // Busca o certificado oficial emitido e homologado
    const cert = await prisma.certificate.findFirst({
      where: {
        OR: [
          { verificationCode: code },
          { user: { registrationCode: { equals: code, mode: 'insensitive' } } },
        ],
        status: 'ISSUED',
      },
      include: {
        user: {
          include: {
            classGroup: true,
            badges: { include: { badge: true } },
          },
        },
        releasedBy: { select: { fullName: true, role: true } },
      },
    });

    if (!cert) {
      res.status(404).json({
        valid: false,
        error: 'Certificado não localizado ou ainda pendente de homologação pela coordenação da Escola SENAI "Morvan Figueiredo".',
      });
      return;
    }

    res.json({
      valid: true,
      verificationCode: cert.verificationCode,
      studentName: cert.user.fullName,
      registrationCode: cert.user.registrationCode || 'ALUNO-SENAI',
      classGroup: cert.user.classGroup
        ? `[${cert.user.classGroup.code}] ${cert.user.classGroup.name}`
        : 'Turma Técnica SENAI',
      courseArea: cert.user.classGroup?.courseArea || 'Formação Profissional Técnica',
      schoolName: config.schoolName,
      unit: 'Escola SENAI "Morvan Figueiredo" (Mooca - São Paulo)',
      institution: 'Serviço Nacional de Aprendizagem Industrial - SENAI-SP',
      eventTitle: 'SIPAT 2026',
      workloadHours: cert.workloadHours || 20,
      totalPoints: cert.totalPointsSnapshot,
      approvedMissionsCount: cert.missionsSnapshot,
      completedQuizzesCount: cert.quizzesSnapshot,
      badgesCount: cert.user.badges.length,
      releasedByName: cert.releasedBy?.fullName || 'Coordenação SIPAT / CIPA',
      releasedAt: cert.releasedAt.toISOString(),
      eventDateLabel: '16 a 19 de Novembro de 2026',
      status: 'AUTENTICADO COM SUCESSO',
      verifiedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});


