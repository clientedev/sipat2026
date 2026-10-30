import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { getStorageStatus } from '../lib/storage.js';
import { getSchedulerHealth } from '../services/scheduler.service.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - started;

    res.status(200).json({
      status: 'ok',
      service: 'sipat2026-senai-morvan-figueiredo',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      database: {
        connected: true,
        provider: 'postgresql',
        latencyMs: dbLatencyMs,
      },
      storage: getStorageStatus(),
      scheduler: getSchedulerHealth(),
    });
  } catch (err) {
    console.error('[HEALTHCHECK DB ERROR]', err);
    res.status(503).json({
      status: 'degraded',
      service: 'sipat2026-senai-morvan-figueiredo',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        provider: 'postgresql',
      },
    });
  }
});
