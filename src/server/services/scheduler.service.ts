import { ActivityStatus, NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { broadcastActivityClosed, broadcastActivityReleased } from '../lib/socket.js';
import { notifyAllActiveParticipants } from './notification.service.js';

let schedulerInterval: NodeJS.Timeout | null = null;
let lastSchedulerTickAt: string | null = null;
let isTickRunning = false;

/**
 * Executa um ciclo do agendador automático baseado nos registros persistidos no PostgreSQL.
 * Resiliente a reinicializações: ao subir o servidor em produção (Railway), qualquer missão
 * ou quiz cujo horário tenha chegado durante o restart é publicado imediatamente.
 */
export async function runSchedulerTick() {
  if (isTickRunning) return;
  isTickRunning = true;

  try {
    const now = new Date();
    lastSchedulerTickAt = now.toISOString();

    // 1. Liberar Missões Agendadas cujo opensAt <= agora
    const dueMissions = await prisma.mission.findMany({
      where: {
        status: ActivityStatus.SCHEDULED,
        opensAt: { lte: now },
      },
    });

    for (const mission of dueMissions) {
      const updated = await prisma.mission.updateMany({
        where: { id: mission.id, status: ActivityStatus.SCHEDULED },
        data: {
          status: ActivityStatus.PUBLISHED,
          publishedAt: now,
        },
      });

      if (updated.count > 0) {
        console.log(`[SCHEDULER] Missão liberada automaticamente: "${mission.title}"`);
        broadcastActivityReleased({
          kind: 'MISSION',
          id: mission.id,
          title: mission.title,
          eventDay: mission.eventDay,
          points: mission.points,
        });

        await notifyAllActiveParticipants({
          type: NotificationType.MISSION_OPENED,
          title: `Nova Missão Liberada: ${mission.title}`,
          message: `Valendo até ${mission.points} pontos! Confira as instruções e participe agora.`,
          linkUrl: `/app/missoes/${mission.id}`,
        });
      }
    }

    // 2. Liberar Quizzes Agendados cujo opensAt <= agora
    const dueQuizzes = await prisma.quiz.findMany({
      where: {
        status: ActivityStatus.SCHEDULED,
        opensAt: { lte: now },
      },
    });

    for (const quiz of dueQuizzes) {
      const updated = await prisma.quiz.updateMany({
        where: { id: quiz.id, status: ActivityStatus.SCHEDULED },
        data: {
          status: ActivityStatus.PUBLISHED,
          publishedAt: now,
        },
      });

      if (updated.count > 0) {
        console.log(`[SCHEDULER] Quiz liberado automaticamente: "${quiz.title}"`);
        broadcastActivityReleased({
          kind: 'QUIZ',
          id: quiz.id,
          title: quiz.title,
          eventDay: quiz.eventDay,
          points: quiz.maxPoints,
        });

        await notifyAllActiveParticipants({
          type: NotificationType.QUIZ_OPENED,
          title: `Novo Quiz Disponível: ${quiz.title}`,
          message: `Responda e conquiste até ${quiz.maxPoints} pontos na SIPAT 2026!`,
          linkUrl: `/app/quizzes/${quiz.id}`,
        });
      }
    }

    // 3. Encerrar Missões Publicadas cujo closesAt <= agora
    const expiredMissions = await prisma.mission.findMany({
      where: {
        status: ActivityStatus.PUBLISHED,
        closesAt: { lte: now },
      },
    });

    for (const mission of expiredMissions) {
      const updated = await prisma.mission.updateMany({
        where: { id: mission.id, status: ActivityStatus.PUBLISHED },
        data: { status: ActivityStatus.CLOSED },
      });
      if (updated.count > 0) {
        console.log(`[SCHEDULER] Missão encerrada automaticamente por prazo: "${mission.title}"`);
        broadcastActivityClosed({
          kind: 'MISSION',
          id: mission.id,
          title: mission.title,
        });
      }
    }

    // 4. Encerrar Quizzes Publicados cujo closesAt <= agora
    const expiredQuizzes = await prisma.quiz.findMany({
      where: {
        status: ActivityStatus.PUBLISHED,
        closesAt: { lte: now },
      },
    });

    for (const quiz of expiredQuizzes) {
      const updated = await prisma.quiz.updateMany({
        where: { id: quiz.id, status: ActivityStatus.PUBLISHED },
        data: { status: ActivityStatus.CLOSED },
      });
      if (updated.count > 0) {
        console.log(`[SCHEDULER] Quiz encerrado automaticamente por prazo: "${quiz.title}"`);
        broadcastActivityClosed({
          kind: 'QUIZ',
          id: quiz.id,
          title: quiz.title,
        });
      }
    }
  } catch (err) {
    console.error('[SCHEDULER ERROR]', err);
  } finally {
    isTickRunning = false;
  }
}

export function startActivityScheduler(intervalMs = 10_000) {
  if (schedulerInterval) return;
  // Executa na inicialização para recuperar estado pós-restart
  void runSchedulerTick();
  schedulerInterval = setInterval(() => {
    void runSchedulerTick();
  }, intervalMs);
}

export function stopActivityScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

export function getSchedulerHealth() {
  return {
    running: Boolean(schedulerInterval),
    lastTickAt: lastSchedulerTickAt,
  };
}

