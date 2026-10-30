import { NotificationType, Role } from '@prisma/client';
import webpush from 'web-push';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { emitToUser } from '../lib/socket.js';

let webPushConfigured = false;
if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    webPushConfigured = true;
  } catch (err) {
    console.warn('[WEB PUSH] Chaves VAPID inválidas, notificações push externas desativadas:', err);
  }
}

export function isWebPushEnabled(): boolean {
  return webPushConfigured;
}

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      linkUrl: params.linkUrl || '/app',
    },
  });

  // Entrega imediata em tempo real via WebSocket
  emitToUser(params.userId, 'notification:new', notification);

  // Entrega opcional via Web Push (somente se suportado e autorizado pelo participante)
  if (webPushConfigured) {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: params.userId },
    });
    const payload = JSON.stringify({
      title: params.title,
      body: params.message,
      url: params.linkUrl || '/app',
    });

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        }
      })
    );
  }

  return notification;
}

export async function notifyAllActiveParticipants(params: {
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
}) {
  const participants = await prisma.user.findMany({
    where: { role: Role.PARTICIPANT, isActive: true, anonymizedAt: null },
    select: { id: true },
  });

  if (participants.length === 0) return;

  await prisma.notification.createMany({
    data: participants.map((p) => ({
      userId: p.id,
      type: params.type,
      title: params.title,
      message: params.message,
      linkUrl: params.linkUrl || '/app',
    })),
  });

  for (const p of participants) {
    emitToUser(p.id, 'notification:refresh', {
      type: params.type,
      title: params.title,
      message: params.message,
      linkUrl: params.linkUrl || '/app',
    });
  }
}

