import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  classGroupId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export function signSessionToken(user: { id: string; role: Role }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie('sipat_token', token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie('sipat_token', {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/',
  });
}

function extractToken(req: Request): string | null {
  const bearer = req.headers.authorization;
  if (bearer && bearer.startsWith('Bearer ')) {
    return bearer.slice(7).trim();
  }
  if (req.cookies?.sipat_token) {
    return req.cookies.sipat_token;
  }
  return null;
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: Role };
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        classGroupId: true,
        isActive: true,
        anonymizedAt: true,
      },
    });
    if (user && user.isActive && !user.anonymizedAt) {
      req.authUser = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        classGroupId: user.classGroupId,
      };
    }
  } catch {
    // ignore invalid optional token
  }
  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  await optionalAuth(req, res, () => {});
  if (!req.authUser) {
    res.status(401).json({ error: 'Sessão não autenticada ou expirada. Faça login novamente.' });
    return;
  }
  next();
}

export function requireRoles(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      res.status(401).json({ error: 'Autenticação necessária.' });
      return;
    }
    if (!allowedRoles.includes(req.authUser.role)) {
      res.status(403).json({
        error: 'Permissão insuficiente para acessar este recurso institucional.',
      });
      return;
    }
    next();
  };
}

