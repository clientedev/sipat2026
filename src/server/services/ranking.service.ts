import { ActivityStatus, Role, SubmissionStatus } from '@prisma/client';
import { calculateLevelInfo, getInitials, maskParticipantName } from '../../shared/constants.js';
import { prisma } from '../lib/prisma.js';

export async function getSystemConfigSafe() {
  let config = await prisma.systemConfig.findUnique({ where: { id: 'default' } });
  if (!config) {
    config = await prisma.systemConfig.create({ data: { id: 'default' } });
  }
  return config;
}

export async function buildPublicRankingData(options?: { unmaskedForStaff?: boolean }) {
  const config = await getSystemConfigSafe();
  const unmasked = Boolean(options?.unmaskedForStaff);

  const [participants, classes, recentApprovedSubmissions] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: Role.PARTICIPANT,
        isActive: true,
        anonymizedAt: null,
      },
      include: {
        classGroup: {
          select: { id: true, code: true, name: true, courseArea: true, shift: true },
        },
        badges: {
          include: {
            badge: { select: { slug: true, name: true, iconName: true, accentColor: true } },
          },
          orderBy: { awardedAt: 'asc' },
        },
        _count: {
          select: {
            submissions: { where: { status: SubmissionStatus.APPROVED } },
            quizAttempts: { where: { completedAt: { not: null } } },
          },
        },
      },
      orderBy: [{ totalPoints: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.classGroup.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.missionSubmission.findMany({
      where: { status: SubmissionStatus.APPROVED },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            imageConsent: true,
            avatarKey: true,
            classGroup: { select: { code: true, name: true } },
          },
        },
        mission: {
          select: { id: true, title: true, category: true, eventDay: true },
        },
      },
      orderBy: { evaluatedAt: 'desc' },
      take: 8,
    }),
  ]);

  const individualRanking = participants.map((p, index) => {
    const levelInfo = calculateLevelInfo(p.totalPoints);
    const displayName = unmasked
      ? p.fullName
      : maskParticipantName(p.fullName, config.namePrivacyMode);

    const canShowAvatar =
      Boolean(p.avatarKey) && (unmasked || (config.showAvatarsInPublic && p.imageConsent));

    return {
      position: index + 1,
      userId: p.id,
      displayName,
      initials: getInitials(p.fullName),
      avatarUrl: canShowAvatar ? `/api/media/avatar/${p.id}` : null,
      totalPoints: p.totalPoints,
      level: levelInfo.level,
      levelTitle: levelInfo.title,
      completedActivities: p._count.submissions + p._count.quizAttempts,
      approvedMissions: p._count.submissions,
      completedQuizzes: p._count.quizAttempts,
      badgesCount: p.badges.length,
      badges: p.badges.map((ub) => ub.badge),
      classGroup: p.classGroup
        ? {
            id: p.classGroup.id,
            code: p.classGroup.code,
            name: p.classGroup.name,
            courseArea: p.classGroup.courseArea,
            shift: p.classGroup.shift,
          }
        : null,
    };
  });

  // Ranking Agregado por Turma
  const classStatsMap = new Map<
    string,
    {
      id: string;
      code: string;
      name: string;
      courseArea: string;
      shift: string;
      participantsCount: number;
      totalPoints: number;
      completedActivities: number;
    }
  >();

  for (const cls of classes) {
    classStatsMap.set(cls.id, {
      id: cls.id,
      code: cls.code,
      name: cls.name,
      courseArea: cls.courseArea,
      shift: cls.shift,
      participantsCount: 0,
      totalPoints: 0,
      completedActivities: 0,
    });
  }

  for (const p of individualRanking) {
    if (p.classGroup && classStatsMap.has(p.classGroup.id)) {
      const entry = classStatsMap.get(p.classGroup.id)!;
      entry.participantsCount += 1;
      entry.totalPoints += p.totalPoints;
      entry.completedActivities += p.completedActivities;
    }
  }

  const classRanking = Array.from(classStatsMap.values())
    .map((c) => ({
      ...c,
      averagePoints:
        c.participantsCount > 0 ? Math.round((c.totalPoints / c.participantsCount) * 10) / 10 : 0,
    }))
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return b.completedActivities - a.completedActivities;
    })
    .map((c, idx) => ({
      position: idx + 1,
      ...c,
    }));

  const highlights = recentApprovedSubmissions.map((s) => ({
    id: s.id,
    participantName: unmasked
      ? s.user.fullName
      : maskParticipantName(s.user.fullName, config.namePrivacyMode),
    initials: getInitials(s.user.fullName),
    classCode: s.user.classGroup?.code || 'GERAL',
    className: s.user.classGroup?.name || 'Geral',
    missionTitle: s.mission.title,
    category: s.mission.category,
    eventDay: s.mission.eventDay,
    awardedPoints: s.awardedPoints,
    evaluatedAt: s.evaluatedAt || s.submittedAt,
  }));

  const totalCompletedActivities = individualRanking.reduce(
    (acc, item) => acc + item.completedActivities,
    0
  );
  const totalPointsAccumulated = individualRanking.reduce(
    (acc, item) => acc + item.totalPoints,
    0
  );

  return {
    schoolName: config.schoolName,
    eventTitle: config.eventTitle,
    eventTheme: config.eventTheme,
    eventSlogan: config.eventSlogan,
    officialLogoUrl: config.officialLogoUrl,
    namePrivacyMode: config.namePrivacyMode,
    tvRotationSeconds: config.tvRotationSeconds,
    updatedAt: new Date().toISOString(),
    summary: {
      totalParticipants: individualRanking.length,
      activeClasses: classRanking.filter((c) => c.participantsCount > 0).length,
      totalClasses: classRanking.length,
      totalCompletedActivities,
      totalPointsAccumulated,
    },
    podium: individualRanking.slice(0, 3),
    individualRanking: individualRanking.slice(0, 100),
    classRanking,
    highlights,
  };
}

