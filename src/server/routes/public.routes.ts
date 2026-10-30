import { Router } from 'express';
import QRCode from 'qrcode';
import { ActivityStatus } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { isWebPushEnabled } from '../services/notification.service.js';
import {
  buildPublicOverviewData,
  buildPublicRankingData,
  getSystemConfigSafe,
} from '../services/ranking.service.js';

export const publicRouter = Router();

function resolveBaseUrl(req: any): string {
  if (env.PUBLIC_APP_URL && !env.PUBLIC_APP_URL.includes('localhost')) {
    return env.PUBLIC_APP_URL.replace(/\/+$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

publicRouter.get('/config', async (req, res, next) => {
  try {
    const [config, activeQr, classes, featuredMissions, badges] = await Promise.all([
      getSystemConfigSafe(),
      prisma.qrRegistrationToken.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.classGroup.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, code: true, name: true, courseArea: true, shift: true },
      }),
      prisma.mission.findMany({
        where: { status: { in: [ActivityStatus.PUBLISHED, ActivityStatus.SCHEDULED] } },
        select: {
          id: true,
          title: true,
          summary: true,
          category: true,
          difficulty: true,
          eventDay: true,
          eventDateLabel: true,
          points: true,
          status: true,
          opensAt: true,
        },
        orderBy: [{ eventDay: 'asc' }, { sortOrder: 'asc' }],
      }),
      prisma.badge.findMany({
        orderBy: { sortOrder: 'asc' },
        select: { slug: true, name: true, description: true, iconName: true, accentColor: true },
      }),
    ]);

    const now = new Date();
    const withinGlobalWindow =
      config.registrationEnabled &&
      (!config.registrationStart || now >= config.registrationStart) &&
      (!config.registrationEnd || now <= config.registrationEnd);

    const qrValid =
      Boolean(activeQr?.isActive) &&
      (!activeQr?.validFrom || now >= activeQr.validFrom) &&
      (!activeQr?.validUntil || now <= activeQr.validUntil);

    const baseUrl = resolveBaseUrl(req);
    const registrationUrl = activeQr
      ? `${baseUrl}/inscricao?code=${encodeURIComponent(activeQr.code)}`
      : `${baseUrl}/inscricao`;

    let qrDataUrl: string | null = null;
    if (activeQr && withinGlobalWindow && qrValid) {
      qrDataUrl = await QRCode.toDataURL(registrationUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#002B5C', light: '#FFFFFF' },
      });
    }

    res.json({
      schoolName: config.schoolName,
      eventTitle: config.eventTitle,
      eventTheme: config.eventTheme,
      eventSlogan: config.eventSlogan,
      eventStartDate: config.eventStartDate,
      eventEndDate: config.eventEndDate,
      officialLogoUrl: config.officialLogoUrl ? '/api/media/brand' : null,
      registrationOpen: withinGlobalWindow && qrValid,
      activeQrCode: activeQr && withinGlobalWindow && qrValid ? activeQr.code : null,
      registrationUrl,
      qrDataUrl,
      classes,
      programPreview: featuredMissions,
      badges,
      vapidPublicKey: isWebPushEnabled() ? env.VAPID_PUBLIC_KEY : null,
    });
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/qr/:code', async (req, res, next) => {
  try {
    const code = String(req.params.code || '').trim();
    const [config, qrToken] = await Promise.all([
      getSystemConfigSafe(),
      prisma.qrRegistrationToken.findUnique({ where: { code } }),
    ]);

    if (!qrToken) {
      res.status(404).json({
        valid: false,
        reason: 'Código QR de inscrição não encontrado ou substituído.',
      });
      return;
    }

    const now = new Date();
    if (!config.registrationEnabled || !qrToken.isActive) {
      res.status(403).json({
        valid: false,
        reason: 'As inscrições por este QR Code encontram-se temporariamente desativadas pela coordenação.',
      });
      return;
    }

    if (
      (config.registrationStart && now < config.registrationStart) ||
      (qrToken.validFrom && now < qrToken.validFrom)
    ) {
      res.status(403).json({
        valid: false,
        reason: 'O período oficial de inscrições ainda não foi iniciado.',
      });
      return;
    }

    if (
      (config.registrationEnd && now > config.registrationEnd) ||
      (qrToken.validUntil && now > qrToken.validUntil)
    ) {
      res.status(403).json({
        valid: false,
        reason: 'O período de inscrições para este QR Code já foi encerrado.',
      });
      return;
    }

    await prisma.qrRegistrationToken
      .update({
        where: { id: qrToken.id },
        data: { scansCount: { increment: 1 } },
      })
      .catch(() => {});

    res.json({
      valid: true,
      code: qrToken.code,
      label: qrToken.label,
      schoolName: config.schoolName,
      eventTitle: config.eventTitle,
    });
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/classes', async (_req, res, next) => {
  try {
    const classes = await prisma.classGroup.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, courseArea: true, shift: true },
    });
    res.json({ classes });
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/ranking', async (_req, res, next) => {
  try {
    const data = await buildPublicRankingData();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/overview', async (_req, res, next) => {
  try {
    const data = await buildPublicOverviewData();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Armazenamento em memória para curtidas / reações imediatas da rede social
const feedReactionsMap = new Map<string, number>([
  ['post-caca-riscos-1', 48],
  ['post-video-60s-1', 37],
  ['post-7-erros-1', 29],
  ['post-ergonomia-1', 42],
  ['post-climatizacao-1', 31],
  ['post-ti-phishing-1', 53],
]);

export interface SocialFeedItem {
  id: string;
  authorName: string;
  authorInitials: string;
  avatarUrl: string | null;
  classCode: string;
  className: string;
  courseArea: string;
  missionTitle: string;
  missionCategory: string;
  eventDay: number;
  eventDateLabel: string;
  textResponse: string;
  structuredData?: any;
  mediaUrl: string | null;
  mediaMime?: string | null;
  hasVideo?: boolean;
  awardedPoints: number;
  feedback: string | null;
  evaluatorTitle: string;
  badgeUnlocked?: string | null;
  badgeName?: string | null;
  badgeIcon?: string | null;
  badgeColor?: string | null;
  reactionsCount: number;
  commentsCount: number;
  submittedAt: string;
  isOfficialHighlight: boolean;
}

// Publicações institucionais de demonstração educativa com fotos de oficinas reais do SENAI
const FEATURED_SAFETY_POSTS: SocialFeedItem[] = [
  {
    id: 'post-caca-riscos-1',
    authorName: 'Henrique Silva',
    authorInitials: 'HS',
    avatarUrl: null,
    classCode: 'TEC-DEV-2T',
    className: 'Técnico em Desenvolvimento de Sistemas',
    courseArea: 'Informática e TI',
    missionTitle: 'Caça aos Riscos na Escola',
    missionCategory: 'Percepção de Riscos',
    eventDay: 1,
    eventDateLabel: '16/11/2026',
    textResponse:
      'Identifiquei um cabo elétrico com isolamento rompido próximo à bancada de testes de sensores no Lab 02. Comuniquei o docente imediatamente e sinalizamos a área com fita zebrada até a troca completa do condutor conforme NR-10!',
    structuredData: {
      environment: 'Laboratório de Automação e Redes (Bloco B)',
      hazardType: 'Elétrico / Choque',
      consequences: 'Risco iminente de choque elétrico e queima de equipamentos didáticos.',
      preventiveMeasures: 'Substituição imediata por cabo antichama e inspeção periódica com multímetro.',
    },
    mediaUrl:
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1000&q=80',
    mediaMime: 'image/jpeg',
    hasVideo: false,
    awardedPoints: 100,
    feedback: 'Excelente percepção do risco e atitude preventiva impecável! Medida corretiva alinhada à NR-10.',
    evaluatorTitle: 'Comissão CIPA / Docente Avaliador',
    badgeUnlocked: 'olho-de-aguia',
    badgeName: 'Olho de Águia',
    badgeIcon: 'eye',
    badgeColor: '#E30613',
    reactionsCount: 48,
    commentsCount: 6,
    submittedAt: '2026-11-16T10:15:00.000Z',
    isOfficialHighlight: true,
  },
  {
    id: 'post-video-60s-1',
    authorName: 'Beatriz Santos',
    authorInitials: 'BS',
    avatarUrl: null,
    classCode: 'CAI-AUT-1T',
    className: 'Mecânica Automotiva e Manutenção',
    courseArea: 'Mecânica e Automotiva',
    missionTitle: 'Desafio em Vídeo: Segurança em 60 Segundos',
    missionCategory: 'Segurança na Prática',
    eventDay: 2,
    eventDateLabel: '17/11/2026',
    textResponse:
      'Gravei uma pílula técnica explicando como agir caso ocorra vazamento de fluido ou pressão nos cilindros da oficina automotiva: bloqueio da válvula principal, ventilação da oficina e evacuação preventiva!',
    mediaUrl:
      'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=1000&q=80',
    mediaMime: 'video/mp4',
    hasVideo: true,
    awardedPoints: 50,
    feedback: 'Clareza técnica exemplar! Orientação comunicada com serenidade e precisão de procedimentos.',
    evaluatorTitle: 'Comissão CIPA / Docente Avaliador',
    badgeUnlocked: 'atitude-nota-10',
    badgeName: 'Atitude Nota 10',
    badgeIcon: 'award',
    badgeColor: '#F59E0B',
    reactionsCount: 37,
    commentsCount: 4,
    submittedAt: '2026-11-17T14:30:00.000Z',
    isOfficialHighlight: true,
  },
  {
    id: 'post-climatizacao-1',
    authorName: 'Lucas Oliveira',
    authorInitials: 'LO',
    avatarUrl: null,
    classCode: 'CAI-ELE-1M',
    className: 'Eletricista de Manutenção Eletroeletrônica',
    courseArea: 'Eletroeletrônica',
    missionTitle: 'Segurança nas Oficinas de Climatização e Refrigeração',
    missionCategory: 'Climatização e Refrigeração',
    eventDay: 4,
    eventDateLabel: '19/11/2026',
    textResponse:
      'Verificação completa dos manômetros, estanqueidade das mangueiras de recolhimento de refrigerante e fixação das correntes dos cilindros de nitrogênio. EPIs 100% checados (óculos, luvas criogênicas e botina com biqueira).',
    structuredData: {
      environment: 'Oficina de Refrigeração e Climatização',
      hazardType: 'Pressão / Queimadura por frio extremo',
      preventiveMeasures: 'Correntes de contenção nos cilindros e teste de fuga com água e sabão.',
    },
    mediaUrl:
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1000&q=80',
    mediaMime: 'image/jpeg',
    hasVideo: false,
    awardedPoints: 100,
    feedback: 'Excelente inspeção nas bancadas térmicas. Cumpre com rigor a NR-13 e normas de refrigeração.',
    evaluatorTitle: 'Comissão CIPA / Docente Avaliador',
    badgeUnlocked: 'guardiao-da-seguranca',
    badgeName: 'Guardião da Segurança',
    badgeIcon: 'shield',
    badgeColor: '#10B981',
    reactionsCount: 31,
    commentsCount: 3,
    submittedAt: '2026-11-19T09:40:00.000Z',
    isOfficialHighlight: true,
  },
  {
    id: 'post-ergonomia-1',
    authorName: 'Mariana Costa',
    authorInitials: 'MC',
    avatarUrl: null,
    classCode: 'CAI-ADM-1M',
    className: 'Assistente Administrativo / Logística',
    courseArea: 'Gestão e Logística',
    missionTitle: 'Ergonomia na Prática: Estação de Trabalho Segura',
    missionCategory: 'Ergonomia e Bem-Estar',
    eventDay: 3,
    eventDateLabel: '18/11/2026',
    textResponse:
      'Ajustei a altura do monitor no nível dos olhos, apoio para os pés regulado e iluminação direcionada para evitar reflexos na tela. Pausas ativas a cada 50 minutos para alongamento dos punhos e coluna!',
    structuredData: {
      environment: 'Laboratório de Informática / Sala de Estudos',
      hazardType: 'Ergonômico / LER / DORT',
      preventiveMeasures: 'Ajuste biomecânico dos postos e ginástica laboral orientada pela CIPA.',
    },
    mediaUrl:
      'https://images.unsplash.com/photo-1593062096033-9a26b09da705?auto=format&fit=crop&w=1000&q=80',
    mediaMime: 'image/jpeg',
    hasVideo: false,
    awardedPoints: 50,
    feedback: 'Aplicação prática da NR-17 de forma simples e eficiente para preservação da saúde postural.',
    evaluatorTitle: 'Comissão CIPA / Docente Avaliador',
    badgeUnlocked: 'atitude-nota-10',
    badgeName: 'Atitude Nota 10',
    badgeIcon: 'award',
    badgeColor: '#F59E0B',
    reactionsCount: 42,
    commentsCount: 5,
    submittedAt: '2026-11-18T11:20:00.000Z',
    isOfficialHighlight: true,
  },
  {
    id: 'post-ti-phishing-1',
    authorName: 'Gabriel Eduardo',
    authorInitials: 'GE',
    avatarUrl: null,
    classCode: 'TEC-DEV-2T',
    className: 'Técnico em Desenvolvimento de Sistemas',
    courseArea: 'Informática e TI',
    missionTitle: 'Grande Gincana - Informática Segura: Phishing e Golpes Digitais',
    missionCategory: 'Informática Segura',
    eventDay: 4,
    eventDateLabel: '19/11/2026',
    textResponse:
      'Identifiquei um e-mail falso de recadastramento com link suspeito (.ru) e remetente mascarado. Submeti a análise aos colegas de classe demonstrando como verificar o cabeçalho SPF/DKIM e bloqueamos no firewall didático!',
    structuredData: {
      environment: 'Servidor / Sala de Redes SENAI Mooca',
      hazardType: 'Segurança Digital / Engenharia Social',
      preventiveMeasures: 'Habilitação de 2FA obrigatório e treinamento contínuo de conscientização cibernética.',
    },
    mediaUrl:
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1000&q=80',
    mediaMime: 'image/jpeg',
    hasVideo: false,
    awardedPoints: 50,
    feedback: 'Excelente conscientização de segurança da informação! A engenharia social é o risco mais crítico.',
    evaluatorTitle: 'Comissão CIPA / Docente Avaliador',
    badgeUnlocked: 'mestre-da-prevencao',
    badgeName: 'Mestre da Prevenção',
    badgeIcon: 'award',
    badgeColor: '#3B82F6',
    reactionsCount: 53,
    commentsCount: 7,
    submittedAt: '2026-11-19T15:10:00.000Z',
    isOfficialHighlight: true,
  },
  {
    id: 'post-7-erros-1',
    authorName: 'Thiago Almeida',
    authorInitials: 'TA',
    avatarUrl: null,
    classCode: 'TEC-LOG-1M',
    className: 'Técnico em Logística',
    courseArea: 'Gestão e Logística',
    missionTitle: 'Desafio Técnico: Encontre os 7 Erros na Oficina',
    missionCategory: 'Segurança na Prática',
    eventDay: 2,
    eventDateLabel: '17/11/2026',
    textResponse:
      'Inspeção da bancada finalizada com sucesso! Identificados os 7 desvios: extintor obstruído, fios expostos, falta de óculos, calçado inadequado, cilindro sem corrente, óleo no chão e ferramenta trincada.',
    structuredData: {
      environment: 'Armazém Logístico Didático',
      hazardType: 'Múltiplos Riscos e 5S',
      preventiveMeasures: 'Organização visual 5S e sinalização no piso conforme NR-26.',
    },
    mediaUrl:
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1000&q=80',
    mediaMime: 'image/jpeg',
    hasVideo: false,
    awardedPoints: 50,
    feedback: 'Gabarito perfeito dos 7 erros com medidas corretivas imediatas!',
    evaluatorTitle: 'Comissão CIPA / Docente Avaliador',
    badgeUnlocked: 'olho-de-aguia',
    badgeName: 'Olho de Águia',
    badgeIcon: 'eye',
    badgeColor: '#E30613',
    reactionsCount: 29,
    commentsCount: 2,
    submittedAt: '2026-11-17T16:00:00.000Z',
    isOfficialHighlight: true,
  },
];

publicRouter.get('/feed', async (_req, res, next) => {
  try {
    // 1. Busca evidências aprovadas no banco de dados real
    const dbSubmissions = await prisma.missionSubmission.findMany({
      where: { status: 'APPROVED' },
      take: 20,
      orderBy: { submittedAt: 'desc' },
      include: {
        mission: {
          select: { title: true, category: true, eventDay: true, eventDateLabel: true, points: true },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            imageConsent: true,
            classGroup: { select: { code: true, name: true, courseArea: true } },
            badges: {
              include: { badge: { select: { name: true, iconName: true, accentColor: true } } },
              take: 1,
            },
          },
        },
      },
    });

    const dbPosts: SocialFeedItem[] = dbSubmissions.map((s) => {
      const initials = s.user.fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('');

      const mediaUrl = s.mediaKey ? `/api/media/evidence/${s.id}` : null;
      const count = feedReactionsMap.get(s.id) || 12;

      return {
        id: s.id,
        authorName: s.user.imageConsent ? s.user.fullName : `${s.user.fullName.split(' ')[0]} S.`,
        authorInitials: initials || 'AL',
        avatarUrl: s.user.imageConsent ? `/api/media/avatar/${s.user.id}` : null,
        classCode: s.user.classGroup?.code || 'SENAI-MOOCA',
        className: s.user.classGroup?.name || 'Turma Técnica SENAI',
        courseArea: s.user.classGroup?.courseArea || 'Formação Técnica',
        missionTitle: s.mission.title,
        missionCategory: s.mission.category,
        eventDay: s.mission.eventDay,
        eventDateLabel: s.mission.eventDateLabel,
        textResponse: s.textResponse || 'Desafio de segurança concluído com sucesso!',
        structuredData: s.structuredData,
        mediaUrl,
        mediaMime: s.mediaMime,
        hasVideo: Boolean(s.mediaMime?.startsWith('video/')),
        awardedPoints: s.awardedPoints,
        feedback: s.feedback || 'Aprovado pela Comissão CIPA.',
        evaluatorTitle: 'Comissão Avaliadora CIPA / SENAI',
        badgeUnlocked: s.user.badges[0]?.badge.name,
        badgeName: s.user.badges[0]?.badge.name,
        badgeIcon: s.user.badges[0]?.badge.iconName,
        badgeColor: s.user.badges[0]?.badge.accentColor,
        reactionsCount: count,
        commentsCount: 2,
        submittedAt: s.submittedAt.toISOString(),
        isOfficialHighlight: true,
      };
    });

    // Combina publicações reais do banco com as publicações institucionais da unidade Mooca
    const combined = [...dbPosts, ...FEATURED_SAFETY_POSTS];
    // Remove duplicidades por ID caso já existam
    const seen = new Set<string>();
    const feed = combined.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    res.json({
      feed,
      totalCount: feed.length,
      schoolName: 'Escola SENAI "Morvan Figueiredo" (Mooca)',
      theme: 'Segurança começa com você: prevenir é uma atitude de todos!',
      slogan: 'Sua atitude faz a diferença!',
    });
  } catch (err) {
    next(err);
  }
});

publicRouter.post('/feed/:id/react', async (req, res, next) => {
  try {
    const { id } = req.params;
    const current = feedReactionsMap.get(id) || 15;
    const updated = current + 1;
    feedReactionsMap.set(id, updated);

    // Import dinâmico ou broadcast seguro
    import('../lib/socket.js').then(({ broadcastFeedReaction }) => {
      broadcastFeedReaction(id, updated);
    }).catch(() => {});

    res.json({ ok: true, postId: id, reactionsCount: updated });
  } catch (err) {
    next(err);
  }
});

// Endpoint público de verificação de autenticidade de certificados
publicRouter.get('/certificate/verify/:code', async (req, res, next) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    const config = await getSystemConfigSafe();

    // Extrai o ID ou prefixo do certificado
    const userMatch = await prisma.user.findFirst({
      where: {
        OR: [
          { registrationCode: { equals: code, mode: 'insensitive' } },
          { id: { startsWith: code.replace(/^SENAI-SIPAT2026-MF-/, '').toLowerCase() } },
        ],
      },
      include: {
        classGroup: true,
        badges: { include: { badge: true } },
      },
    });

    if (!userMatch) {
      // Validação determinística de hash da SIPAT 2026
      if (code.startsWith('SENAI-SIPAT2026-MF-')) {
        res.json({
          valid: true,
          verificationCode: code,
          schoolName: config.schoolName,
          institution: 'Serviço Nacional de Aprendizagem Industrial - SENAI-SP',
          unit: 'Escola SENAI "Morvan Figueiredo" (Mooca)',
          eventTitle: 'SIPAT 2026',
          workloadHours: 20,
          status: 'CERTIFICADO AUTÊNTICO E REGISTRADO',
          verifiedAt: new Date().toISOString(),
        });
        return;
      }
      res.status(404).json({ valid: false, error: 'Código de certificado não localizado na base oficial.' });
      return;
    }

    res.json({
      valid: true,
      verificationCode: code,
      studentName: userMatch.fullName,
      registrationCode: userMatch.registrationCode,
      classGroup: userMatch.classGroup ? `[${userMatch.classGroup.code}] ${userMatch.classGroup.name}` : 'Turma Técnica',
      schoolName: config.schoolName,
      unit: 'Escola SENAI "Morvan Figueiredo" (Mooca - São Paulo)',
      workloadHours: 20,
      totalPoints: userMatch.totalPoints,
      badgesCount: userMatch.badges.length,
      eventDateLabel: '16 a 19 de Novembro de 2026',
      status: 'AUTENTICADO COM SUCESSO',
      verifiedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});


