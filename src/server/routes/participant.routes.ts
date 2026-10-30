import { Router } from 'express';
import {
  ActivityStatus,
  PointSourceType,
  Prisma,
  Role,
  SubmissionStatus,
} from '@prisma/client';
import { z } from 'zod';
import { calculateLevelInfo, getInitials } from '../../shared/constants.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
  deleteObject,
  uploadObject,
  verifyFileSignature,
} from '../lib/storage.js';
import { emitToStaff } from '../lib/socket.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadEvidence } from '../middleware/upload.middleware.js';
import { awardPointsSecurely, evaluateAndGrantBadges } from '../services/gamification.service.js';

export const participantRouter = Router();

participantRouter.use(requireAuth);

/**
 * Remove gabaritos secretos de configJson antes de enviar ao frontend do aluno (proteção anti-fraude)
 */
function sanitizeMissionConfigForParticipant(configJson: unknown) {
  if (!configJson || typeof configJson !== 'object') return null;
  const raw = configJson as Record<string, any>;
  const safe: Record<string, any> = {};

  if (raw.question) safe.question = raw.question;
  if (Array.isArray(raw.options)) {
    safe.options = raw.options.map((o: any) => ({ id: o.id, text: o.text }));
  }
  if (Array.isArray(raw.items)) {
    safe.items = raw.items.map((item: any) => ({ id: item.id, label: item.label }));
  }
  return safe;
}

