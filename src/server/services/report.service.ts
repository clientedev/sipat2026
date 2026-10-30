import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Role, SubmissionStatus } from '@prisma/client';
import { calculateLevelInfo } from '../../shared/constants.js';
import { prisma } from '../lib/prisma.js';
import { buildPublicOverviewData, buildPublicRankingData, getSystemConfigSafe } from './ranking.service.js';

function styleHeaderRow(row: ExcelJS.Row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0047B6' },
    };
    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 11,
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
}

export async function generateGeneralExcelReport(): Promise<Buffer> {
  const [config, ranking, overview, missions, quizzes, approvedEvidences] = await Promise.all([
    getSystemConfigSafe(),
    buildPublicRankingData({ unmaskedForStaff: true }),
    buildPublicOverviewData(),
    prisma.mission.findMany({
      include: {
        submissions: { select: { status: true } },
      },
      orderBy: [{ eventDay: 'asc' }, { sortOrder: 'asc' }],
    }),
    prisma.quiz.findMany({
      include: {
        attempts: { where: { completedAt: { not: null } } },
      },
      orderBy: [{ eventDay: 'asc' }, { sortOrder: 'asc' }],
    }),
    prisma.missionSubmission.findMany({
      where: { status: SubmissionStatus.APPROVED },
      include: {
        user: { include: { classGroup: true } },
        mission: true,
        evaluatedBy: { select: { fullName: true } },
      },
      orderBy: { evaluatedAt: 'desc' },
    }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = config.schoolName;
  workbook.created = new Date();

  // ABA 1: Resumo Geral
  const wsSummary = workbook.addWorksheet('Resumo Geral');
  wsSummary.columns = [
    { header: 'Indicador Institucional – SIPAT 2026', key: 'metric', width: 46 },
    { header: 'Resultado', key: 'value', width: 38 },
  ];
  styleHeaderRow(wsSummary.getRow(1));
  wsSummary.addRows([
    { metric: 'Unidade Escolar', value: config.schoolName },
    { metric: 'Evento', value: config.eventTitle },
    { metric: 'Tema Oficial', value: config.eventTheme },
    { metric: 'Slogan', value: config.eventSlogan },
    { metric: 'Data de Geração do Relatório', value: new Date().toLocaleString('pt-BR') },
    { metric: 'Total de Participantes Inscritos', value: overview.indicators.totalRegistered },
    { metric: 'Participantes Ativos (com atividades realizadas)', value: overview.indicators.activeParticipants },
    { metric: 'Taxa de Engajamento (%)', value: `${overview.indicators.participationRatePercent}%` },
    { metric: 'Total de Evidências Enviadas', value: overview.indicators.evidencesSent },
    { metric: 'Missões Aprovadas', value: overview.indicators.missionsCompleted },
    { metric: 'Quizzes Respondidos', value: overview.indicators.quizzesCompleted },
    { metric: 'Medalhas Desbloqueadas', value: overview.indicators.badgesUnlocked },
    { metric: 'Pontuação Total Acumulada', value: overview.indicators.totalPointsAccumulated },
  ]);

  // ABA 2: Ranking Individual
  const wsUsers = workbook.addWorksheet('Ranking Individual');
  wsUsers.columns = [
    { header: 'Posição', key: 'position', width: 10 },
    { header: 'Participante', key: 'name', width: 34 },
    { header: 'Turma / Setor', key: 'className', width: 36 },
    { header: 'Área Tecnológica', key: 'courseArea', width: 26 },
    { header: 'Nível', key: 'level', width: 26 },
    { header: 'Pontuação', key: 'points', width: 14 },
    { header: 'Missões Aprovadas', key: 'missions', width: 18 },
    { header: 'Quizzes Concluídos', key: 'quizzes', width: 18 },
    { header: 'Medalhas', key: 'badges', width: 32 },
  ];
  styleHeaderRow(wsUsers.getRow(1));

  const allParticipants = await prisma.user.findMany({
    where: { role: Role.PARTICIPANT, isActive: true, anonymizedAt: null },
    include: {
      classGroup: true,
      badges: { include: { badge: true } },
      _count: {
        select: {
          submissions: { where: { status: SubmissionStatus.APPROVED } },
          quizAttempts: { where: { completedAt: { not: null } } },
        },
      },
    },
    orderBy: [{ totalPoints: 'desc' }, { createdAt: 'asc' }],
  });

  allParticipants.forEach((u, idx) => {
    const lvl = calculateLevelInfo(u.totalPoints);
    wsUsers.addRow({
      position: idx + 1,
      name: u.fullName,
      className: u.classGroup?.name || 'Sem turma',
      courseArea: u.classGroup?.courseArea || '-',
      level: `Nível ${lvl.level} – ${lvl.title}`,
      points: u.totalPoints,
      missions: u._count.submissions,
      quizzes: u._count.quizAttempts,
      badges: u.badges.map((b) => b.badge.name).join(', ') || '-',
    });
  });

  // ABA 3: Distribuição por Turma
  const wsClasses = workbook.addWorksheet('Distribuição por Turma');
  wsClasses.columns = [
    { header: 'Posição', key: 'position', width: 10 },
    { header: 'Código', key: 'code', width: 16 },
    { header: 'Turma', key: 'name', width: 42 },
    { header: 'Área', key: 'courseArea', width: 26 },
    { header: 'Turno', key: 'shift', width: 14 },
    { header: 'Participantes', key: 'participantsCount', width: 16 },
    { header: 'Pontos Acumulados', key: 'totalPoints', width: 18 },
    { header: 'Média por Participante', key: 'averagePoints', width: 22 },
    { header: 'Atividades Concluídas', key: 'completedActivities', width: 22 },
  ];
  styleHeaderRow(wsClasses.getRow(1));
  ranking.classRanking.forEach((cls) => wsClasses.addRow(cls));

  // ABA 4: Missões Realizadas & Desempenho
  const wsMissions = workbook.addWorksheet('Missões Realizadas');
  wsMissions.columns = [
    { header: 'Dia SIPAT', key: 'day', width: 14 },
    { header: 'Título da Missão', key: 'title', width: 40 },
    { header: 'Categoria', key: 'category', width: 26 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Pontos Máx.', key: 'points', width: 14 },
    { header: 'Total Envios', key: 'total', width: 14 },
    { header: 'Aprovadas', key: 'approved', width: 14 },
    { header: 'Pendentes', key: 'pending', width: 14 },
    { header: 'Correção / Reprov.', key: 'other', width: 18 },
  ];
  styleHeaderRow(wsMissions.getRow(1));
  missions.forEach((m) => {
    const approved = m.submissions.filter((s) => s.status === 'APPROVED').length;
    const pending = m.submissions.filter((s) => s.status === 'PENDING').length;
    const other = m.submissions.length - approved - pending;
    wsMissions.addRow({
      day: `Dia ${m.eventDay} (${m.eventDateLabel})`,
      title: m.title,
      category: m.category,
      status: m.status,
      points: m.points,
      total: m.submissions.length,
      approved,
      pending,
      other,
    });
  });

  // ABA 5: Quizzes Respondidos
  const wsQuizzes = workbook.addWorksheet('Quizzes Respondidos');
  wsQuizzes.columns = [
    { header: 'Dia SIPAT', key: 'day', width: 14 },
    { header: 'Quiz', key: 'title', width: 44 },
    { header: 'Categoria', key: 'category', width: 24 },
    { header: 'Tentativas Concluídas', key: 'attempts', width: 22 },
    { header: 'Aproveitamento Médio (%)', key: 'avgScore', width: 24 },
    { header: 'Pontos Distribuídos', key: 'totalAwarded', width: 20 },
  ];
  styleHeaderRow(wsQuizzes.getRow(1));
  quizzes.forEach((q) => {
    const count = q.attempts.length;
    const avgScore =
      count > 0
        ? Math.round((q.attempts.reduce((a, b) => a + b.scorePercent, 0) / count) * 10) / 10
        : 0;
    const totalAwarded = q.attempts.reduce((a, b) => a + b.awardedPoints, 0);
    wsQuizzes.addRow({
      day: `Dia ${q.eventDay} (${q.eventDateLabel})`,
      title: q.title,
      category: q.category,
      attempts: count,
      avgScore: `${avgScore}%`,
      totalAwarded,
    });
  });

  // ABA 6: Participação por Dia e Evidências Aprovadas
  const wsDaily = workbook.addWorksheet('Participação Diária');
  wsDaily.columns = [
    { header: 'Data', key: 'date', width: 18 },
    { header: 'Evidências Enviadas', key: 'evidencesSent', width: 22 },
    { header: 'Quizzes Respondidos', key: 'quizzesAnswered', width: 22 },
    { header: 'Pontos Gerados no Dia', key: 'pointsGenerated', width: 22 },
  ];
  styleHeaderRow(wsDaily.getRow(1));
  overview.evolution.forEach((ev) => wsDaily.addRow(ev));

  const wsApproved = workbook.addWorksheet('Evidências Aprovadas');
  wsApproved.columns = [
    { header: 'Data Aprovação', key: 'date', width: 20 },
    { header: 'Participante', key: 'participant', width: 32 },
    { header: 'Turma', key: 'classGroup', width: 32 },
    { header: 'Missão', key: 'mission', width: 36 },
    { header: 'Pontos', key: 'points', width: 12 },
    { header: 'Avaliador', key: 'evaluator', width: 28 },
    { header: 'Parecer', key: 'feedback', width: 40 },
  ];
  styleHeaderRow(wsApproved.getRow(1));
  approvedEvidences.forEach((ev) => {
    wsApproved.addRow({
      date: (ev.evaluatedAt || ev.submittedAt).toLocaleString('pt-BR'),
      participant: ev.user.fullName,
      classGroup: ev.user.classGroup?.name || '-',
      mission: ev.mission.title,
      points: ev.awardedPoints,
      evaluator: ev.evaluatedBy?.fullName || 'Automático',
      feedback: ev.feedback || '-',
    });
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function generateRiskHuntExcelReport(): Promise<Buffer> {
  const config = await getSystemConfigSafe();
  const submissions = await prisma.missionSubmission.findMany({
    where: {
      OR: [
        { mission: { slug: 'caca-aos-riscos' } },
        { mission: { submissionType: 'RISK_HUNT' } },
      ],
    },
    include: {
      user: { include: { classGroup: true } },
      mission: true,
      evaluatedBy: { select: { fullName: true } },
    },
    orderBy: { submittedAt: 'desc' },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = config.schoolName;
  const ws = workbook.addWorksheet('Relatório Caça aos Riscos');
  ws.columns = [
    { header: 'Data/Hora', key: 'submittedAt', width: 20 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Ambiente / Local Correspondente', key: 'environment', width: 32 },
    { header: 'Classificação do Risco', key: 'hazardType', width: 24 },
    { header: 'Situação Identificada / Perigo', key: 'hazardDescription', width: 44 },
    { header: 'Possíveis Consequências', key: 'consequences', width: 40 },
    { header: 'Medidas Preventivas Sugeridas', key: 'preventiveMeasures', width: 44 },
    { header: 'Participante', key: 'participant', width: 28 },
    { header: 'Turma', key: 'classGroup', width: 30 },
    { header: 'Pontos', key: 'points', width: 12 },
    { header: 'Parecer Técnico', key: 'feedback', width: 36 },
  ];
  styleHeaderRow(ws.getRow(1));

  for (const sub of submissions) {
    const data = (sub.structuredData as Record<string, string> | null) || {};
    ws.addRow({
      submittedAt: sub.submittedAt.toLocaleString('pt-BR'),
      status: sub.status,
      environment: data.environment || 'Não especificado',
      hazardType: data.hazardType || 'Geral',
      hazardDescription: data.hazardDescription || sub.textResponse || '-',
      consequences: data.consequences || '-',
      preventiveMeasures: data.preventiveMeasures || '-',
      participant: sub.user.fullName,
      classGroup: sub.user.classGroup?.name || '-',
      points: sub.awardedPoints,
      feedback: sub.feedback || '-',
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function generateGeneralPdfReport(): Promise<Buffer> {
  const [config, ranking, overview] = await Promise.all([
    getSystemConfigSafe(),
    buildPublicRankingData({ unmaskedForStaff: true }),
    buildPublicOverviewData(),
  ]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 42 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Cabeçalho Institucional SENAI
    doc.rect(0, 0, doc.page.width, 92).fill('#0047B6');
    doc.rect(0, 92, doc.page.width, 6).fill('#FFB800');

    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18).text(config.schoolName, 42, 24);
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#E2E8F0')
      .text(`${config.eventTitle} – Relatório Executivo Geral de Resultados`, 42, 48);
    doc
      .fontSize(9)
      .fillColor('#FFB800')
      .text(`Tema: ${config.eventTheme} | Gerado em ${new Date().toLocaleString('pt-BR')}`, 42, 68);

    doc.y = 118;
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(13).text('1. Indicadores Gerais da Competição');
    doc.moveDown(0.5);

    const kpis = [
      `Participantes Inscritos: ${overview.indicators.totalRegistered} (Ativos: ${overview.indicators.activeParticipants} – ${overview.indicators.participationRatePercent}%)`,
      `Evidências Enviadas: ${overview.indicators.evidencesSent} | Missões Concluídas/Aprovadas: ${overview.indicators.missionsCompleted}`,
      `Quizzes Respondidos: ${overview.indicators.quizzesCompleted} | Medalhas Desbloqueadas: ${overview.indicators.badgesUnlocked}`,
      `Pontuação Coletiva Acumulada: ${overview.indicators.totalPointsAccumulated} pontos`,
    ];

    doc.font('Helvetica').fontSize(10).fillColor('#334155');
    for (const line of kpis) {
      doc.text(`• ${line}`, { lineGap: 4 });
    }

    doc.moveDown(1);
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(13).text('2. Top 15 – Ranking Individual');
    doc.moveDown(0.4);

    doc.font('Helvetica').fontSize(9.5).fillColor('#1E293B');
    if (ranking.individualRanking.length === 0) {
      doc.text('Nenhum participante registrado até o momento.');
    } else {
      ranking.individualRanking.slice(0, 15).forEach((p) => {
        doc.text(
          `${String(p.position).padStart(2, '0')}º  ${p.displayName}  (${p.classGroup?.code || 'S/T'}) — ${p.totalPoints} pts | ${p.completedActivities} ativ. | ${p.badgesCount} medalha(s)`,
          { lineGap: 3 }
        );
      });
    }

    doc.moveDown(1);
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(13).text('3. Desempenho e Distribuição por Turmas');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9.5).fillColor('#1E293B');
    ranking.classRanking.forEach((cls) => {
      doc.text(
        `${String(cls.position).padStart(2, '0')}º  [${cls.code}] ${cls.name} — ${cls.participantsCount} inscritos | ${cls.totalPoints} pts (Média: ${cls.averagePoints} pts)`,
        { lineGap: 3 }
      );
    });

    doc.moveDown(1);
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(13).text('4. Missões Realizadas por Dia');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9.5).fillColor('#1E293B');
    overview.missionsProgress.forEach((m) => {
      doc.text(
        `Dia ${m.eventDay} (${m.eventDateLabel}) – ${m.title} [${m.status}] — ${m.submissionsCount} envio(s) (${m.points} pts)`,
        { lineGap: 3 }
      );
    });

    doc.end();
  });
}

export async function generateRiskHuntPdfReport(): Promise<Buffer> {
  const config = await getSystemConfigSafe();
  const submissions = await prisma.missionSubmission.findMany({
    where: {
      OR: [
        { mission: { slug: 'caca-aos-riscos' } },
        { mission: { submissionType: 'RISK_HUNT' } },
      ],
    },
    include: {
      user: { include: { classGroup: true } },
    },
    orderBy: { submittedAt: 'desc' },
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 42 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, doc.page.width, 90).fill('#0047B6');
    doc.rect(0, 90, doc.page.width, 6).fill('#FFB800');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(17).text(config.schoolName, 42, 22);
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#E2E8F0')
      .text('Relatório Técnico Consolidado – Atividade "Caça aos Riscos" (SIPAT 2026)', 42, 46);
    doc
      .fontSize(9)
      .fillColor('#FFB800')
      .text(
        `Total de mapeamentos registrados: ${submissions.length} | Emitido em ${new Date().toLocaleString('pt-BR')}`,
        42,
        66
      );

    doc.y = 114;

    if (submissions.length === 0) {
      doc
        .fillColor('#334155')
        .font('Helvetica')
        .fontSize(11)
        .text('Nenhum registro da atividade Caça aos Riscos foi submetido até o momento.');
    } else {
      submissions.forEach((sub, idx) => {
        if (doc.y > 680) {
          doc.addPage();
        }
        const data = (sub.structuredData as Record<string, string> | null) || {};
        doc
          .fillColor('#0047B6')
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(
            `#${idx + 1} – Ambiente: ${data.environment || 'Área Escolar'}  [${sub.status}]`
          );
        doc
          .fillColor('#475569')
          .font('Helvetica')
          .fontSize(9)
          .text(
            `Registrado por: ${sub.user.fullName} (${sub.user.classGroup?.code || 'S/T'}) em ${sub.submittedAt.toLocaleString('pt-BR')} | Tipo de Risco: ${data.hazardType || 'Geral'}`
          );
        doc.moveDown(0.25);
        doc
          .fillColor('#0F172A')
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .text('Situação / Perigo Identificado: ', { continued: true })
          .font('Helvetica')
          .text(data.hazardDescription || sub.textResponse || '-');
        doc
          .font('Helvetica-Bold')
          .text('Possíveis Consequências: ', { continued: true })
          .font('Helvetica')
          .text(data.consequences || '-');
        doc
          .font('Helvetica-Bold')
          .text('Medidas Preventivas Sugeridas: ', { continued: true })
          .font('Helvetica')
          .text(data.preventiveMeasures || '-');

        doc.moveDown(0.6);
        doc
          .moveTo(42, doc.y)
          .lineTo(doc.page.width - 42, doc.y)
          .strokeColor('#CBD5E1')
          .stroke();
        doc.moveDown(0.6);
      });
    }

    doc.end();
  });
}

export async function generateQrPosterPdf(params: {
  registrationUrl: string;
  code: string;
  label: string;
}): Promise<Buffer> {
  const config = await getSystemConfigSafe();
  const qrPngBuffer = await QRCode.toBuffer(params.registrationUrl, {
    type: 'png',
    width: 480,
    margin: 2,
    color: {
      dark: '#002B5C',
      light: '#FFFFFF',
    },
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Topo Institucional Azul SENAI + Faixa Amarela de Segurança
    doc.rect(0, 0, doc.page.width, 140).fill('#0047B6');
    doc.rect(0, 140, doc.page.width, 10).fill('#FFB800');

    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(13)
      .text(config.schoolName.toUpperCase(), 40, 32, { align: 'center' });
    doc
      .font('Helvetica-Bold')
      .fontSize(30)
      .fillColor('#FFFFFF')
      .text('SIPAT 2026', 40, 56, { align: 'center' });
    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor('#E2E8F0')
      .text('16 a 19 de Novembro de 2026 • Semana Interna de Prevenção de Acidentes do Trabalho', 40, 96, {
        align: 'center',
      });

    doc.y = 178;
    doc
      .fillColor('#0F172A')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(`"${config.eventTheme}"`, { align: 'center' });
    doc.moveDown(0.3);
    doc
      .fillColor('#0047B6')
      .font('Helvetica-Bold')
      .fontSize(13)
      .text(config.eventSlogan.toUpperCase(), { align: 'center' });

    // Moldura do QR Code
    const qrBoxSize = 260;
    const qrX = (doc.page.width - qrBoxSize) / 2;
    const qrY = 255;

    doc
      .roundedRect(qrX - 14, qrY - 14, qrBoxSize + 28, qrBoxSize + 28, 8)
      .lineWidth(3)
      .strokeColor('#0047B6')
      .stroke();

    doc.image(qrPngBuffer, qrX, qrY, { width: qrBoxSize, height: qrBoxSize });

    doc.y = qrY + qrBoxSize + 34;
    doc
      .fillColor('#0F172A')
      .font('Helvetica-Bold')
      .fontSize(15)
      .text('ESCANEIE O QR CODE COM SEU CELULAR E INSCREVA-SE!', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fillColor('#334155')
      .font('Helvetica')
      .fontSize(11)
      .text(
        'Participe das Missões Diárias, Caça aos Riscos, Quizzes Técnicos e Grande Gincana.\nAcumule pontos, desbloqueie medalhas e represente sua turma no Ranking Ao Vivo!',
        { align: 'center', lineGap: 4 }
      );

    doc.moveDown(1.2);
    doc
      .fillColor('#475569')
      .font('Helvetica')
      .fontSize(9.5)
      .text(`Link direto de acesso: ${params.registrationUrl}`, { align: 'center' });
    doc
      .fontSize(8.5)
      .fillColor('#64748B')
      .text(`Código da Campanha: ${params.code} • ${params.label}`, { align: 'center' });

    // Rodapé de Sinalização Preventiva
    doc.rect(0, doc.page.height - 44, doc.page.width, 44).fill('#0F172A');
    doc
      .fillColor('#FFB800')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(
        'SEGURANÇA COMEÇA COM VOCÊ • SUA ATITUDE FAZ A DIFERENÇA!',
        40,
        doc.page.height - 27,
        { align: 'center' }
      );

    doc.end();
  });
}

