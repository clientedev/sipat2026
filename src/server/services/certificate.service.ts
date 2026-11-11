import { ActivityStatus, SubmissionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export interface ChallengeProgress {
  requiredMissions: number;
  doneMissions: number;
  requiredQuizzes: number;
  doneQuizzes: number;
  totalRequired: number;
  totalDone: number;
  progressPercent: number;
  /** Concluiu TODOS os desafios que valem para ele: única condição para o certificado */
  isComplete: boolean;
}

/**
 * Regra do certificado de 20h: o aluno precisa concluir TODOS os desafios da SIPAT que valem para ele.
 *  - Missões: todas as não-rascunho que são para todas as turmas ou para a turma do aluno,
 *    com participação APROVADA.
 *  - Quizzes: todos os não-rascunho, com pelo menos uma tentativa finalizada.
 * Missões ainda agendadas também contam: o evento só está concluído quando elas também forem feitas.
 */
export async function computeChallengeProgress(userIds: string[]): Promise<Map<string, ChallengeProgress>> {
  const result = new Map<string, ChallengeProgress>();
  if (userIds.length === 0) return result;

  const [missions, quizzes, users] = await Promise.all([
    prisma.mission.findMany({
      where: { status: { not: ActivityStatus.DRAFT } },
      select: { id: true, targetClassGroups: { select: { classGroupId: true } } },
    }),
    prisma.quiz.findMany({ where: { status: { not: ActivityStatus.DRAFT } }, select: { id: true } }),
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        classGroupId: true,
        submissions: { where: { status: SubmissionStatus.APPROVED }, select: { missionId: true } },
        quizAttempts: { where: { completedAt: { not: null } }, select: { quizId: true } },
      },
    }),
  ]);

  const quizIds = new Set(quizzes.map((q) => q.id));

  for (const u of users) {
    const applicable = missions.filter(
      (m) =>
        m.targetClassGroups.length === 0 ||
        (u.classGroupId && m.targetClassGroups.some((t) => t.classGroupId === u.classGroupId))
    );
    const applicableIds = new Set(applicable.map((m) => m.id));
    const doneMissions = new Set(u.submissions.map((s) => s.missionId).filter((id) => applicableIds.has(id))).size;
    const doneQuizzes = new Set(u.quizAttempts.map((a) => a.quizId).filter((id) => quizIds.has(id))).size;

    const totalRequired = applicable.length + quizIds.size;
    const totalDone = doneMissions + doneQuizzes;
    result.set(u.id, {
      requiredMissions: applicable.length,
      doneMissions,
      requiredQuizzes: quizIds.size,
      doneQuizzes,
      totalRequired,
      totalDone,
      progressPercent: totalRequired > 0 ? Math.min(100, Math.round((totalDone / totalRequired) * 100)) : 0,
      isComplete: totalRequired > 0 && totalDone >= totalRequired,
    });
  }
  return result;
}
