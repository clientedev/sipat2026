import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { NotificationType, Prisma, Role, SubmissionStatus } from '@prisma/client';
import { z } from 'zod';
import { calculateLevelInfo, getInitials } from '../../shared/constants.js';
import { prisma } from '../lib/prisma.js';
import { getIO } from '../lib/socket.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { recordAuditLog } from '../services/audit.service.js';
import { createNotification } from '../services/notification.service.js';
import { buildPublicRankingData } from '../services/ranking.service.js';

/**
 * REDE SOCIAL DOS ALUNOS
 *
 * Lógica do sistema:
 *  - A coordenação cadastra ATIVIDADES (missões e quizzes) com pontuação.
 *  - O aluno participa; quando a equipe APROVA a participação, ele ganha os pontos
 *    e a participação vira uma PUBLICAÇÃO no mural da escola (se ele optou por compartilhar).
 *  - Colegas curtem e comentam. Curtidas/comentários NÃO valem pontos: os pontos vêm
 *    somente das atividades cadastradas, o que evita "farm" de curtidas.
 *  - A equipe (avaliador/admin) pode ocultar publicações e comentários inadequados.
 *  - Fotos/vídeos só aparecem no mural se o autor autorizou uso de imagem (LGPD).
 */
export const socialRouter = Router();
socialRouter.use(requireAuth);

const STAFF_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.EVALUATOR];
const isStaffRole = (role: Role) => STAFF_ROLES.includes(role);

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas ações em sequência. Aguarde alguns segundos.' },
});

const PAGE_SIZE = 15;

/** Publicações visíveis no mural: aprovadas, compartilhadas, não ocultadas e de contas ativas. */
function visiblePostWhere(extra: Prisma.MissionSubmissionWhereInput = {}): Prisma.MissionSubmissionWhereInput {
  return {
    status: SubmissionStatus.APPROVED,
    shareToFeed: true,
    hiddenFromFeed: false,
    user: { isActive: true, anonymizedAt: null, role: Role.PARTICIPANT },
    ...extra,
  };
}

const authorSelect = {
  id: true,
  fullName: true,
  avatarKey: true,
  imageConsent: true,
  totalPoints: true,
  updatedAt: true,
  classGroup: { select: { id: true, code: true, name: true } },
} satisfies Prisma.UserSelect;

type AuthorRow = Prisma.UserGetPayload<{ select: typeof authorSelect }>;

export function serializeAuthor(u: AuthorRow) {
  const lvl = calculateLevelInfo(u.totalPoints);
  return {
    id: u.id,
    fullName: u.fullName,
    initials: getInitials(u.fullName),
    avatarUrl:
      u.avatarKey && u.imageConsent ? `/api/media/avatar/${u.id}?v=${u.updatedAt.getTime()}` : null,
    level: lvl.level,
    levelTitle: lvl.title,
    classGroup: u.classGroup ? { code: u.classGroup.code, name: u.classGroup.name } : null,
  };
}

const postInclude = (viewerId: string) =>
  ({
    user: { select: authorSelect },
    mission: { select: { id: true, title: true, category: true, eventDay: true, eventDateLabel: true } },
    likes: { where: { userId: viewerId }, select: { id: true } },
    _count: { select: { likes: true, comments: { where: { isHidden: false } } } },
  }) satisfies Prisma.MissionSubmissionInclude;

type PostRow = Prisma.MissionSubmissionGetPayload<{ include: ReturnType<typeof postInclude> }>;

function serializePost(s: PostRow, viewer: { id: string; role: Role }) {
  const sd = (s.structuredData || {}) as Record<string, any>;
  // Apenas campos descritivos do registro técnico; gabaritos/seleções não são expostos
  const details: Array<{ label: string; value: string }> = [];
  if (sd.environment) details.push({ label: 'Local', value: String(sd.environment) });
  if (sd.hazardType) details.push({ label: 'Risco', value: String(sd.hazardType) });
  if (sd.preventiveMeasures) details.push({ label: 'Prevenção', value: String(sd.preventiveMeasures) });

  const canShowMedia = Boolean(s.mediaKey) && s.user.imageConsent;
  return {
    id: s.id,
    kind: 'POST' as const,
    author: serializeAuthor(s.user),
    activity: {
      id: s.mission.id,
      title: s.mission.title,
      category: s.mission.category,
      eventDay: s.mission.eventDay,
      eventDateLabel: s.mission.eventDateLabel,
    },
    text: s.textResponse || '',
    details,
    teamName: s.teamName,
    media: canShowMedia
      ? {
          url: `/api/media/evidence/${s.id}`,
          isVideo: Boolean(s.mediaMime?.startsWith('video/')),
        }
      : null,
    awardedPoints: s.awardedPoints,
    evaluatorFeedback: s.feedback,
    likesCount: s._count.likes,
    commentsCount: s._count.comments,
    likedByMe: s.likes.length > 0,
    isMine: s.userId === viewer.id,
    canModerate: isStaffRole(viewer.role),
    isPublicHighlight: s.isPublicHighlight,
    createdAt: (s.evaluatedAt || s.submittedAt).toISOString(),
  };
}

