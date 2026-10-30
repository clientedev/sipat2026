import { Router } from 'express';
import QRCode from 'qrcode';
import { ActivityStatus } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
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