participantRouter.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.authUser!.id;

    const [
      user,
      higherRankedCount,
      totalParticipants,
      missions,
      quizzes,
      allBadges,
      userBadges,
      pointHistory,
      notifications,
      unreadCount,
    ] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
          classGroup: true,
          submissions: {
            include: {
              mission: { select: { id: true, title: true, points: true, eventDay: true, category: true } },
            },
            orderBy: { submittedAt: 'desc' },
          },
          quizAttempts: {
            where: { completedAt: { not: null } },
            include: {
              quiz: { select: { id: true, title: true, maxPoints: true, eventDay: true } },
            },
            orderBy: { completedAt: 'desc' },
          },
        },
      }),
      prisma.user.count({
        where: {
          role: Role.PARTICIPANT,
          isActive: true,
          anonymizedAt: null,
          OR: [
            { totalPoints: { gt: (await prisma.user.findUnique({ where: { id: userId }, select: { totalPoints: true } }))?.totalPoints || 0 } },
          ],
        },
      }),
      prisma.user.count({
        where: { role: Role.PARTICIPANT, isActive: true, anonymizedAt: null },
      }),
      prisma.mission.findMany({
        where: { status: { in: [ActivityStatus.PUBLISHED, ActivityStatus.SCHEDULED, ActivityStatus.CLOSED] } },
        orderBy: [{ eventDay: 'asc' }, { sortOrder: 'asc' }],
      }),
      prisma.quiz.findMany({
        where: { status: { in: [ActivityStatus.PUBLISHED, ActivityStatus.SCHEDULED, ActivityStatus.CLOSED] } },
        include: { _count: { select: { questions: true } } },
        orderBy: [{ eventDay: 'asc' }, { sortOrder: 'asc' }],
      }),
      prisma.badge.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
        orderBy: { awardedAt: 'desc' },
      }),
      prisma.pointLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    const levelInfo = calculateLevelInfo(user.totalPoints);
    const submissionsByMission = new Map(user.submissions.map((s) => [s.missionId, s]));

    const attemptsByQuiz = new Map<string, typeof user.quizAttempts>();
    for (const att of user.quizAttempts) {
      const list = attemptsByQuiz.get(att.quizId) || [];
      list.push(att);
      attemptsByQuiz.set(att.quizId, list);
    }

    const earnedBadgeIds = new Set(userBadges.map((ub) => ub.badgeId));

    res.json({
      profile: {
        id: user.id,
        fullName: user.fullName,
        initials: getInitials(user.fullName),
        email: user.email,
        registrationCode: user.registrationCode,
        avatarUrl: user.avatarKey ? `/api/media/avatar/${user.id}?v=${user.updatedAt.getTime()}` : null,
        classGroup: user.classGroup,
        totalPoints: user.totalPoints,
        rankPosition: user.role === Role.PARTICIPANT ? higherRankedCount + 1 : null,
        totalParticipants,
        level: levelInfo.level,
        levelTitle: levelInfo.title,
        levelProgressPercent: levelInfo.progressPercent,
        nextLevelPoints: levelInfo.nextLevelPoints,
        approvedMissionsCount: user.submissions.filter((s) => s.status === 'APPROVED').length,
        pendingMissionsCount: user.submissions.filter((s) => s.status === 'PENDING').length,
        completedQuizzesCount: new Set(user.quizAttempts.map((a) => a.quizId)).size,
        imageConsent: user.imageConsent,
      },
      missions: missions.map((m) => {
        const sub = submissionsByMission.get(m.id);
        return {
          id: m.id,
          slug: m.slug,
          title: m.title,
          summary: m.summary,
          description: m.status === ActivityStatus.SCHEDULED ? m.summary : m.description,
          instructions: m.status === ActivityStatus.SCHEDULED ? 'Disponível na abertura agendada.' : m.instructions,
          evaluationCriteria: m.evaluationCriteria,
          safetyNotice: m.safetyNotice,
          bannerUrl: m.bannerUrl,
          category: m.category,
          difficulty: m.difficulty,
          participationMode: m.participationMode,
          submissionType: m.submissionType,
          eventDay: m.eventDay,
          eventDateLabel: m.eventDateLabel,
          status: m.status,
          opensAt: m.opensAt,
          closesAt: m.closesAt,
          points: m.points,
          requiresPhoto: m.requiresPhoto,
          requiresVideo: m.requiresVideo,
          requiresText: m.requiresText,
          requiresApproval: m.requiresApproval,
          isFeatured: m.isFeatured,
          config: m.status === ActivityStatus.SCHEDULED ? null : sanitizeMissionConfigForParticipant(m.configJson),
          mySubmission: sub
            ? {
                id: sub.id,
                status: sub.status,
                awardedPoints: sub.awardedPoints,
                feedback: sub.feedback,
                submittedAt: sub.submittedAt,
                evaluatedAt: sub.evaluatedAt,
                textResponse: sub.textResponse,
                structuredData: sub.structuredData,
                hasMedia: Boolean(sub.mediaKey),
                mediaMime: sub.mediaMime,
                mediaUrl: sub.mediaKey ? `/api/media/evidence/${sub.id}` : null,
              }
            : null,
        };
      }),
      quizzes: quizzes.map((q) => {
        const myAttempts = attemptsByQuiz.get(q.id) || [];
        const bestAttempt = myAttempts.reduce(
          (best, cur) => (!best || cur.awardedPoints > best.awardedPoints ? cur : best),
          null as (typeof myAttempts)[0] | null
        );
        return {
          id: q.id,
          slug: q.slug,
          title: q.title,
          description: q.description,
          category: q.category,
          eventDay: q.eventDay,
          eventDateLabel: q.eventDateLabel,
          status: q.status,
          opensAt: q.opensAt,
          closesAt: q.closesAt,
          durationSeconds: q.durationSeconds,
          maxPoints: q.maxPoints,
          maxAttempts: q.maxAttempts,
          questionsCount: q._count.questions,
          attemptsUsed: myAttempts.length,
          bestScorePercent: bestAttempt?.scorePercent ?? null,
          bestAwardedPoints: bestAttempt?.awardedPoints ?? 0,
        };
      }),
      badges: allBadges.map((b) => {
        const ub = userBadges.find((x) => x.badgeId === b.id);
        return {
          id: b.id,
          slug: b.slug,
          name: b.name,
          description: b.description,
          iconName: b.iconName,
          accentColor: b.accentColor,
          unlocked: earnedBadgeIds.has(b.id),
          awardedAt: ub?.awardedAt || null,
        };
      }),
      pointHistory,
      notifications,
      unreadNotificationsCount: unreadCount,
    });
  } catch (err) {
    next(err);
  }
});