// ----------------------------------------------------------------------------
// MURAL (feed): publicações + conquistas de medalhas, mais recentes primeiro
// ----------------------------------------------------------------------------
socialRouter.get('/feed', async (req, res, next) => {
  try {
    const viewer = req.authUser!;
    const scope = req.query.scope === 'class' ? 'class' : 'all';
    const before = req.query.before ? new Date(String(req.query.before)) : null;
    const validBefore = before && !Number.isNaN(before.getTime()) ? before : null;

    const classFilter: Prisma.MissionSubmissionWhereInput =
      scope === 'class' && viewer.classGroupId ? { user: { classGroupId: viewer.classGroupId } } : {};

    const baseWhere = visiblePostWhere();
    const where: Prisma.MissionSubmissionWhereInput = {
      ...baseWhere,
      user: { ...(baseWhere.user as object), ...((classFilter.user as object) || {}) },
      ...(validBefore ? { evaluatedAt: { lt: validBefore } } : {}),
    };

    const [posts, badgeEvents] = await Promise.all([
      prisma.missionSubmission.findMany({
        where,
        include: postInclude(viewer.id),
        orderBy: [{ evaluatedAt: 'desc' }, { submittedAt: 'desc' }],
        take: PAGE_SIZE,
      }),
      prisma.userBadge.findMany({
        where: {
          user: {
            role: Role.PARTICIPANT,
            isActive: true,
            anonymizedAt: null,
            ...(scope === 'class' && viewer.classGroupId ? { classGroupId: viewer.classGroupId } : {}),
          },
          ...(validBefore ? { awardedAt: { lt: validBefore } } : {}),
        },
        include: {
          user: { select: authorSelect },
          badge: { select: { name: true, description: true, iconName: true, accentColor: true } },
        },
        orderBy: { awardedAt: 'desc' },
        take: 8,
      }),
    ]);

    const serializedPosts = posts.map((p) => serializePost(p, viewer));
    const oldestPost = serializedPosts.length ? serializedPosts[serializedPosts.length - 1].createdAt : null;

    // Conquistas entram somente dentro da janela de tempo coberta pelas publicações desta página
    const achievements = badgeEvents
      .filter((b) => !oldestPost || serializedPosts.length < PAGE_SIZE || b.awardedAt.toISOString() >= oldestPost)
      .map((b) => ({
        id: `badge-${b.id}`,
        kind: 'ACHIEVEMENT' as const,
        author: serializeAuthor(b.user),
        badge: b.badge,
        createdAt: b.awardedAt.toISOString(),
      }));

    const items = [...serializedPosts, ...achievements].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1
    );

    res.json({
      items,
      nextCursor: serializedPosts.length === PAGE_SIZE ? oldestPost : null,
      scope,
    });
  } catch (err) {
    next(err);
  }
});

async function findVisiblePostOr404(id: string, viewerRole: Role) {
  const post = await prisma.missionSubmission.findUnique({
    where: { id },
    include: { user: { select: { id: true, fullName: true, isActive: true } }, mission: { select: { title: true } } },
  });
  if (!post || post.status !== SubmissionStatus.APPROVED) return null;
  if (!isStaffRole(viewerRole) && (!post.shareToFeed || post.hiddenFromFeed)) return null;
  return post;
}

