import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { initSocketServer } from './lib/socket.js';
import { errorHandler } from './middleware/error.middleware.js';
import { adminRouter } from './routes/admin.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { mediaRouter } from './routes/media.routes.js';
import { participantRouter } from './routes/participant.routes.js';
import { publicRouter } from './routes/public.routes.js';
import {
  startActivityScheduler,
  stopActivityScheduler,
} from './services/scheduler.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // Necessário para Railway reverse proxy (HTTPS, rate-limit por IP real e cookies seguros)
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
          mediaSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
          connectSrc: ["'self'", 'ws:', 'wss:', 'https:', 'http:'],
          workerSrc: ["'self'", 'blob:'],
        },
      },
    })
  );

  app.use(compression());
  app.use(
    cors({
      origin: env.PUBLIC_APP_URL || true,
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Rotas da API REST
  app.use('/api/health', healthRouter);
  app.use('/api/public', publicRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/participant', participantRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/media', mediaRouter);

  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'Rota da API não encontrada.' });
  });

  // Servir Frontend React compilado (Vite -> dist/client) em Produção
  const clientDistPath = path.resolve(process.cwd(), 'dist/client');
  if (fs.existsSync(path.join(clientDistPath, 'index.html'))) {
    app.use(
      express.static(clientDistPath, {
        maxAge: '1h',
        index: false,
      })
    );
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}

async function bootstrap() {
  const app = createApp();
  const httpServer = http.createServer(app);

  initSocketServer(httpServer);
  startActivityScheduler(10_000);

  const port = env.PORT;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(
      `[SIPAT 2026 - SENAI "Morvan Figueiredo"] Servidor HTTP + WebSocket ativo em 0.0.0.0:${port} (${env.NODE_ENV})`
    );
  });

  const shutdown = async (signal: string) => {
    console.log(`[SERVER] Recebido ${signal}, encerrando de forma segura...`);
    stopActivityScheduler();
    httpServer.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

// Inicia apenas se executado diretamente
const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase().includes(path.join('server', 'index').toLowerCase());

if (isDirectRun) {
  bootstrap().catch((err) => {
    console.error('[BOOTSTRAP FATAL]', err);
    process.exit(1);
  });
}