export async function buildPublicOverviewData() {
  const [
    config,
    rankingData,
    totalSubmissions,
    approvedSubmissionsCount,
    totalQuizAttempts,
    publishedMissionsCount,
    publishedQuizzesCount,
    badgesAwardedCount,
    missionsByDay,
    submissionsTimeline,
    quizTimeline,
  ] = await Promise.all([
    getSystemConfigSafe(),
    buildPublicRankingData(),
    prisma.missionSubmission.count(),
    prisma.missionSubmission.count({ where: { status: SubmissionStatus.APPROVED } }),
    prisma.quizAttempt.count({ where: { completedAt: { not: null } } }),
    prisma.mission.count({ where: { status: { in: [ActivityStatus.PUBLISHED, ActivityStatus.CLOSED] } } }),
    prisma.quiz.count({ where: { status: { in: [ActivityStatus.PUBLISHED, ActivityStatus.CLOSED] } } }),
    prisma.userBadge.count(),
    prisma.mission.findMany({
      where: { status: { not: ActivityStatus.DRAFT } },
      select: {
        id: true,
        title: true,
        category: true,
        eventDay: true,
        eventDateLabel: true,
        status: true,
        points: true,
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: [{ eventDay: 'asc' }, { sortOrder: 'asc' }],
    }),
    prisma.missionSubmission.findMany({
      select: { submittedAt: true, status: true, awardedPoints: true },
      orderBy: { submittedAt: 'asc' },
    }),
    prisma.quizAttempt.findMany({
      where: { completedAt: { not: null } },
      select: { completedAt: true, awardedPoints: true },
      orderBy: { completedAt: 'asc' },
    }),
  ]);

  // Agrupamento diário de engajamento (sem dados pessoais - LGPD safe)
  const dailyMap = new Map<
    string,
    { date: string; evidencesSent: number; quizzesAnswered: number; pointsGenerated: number }
  >();

  // Garante também os 4 dias oficiais da SIPAT 2026 no gráfico evolutivo
  for (const officialDate of ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19']) {
    dailyMap.set(officialDate, {
      date: officialDate,
      evidencesSent: 0,
      quizzesAnswered: 0,
      pointsGenerated: 0,
    });
  }

  for (const s of submissionsTimeline) {
    const key = s.submittedAt.toISOString().slice(0, 10);
    const cur = dailyMap.get(key) || {
      date: key,
      evidencesSent: 0,
      quizzesAnswered: 0,
      pointsGenerated: 0,
    };
    cur.evidencesSent += 1;
    cur.pointsGenerated += s.awardedPoints;
    dailyMap.set(key, cur);
  }

  for (const q of quizTimeline) {
    if (!q.completedAt) continue;
    const key = q.completedAt.toISOString().slice(0, 10);
    const cur = dailyMap.get(key) || {
      date: key,
      evidencesSent: 0,
      quizzesAnswered: 0,
      pointsGenerated: 0,
    };
    cur.quizzesAnswered += 1;
    cur.pointsGenerated += q.awardedPoints;
    dailyMap.set(key, cur);
  }

  const activeParticipantsCount = rankingData.individualRanking.filter(
    (p) => p.completedActivities > 0
  ).length;
  const participationRate =
    rankingData.summary.totalParticipants > 0
      ? Math.round((activeParticipantsCount / rankingData.summary.totalParticipants) * 100)
      : 0;

  return {
    schoolName: config.schoolName,
    eventTitle: config.eventTitle,
    eventTheme: config.eventTheme,
    eventSlogan: config.eventSlogan,
    officialLogoUrl: config.officialLogoUrl,
    updatedAt: new Date().toISOString(),
    indicators: {
      totalRegistered: rankingData.summary.totalParticipants,
      activeParticipants: activeParticipantsCount,
      participationRatePercent: participationRate,
      evidencesSent: totalSubmissions,
      missionsCompleted: approvedSubmissionsCount,
      quizzesCompleted: totalQuizAttempts,
      publishedActivities: publishedMissionsCount + publishedQuizzesCount,
      badgesUnlocked: badgesAwardedCount,
      totalPointsAccumulated: rankingData.summary.totalPointsAccumulated,
    },
    evolution: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    topClasses: rankingData.classRanking.slice(0, 6),
    missionsProgress: missionsByDay.map((m) => ({
      id: m.id,
      title: m.title,
      category: m.category,
      eventDay: m.eventDay,
      eventDateLabel: m.eventDateLabel,
      status: m.status,
      points: m.points,
      submissionsCount: m._count.submissions,
    })),
  };
}

