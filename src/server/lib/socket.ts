import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

let io: SocketIOServer | null = null;

interface JwtPayload {
  sub: string;
  role: string;
}

function parseCookieToken(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === 'sipat_token') {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.PUBLIC_APP_URL || true,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    // Qualquer cliente pode assinar atualizações públicas em tempo real (Ranking TV / Acompanhamento)
    socket.join('public-live');

    const authToken =
      (socket.handshake.auth?.token as string | undefined) ||
      parseCookieToken(socket.handshake.headers.cookie);

    if (authToken) {
      try {
        const decoded = jwt.verify(authToken, env.JWT_SECRET) as JwtPayload;
        if (decoded?.sub) {
          socket.join(`user:${decoded.sub}`);
          if (decoded.role === 'PARTICIPANT') {
            socket.join('participants');
          } else {
            socket.join('staff');
            socket.join('participants');
          }
        }
      } catch {
        // Token expirado/inválido: permanece apenas em public-live
      }
    }

    socket.on('join:public', () => {
      socket.join('public-live');
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function broadcastRankingRefresh(reason = 'update') {
  if (!io) return;
  io.to('public-live').emit('ranking:updated', {
    reason,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastActivityReleased(payload: {
  kind: 'MISSION' | 'QUIZ';
  id: string;
  title: string;
  eventDay: number;
  points: number;
}) {
  if (!io) return;
  io.to('participants').to('public-live').emit('activity:released', {
    ...payload,
    releasedAt: new Date().toISOString(),
  });
}

export function broadcastActivityClosed(payload: {
  kind: 'MISSION' | 'QUIZ';
  id: string;
  title: string;
}) {
  if (!io) return;
  io.to('participants').to('public-live').emit('activity:closed', {
    ...payload,
    closedAt: new Date().toISOString(),
  });
}

export function emitToUser(userId: string, event: string, data: unknown) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToStaff(event: string, data: unknown) {
  if (!io) return;
  io.to('staff').emit(event, data);
}
