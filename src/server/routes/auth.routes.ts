import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { calculateLevelInfo, getInitials } from '../../shared/constants.js';
import { prisma } from '../lib/prisma.js';
import {
  ALLOWED_IMAGE_MIMES,
  deleteObject,
  uploadObject,
  verifyFileSignature,
} from '../lib/storage.js';
import { broadcastRankingRefresh } from '../lib/socket.js';
import {
  clearAuthCookie,
  requireAuth,
  setAuthCookie,
  signSessionToken,
} from '../middleware/auth.middleware.js';
import { uploadAvatar } from '../middleware/upload.middleware.js';
import { recordAuditLog } from '../services/audit.service.js';
import { getSystemConfigSafe } from '../services/ranking.service.js';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.' },
});

function serializeAuthenticatedUser(user: any) {
  const levelInfo = calculateLevelInfo(user.totalPoints || 0);
  return {
    id: user.id,
    fullName: user.fullName,
    initials: getInitials(user.fullName),
    email: user.email,
    registrationCode: user.registrationCode,
    role: user.role,
    totalPoints: user.totalPoints,
    level: levelInfo.level,
    levelTitle: levelInfo.title,
    levelProgressPercent: levelInfo.progressPercent,
    nextLevelPoints: levelInfo.nextLevelPoints,
    avatarUrl: user.avatarKey ? `/api/media/avatar/${user.id}?v=${user.updatedAt?.getTime?.() || 1}` : null,
    isMinor: user.isMinor,
    imageConsent: user.imageConsent,
    lgpdConsentAt: user.lgpdConsentAt,
    classGroup: user.classGroup
      ? {
          id: user.classGroup.id,
          code: user.classGroup.code,
          name: user.classGroup.name,
          courseArea: user.classGroup.courseArea,
          shift: user.classGroup.shift,
        }
      : null,
  };
}

const registerSchema = z.object({
  fullName: z.string().trim().min(5, 'Informe seu nome completo (mínimo 5 caracteres).').max(120),
  email: z.string().trim().toLowerCase().email('Informe um endereço de e-mail válido.'),
  registrationCode: z
    .string()
    .trim()
    .min(3, 'Informe seu número de matrícula / RA ou identificação funcional.')
    .max(40),
  classGroupId: z.string().uuid('Selecione uma turma válida.'),
  password: z.string().min(6, 'A senha deve possuir no mínimo 6 caracteres.').max(100),
  qrCode: z.string().trim().optional(),
  isMinor: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(false),
  guardianName: z.string().trim().max(120).optional(),
  lgpdAccepted: z.preprocess(
    (v) => v === 'true' || v === true,
    z.boolean().refine((val) => val === true, {
      message: 'É necessário aceitar os termos institucionais de participação e proteção de dados (LGPD).',
    })
  ),
  imageConsent: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(false),
});