// ----------------------------------------------------------------------------
// CURTIR / DESCURTIR (1 curtida por pessoa, sem pontos)
// ----------------------------------------------------------------------------
socialRouter.post('/posts/:id/like', writeLimiter, async (req, res, next) => {
  try {
    const viewer = req.authUser!;
    const post = await findVisiblePostOr404(String(req.params.id), viewer.role);
    if (!post) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }

    const existing = await prisma.postLike.findUnique({
      where: { submissionId_userId: { submissionId: post.id, userId: viewer.id } },
    });

    let liked: boolean;
    if (existing) {
      await prisma.postLike.delete({ where: { id: existing.id } });
      liked = false;
    } else {
      await prisma.postLike.create({ data: { submissionId: post.id, userId: viewer.id } }).catch((e) => {
        if (e?.code !== 'P2002') throw e; // clique duplo simultâneo
      });
      liked = true;
      if (post.userId !== viewer.id) {
        const actor = await prisma.user.findUnique({ where: { id: viewer.id }, select: { fullName: true } });
        await createNotification({
          userId: post.userId,
          type: NotificationType.SOCIAL_LIKE,
          title: 'Nova curtida',
          message: `${actor?.fullName.split(' ')[0] || 'Um colega'} curtiu sua publicação "${post.mission.title}".`,
          linkUrl: `/app?post=${post.id}`,
        }).catch(() => {});
      }
    }

    const likesCount = await prisma.postLike.count({ where: { submissionId: post.id } });
    getIO()?.to('participants').emit('social:post-updated', { postId: post.id, likesCount });
    res.json({ liked, likesCount });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// COMENTÁRIOS
// ----------------------------------------------------------------------------
socialRouter.get('/posts/:id/comments', async (req, res, next) => {
  try {
    const viewer = req.authUser!;
    const post = await findVisiblePostOr404(String(req.params.id), viewer.role);
    if (!post) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    const comments = await prisma.postComment.findMany({
      where: { submissionId: post.id, isHidden: false },
      include: { user: { select: authorSelect } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    res.json({
      comments: comments.map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        author: serializeAuthor(c.user),
        canDelete: c.userId === viewer.id || isStaffRole(viewer.role) || post.userId === viewer.id,
      })),
    });
  } catch (err) {
    next(err);
  }
});

const commentSchema = z.object({
  body: z.string().trim().min(1, 'Escreva algo antes de enviar.').max(400, 'Comentário muito longo (máx. 400 caracteres).'),
});

socialRouter.post('/posts/:id/comments', writeLimiter, async (req, res, next) => {
  try {
    const viewer = req.authUser!;
    const { body } = commentSchema.parse(req.body);
    const post = await findVisiblePostOr404(String(req.params.id), viewer.role);
    if (!post) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    const comment = await prisma.postComment.create({
      data: { submissionId: post.id, userId: viewer.id, body },
      include: { user: { select: authorSelect } },
    });

    if (post.userId !== viewer.id) {
      await createNotification({
        userId: post.userId,
        type: NotificationType.SOCIAL_COMMENT,
        title: 'Novo comentário',
        message: `${comment.user.fullName.split(' ')[0]} comentou: "${body.slice(0, 80)}${body.length > 80 ? '…' : ''}"`,
        linkUrl: `/app?post=${post.id}`,
      }).catch(() => {});
    }

    const commentsCount = await prisma.postComment.count({ where: { submissionId: post.id, isHidden: false } });
    getIO()?.to('participants').emit('social:post-updated', { postId: post.id, commentsCount });

    res.status(201).json({
      comment: {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        author: serializeAuthor(comment.user),
        canDelete: true,
      },
      commentsCount,
    });
  } catch (err) {
    next(err);
  }
});

socialRouter.delete('/comments/:id', writeLimiter, async (req, res, next) => {
  try {
    const viewer = req.authUser!;
    const comment = await prisma.postComment.findUnique({
      where: { id: String(req.params.id) },
      include: { submission: { select: { id: true, userId: true } } },
    });
    if (!comment) {
      res.status(404).json({ error: 'Comentário não encontrado.' });
      return;
    }
    const isAuthor = comment.userId === viewer.id;
    const isPostOwner = comment.submission.userId === viewer.id;
    const isStaff = isStaffRole(viewer.role);
    if (!isAuthor && !isPostOwner && !isStaff) {
      res.status(403).json({ error: 'Você não pode remover este comentário.' });
      return;
    }

    if (isAuthor) {
      await prisma.postComment.delete({ where: { id: comment.id } });
    } else {
      await prisma.postComment.update({ where: { id: comment.id }, data: { isHidden: true } });
      await recordAuditLog({
        actorId: viewer.id,
        actorRole: viewer.role,
        targetUserId: comment.userId,
        action: 'SOCIAL_COMMENT_HIDDEN',
        entityType: 'PostComment',
        entityId: comment.id,
        metadata: { body: comment.body, byPostOwner: isPostOwner && !isStaff },
        ipAddress: req.ip,
      });
    }

    const commentsCount = await prisma.postComment.count({
      where: { submissionId: comment.submission.id, isHidden: false },
    });
    getIO()?.to('participants').emit('social:post-updated', { postId: comment.submission.id, commentsCount });
    res.json({ ok: true, commentsCount });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// O PRÓPRIO AUTOR decide se a publicação fica no mural
// ----------------------------------------------------------------------------
socialRouter.patch('/posts/:id/visibility', writeLimiter, async (req, res, next) => {
  try {
    const viewer = req.authUser!;
    const { shareToFeed } = z.object({ shareToFeed: z.boolean() }).parse(req.body);
    const post = await prisma.missionSubmission.findUnique({ where: { id: String(req.params.id) } });
    if (!post || post.userId !== viewer.id) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    await prisma.missionSubmission.update({ where: { id: post.id }, data: { shareToFeed } });
    getIO()?.to('participants').emit('social:feed-changed', { postId: post.id });
    res.json({ ok: true, shareToFeed });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// MODERAÇÃO (avaliador / coordenação): ocultar ou reexibir publicação
// ----------------------------------------------------------------------------
socialRouter.post('/posts/:id/moderate', writeLimiter, async (req, res, next) => {
  try {
    const viewer = req.authUser!;
    if (!isStaffRole(viewer.role)) {
      res.status(403).json({ error: 'Apenas a equipe da SIPAT pode moderar o mural.' });
      return;
    }
    const { hidden, reason } = z
      .object({ hidden: z.boolean(), reason: z.string().trim().max(300).optional() })
      .parse(req.body);
    const post = await prisma.missionSubmission.findUnique({ where: { id: String(req.params.id) } });
    if (!post) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    await prisma.missionSubmission.update({
      where: { id: post.id },
      data: { hiddenFromFeed: hidden, ...(hidden ? { isPublicHighlight: false } : {}) },
    });
    await recordAuditLog({
      actorId: viewer.id,
      actorRole: viewer.role,
      targetUserId: post.userId,
      action: hidden ? 'SOCIAL_POST_HIDDEN' : 'SOCIAL_POST_RESTORED',
      entityType: 'MissionSubmission',
      entityId: post.id,
      reason: reason || null,
      ipAddress: req.ip,
    });
    getIO()?.to('participants').emit('social:feed-changed', { postId: post.id });
    res.json({ ok: true, hidden });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// PERFIL de um aluno (visto pelos colegas)
// ----------------------------------------------------------------------------
socialRouter.get('/profiles/:userId', async (req, res, next) => {
  try {
    const viewer = req.authUser!;
    const user = await prisma.user.findFirst({
      where: { id: String(req.params.userId), role: Role.PARTICIPANT, isActive: true, anonymizedAt: null },
      select: {
        ...authorSelect,
        bio: true,
        createdAt: true,
        badges: {
          include: { badge: { select: { slug: true, name: true, description: true, iconName: true, accentColor: true } } },
          orderBy: { awardedAt: 'desc' },
        },
        _count: {
          select: {
            submissions: { where: { status: SubmissionStatus.APPROVED } },
            quizAttempts: { where: { completedAt: { not: null } } },
          },
        },
      },
    });
    if (!user) {
      res.status(404).json({ error: 'Perfil não encontrado.' });
      return;
    }

    const isSelf = user.id === viewer.id;
    const [higher, posts, likesReceived] = await Promise.all([
      prisma.user.count({
        where: { role: Role.PARTICIPANT, isActive: true, anonymizedAt: null, totalPoints: { gt: user.totalPoints } },
      }),
      prisma.missionSubmission.findMany({
        where: isSelf
          ? { userId: user.id, status: SubmissionStatus.APPROVED }
          : visiblePostWhere({ userId: user.id }),
        include: postInclude(viewer.id),
        orderBy: [{ evaluatedAt: 'desc' }],
        take: 30,
      }),
      prisma.postLike.count({ where: { submission: { userId: user.id } } }),
    ]);

    const levelInfo = calculateLevelInfo(user.totalPoints);
    res.json({
      profile: {
        ...serializeAuthor(user),
        bio: user.bio,
        totalPoints: user.totalPoints,
        rankPosition: higher + 1,
        levelProgressPercent: levelInfo.progressPercent,
        nextLevelPoints: levelInfo.nextLevelPoints,
        approvedActivities: user._count.submissions,
        completedQuizzes: user._count.quizAttempts,
        likesReceived,
        memberSince: user.createdAt.toISOString(),
        isSelf,
        badges: user.badges.map((ub) => ({ ...ub.badge, awardedAt: ub.awardedAt.toISOString() })),
      },
      posts: posts.map((p) => ({
        ...serializePost(p, viewer),
        shareToFeed: p.shareToFeed,
        hiddenFromFeed: p.hiddenFromFeed,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// RANKING dentro da rede (nome completo e foto de quem autorizou)
// ----------------------------------------------------------------------------
socialRouter.get('/ranking', async (req, res, next) => {
  try {
    const data = await buildPublicRankingData({ schoolMembersView: true });
    const viewerId = req.authUser!.id;
    const me = data.individualRanking.find((r) => r.userId === viewerId) || null;
    res.json({
      individual: data.individualRanking,
      classes: data.classRanking,
      me,
      myClassId: req.authUser!.classGroupId || null,
      updatedAt: data.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});
