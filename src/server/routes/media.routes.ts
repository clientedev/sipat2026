import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getObjectStream, getPrivateSignedUrl } from '../lib/storage.js';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { getSystemConfigSafe } from '../services/ranking.service.js';

export const mediaRouter = Router();

/**
 * Entrega a marca institucional oficial enviada pelo administrador sem alterações ou recriações
 */
mediaRouter.get('/brand', async (_req, res, next) => {
  try {
    const config = await getSystemConfigSafe();
    if (!config.officialLogoUrl) {
      res.status(404).end();
      return;
    }
    if (config.officialLogoUrl.startsWith('http://') || config.officialLogoUrl.startsWith('https://')) {
      res.redirect(config.officialLogoUrl);
      return;
    }
    const obj = await getObjectStream(config.officialLogoUrl);
    if (!obj) {
      res.status(404).end();
      return;
    }
    res.setHeader('Content-Type', obj.contentType || 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    obj.stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

/**
 * Entrega o avatar do participante respeitando a LGPD:
 * - Próprio usuário logado ou Staff (ADMIN / SUPER_ADMIN / EVALUATOR): acesso liberado
 * - Público externo: somente se showAvatarsInPublic == true E participante concedeu imageConsent == true
 */
mediaRouter.get('/avatar/:userId', optionalAuth, async (req, res, next) => {
  try {
    const userId = String(req.params.userId || '');
    const [config, targetUser] = await Promise.all([
      getSystemConfigSafe(),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          avatarKey: true,
          avatarMime: true,
          imageConsent: true,
          anonymizedAt: true,
        },
      }),
    ]);

    if (!targetUser || !targetUser.avatarKey || targetUser.anonymizedAt) {
      res.status(404).end();
      return;
    }

    const isSelf = req.authUser?.id === targetUser.id;
    const isStaff =
      req.authUser &&
      ([Role.SUPER_ADMIN, Role.ADMIN, Role.EVALUATOR] as Role[]).includes(req.authUser.role);
    const isAllowedPublic = config.showAvatarsInPublic && targetUser.imageConsent;

    if (!isSelf && !isStaff && !isAllowedPublic) {
      res.status(403).json({ error: 'Imagem protegida pelas regras de privacidade LGPD.' });
      return;
    }

    const signed = await getPrivateSignedUrl(targetUser.avatarKey);
    if (signed) {
      res.redirect(signed);
      return;
    }

    const obj = await getObjectStream(targetUser.avatarKey);
    if (!obj) {
      res.status(404).end();
      return;
    }
    res.setHeader('Content-Type', targetUser.avatarMime || obj.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=300');
    obj.stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

/**
 * Entrega evidência fotográfica ou de vídeo (Privada por padrão - LGPD):
 * Somente o próprio autor da submissão ou membros autorizados (EVALUATOR, ADMIN, SUPER_ADMIN) têm acesso!
 */
mediaRouter.get('/evidence/:submissionId', optionalAuth, async (req, res, next) => {
  try {
    const submissionId = String(req.params.submissionId || '');
    const slot = req.query.slot === 'secondary' ? 'secondary' : 'primary';

    const submission = await prisma.missionSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: { select: { id: true, imageConsent: true } },
      },
    });

    if (!submission) {
      res.status(404).json({ error: 'Evidência não encontrada.' });
      return;
    }

    const isOwner = req.authUser?.id === submission.userId;
    const isStaff =
      req.authUser &&
      ([Role.SUPER_ADMIN, Role.ADMIN, Role.EVALUATOR] as Role[]).includes(req.authUser.role);
    const isPublicHighlightAllowed =
      submission.isPublicHighlight && submission.status === 'APPROVED' && submission.user.imageConsent;

    if (!isOwner && !isStaff && !isPublicHighlightAllowed) {
      res.status(403).json({
        error: 'Acesso negado. As evidências da SIPAT são privadas por padrão conforme a LGPD.',
      });
      return;
    }

    const key = slot === 'secondary' ? submission.secondaryMediaKey : submission.mediaKey;
    const mime = slot === 'secondary' ? submission.secondaryMediaMime : submission.mediaMime;

    if (!key) {
      res.status(404).json({ error: 'Arquivo de mídia não associado a esta submissão.' });
      return;
    }

    const signed = await getPrivateSignedUrl(key);
    if (signed) {
      res.redirect(signed);
      return;
    }

    const obj = await getObjectStream(key);
    if (!obj) {
      res.status(404).json({ error: 'Objeto não encontrado no armazenamento.' });
      return;
    }

    res.setHeader('Content-Type', mime || obj.contentType || 'application/octet-stream');
    if (obj.contentLength) {
      res.setHeader('Content-Length', String(obj.contentLength));
    }
    res.setHeader('Cache-Control', 'private, no-store');
    obj.stream.pipe(res);
  } catch (err) {
    next(err);
  }
});
