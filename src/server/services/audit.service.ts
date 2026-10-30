import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export interface CreateAuditLogInput {
  actorId?: string | null;
  actorRole?: string | null;
  targetUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function recordAuditLog(input: CreateAuditLogInput) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorId: input.actorId || null,
        actorRole: input.actorRole || null,
        targetUserId: input.targetUserId || null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || null,
        reason: input.reason || null,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        ipAddress: input.ipAddress || null,
      },
    });
  } catch (err) {
    console.error('[AUDIT LOG ERROR]', err);
    return null;
  }
}

