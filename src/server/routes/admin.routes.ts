import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import {
  ActivityStatus,
  MissionDifficulty,
  NamePrivacyMode,
  NotificationType,
  ParticipationMode,
  PointSourceType,
  Prisma,
  QuestionType,
  Role,
  SubmissionStatus,
  SubmissionType,
} from '@prisma/client';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import {
  ALLOWED_BRAND_MIMES,
  deleteObject,
  uploadObject,
  verifyFileSignature,
} from '../lib/storage.js';
import {
  broadcastActivityClosed,
  broadcastActivityReleased,
  broadcastRankingRefresh,
} from '../lib/socket.js';
import { requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { uploadAvatar, uploadSpreadsheet } from '../middleware/upload.middleware.js';
import { recordAuditLog } from '../services/audit.service.js';
import {
  adjustUserPointsManually,
  awardPointsSecurely,
  evaluateAndGrantBadges,
} from '../services/gamification.service.js';
import { createNotification } from '../services/notification.service.js';
import {
  buildPublicOverviewData,
  buildPublicRankingData,
  getSystemConfigSafe,
} from '../services/ranking.service.js';
import {
  generateGeneralExcelReport,
  generateGeneralPdfReport,
  generateQrPosterPdf,
  generateRiskHuntExcelReport,
  generateRiskHuntPdfReport,
} from '../services/report.service.js';
import { runSchedulerTick } from '../services/scheduler.service.js';

export const adminRouter = Router();

adminRouter.use(requireAuth);

const STAFF_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.EVALUATOR];
const ADMIN_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN];

function resolveAppBaseUrl(req: any): string {
  if (env.PUBLIC_APP_URL && !env.PUBLIC_APP_URL.includes('localhost')) {
    return env.PUBLIC_APP_URL.replace(/\/+$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// ============================================================================
// 1. DASHBOARD GERAL (Acessível para SUPER_ADMIN, ADMIN e EVALUATOR)
// ============================================================================
adminRouter.get('/dashboard', requireRoles(...STAFF_ROLES), async (req, res, next) => {
  try {
    const [
      overview,
      ranking,
      pendingSubmissionsCount,
      needsCorrectionCount,
      scheduledMissionsCount,
      scheduledQuizzesCount,
      recentSubmissions,
    ] = await Promise.all([
      buildPublicOverviewData(),
      buildPublicRankingData({ unmaskedForStaff: true }),
      prisma.missionSubmission.count({ where: { status: SubmissionStatus.PENDING } }),
      prisma.missionSubmission.count({ where: { status: SubmissionStatus.NEEDS_CORRECTION } }),
      prisma.mission.count({ where: { status: ActivityStatus.SCHEDULED } }),
      prisma.quiz.count({ where: { status: ActivityStatus.SCHEDULED } }),
      prisma.missionSubmission.findMany({
        take: 8,
        orderBy: { submittedAt: 'desc' },
        include: {
          user: { select: { fullName: true, classGroup: { select: { code: true } } } },
          mission: { select: { title: true, points: true, submissionType: true } },
        },
      }),
    ]);

    const baseUrl = resolveAppBaseUrl(req);
    const activeQr = await prisma.qrRegistrationToken.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      indicators: {
        ...overview.indicators,
        pendingSubmissions: pendingSubmissionsCount,
        needsCorrectionSubmissions: needsCorrectionCount,
        scheduledActivities: scheduledMissionsCount + scheduledQuizzesCount,
      },
      links: {
        publicHomeUrl: `${baseUrl}/`,
        publicRankingUrl: `${baseUrl}/ranking`,
        publicOverviewUrl: `${baseUrl}/acompanhamento`,
        registrationUrl: activeQr
          ? `${baseUrl}/inscricao?code=${encodeURIComponent(activeQr.code)}`
          : `${baseUrl}/inscricao`,
      },
      evolution: overview.evolution,
      classRanking: ranking.classRanking,
      topParticipants: ranking.individualRanking.slice(0, 10),
      recentSubmissions: recentSubmissions.map((s) => ({
        id: s.id,
        status: s.status,
        participantName: s.user.fullName,
        classCode: s.user.classGroup?.code || 'S/T',
        missionTitle: s.mission.title,
        submissionType: s.mission.submissionType,
        maxPoints: s.mission.points,
        awardedPoints: s.awardedPoints,
        submittedAt: s.submittedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 2. CENTRAL DE ANÁLISE E APROVAÇÃO DE EVIDÊNCIAS (EVALUATOR, ADMIN, SUPER_ADMIN)
// ============================================================================
adminRouter.get('/submissions', requireRoles(...STAFF_ROLES), async (req, res, next) => {
  try {
    const statusFilter = req.query.status ? String(req.query.status) : undefined;
    const missionId = req.query.missionId ? String(req.query.missionId) : undefined;
    const classGroupId = req.query.classGroupId ? String(req.query.classGroupId) : undefined;
    const search = req.query.search ? String(req.query.search).trim() : undefined;

    const where: Prisma.MissionSubmissionWhereInput = {};
    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter as SubmissionStatus;
    }
    if (missionId) where.missionId = missionId;
    if (classGroupId) where.classGroupId = classGroupId;
    if (search) {
      where.OR = [
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { mission: { title: { contains: search, mode: 'insensitive' } } },
        { textResponse: { contains: search, mode: 'insensitive' } },
      ];
    }

    const submissions = await prisma.missionSubmission.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            registrationCode: true,
            isMinor: true,
            imageConsent: true,
            avatarKey: true,
            classGroup: { select: { id: true, code: true, name: true } },
          },
        },
        mission: {
          select: {
            id: true,
            slug: true,
            title: true,
            category: true,
            eventDay: true,
            points: true,
            submissionType: true,
            evaluationCriteria: true,
            configJson: true,
          },
        },
        evaluatedBy: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: [{ status: 'asc' }, { submittedAt: 'desc' }],
      take: 200,
    });

    res.json({
      submissions: submissions.map((s) => ({
        id: s.id,
        status: s.status,
        textResponse: s.textResponse,
        structuredData: s.structuredData,
        teamName: s.teamName,
        teamMembersText: s.teamMembersText,
        mediaUrl: s.mediaKey ? `/api/media/evidence/${s.id}` : null,
        mediaMime: s.mediaMime,
        secondaryMediaUrl: s.secondaryMediaKey
          ? `/api/media/evidence/${s.id}?slot=secondary`
          : null,
        secondaryMediaMime: s.secondaryMediaMime,
        isPublicHighlight: s.isPublicHighlight,
        awardedPoints: s.awardedPoints,
        feedback: s.feedback,
        submittedAt: s.submittedAt,
        evaluatedAt: s.evaluatedAt,
        evaluatedBy: s.evaluatedBy,
        participant: {
          ...s.user,
          avatarUrl: s.user.avatarKey ? `/api/media/avatar/${s.user.id}` : null,
        },
        mission: s.mission,
      })),
    });
  } catch (err) {
    next(err);
  }
});

const reviewSubmissionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'NEEDS_CORRECTION']),
  awardedPoints: z.coerce.number().int().min(0).optional(),
  feedback: z.string().trim().max(1000).optional(),
  isPublicHighlight: z.boolean().optional(),
});