authRouter.post('/register', authLimiter, uploadAvatar.single('avatar'), async (req, res, next) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const config = await getSystemConfigSafe();
    const now = new Date();

    if (!config.registrationEnabled) {
      res.status(403).json({
        error: 'As inscrições da SIPAT 2026 estão temporariamente pausadas pela coordenação.',
      });
      return;
    }

    if (config.registrationStart && now < config.registrationStart) {
      res.status(403).json({ error: 'O período de inscrições ainda não começou.' });
      return;
    }
    if (config.registrationEnd && now > config.registrationEnd) {
      res.status(403).json({ error: 'O período de inscrições foi encerrado.' });
      return;
    }

    let qrRecordId: string | null = null;
    if (parsed.qrCode) {
      const qrRecord = await prisma.qrRegistrationToken.findUnique({
        where: { code: parsed.qrCode },
      });
      if (
        !qrRecord ||
        !qrRecord.isActive ||
        (qrRecord.validFrom && now < qrRecord.validFrom) ||
        (qrRecord.validUntil && now > qrRecord.validUntil)
      ) {
        res.status(403).json({
          error: 'O QR Code utilizado está inativo, expirado ou foi regenerado pela escola.',
        });
        return;
      }
      qrRecordId = qrRecord.id;
    }

    if (parsed.isMinor && parsed.imageConsent && (!parsed.guardianName || parsed.guardianName.length < 4)) {
      res.status(400).json({
        error:
          'Para participantes menores de 18 anos que optarem por autorizar uso institucional de imagem, informe o nome do responsável legal/ciência escolar.',
      });
      return;
    }

    const classGroup = await prisma.classGroup.findFirst({
      where: { id: parsed.classGroupId, isActive: true },
    });
    if (!classGroup) {
      res.status(400).json({ error: 'A turma selecionada não está ativa ou não existe.' });
      return;
    }

    const normalizedRegCode = parsed.registrationCode.toUpperCase().replace(/\s+/g, '');

    // Impede cadastros duplicados por e-mail OU por matrícula/RA
    const existingDuplicate = await prisma.user.findFirst({
      where: {
        OR: [{ email: parsed.email }, { registrationCode: normalizedRegCode }],
      },
    });

    if (existingDuplicate) {
      const duplicateField =
        existingDuplicate.email === parsed.email ? 'e-mail' : 'número de matrícula/identificação';
      res.status(409).json({
        error: `Já existe um participante inscrito com este ${duplicateField}. Utilize a tela de Login ou Recuperação de Acesso.`,
      });
      return;
    }

    let avatarKey: string | null = null;
    let avatarMime: string | null = null;

    if (req.file) {
      if (!ALLOWED_IMAGE_MIMES.has(req.file.mimetype)) {
        res.status(400).json({
          error: 'Formato de foto de perfil não permitido. Envie JPEG, PNG ou WEBP.',
        });
        return;
      }
      if (!verifyFileSignature(req.file.buffer, req.file.mimetype)) {
        res.status(400).json({
          error: 'O arquivo de foto enviado não corresponde a uma imagem válida.',
        });
        return;
      }

      const uploaded = await uploadObject({
        folder: 'avatars',
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
      });
      avatarKey = uploaded.key;
      avatarMime = uploaded.mimeType;
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);

    const createdUser = await prisma.user.create({
      data: {
        fullName: parsed.fullName,
        email: parsed.email,
        registrationCode: normalizedRegCode,
        passwordHash,
        role: Role.PARTICIPANT,
        classGroupId: classGroup.id,
        avatarKey,
        avatarMime,
        isMinor: parsed.isMinor,
        guardianName: parsed.guardianName || null,
        lgpdConsentAt: now,
        imageConsent: parsed.imageConsent,
        imageConsentAt: parsed.imageConsent ? now : null,
        registeredViaQrId: qrRecordId,
        lastLoginAt: now,
      },
      include: { classGroup: true },
    });

    if (qrRecordId) {
      await prisma.qrRegistrationToken
        .update({
          where: { id: qrRecordId },
          data: { registrationsCount: { increment: 1 } },
        })
        .catch(() => {});
    }

    await recordAuditLog({
      actorId: createdUser.id,
      actorRole: createdUser.role,
      targetUserId: createdUser.id,
      action: 'PARTICIPANT_REGISTERED',
      entityType: 'User',
      entityId: createdUser.id,
      metadata: {
        viaQr: Boolean(qrRecordId),
        classCode: classGroup.code,
        isMinor: createdUser.isMinor,
        imageConsent: createdUser.imageConsent,
      },
      ipAddress: req.ip,
    });

    broadcastRankingRefresh('participant_registered');

    const token = signSessionToken(createdUser);
    setAuthCookie(res, token);

    res.status(201).json({
      token,
      user: serializeAuthenticatedUser(createdUser),
    });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Informe seu e-mail ou matrícula.'),
  password: z.string().min(1, 'Informe sua senha de acesso.'),
});

authRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { identifier, password } = loginSchema.parse(req.body);
    const normalizedEmail = identifier.toLowerCase();
    const normalizedCode = identifier.toUpperCase().replace(/\s+/g, '');

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { registrationCode: normalizedCode }],
      },
      include: { classGroup: true },
    });

    if (!user || !user.isActive || user.anonymizedAt) {
      res.status(401).json({ error: 'Credenciais inválidas ou conta inativa.' });
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail/matrícula e senha.' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signSessionToken(user);
    setAuthCookie(res, token);

    res.json({
      token,
      user: serializeAuthenticatedUser(user),
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.authUser!.id },
      include: { classGroup: true },
    });
    if (!user) {
      clearAuthCookie(res);
      res.status(401).json({ error: 'Usuário não encontrado.' });
      return;
    }
    res.json({ user: serializeAuthenticatedUser(user) });
  } catch (err) {
    next(err);
  }
});

// Recuperação de acesso: validação por E-mail + Matrícula Escolar (adequado ao ambiente escolar SENAI sem exigir SMTP externo obrigatório) + geração de token seguro
const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe o e-mail cadastrado.'),
  registrationCode: z.string().trim().min(3, 'Informe sua matrícula/RA para confirmação de segurança.'),
  newPassword: z.string().min(6, 'A nova senha deve possuir ao menos 6 caracteres.').max(100),
});

authRouter.post('/recover-access', authLimiter, async (req, res, next) => {
  try {
    const parsed = forgotSchema.parse(req.body);
    const normalizedCode = parsed.registrationCode.toUpperCase().replace(/\s+/g, '');

    const user = await prisma.user.findFirst({
      where: {
        email: parsed.email,
        registrationCode: normalizedCode,
        role: Role.PARTICIPANT,
        isActive: true,
        anonymizedAt: null,
      },
    });

    if (!user) {
      res.status(404).json({
        error:
          'Dados não conferem ou pertencem a uma conta administrativa. Caso não lembre sua matrícula, procure a coordenação da SIPAT na secretaria.',
      });
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: crypto.randomBytes(16).toString('hex'),
        passwordResetExpires: new Date(),
      },
    });

    await recordAuditLog({
      actorId: user.id,
      actorRole: user.role,
      targetUserId: user.id,
      action: 'PASSWORD_RECOVERED_SELF',
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.ip,
    });

    res.json({
      ok: true,
      message: 'Sua senha foi redefinida com sucesso! Você já pode acessar seu painel.',
    });
  } catch (err) {
    next(err);
  }
});