// Submissão de evidência de Missão (Foto, Vídeo, Texto, Caça aos Riscos, 7 Erros, Equipe)
participantRouter.post(
  '/missions/:id/submit',
  uploadEvidence.fields([
    { name: 'media', maxCount: 1 },
    { name: 'secondaryMedia', maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const missionId = String(req.params.id || '');
      const userId = req.authUser!.id;
      const now = new Date();

      const mission = await prisma.mission.findUnique({ where: { id: missionId } });
      if (!mission) {
        res.status(404).json({ error: 'Missão não encontrada.' });
        return;
      }

      if (mission.status !== ActivityStatus.PUBLISHED) {
        res.status(400).json({
          error:
            mission.status === ActivityStatus.SCHEDULED
              ? 'Esta missão ainda está agendada e será liberada automaticamente no horário programado.'
              : 'Esta missão não está aberta para envio de evidências.',
        });
        return;
      }

      if (mission.opensAt && now < mission.opensAt) {
        res.status(400).json({ error: 'O horário de abertura desta missão ainda não chegou.' });
        return;
      }
      if (mission.closesAt && now > mission.closesAt) {
        res.status(400).json({ error: 'O prazo de participação desta missão já foi encerrado.' });
        return;
      }

      const existingSub = await prisma.missionSubmission.findUnique({
        where: { missionId_userId: { missionId, userId } },
      });

      if (existingSub && existingSub.status !== SubmissionStatus.NEEDS_CORRECTION) {
        res.status(409).json({
          error: 'Você já enviou sua participação para esta missão.',
        });
        return;
      }

      const filesMap = (req.files as Record<string, Express.Multer.File[]> | undefined) || {};
      const primaryFile = filesMap.media?.[0];
      const secondaryFile = filesMap.secondaryMedia?.[0];

      if (mission.requiresPhoto && !primaryFile && !existingSub?.mediaKey) {
        res.status(400).json({
          error: 'Esta missão exige o envio de uma fotografia de evidência.',
        });
        return;
      }

      if (mission.requiresVideo && !primaryFile && !existingSub?.mediaKey) {
        res.status(400).json({
          error: 'Esta missão exige o envio de um vídeo curto (até 60 segundos).',
        });
        return;
      }

      const textResponse = String(req.body.textResponse || '').trim();
      let structuredData: Record<string, any> | null = null;
      if (req.body.structuredData) {
        try {
          structuredData =
            typeof req.body.structuredData === 'string'
              ? JSON.parse(req.body.structuredData)
              : req.body.structuredData;
        } catch {
          res.status(400).json({ error: 'Formato inválido nos campos estruturados da missão.' });
          return;
        }
      }

      // Validação específica da missão Caça aos Riscos
      if (mission.submissionType === 'RISK_HUNT') {
        const envField = String(structuredData?.environment || '').trim();
        const hazDesc = String(structuredData?.hazardDescription || '').trim();
        const conseq = String(structuredData?.consequences || '').trim();
        const prevMeas = String(structuredData?.preventiveMeasures || '').trim();
        if (!envField || !hazDesc || !conseq || !prevMeas) {
          res.status(400).json({
            error:
              'Na atividade Caça aos Riscos, preencha obrigatoriamente: Ambiente, Descrição do Perigo, Possíveis Consequências e Medidas Preventivas.',
          });
          return;
        }
      } else if (mission.requiresText && textResponse.length < 15) {
        res.status(400).json({
          error: 'Descreva sua resposta/relato técnico com pelo menos 15 caracteres.',
        });
        return;
      }

      let mediaKey = existingSub?.mediaKey || null;
      let mediaMime = existingSub?.mediaMime || null;
      let mediaSize = existingSub?.mediaSize || null;
      let mediaOriginalName = existingSub?.mediaOriginalName || null;

      if (primaryFile) {
        const isImg = ALLOWED_IMAGE_MIMES.has(primaryFile.mimetype);
        const isVid = ALLOWED_VIDEO_MIMES.has(primaryFile.mimetype);

        if (mission.requiresPhoto && !isImg) {
          res.status(400).json({ error: 'Envie uma imagem válida nos formatos JPEG, PNG ou WEBP.' });
          return;
        }
        if (mission.requiresVideo && !isVid) {
          res.status(400).json({ error: 'Envie um vídeo válido nos formatos MP4, WEBM ou MOV.' });
          return;
        }
        if (!isImg && !isVid) {
          res.status(400).json({ error: 'Formato de arquivo não permitido.' });
          return;
        }
        if (isImg && primaryFile.size > env.maxImageBytes) {
          res.status(413).json({ error: `A fotografia excede o limite de ${env.MAX_IMAGE_SIZE_MB} MB.` });
          return;
        }
        if (isVid && primaryFile.size > env.maxVideoBytes) {
          res.status(413).json({ error: `O vídeo excede o limite de ${env.MAX_VIDEO_SIZE_MB} MB.` });
          return;
        }
        if (!verifyFileSignature(primaryFile.buffer, primaryFile.mimetype)) {
          res.status(400).json({
            error: 'Assinatura binária do arquivo inválida ou corrompida.',
          });
          return;
        }

        const stored = await uploadObject({
          folder: 'evidences',
          buffer: primaryFile.buffer,
          mimeType: primaryFile.mimetype,
          originalName: primaryFile.originalname,
        });

        if (existingSub?.mediaKey) {
          await deleteObject(existingSub.mediaKey);
        }
        mediaKey = stored.key;
        mediaMime = stored.mimeType;
        mediaSize = stored.size;
        mediaOriginalName = primaryFile.originalname;
      }

      let secondaryMediaKey = existingSub?.secondaryMediaKey || null;
      let secondaryMediaMime = existingSub?.secondaryMediaMime || null;
      if (secondaryFile) {
        if (
          (!ALLOWED_IMAGE_MIMES.has(secondaryFile.mimetype) &&
            !ALLOWED_VIDEO_MIMES.has(secondaryFile.mimetype)) ||
          !verifyFileSignature(secondaryFile.buffer, secondaryFile.mimetype)
        ) {
          res.status(400).json({ error: 'Segundo arquivo de mídia inválido.' });
          return;
        }
        const storedSec = await uploadObject({
          folder: 'evidences',
          buffer: secondaryFile.buffer,
          mimeType: secondaryFile.mimetype,
          originalName: secondaryFile.originalname,
        });
        if (existingSub?.secondaryMediaKey) {
          await deleteObject(existingSub.secondaryMediaKey);
        }
        secondaryMediaKey = storedSec.key;
        secondaryMediaMime = storedSec.mimeType;
      }

      // Avaliação automática no backend quando a missão não exige aprovação humana (ex: Encontre os 7 Erros)
      let finalStatus: SubmissionStatus = SubmissionStatus.PENDING;
      let autoPoints = 0;
      let autoFeedback: string | null = null;

      if (!mission.requiresApproval) {
        if (mission.submissionType === 'SEVEN_ERRORS' && mission.configJson) {
          const cfg = mission.configJson as { items?: Array<{ id: string; isError: boolean }> };
          const selectedIds: string[] = Array.isArray(structuredData?.selectedIds)
            ? structuredData!.selectedIds
            : [];
          const expectedIds = new Set(
            (cfg.items || []).filter((i) => i.isError).map((i) => i.id)
          );
          const uniqueSelected = Array.from(new Set(selectedIds));
          let hits = 0;
          let wrongPicks = 0;
          for (const id of uniqueSelected) {
            if (expectedIds.has(id)) hits++;
            else wrongPicks++;
          }
          const netHits = Math.max(0, hits - wrongPicks);
          const ratio = expectedIds.size > 0 ? netHits / expectedIds.size : 1;

          if (ratio >= 0.7) {
            finalStatus = SubmissionStatus.APPROVED;
            autoPoints = Math.max(10, Math.round(mission.points * ratio));
            autoFeedback = `Correção técnica automática: você identificou ${hits} de ${expectedIds.size} desvios reais (${wrongPicks} falso-positivo(s)).`;
          } else {
            finalStatus = SubmissionStatus.NEEDS_CORRECTION;
            autoPoints = 0;
            autoFeedback = `Você identificou apenas ${hits} de ${expectedIds.size} erros (${wrongPicks} seleção incorreta). Revise atentamente o cenário da bancada e reenvie!`;
          }
        } else {
          finalStatus = SubmissionStatus.APPROVED;
          autoPoints = mission.points;
          autoFeedback = 'Atividade registrada e validada automaticamente.';
        }
      }

      const submissionPayload = {
        classGroupId: req.authUser!.classGroupId,
        teamName: req.body.teamName ? String(req.body.teamName).trim().slice(0, 80) : null,
        teamMembersText: req.body.teamMembersText
          ? String(req.body.teamMembersText).trim().slice(0, 300)
          : null,
        status: finalStatus,
        textResponse: textResponse || null,
        structuredData: (structuredData as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        mediaKey,
        mediaMime,
        mediaSize,
        mediaOriginalName,
        secondaryMediaKey,
        secondaryMediaMime,
        awardedPoints: finalStatus === SubmissionStatus.APPROVED ? autoPoints : 0,
        feedback: autoFeedback,
        evaluatedAt: finalStatus !== SubmissionStatus.PENDING ? now : null,
        submittedAt: now,
      };

      const savedSubmission = existingSub
        ? await prisma.missionSubmission.update({
            where: { id: existingSub.id },
            data: submissionPayload,
          })
        : await prisma.missionSubmission.create({
            data: {
              missionId: mission.id,
              userId,
              ...submissionPayload,
            },
          });

      if (finalStatus === SubmissionStatus.APPROVED && autoPoints > 0) {
        await awardPointsSecurely({
          userId,
          delta: autoPoints,
          sourceType: PointSourceType.MISSION,
          sourceId: `mission:${mission.id}`,
          reason: `Conclusão da atividade "${mission.title}"`,
        });
        await evaluateAndGrantBadges(userId);
      } else if (finalStatus === SubmissionStatus.PENDING) {
        emitToStaff('submission:new', {
          submissionId: savedSubmission.id,
          missionTitle: mission.title,
          participantName: req.authUser!.fullName,
          submittedAt: now.toISOString(),
        });
      }

      res.status(201).json({
        submission: {
          id: savedSubmission.id,
          status: savedSubmission.status,
          awardedPoints: savedSubmission.awardedPoints,
          feedback: savedSubmission.feedback,
          submittedAt: savedSubmission.submittedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Obter Quiz para responder (SEM enviar correctOptionId ou explanation antes da submissão!)
participantRouter.get('/quizzes/:id', async (req, res, next) => {
  try {
    const quizId = String(req.params.id || '');
    const userId = req.authUser!.id;

    const [quiz, myAttempts] = await Promise.all([
      prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
          questions: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      prisma.quizAttempt.findMany({
        where: { quizId, userId, completedAt: { not: null } },
        orderBy: { attemptNumber: 'desc' },
      }),
    ]);

    if (!quiz || quiz.status === ActivityStatus.DRAFT) {
      res.status(404).json({ error: 'Quiz não encontrado.' });
      return;
    }

    if (quiz.status === ActivityStatus.SCHEDULED) {
      res.status(400).json({
        error: 'Este quiz está programado e será liberado automaticamente no horário agendado.',
      });
      return;
    }

    const questions = quiz.questions.map((q) => ({
      id: q.id,
      questionType: q.questionType,
      courseTrack: q.courseTrack,
      prompt: q.prompt,
      scenarioContext: q.scenarioContext,
      imageUrl: q.imageUrl,
      options: q.options,
      pointsWeight: q.pointsWeight,
    }));

    if (quiz.shuffleQuestions) {
      questions.sort(() => Math.random() - 0.5);
    }

    res.json({
      quiz: {
        id: quiz.id,
        slug: quiz.slug,
        title: quiz.title,
        description: quiz.description,
        category: quiz.category,
        eventDay: quiz.eventDay,
        eventDateLabel: quiz.eventDateLabel,
        status: quiz.status,
        durationSeconds: quiz.durationSeconds,
        maxPoints: quiz.maxPoints,
        maxAttempts: quiz.maxAttempts,
        attemptsUsed: myAttempts.length,
        canAttempt:
          quiz.status === ActivityStatus.PUBLISHED && myAttempts.length < quiz.maxAttempts,
        questions,
      },
      previousAttempts: myAttempts.map((a) => ({
        id: a.id,
        attemptNumber: a.attemptNumber,
        correctCount: a.correctCount,
        totalQuestions: a.totalQuestions,
        scorePercent: a.scorePercent,
        awardedPoints: a.awardedPoints,
        completedAt: a.completedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

const submitQuizSchema = z.object({
  answers: z.record(z.string(), z.string()),
  startedAt: z.string().optional(),
});

participantRouter.post('/quizzes/:id/submit', async (req, res, next) => {
  try {
    const quizId = String(req.params.id || '');
    const userId = req.authUser!.id;
    const { answers, startedAt } = submitQuizSchema.parse(req.body);
    const now = new Date();

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!quiz || quiz.status !== ActivityStatus.PUBLISHED) {
      res.status(400).json({ error: 'Este quiz não está disponível para envio no momento.' });
      return;
    }

    if (quiz.opensAt && now < quiz.opensAt) {
      res.status(400).json({ error: 'Este quiz ainda não abriu.' });
      return;
    }
    if (quiz.closesAt && now > quiz.closesAt) {
      res.status(400).json({ error: 'O prazo de resposta deste quiz já encerrou.' });
      return;
    }

    const previousAttempts = await prisma.quizAttempt.findMany({
      where: { quizId, userId },
      orderBy: { attemptNumber: 'asc' },
    });

    if (previousAttempts.length >= quiz.maxAttempts) {
      res.status(409).json({
        error: `Você já atingiu o limite máximo de ${quiz.maxAttempts} tentativa(s) neste quiz.`,
      });
      return;
    }

    let totalWeight = 0;
    let earnedWeight = 0;
    let correctCount = 0;

    const feedbackItems = quiz.questions.map((q) => {
      totalWeight += q.pointsWeight;
      const chosenOptionId = answers[q.id] || '';
      const isCorrect = chosenOptionId === q.correctOptionId;
      if (isCorrect) {
        earnedWeight += q.pointsWeight;
        correctCount += 1;
      }
      return {
        questionId: q.id,
        prompt: q.prompt,
        chosenOptionId,
        correctOptionId: q.correctOptionId,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const scorePercent =
      totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 1000) / 10 : 0;
    const rawQuizPoints =
      totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * quiz.maxPoints) : 0;

    // Caso o quiz permita 2 tentativas, só concede a diferença positiva acima da melhor tentativa anterior (impede pontuação duplicada!)
    const bestPreviousPoints = previousAttempts.reduce(
      (max, cur) => Math.max(max, cur.awardedPoints),
      0
    );
    const netDeltaToAward = Math.max(0, rawQuizPoints - bestPreviousPoints);
    const attemptNumber = previousAttempts.length + 1;

    const createdAttempt = await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId,
        attemptNumber,
        answersJson: feedbackItems,
        correctCount,
        totalQuestions: quiz.questions.length,
        scorePercent,
        awardedPoints: rawQuizPoints,
        startedAt: startedAt ? new Date(startedAt) : now,
        completedAt: now,
      },
    });

    if (netDeltaToAward > 0) {
      await awardPointsSecurely({
        userId,
        delta: netDeltaToAward,
        sourceType: PointSourceType.QUIZ,
        sourceId: `quiz:${quiz.id}:attempt:${attemptNumber}`,
        reason:
          attemptNumber === 1
            ? `Quiz "${quiz.title}" (${scorePercent}% de acerto)`
            : `Melhoria de nota no Quiz "${quiz.title}" (+${netDeltaToAward} pts)`,
      });
    } else {
      await evaluateAndGrantBadges(userId);
    }

    res.status(201).json({
      attempt: {
        id: createdAttempt.id,
        attemptNumber,
        correctCount,
        totalQuestions: quiz.questions.length,
        scorePercent,
        quizScorePoints: rawQuizPoints,
        pointsAddedToTotal: netDeltaToAward,
      },
      review: feedbackItems,
    });
  } catch (err) {
    next(err);
  }
});

participantRouter.post('/notifications/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.authUser!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const pushSubSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

participantRouter.post('/push-subscribe', async (req, res, next) => {
  try {
    const parsed = pushSubSchema.parse(req.body);
    await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.endpoint },
      update: {
        userId: req.authUser!.id,
        p256dh: parsed.keys.p256dh,
        auth: parsed.keys.auth,
        userAgent: req.get('user-agent') || null,
      },
      create: {
        userId: req.authUser!.id,
        endpoint: parsed.endpoint,
        p256dh: parsed.keys.p256dh,
        auth: parsed.keys.auth,
        userAgent: req.get('user-agent') || null,
      },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