adminRouter.post('/submissions/:id/review', requireRoles(...STAFF_ROLES), async (req, res, next) => {
  try {
    const submissionId = String(req.params.id || '');
    const parsed = reviewSubmissionSchema.parse(req.body);

    const existing = await prisma.missionSubmission.findUnique({
      where: { id: submissionId },
      include: {
        mission: true,
        user: { select: { id: true, fullName: true, imageConsent: true } },
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Evidência não encontrada.' });
      return;
    }

    if (
      (parsed.status === 'REJECTED' || parsed.status === 'NEEDS_CORRECTION') &&
      (!parsed.feedback || parsed.feedback.length < 4)
    ) {
      res.status(400).json({
        error: 'Informe uma justificativa/orientação para o participante ao reprovar ou solicitar correção.',
      });
      return;
    }

    const maxAllowed = existing.mission.points;
    let targetPoints = 0;
    if (parsed.status === 'APPROVED') {
      targetPoints =
        parsed.awardedPoints !== undefined
          ? Math.min(maxAllowed, Math.max(0, parsed.awardedPoints))
          : maxAllowed;
    }

    const previousPoints = existing.awardedPoints || 0;
    const pointsDelta = targetPoints - previousPoints;

    const canHighlight = Boolean(
      parsed.status === 'APPROVED' && parsed.isPublicHighlight && existing.user.imageConsent
    );

    const updated = await prisma.missionSubmission.update({
      where: { id: existing.id },
      data: {
        status: parsed.status as SubmissionStatus,
        awardedPoints: targetPoints,
        feedback: parsed.feedback || (parsed.status === 'APPROVED' ? 'Evidência aprovada pela comissão técnica!' : null),
        isPublicHighlight: canHighlight,
        evaluatedById: req.authUser!.id,
        evaluatedAt: new Date(),
      },
    });

    if (pointsDelta !== 0) {
      await awardPointsSecurely({
        userId: existing.userId,
        delta: pointsDelta,
        sourceType: PointSourceType.MISSION,
        sourceId: `mission:${existing.missionId}:review:${Date.now()}`,
        reason:
          pointsDelta > 0
            ? `Aprovação da missão "${existing.mission.title}" (+${pointsDelta} pts)`
            : `Reavaliação da missão "${existing.mission.title}" (${pointsDelta} pts)`,
        actorId: req.authUser!.id,
        allowUpdateDelta: true,
      });
    } else if (parsed.status === 'APPROVED') {
      await evaluateAndGrantBadges(existing.userId);
      broadcastRankingRefresh('submission_approved');
    }

    const statusLabelMap: Record<string, string> = {
      APPROVED: 'APROVADA',
      REJECTED: 'REPROVADA',
      NEEDS_CORRECTION: 'SOLICITADA CORREÇÃO',
    };

    await createNotification({
      userId: existing.userId,
      type: NotificationType.SUBMISSION_REVIEWED,
      title: `Evidência ${statusLabelMap[parsed.status]}: ${existing.mission.title}`,
      message:
        parsed.status === 'APPROVED'
          ? `Você recebeu ${targetPoints} pontos! ${updated.feedback || ''}`
          : `Orientação do avaliador: ${updated.feedback || 'Verifique sua atividade no painel.'}`,
      linkUrl: '/app',
    });

    await recordAuditLog({
      actorId: req.authUser!.id,
      actorRole: req.authUser!.role,
      targetUserId: existing.userId,
      action: `SUBMISSION_${parsed.status}`,
      entityType: 'MissionSubmission',
      entityId: existing.id,
      reason: updated.feedback,
      metadata: {
        missionTitle: existing.mission.title,
        previousPoints,
        awardedPoints: targetPoints,
      },
      ipAddress: req.ip,
    });

    res.json({ submission: updated });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 3. CONTROLE DE QR CODE E PERÍODO DE INSCRIÇÕES (ADMIN, SUPER_ADMIN)
// ============================================================================
adminRouter.get('/qr', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const config = await getSystemConfigSafe();
    let currentQr = await prisma.qrRegistrationToken.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!currentQr) {
      currentQr = await prisma.qrRegistrationToken.create({
        data: {
          code: `SIPAT2026-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
          label: 'QR Code Oficial de Inscrição SIPAT 2026',
          isActive: true,
          createdById: req.authUser!.id,
        },
      });
    }

    const baseUrl = resolveAppBaseUrl(req);
    const registrationUrl = `${baseUrl}/inscricao?code=${encodeURIComponent(currentQr.code)}`;
    const qrDataUrl = await QRCode.toDataURL(registrationUrl, {
      width: 480,
      margin: 2,
      color: { dark: '#002B5C', light: '#FFFFFF' },
    });

    const history = await prisma.qrRegistrationToken.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({
      registrationEnabled: config.registrationEnabled,
      registrationStart: config.registrationStart,
      registrationEnd: config.registrationEnd,
      currentQr,
      registrationUrl,
      qrDataUrl,
      history,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/qr/regenerate', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const label = String(req.body.label || 'QR Code Oficial SIPAT 2026 – SENAI Morvan Figueiredo').trim();
    const newCode = `SIPAT26-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    await prisma.qrRegistrationToken.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    const created = await prisma.qrRegistrationToken.create({
      data: {
        code: newCode,
        label,
        isActive: true,
        validFrom: req.body.validFrom ? new Date(req.body.validFrom) : null,
        validUntil: req.body.validUntil ? new Date(req.body.validUntil) : null,
        createdById: req.authUser!.id,
      },
    });

    await recordAuditLog({
      actorId: req.authUser!.id,
      actorRole: req.authUser!.role,
      action: 'QR_CODE_REGENERATED',
      entityType: 'QrRegistrationToken',
      entityId: created.id,
      metadata: { code: created.code, label: created.label },
      ipAddress: req.ip,
    });

    res.status(201).json({ qr: created });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/qr', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const { isActive, registrationEnabled, validFrom, validUntil, label } = req.body;

    if (registrationEnabled !== undefined) {
      await prisma.systemConfig.update({
        where: { id: 'default' },
        data: {
          registrationEnabled: Boolean(registrationEnabled),
          registrationStart: validFrom !== undefined ? (validFrom ? new Date(validFrom) : null) : undefined,
          registrationEnd: validUntil !== undefined ? (validUntil ? new Date(validUntil) : null) : undefined,
        },
      });
    }

    const latestQr = await prisma.qrRegistrationToken.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (latestQr) {
      await prisma.qrRegistrationToken.update({
        where: { id: latestQr.id },
        data: {
          isActive: isActive !== undefined ? Boolean(isActive) : latestQr.isActive,
          label: label ? String(label).trim() : latestQr.label,
          validFrom: validFrom !== undefined ? (validFrom ? new Date(validFrom) : null) : latestQr.validFrom,
          validUntil: validUntil !== undefined ? (validUntil ? new Date(validUntil) : null) : latestQr.validUntil,
        },
      });
    }

    await recordAuditLog({
      actorId: req.authUser!.id,
      actorRole: req.authUser!.role,
      action: 'QR_SETTINGS_UPDATED',
      entityType: 'QrRegistrationToken',
      entityId: latestQr?.id || 'default',
      metadata: { isActive, registrationEnabled, validFrom, validUntil },
      ipAddress: req.ip,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/qr/download/png', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const latestQr = await prisma.qrRegistrationToken.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    const code = latestQr?.code || 'SIPAT2026';
    const url = `${resolveAppBaseUrl(req)}/inscricao?code=${encodeURIComponent(code)}`;
    const pngBuffer = await QRCode.toBuffer(url, {
      type: 'png',
      width: 1024,
      margin: 2,
      color: { dark: '#002B5C', light: '#FFFFFF' },
    });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="qrcode-sipat2026-${code}.png"`);
    res.send(pngBuffer);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/qr/download/pdf', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const latestQr = await prisma.qrRegistrationToken.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    const code = latestQr?.code || 'SIPAT2026';
    const label = latestQr?.label || 'Campanha Oficial SIPAT 2026';
    const registrationUrl = `${resolveAppBaseUrl(req)}/inscricao?code=${encodeURIComponent(code)}`;
    const pdfBuffer = await generateQrPosterPdf({ registrationUrl, code, label });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cartaz-qrcode-sipat2026-${code}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 4. GERENCIAMENTO DE TURMAS (ADMIN, SUPER_ADMIN + leitura para EVALUATOR)
// ============================================================================
adminRouter.get('/classes', requireRoles(...STAFF_ROLES), async (_req, res, next) => {
  try {
    const classes = await prisma.classGroup.findMany({
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ classes });
  } catch (err) {
    next(err);
  }
});

const classSchema = z.object({
  code: z.string().trim().min(2).max(24),
  name: z.string().trim().min(3).max(120),
  courseArea: z.string().trim().min(2).max(80),
  shift: z.string().trim().min(2).max(30),
  isActive: z.boolean().optional(),
});

adminRouter.post('/classes', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const parsed = classSchema.parse(req.body);
    const created = await prisma.classGroup.create({
      data: {
        code: parsed.code.toUpperCase().replace(/\s+/g, '-'),
        name: parsed.name,
        courseArea: parsed.courseArea,
        shift: parsed.shift,
        isActive: parsed.isActive ?? true,
      },
    });
    broadcastRankingRefresh('class_created');
    res.status(201).json({ classGroup: created });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/classes/:id', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const id = String(req.params.id || '');
    const parsed = classSchema.partial().parse(req.body);
    const updated = await prisma.classGroup.update({
      where: { id },
      data: {
        ...(parsed.code ? { code: parsed.code.toUpperCase().replace(/\s+/g, '-') } : {}),
        ...(parsed.name ? { name: parsed.name } : {}),
        ...(parsed.courseArea ? { courseArea: parsed.courseArea } : {}),
        ...(parsed.shift ? { shift: parsed.shift } : {}),
        ...(parsed.isActive !== undefined ? { isActive: parsed.isActive } : {}),
      },
    });
    broadcastRankingRefresh('class_updated');
    res.json({ classGroup: updated });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 5. GERENCIAMENTO DE PARTICIPANTES, CADASTRO MANUAL E IMPORTAÇÃO POR PLANILHA
// ============================================================================
adminRouter.get('/participants', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const search = req.query.search ? String(req.query.search).trim() : '';
    const classGroupId = req.query.classGroupId ? String(req.query.classGroupId) : '';

    const where: Prisma.UserWhereInput = {
      role: Role.PARTICIPANT,
      anonymizedAt: null,
    };

    if (classGroupId) where.classGroupId = classGroupId;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { registrationCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const participants = await prisma.user.findMany({
      where,
      include: {
        classGroup: { select: { id: true, code: true, name: true } },
        badges: { include: { badge: { select: { name: true, slug: true } } } },
        _count: {
          select: {
            submissions: true,
            quizAttempts: true,
          },
        },
      },
      orderBy: [{ totalPoints: 'desc' }, { fullName: 'asc' }],
      take: 300,
    });

    res.json({
      participants: participants.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        email: p.email,
        registrationCode: p.registrationCode,
        isActive: p.isActive,
        isMinor: p.isMinor,
        imageConsent: p.imageConsent,
        totalPoints: p.totalPoints,
        level: p.level,
        classGroup: p.classGroup,
        badges: p.badges.map((b) => b.badge),
        submissionsCount: p._count.submissions,
        quizAttemptsCount: p._count.quizAttempts,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

const manualParticipantSchema = z.object({
  fullName: z.string().trim().min(4).max(120),
  email: z.string().trim().toLowerCase().email(),
  registrationCode: z.string().trim().min(2).max(40),
  classGroupId: z.string().uuid(),
  password: z.string().min(6).max(100),
  isMinor: z.boolean().optional(),
  imageConsent: z.boolean().optional(),
});

adminRouter.post('/participants', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const parsed = manualParticipantSchema.parse(req.body);
    const normalizedCode = parsed.registrationCode.toUpperCase().replace(/\s+/g, '');

    const dup = await prisma.user.findFirst({
      where: { OR: [{ email: parsed.email }, { registrationCode: normalizedCode }] },
    });
    if (dup) {
      res.status(409).json({ error: 'Já existe um participante com este e-mail ou matrícula.' });
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const created = await prisma.user.create({
      data: {
        fullName: parsed.fullName,
        email: parsed.email,
        registrationCode: normalizedCode,
        passwordHash,
        role: Role.PARTICIPANT,
        classGroupId: parsed.classGroupId,
        isMinor: Boolean(parsed.isMinor),
        lgpdConsentAt: new Date(),
        imageConsent: Boolean(parsed.imageConsent),
        imageConsentAt: parsed.imageConsent ? new Date() : null,
      },
      include: { classGroup: true },
    });

    await recordAuditLog({
      actorId: req.authUser!.id,
      actorRole: req.authUser!.role,
      targetUserId: created.id,
      action: 'PARTICIPANT_CREATED_MANUAL',
      entityType: 'User',
      entityId: created.id,
      ipAddress: req.ip,
    });

    broadcastRankingRefresh('participant_manual');
    res.status(201).json({ participant: created });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/participants/:id', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const id = String(req.params.id || '');
    const { fullName, email, registrationCode, classGroupId, isActive, newPassword, imageConsent } =
      req.body;

    const updateData: Prisma.UserUpdateInput = {};
    if (fullName) updateData.fullName = String(fullName).trim();
    if (email) updateData.email = String(email).trim().toLowerCase();
    if (registrationCode) {
      updateData.registrationCode = String(registrationCode).trim().toUpperCase().replace(/\s+/g, '');
    }
    if (classGroupId) {
      updateData.classGroup = { connect: { id: String(classGroupId) } };
    }
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (imageConsent !== undefined) {
      updateData.imageConsent = Boolean(imageConsent);
      updateData.imageConsentAt = imageConsent ? new Date() : null;
    }
    if (newPassword && String(newPassword).length >= 6) {
      updateData.passwordHash = await bcrypt.hash(String(newPassword), 12);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { classGroup: true },
    });

    await recordAuditLog({
      actorId: req.authUser!.id,
      actorRole: req.authUser!.role,
      targetUserId: id,
      action: 'PARTICIPANT_UPDATED_BY_ADMIN',
      entityType: 'User',
      entityId: id,
      metadata: { resetPassword: Boolean(newPassword), isActive },
      ipAddress: req.ip,
    });

    broadcastRankingRefresh('participant_updated');
    res.json({ participant: updated });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/participants/:id/points', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const targetUserId = String(req.params.id || '');
    const delta = Number(req.body.delta);
    const reason = String(req.body.reason || '');

    const result = await adjustUserPointsManually({
      targetUserId,
      delta,
      reason,
      actorId: req.authUser!.id,
      actorRole: req.authUser!.role,
      ipAddress: req.ip,
    });

    res.json({
      totalPoints: result.user.totalPoints,
      level: result.user.level,
      ledgerEntry: result.ledgerEntry,
    });
  } catch (err) {
    next(err);
  }
});

// Download da planilha modelo (.xlsx) para importação em lote
adminRouter.get('/participants/template.xlsx', requireRoles(...ADMIN_ROLES), async (_req, res, next) => {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Importacao Participantes');
    ws.columns = [
      { header: 'nome_completo', key: 'nome_completo', width: 34 },
      { header: 'email', key: 'email', width: 32 },
      { header: 'matricula', key: 'matricula', width: 18 },
      { header: 'codigo_turma', key: 'codigo_turma', width: 18 },
      { header: 'senha_inicial', key: 'senha_inicial', width: 20 },
      { header: 'menor_idade', key: 'menor_idade', width: 14 },
    ];
    ws.addRow({
      nome_completo: 'Lucas Oliveira Santos',
      email: 'lucas.santos@aluno.senai.br',
      matricula: 'RA20261001',
      codigo_turma: 'TEC-INF-1M',
      senha_inicial: 'Senai@2026',
      menor_idade: 'SIM',
    });
    ws.addRow({
      nome_completo: 'Mariana Costa Lima',
      email: 'mariana.lima@aluno.senai.br',
      matricula: 'RA20261002',
      codigo_turma: 'TEC-LOG-1M',
      senha_inicial: 'Senai@2026',
      menor_idade: 'NAO',
    });

    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="modelo-importacao-sipat2026.xlsx"'
    );
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

// Importação real de participantes por planilha (.xlsx ou .csv)
adminRouter.post(
  '/participants/import',
  requireRoles(...ADMIN_ROLES),
  uploadSpreadsheet.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Envie um arquivo .xlsx ou .csv válido.' });
        return;
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        res.status(400).json({ error: 'A planilha enviada está vazia.' });
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName], {
        defval: '',
      });

      if (rows.length === 0) {
        res.status(400).json({ error: 'Nenhuma linha encontrada na planilha.' });
        return;
      }

      const classes = await prisma.classGroup.findMany();
      const classByCode = new Map(classes.map((c) => [c.code.toUpperCase(), c]));
      const fallbackClass = classes[0] || null;

      let imported = 0;
      let skippedDuplicates = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const raw = rows[i];
        const rowNum = i + 2;

        const fullName = String(
          raw.nome_completo || raw.nome || raw.fullName || raw.Nome || ''
        ).trim();
        const email = String(raw.email || raw.Email || raw['e-mail'] || '')
          .trim()
          .toLowerCase();
        const regCode = String(
          raw.matricula || raw.ra || raw.registrationCode || raw.Matricula || ''
        )
          .trim()
          .toUpperCase()
          .replace(/\s+/g, '');
        const classCode = String(
          raw.codigo_turma || raw.turma || raw.classCode || raw.Turma || ''
        )
          .trim()
          .toUpperCase();
        const rawPass = String(raw.senha_inicial || raw.senha || raw.password || 'Senai@2026').trim();
        const minorRaw = String(raw.menor_idade || raw.isMinor || '').trim().toUpperCase();
        const isMinor = ['SIM', 'TRUE', '1', 'S', 'YES'].includes(minorRaw);

        if (!fullName || !email || !email.includes('@')) {
          errors.push(`Linha ${rowNum}: nome completo ou e-mail inválido.`);
          continue;
        }

        const effectiveRegCode = regCode || `IMP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        const exists = await prisma.user.findFirst({
          where: {
            OR: [{ email }, { registrationCode: effectiveRegCode }],
          },
        });

        if (exists) {
          skippedDuplicates++;
          continue;
        }

        const targetClass = classByCode.get(classCode) || fallbackClass;
        const passwordHash = await bcrypt.hash(rawPass.length >= 6 ? rawPass : 'Senai@2026', 10);

        await prisma.user.create({
          data: {
            fullName,
            email,
            registrationCode: effectiveRegCode,
            passwordHash,
            role: Role.PARTICIPANT,
            classGroupId: targetClass?.id || null,
            isMinor,
            lgpdConsentAt: new Date(),
            imageConsent: false,
          },
        });
        imported++;
      }

      await recordAuditLog({
        actorId: req.authUser!.id,
        actorRole: req.authUser!.role,
        action: 'PARTICIPANTS_IMPORTED_SPREADSHEET',
        entityType: 'User',
        metadata: {
          fileName: req.file.originalname,
          totalRows: rows.length,
          imported,
          skippedDuplicates,
          errorsCount: errors.length,
        },
        ipAddress: req.ip,
      });

      if (imported > 0) {
        broadcastRankingRefresh('participants_imported');
      }

      res.json({
        totalRows: rows.length,
        imported,
        skippedDuplicates,
        errors: errors.slice(0, 25),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================================
// 6. GERENCIAMENTO COMPLETO DE MISSÕES & AGENDADOR (ADMIN, SUPER_ADMIN)
// ============================================================================
adminRouter.get('/missions', requireRoles(...STAFF_ROLES), async (_req, res, next) => {
  try {
    const missions = await prisma.mission.findMany({
      include: {
        _count: { select: { submissions: true } },
      },
      orderBy: [{ eventDay: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ missions });
  } catch (err) {
    next(err);
  }
});

const missionInputSchema = z.object({
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().min(5).max(320),
  description: z.string().trim().min(10),
  instructions: z.string().trim().min(10),
  evaluationCriteria: z.string().trim().min(5),
  safetyNotice: z.string().trim().optional().nullable(),
  bannerUrl: z.string().trim().optional().nullable(),
  category: z.string().trim().min(2).max(80),
  difficulty: z.nativeEnum(MissionDifficulty).default(MissionDifficulty.INTERMEDIATE),
  participationMode: z.nativeEnum(ParticipationMode).default(ParticipationMode.INDIVIDUAL),
  submissionType: z.nativeEnum(SubmissionType).default(SubmissionType.PHOTO),
  eventDay: z.coerce.number().int().min(1).max(4).default(1),
  eventDateLabel: z.string().trim().default('16/11/2026'),
  status: z.nativeEnum(ActivityStatus).default(ActivityStatus.DRAFT),
  opensAt: z.string().optional().nullable(),
  closesAt: z.string().optional().nullable(),
  points: z.coerce.number().int().min(5).max(500).default(50),
  requiresPhoto: z.boolean().default(false),
  requiresVideo: z.boolean().default(false),
  requiresText: z.boolean().default(true),
  requiresApproval: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  configJson: z.any().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
});

adminRouter.post('/missions', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const parsed = missionInputSchema.parse(req.body);
    const baseSlug = slugify(parsed.title) || 'missao';
    const uniqueSlug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;

    const created = await prisma.mission.create({
      data: {
        slug: uniqueSlug,
        title: parsed.title,
        summary: parsed.summary,
        description: parsed.description,
        instructions: parsed.instructions,
        evaluationCriteria: parsed.evaluationCriteria,
        safetyNotice: parsed.safetyNotice || null,
        bannerUrl: parsed.bannerUrl || null,
        category: parsed.category,
        difficulty: parsed.difficulty,
        participationMode: parsed.participationMode,
        submissionType: parsed.submissionType,
        eventDay: parsed.eventDay,
        eventDateLabel: parsed.eventDateLabel,
        status: parsed.status,
        opensAt: parsed.opensAt ? new Date(parsed.opensAt) : null,
        closesAt: parsed.closesAt ? new Date(parsed.closesAt) : null,
        publishedAt: parsed.status === ActivityStatus.PUBLISHED ? new Date() : null,
        points: parsed.points,
        requiresPhoto: parsed.requiresPhoto,
        requiresVideo: parsed.requiresVideo,
        requiresText: parsed.requiresText,
        requiresApproval: parsed.requiresApproval,
        isFeatured: parsed.isFeatured,
        configJson: parsed.configJson ?? Prisma.JsonNull,
        sortOrder: parsed.sortOrder,
      },
    });

    if (created.status === ActivityStatus.PUBLISHED) {
      broadcastActivityReleased({
        kind: 'MISSION',
        id: created.id,
        title: created.title,
        eventDay: created.eventDay,
        points: created.points,
      });
    } else if (created.status === ActivityStatus.SCHEDULED) {
      void runSchedulerTick();
    }

    await recordAuditLog({
      actorId: req.authUser!.id,
      actorRole: req.authUser!.role,
      action: 'MISSION_CREATED',
      entityType: 'Mission',
      entityId: created.id,
      metadata: { title: created.title, status: created.status, points: created.points },
      ipAddress: req.ip,
    });

    res.status(201).json({ mission: created });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/missions/:id', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const id = String(req.params.id || '');
    const previous = await prisma.mission.findUniqueOrThrow({ where: { id } });
    const parsed = missionInputSchema.partial().parse(req.body);

    const updated = await prisma.mission.update({
      where: { id },
      data: {
        ...(parsed.title !== undefined ? { title: parsed.title } : {}),
        ...(parsed.summary !== undefined ? { summary: parsed.summary } : {}),
        ...(parsed.description !== undefined ? { description: parsed.description } : {}),
        ...(parsed.instructions !== undefined ? { instructions: parsed.instructions } : {}),
        ...(parsed.evaluationCriteria !== undefined
          ? { evaluationCriteria: parsed.evaluationCriteria }
          : {}),
        ...(parsed.safetyNotice !== undefined ? { safetyNotice: parsed.safetyNotice } : {}),
        ...(parsed.bannerUrl !== undefined ? { bannerUrl: parsed.bannerUrl } : {}),
        ...(parsed.category !== undefined ? { category: parsed.category } : {}),
        ...(parsed.difficulty !== undefined ? { difficulty: parsed.difficulty } : {}),
        ...(parsed.participationMode !== undefined
          ? { participationMode: parsed.participationMode }
          : {}),
        ...(parsed.submissionType !== undefined ? { submissionType: parsed.submissionType } : {}),
        ...(parsed.eventDay !== undefined ? { eventDay: parsed.eventDay } : {}),
        ...(parsed.eventDateLabel !== undefined ? { eventDateLabel: parsed.eventDateLabel } : {}),
        ...(parsed.status !== undefined
          ? {
              status: parsed.status,
              publishedAt:
                parsed.status === ActivityStatus.PUBLISHED && !previous.publishedAt
                  ? new Date()
                  : previous.publishedAt,
            }
          : {}),
        ...(parsed.opensAt !== undefined
          ? { opensAt: parsed.opensAt ? new Date(parsed.opensAt) : null }
          : {}),
        ...(parsed.closesAt !== undefined
          ? { closesAt: parsed.closesAt ? new Date(parsed.closesAt) : null }
          : {}),
        ...(parsed.points !== undefined ? { points: parsed.points } : {}),
        ...(parsed.requiresPhoto !== undefined ? { requiresPhoto: parsed.requiresPhoto } : {}),
        ...(parsed.requiresVideo !== undefined ? { requiresVideo: parsed.requiresVideo } : {}),
        ...(parsed.requiresText !== undefined ? { requiresText: parsed.requiresText } : {}),
        ...(parsed.requiresApproval !== undefined
          ? { requiresApproval: parsed.requiresApproval }
          : {}),
        ...(parsed.isFeatured !== undefined ? { isFeatured: parsed.isFeatured } : {}),
        ...(parsed.configJson !== undefined
          ? { configJson: parsed.configJson ?? Prisma.JsonNull }
          : {}),
        ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
      },
    });

    if (previous.status !== ActivityStatus.PUBLISHED && updated.status === ActivityStatus.PUBLISHED) {
      broadcastActivityReleased({
        kind: 'MISSION',
        id: updated.id,
        title: updated.title,
        eventDay: updated.eventDay,
        points: updated.points,
      });
    } else if (previous.status !== ActivityStatus.CLOSED && updated.status === ActivityStatus.CLOSED) {
      broadcastActivityClosed({
        kind: 'MISSION',
        id: updated.id,
        title: updated.title,
      });
    } else if (updated.status === ActivityStatus.SCHEDULED) {
      void runSchedulerTick();
    }

    await recordAuditLog({
      actorId: req.authUser!.id,
      actorRole: req.authUser!.role,
      action: 'MISSION_UPDATED',
      entityType: 'Mission',
      entityId: updated.id,
      metadata: { title: updated.title, status: updated.status },
      ipAddress: req.ip,
    });

    res.json({ mission: updated });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/missions/:id/duplicate', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const id = String(req.params.id || '');
    const source = await prisma.mission.findUniqueOrThrow({ where: { id } });
    const copySlug = `${source.slug}-copia-${crypto.randomBytes(2).toString('hex')}`;

    const duplicated = await prisma.mission.create({
      data: {
        slug: copySlug,
        title: `${source.title} (Cópia)`,
        summary: source.summary,
        description: source.description,
        instructions: source.instructions,
        evaluationCriteria: source.evaluationCriteria,
        safetyNotice: source.safetyNotice,
        bannerUrl: source.bannerUrl,
        category: source.category,
        difficulty: source.difficulty,
        participationMode: source.participationMode,
        submissionType: source.submissionType,
        eventDay: source.eventDay,
        eventDateLabel: source.eventDateLabel,
        status: ActivityStatus.DRAFT,
        opensAt: source.opensAt,
        closesAt: source.closesAt,
        points: source.points,
        requiresPhoto: source.requiresPhoto,
        requiresVideo: source.requiresVideo,
        requiresText: source.requiresText,
        requiresApproval: source.requiresApproval,
        isFeatured: false,
        configJson: (source.configJson as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        sortOrder: source.sortOrder + 1,
      },
    });

    res.status(201).json({ mission: duplicated });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 7. GERENCIAMENTO DE QUIZZES E QUESTÕES (ADMIN, SUPER_ADMIN)
// ============================================================================
adminRouter.get('/quizzes', requireRoles(...ADMIN_ROLES), async (_req, res, next) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      include: {
        questions: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { attempts: true } },
      },
      orderBy: [{ eventDay: 'asc' }, { sortOrder: 'asc' }],
    });
    res.json({ quizzes });
  } catch (err) {
    next(err);
  }
});

const quizSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(5),
  category: z.string().trim().min(2).max(80),
  eventDay: z.coerce.number().int().min(1).max(4).default(1),
  eventDateLabel: z.string().trim().default('16/11/2026'),
  status: z.nativeEnum(ActivityStatus).default(ActivityStatus.DRAFT),
  opensAt: z.string().optional().nullable(),
  closesAt: z.string().optional().nullable(),
  durationSeconds: z.coerce.number().int().min(60).max(7200).default(600),
  maxPoints: z.coerce.number().int().min(5).max(300).default(50),
  maxAttempts: z.coerce.number().int().min(1).max(5).default(1),
  shuffleQuestions: z.boolean().default(false),
});

adminRouter.post('/quizzes', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const parsed = quizSchema.parse(req.body);
    const slug = `${slugify(parsed.title)}-${crypto.randomBytes(2).toString('hex')}`;
    const created = await prisma.quiz.create({
      data: {
        slug,
        title: parsed.title,
        description: parsed.description,
        category: parsed.category,
        eventDay: parsed.eventDay,
        eventDateLabel: parsed.eventDateLabel,
        status: parsed.status,
        opensAt: parsed.opensAt ? new Date(parsed.opensAt) : null,
        closesAt: parsed.closesAt ? new Date(parsed.closesAt) : null,
        publishedAt: parsed.status === ActivityStatus.PUBLISHED ? new Date() : null,
        durationSeconds: parsed.durationSeconds,
        maxPoints: parsed.maxPoints,
        maxAttempts: parsed.maxAttempts,
        shuffleQuestions: parsed.shuffleQuestions,
      },
      include: { questions: true },
    });

    if (created.status === ActivityStatus.PUBLISHED) {
      broadcastActivityReleased({
        kind: 'QUIZ',
        id: created.id,
        title: created.title,
        eventDay: created.eventDay,
        points: created.maxPoints,
      });
    } else if (created.status === ActivityStatus.SCHEDULED) {
      void runSchedulerTick();
    }

    res.status(201).json({ quiz: created });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/quizzes/:id', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const id = String(req.params.id || '');
    const previous = await prisma.quiz.findUniqueOrThrow({ where: { id } });
    const parsed = quizSchema.partial().parse(req.body);

    const updated = await prisma.quiz.update({
      where: { id },
      data: {
        ...(parsed.title !== undefined ? { title: parsed.title } : {}),
        ...(parsed.description !== undefined ? { description: parsed.description } : {}),
        ...(parsed.category !== undefined ? { category: parsed.category } : {}),
        ...(parsed.eventDay !== undefined ? { eventDay: parsed.eventDay } : {}),
        ...(parsed.eventDateLabel !== undefined ? { eventDateLabel: parsed.eventDateLabel } : {}),
        ...(parsed.status !== undefined
          ? {
              status: parsed.status,
              publishedAt:
                parsed.status === ActivityStatus.PUBLISHED && !previous.publishedAt
                  ? new Date()
                  : previous.publishedAt,
            }
          : {}),
        ...(parsed.opensAt !== undefined
          ? { opensAt: parsed.opensAt ? new Date(parsed.opensAt) : null }
          : {}),
        ...(parsed.closesAt !== undefined
          ? { closesAt: parsed.closesAt ? new Date(parsed.closesAt) : null }
          : {}),
        ...(parsed.durationSeconds !== undefined ? { durationSeconds: parsed.durationSeconds } : {}),
        ...(parsed.maxPoints !== undefined ? { maxPoints: parsed.maxPoints } : {}),
        ...(parsed.maxAttempts !== undefined ? { maxAttempts: parsed.maxAttempts } : {}),
        ...(parsed.shuffleQuestions !== undefined
          ? { shuffleQuestions: parsed.shuffleQuestions }
          : {}),
      },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
    });

    if (previous.status !== ActivityStatus.PUBLISHED && updated.status === ActivityStatus.PUBLISHED) {
      broadcastActivityReleased({
        kind: 'QUIZ',
        id: updated.id,
        title: updated.title,
        eventDay: updated.eventDay,
        points: updated.maxPoints,
      });
    } else if (updated.status === ActivityStatus.SCHEDULED) {
      void runSchedulerTick();
    }

    res.json({ quiz: updated });
  } catch (err) {
    next(err);
  }
});

const questionSchema = z.object({
  questionType: z.nativeEnum(QuestionType).default(QuestionType.MULTIPLE_CHOICE),
  courseTrack: z.string().trim().default('GERAL'),
  prompt: z.string().trim().min(5),
  scenarioContext: z.string().trim().optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
  options: z.array(z.object({ id: z.string(), text: z.string().min(1) })).min(2),
  correctOptionId: z.string().min(1),
  explanation: z.string().trim().min(5),
  pointsWeight: z.coerce.number().int().min(1).max(100).default(10),
  sortOrder: z.coerce.number().int().default(0),
});

adminRouter.post('/quizzes/:quizId/questions', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const quizId = String(req.params.quizId || '');
    const parsed = questionSchema.parse(req.body);
    const question = await prisma.quizQuestion.create({
      data: {
        quizId,
        questionType: parsed.questionType,
        courseTrack: parsed.courseTrack,
        prompt: parsed.prompt,
        scenarioContext: parsed.scenarioContext || null,
        imageUrl: parsed.imageUrl || null,
        options: parsed.options,
        correctOptionId: parsed.correctOptionId,
        explanation: parsed.explanation,
        pointsWeight: parsed.pointsWeight,
        sortOrder: parsed.sortOrder,
      },
    });
    res.status(201).json({ question });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/questions/:id', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const id = String(req.params.id || '');
    const parsed = questionSchema.partial().parse(req.body);
    const updated = await prisma.quizQuestion.update({
      where: { id },
      data: {
        ...(parsed.questionType !== undefined ? { questionType: parsed.questionType } : {}),
        ...(parsed.courseTrack !== undefined ? { courseTrack: parsed.courseTrack } : {}),
        ...(parsed.prompt !== undefined ? { prompt: parsed.prompt } : {}),
        ...(parsed.scenarioContext !== undefined ? { scenarioContext: parsed.scenarioContext } : {}),
        ...(parsed.imageUrl !== undefined ? { imageUrl: parsed.imageUrl } : {}),
        ...(parsed.options !== undefined ? { options: parsed.options } : {}),
        ...(parsed.correctOptionId !== undefined ? { correctOptionId: parsed.correctOptionId } : {}),
        ...(parsed.explanation !== undefined ? { explanation: parsed.explanation } : {}),
        ...(parsed.pointsWeight !== undefined ? { pointsWeight: parsed.pointsWeight } : {}),
        ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
      },
    });
    res.json({ question: updated });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/questions/:id', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const id = String(req.params.id || '');
    await prisma.quizQuestion.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 8. MEDALHAS, CONFIGURAÇÕES INSTITUCIONAIS, MARCA OFICIAL SENAI, STAFF E AUDITORIA
// ============================================================================
adminRouter.get('/badges', requireRoles(...ADMIN_ROLES), async (_req, res, next) => {
  try {
    const badges = await prisma.badge.findMany({
      include: { _count: { select: { userBadges: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ badges });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/config', requireRoles(...ADMIN_ROLES), async (_req, res, next) => {
  try {
    const config = await getSystemConfigSafe();
    res.json({
      config: {
        ...config,
        hasOfficialLogo: Boolean(config.officialLogoUrl),
        officialLogoPreviewUrl: config.officialLogoUrl ? '/api/media/brand' : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

const updateConfigSchema = z.object({
  schoolName: z.string().trim().min(3).max(160).optional(),
  eventTitle: z.string().trim().min(3).max(80).optional(),
  eventTheme: z.string().trim().min(5).max(240).optional(),
  eventSlogan: z.string().trim().min(3).max(160).optional(),
  namePrivacyMode: z.nativeEnum(NamePrivacyMode).optional(),
  showAvatarsInPublic: z.boolean().optional(),
  pointsSimpleMission: z.coerce.number().int().min(5).max(500).optional(),
  pointsMediumMission: z.coerce.number().int().min(5).max(500).optional(),
  pointsAdvancedMission: z.coerce.number().int().min(5).max(500).optional(),
  pointsMaxQuiz: z.coerce.number().int().min(5).max(500).optional(),
  pointsSurpriseMax: z.coerce.number().int().min(5).max(500).optional(),
  tvRotationSeconds: z.coerce.number().int().min(5).max(120).optional(),
  lgpdRetentionDays: z.coerce.number().int().min(7).max(730).optional(),
});

adminRouter.patch('/config', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const parsed = updateConfigSchema.parse(req.body);
    await getSystemConfigSafe();

    const updated = await prisma.systemConfig.update({
      where: { id: 'default' },
      data: parsed,
    });

    await recordAuditLog({
      actorId: req.authUser!.id,
      actorRole: req.authUser!.role,
      action: 'SYSTEM_CONFIG_UPDATED',
      entityType: 'SystemConfig',
      entityId: 'default',
      metadata: parsed as Record<string, unknown>,
      ipAddress: req.ip,
    });

    broadcastRankingRefresh('config_updated');
    res.json({ config: updated });
  } catch (err) {
    next(err);
  }
});

// Upload do arquivo original oficial da Marca SENAI (sem distorção ou recriação)
adminRouter.post(
  '/config/brand-logo',
  requireRoles(...ADMIN_ROLES),
  uploadAvatar.single('logo'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Selecione o arquivo original da marca institucional (SVG ou PNG).' });
        return;
      }
      if (
        !ALLOWED_BRAND_MIMES.has(req.file.mimetype) ||
        !verifyFileSignature(req.file.buffer, req.file.mimetype)
      ) {
        res.status(400).json({
          error: 'Formato inválido. Utilize arquivo oficial original em SVG, PNG, WEBP ou JPEG.',
        });
        return;
      }

      const prev = await getSystemConfigSafe();
      const stored = await uploadObject({
        folder: 'brand',
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
      });

      if (prev.officialLogoUrl && !prev.officialLogoUrl.startsWith('http')) {
        await deleteObject(prev.officialLogoUrl);
      }

      await prisma.systemConfig.update({
        where: { id: 'default' },
        data: { officialLogoUrl: stored.key },
      });

      await recordAuditLog({
        actorId: req.authUser!.id,
        actorRole: req.authUser!.role,
        action: 'BRAND_LOGO_UPLOADED',
        entityType: 'SystemConfig',
        entityId: 'default',
        ipAddress: req.ip,
      });

      broadcastRankingRefresh('brand_updated');
      res.json({ ok: true, officialLogoUrl: '/api/media/brand' });
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.delete('/config/brand-logo', requireRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const prev = await getSystemConfigSafe();
    if (prev.officialLogoUrl && !prev.officialLogoUrl.startsWith('http')) {
      await deleteObject(prev.officialLogoUrl);
    }
    await prisma.systemConfig.update({
      where: { id: 'default' },
      data: { officialLogoUrl: null },
    });
    broadcastRankingRefresh('brand_removed');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Gestão de equipe administrativa (Exclusivo SUPER_ADMIN)
adminRouter.get('/staff', requireRoles(Role.SUPER_ADMIN), async (_req, res, next) => {
  try {
    const staff = await prisma.user.findMany({
      where: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN, Role.EVALUATOR] } },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ staff });
  } catch (err) {
    next(err);
  }
});

const createStaffSchema = z.object({
  fullName: z.string().trim().min(4).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'EVALUATOR']),
});

adminRouter.post('/staff', requireRoles(Role.SUPER_ADMIN), async (req, res, next) => {
  try {
    const parsed = createStaffSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (exists) {
      res.status(409).json({ error: 'Já existe um usuário com este e-mail.' });
      return;
    }
    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const created = await prisma.user.create({
      data: {
        fullName: parsed.fullName,
        email: parsed.email,
        passwordHash,
        role: parsed.role as Role,
        lgpdConsentAt: new Date(),
      },
      select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true },
    });

    await recordAuditLog({
      actorId: req.authUser!.id,
      actorRole: req.authUser!.role,
      targetUserId: created.id,
      action: 'STAFF_ACCOUNT_CREATED',
      entityType: 'User',
      entityId: created.id,
      metadata: { assignedRole: created.role },
      ipAddress: req.ip,
    });

    res.status(201).json({ staffMember: created });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/staff/:id', requireRoles(Role.SUPER_ADMIN), async (req, res, next) => {
  try {
    const id = String(req.params.id || '');
    const { role, isActive, newPassword } = req.body;
    if (id === req.authUser!.id && isActive === false) {
      res.status(400).json({ error: 'Você não pode desativar sua própria conta de Superadministrador.' });
      return;
    }
    const data: Prisma.UserUpdateInput = {};
    if (role && ['SUPER_ADMIN', 'ADMIN', 'EVALUATOR'].includes(role)) {
      data.role = role as Role;
    }
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (newPassword && String(newPassword).length >= 8) {
      data.passwordHash = await bcrypt.hash(String(newPassword), 12);
    }
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, fullName: true, email: true, role: true, isActive: true },
    });
    res.json({ staffMember: updated });
  } catch (err) {
    next(err);
  }
});

// Auditoria e Retenção LGPD
adminRouter.get('/audit-logs', requireRoles(...ADMIN_ROLES), async (_req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 150,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { fullName: true, email: true, role: true } },
        targetUser: { select: { fullName: true, email: true } },
      },
    });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/lgpd/purge-expired-media', requireRoles(Role.SUPER_ADMIN), async (req, res, next) => {
  try {
    const config = await getSystemConfigSafe();
    const cutoff = new Date(Date.now() - config.lgpdRetentionDays * 24 * 60 * 60 * 1000);

    const expiredSubs = await prisma.missionSubmission.findMany({
      where: {
        submittedAt: { lt: cutoff },
        OR: [{ mediaKey: { not: null } }, { secondaryMediaKey: { not: null } }],
      },
    });

    for (const sub of expiredSubs) {
      if (sub.mediaKey) await deleteObject(sub.mediaKey);
      if (sub.secondaryMediaKey) await deleteObject(sub.secondaryMediaKey);
      await prisma.missionSubmission.update({
        where: { id: sub.id },
        data: { mediaKey: null, secondaryMediaKey: null, isPublicHighlight: false },
      });
    }

    await recordAuditLog({
      actorId: req.authUser!.id,
      actorRole: req.authUser!.role,
      action: 'LGPD_MEDIA_RETENTION_PURGE',
      entityType: 'MissionSubmission',
      metadata: { purgedCount: expiredSubs.length, retentionDays: config.lgpdRetentionDays },
      ipAddress: req.ip,
    });

    res.json({ purgedCount: expiredSubs.length, retentionDays: config.lgpdRetentionDays });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 9. EXPORTAÇÃO DE RELATÓRIOS OFICIAIS (EXCEL .XLSX & PDF .PDF)
// ============================================================================
adminRouter.get('/reports/general.xlsx', requireRoles(...ADMIN_ROLES), async (_req, res, next) => {
  try {
    const buf = await generateGeneralExcelReport();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-geral-sipat2026.xlsx"');
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/reports/general.pdf', requireRoles(...ADMIN_ROLES), async (_req, res, next) => {
  try {
    const buf = await generateGeneralPdfReport();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-geral-sipat2026.pdf"');
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/reports/risk-hunt.xlsx', requireRoles(...ADMIN_ROLES), async (_req, res, next) => {
  try {
    const buf = await generateRiskHuntExcelReport();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="relatorio-caca-aos-riscos-sipat2026.xlsx"'
    );
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/reports/risk-hunt.pdf', requireRoles(...ADMIN_ROLES), async (_req, res, next) => {
  try {
    const buf = await generateRiskHuntPdfReport();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="relatorio-caca-aos-riscos-sipat2026.pdf"'
    );
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