// Atualização de foto de perfil e preferências de consentimento LGPD pelo participante
authRouter.patch('/profile', requireAuth, uploadAvatar.single('avatar'), async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.authUser!.id },
    });

    const dataToUpdate: Record<string, any> = {};

    if (req.body.imageConsent !== undefined) {
      const consent = req.body.imageConsent === 'true' || req.body.imageConsent === true;
      dataToUpdate.imageConsent = consent;
      dataToUpdate.imageConsentAt = consent ? new Date() : null;
    }

    if (req.file) {
      if (!ALLOWED_IMAGE_MIMES.has(req.file.mimetype) || !verifyFileSignature(req.file.buffer, req.file.mimetype)) {
        res.status(400).json({ error: 'Imagem inválida. Utilize JPEG, PNG ou WEBP.' });
        return;
      }
      const stored = await uploadObject({
        folder: 'avatars',
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
      });
      if (user.avatarKey) {
        await deleteObject(user.avatarKey);
      }
      dataToUpdate.avatarKey = stored.key;
      dataToUpdate.avatarMime = stored.mimeType;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: dataToUpdate,
      include: { classGroup: true },
    });

    res.json({ user: serializeAuthenticatedUser(updated) });
  } catch (err) {
    next(err);
  }
});

// LGPD: Portabilidade / Consulta integral dos dados do titular
authRouter.get('/lgpd-export', requireAuth, async (req, res, next) => {
  try {
    const data = await prisma.user.findUnique({
      where: { id: req.authUser!.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        registrationCode: true,
        isMinor: true,
        guardianName: true,
        lgpdConsentAt: true,
        imageConsent: true,
        imageConsentAt: true,
        totalPoints: true,
        level: true,
        createdAt: true,
        classGroup: { select: { code: true, name: true } },
        submissions: {
          select: {
            id: true,
            status: true,
            textResponse: true,
            structuredData: true,
            awardedPoints: true,
            submittedAt: true,
            mission: { select: { title: true } },
          },
        },
        quizAttempts: {
          select: {
            id: true,
            scorePercent: true,
            awardedPoints: true,
            completedAt: true,
            quiz: { select: { title: true } },
          },
        },
        badges: {
          select: {
            awardedAt: true,
            badge: { select: { name: true } },
          },
        },
      },
    });
    res.json({ exportedAt: new Date().toISOString(), holderData: data });
  } catch (err) {
    next(err);
  }
});

// LGPD: Solicitação de exclusão e anonimização de dados pessoais e mídias do participante
authRouter.delete('/lgpd-account', requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role !== Role.PARTICIPANT) {
      res.status(400).json({ error: 'Contas administrativas devem ser gerenciadas pelo Superadministrador.' });
      return;
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.authUser!.id },
      include: { submissions: true },
    });

    if (user.avatarKey) {
      await deleteObject(user.avatarKey);
    }
    for (const sub of user.submissions) {
      if (sub.mediaKey) await deleteObject(sub.mediaKey);
      if (sub.secondaryMediaKey) await deleteObject(sub.secondaryMediaKey);
    }

    const anonSuffix = crypto.randomBytes(4).toString('hex');
    await prisma.$transaction([
      prisma.missionSubmission.updateMany({
        where: { userId: user.id },
        data: {
          mediaKey: null,
          secondaryMediaKey: null,
          isPublicHighlight: false,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          fullName: `Titular Anonimizado #${anonSuffix}`,
          email: `anon.${anonSuffix}@deleted.sipat.local`,
          registrationCode: null,
          avatarKey: null,
          guardianName: null,
          imageConsent: false,
          isActive: false,
          anonymizedAt: new Date(),
        },
      }),
    ]);

    await recordAuditLog({
      actorId: user.id,
      actorRole: Role.PARTICIPANT,
      targetUserId: user.id,
      action: 'LGPD_SELF_ANONYMIZE',
      entityType: 'User',
      entityId: user.id,
      reason: 'Exclusão/anonimização solicitada pelo próprio titular (LGPD).',
      ipAddress: req.ip,
    });

    clearAuthCookie(res);
    broadcastRankingRefresh('lgpd_anonymized');
    res.json({ ok: true, message: 'Seus dados pessoais e arquivos de mídia foram removidos conforme a LGPD.' });
  } catch (err) {
    next(err);
  }
});
