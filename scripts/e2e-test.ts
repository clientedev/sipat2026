import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io as ioClient } from 'socket.io-client';
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const TEST_PORT = 3099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const prisma = new PrismaClient();

// Minimal valid 1x1 PNG buffer (passes magic byte signature check: 89 50 4E 47)
const VALID_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Minimal valid ISO MP4 header buffer (passes magic byte signature check: bytes 4..7 == 'ftyp')
const VALID_MP4_BUFFER = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, // size=24, 'ftyp'
  0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00, // 'isom'
  0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
]);

async function waitForHealth(timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE_URL}/api/health`);
      if (r.ok) return await r.json();
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Timeout aguardando inicialização de produção em /api/health');
}

async function jsonReq(path: string, opts: RequestInit = {}, token?: string) {
  const headers = new Headers(opts.headers || {});
  if (!(opts.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

async function runTests() {
  console.log('======================================================================');
  console.log(' INICIANDO BATERIA E2E EM AMBIENTE DE PRODUÇÃO – SIPAT 2026 SENAI');
  console.log('======================================================================');

  // Inicia o servidor real compilado (simulando inicialização no Railway com PORT dinâmica)
  const serverProc = spawn(process.execPath, ['dist/server/index.js'], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(TEST_PORT),
      COOKIE_SECURE: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProc.stdout.on('data', (chunk) => process.stdout.write(`[PROD-SERVER] ${chunk}`));
  serverProc.stderr.on('data', (chunk) => process.stderr.write(`[PROD-ERR] ${chunk}`));

  const createdTestEmails: string[] = [];
  let createdScheduledMissionId: string | null = null;

  try {
    // 1. Healthcheck, PostgreSQL & SPA Production Assets
    const health = await waitForHealth();
    assert.equal(health.status, 'ok');
    assert.equal(health.database.connected, true);
    assert.equal(health.database.provider, 'postgresql');
    assert.equal(health.scheduler.running, true);
    console.log('✔ [1/10] Produção iniciada com PostgreSQL conectado e /api/health OK');

    for (const spaRoute of ['/', '/ranking', '/acompanhamento', '/inscricao', '/manifest.webmanifest', '/sw.js']) {
      const r = await fetch(`${BASE_URL}${spaRoute}`);
      assert.equal(r.status, 200, `Rota pública/PWA ${spaRoute} deveria retornar 200`);
    }
    console.log('✔ [2/10] Páginas públicas, Modo TV Mobile/Desktop e arquivos PWA validados');

    // 2. Autenticação Admin e Avaliador + Ciclo Completo de QR Code (PNG e PDF)
    const adminLogin = await jsonReq('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: process.env.INITIAL_ADMIN_EMAIL || 'admin.sipat@senai.br',
        password: process.env.INITIAL_ADMIN_PASSWORD || 'Sipat@Senai2026!ChangeMe',
      }),
    });
    assert.equal(adminLogin.status, 200, 'Login do SuperAdmin falhou');
    const adminToken = adminLogin.data.token as string;

    const evalLogin = await jsonReq('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: process.env.INITIAL_EVALUATOR_EMAIL || 'avaliador.sipat@senai.br',
        password: process.env.INITIAL_EVALUATOR_PASSWORD || 'Avalia@Senai2026!ChangeMe',
      }),
    });
    assert.equal(evalLogin.status, 200, 'Login do Avaliador falhou');
    const evalToken = evalLogin.data.token as string;

    // RBAC Check: Avaliador não pode regenerar QR Code nem acessar /staff
    const evalForbiddenQr = await jsonReq('/api/admin/qr', {}, evalToken);
    assert.equal(evalForbiddenQr.status, 403, 'Avaliador não deve acessar gestão de QR Code');

    const qrPngRes = await fetch(`${BASE_URL}/api/admin/qr/download/png`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(qrPngRes.status, 200);
    const pngBytes = Buffer.from(await qrPngRes.arrayBuffer());
    assert.equal(pngBytes[0], 0x89);
    assert.equal(pngBytes[1], 0x50);

    const qrPdfRes = await fetch(`${BASE_URL}/api/admin/qr/download/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(qrPdfRes.status, 200);
    const pdfBytes = Buffer.from(await qrPdfRes.arrayBuffer());
    assert.equal(pdfBytes.subarray(0, 5).toString('ascii'), '%PDF-');

    const regenRes = await jsonReq(
      '/api/admin/qr/regenerate',
      { method: 'POST', body: JSON.stringify({ label: 'QR E2E Teste' }) },
      adminToken
    );
    assert.equal(regenRes.status, 201);
    const activeQrCode = regenRes.data.qr.code as string;

    const qrPublicValid = await jsonReq(`/api/public/qr/${activeQrCode}`);
    assert.equal(qrPublicValid.status, 200);
    console.log('✔ [3/10] Autenticação RBAC e QR Code (PNG, Cartaz PDF, Regeneração e Validação) OK');

    // 3. Conectar WebSocket em Tempo Real + Inscrição Mobile do Aluno com Foto e Anti-Duplicidade
    const wsEvents: string[] = [];
    const socket = ioClient(BASE_URL, {
      transports: ['websocket'],
    });
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Timeout WebSocket')), 5000);
      socket.on('connect', () => {
        clearTimeout(t);
        resolve();
      });
    });
    socket.on('ranking:updated', () => wsEvents.push('ranking:updated'));
    socket.on('activity:released', () => wsEvents.push('activity:released'));
    socket.onAny((event) => {
      if (typeof event === 'string' && !wsEvents.includes(event)) {
        wsEvents.push(event);
      }
    });

    const pubConfig = await jsonReq('/api/public/config');
    assert.equal(pubConfig.status, 200);
    assert.equal(pubConfig.data.schoolName, 'Escola SENAI "Morvan Figueiredo"');
    const targetClassId = pubConfig.data.classes[0].id as string;

    const studentEmail = `aluno.e2e.${Date.now()}@teste.senai.br`;
    const studentRegCode = `RAE2E${Date.now().toString().slice(-5)}`;
    createdTestEmails.push(studentEmail);

    const regForm = new FormData();
    regForm.append('fullName', 'Henrique Souza Teste');
    regForm.append('email', studentEmail);
    regForm.append('registrationCode', studentRegCode);
    regForm.append('classGroupId', targetClassId);
    regForm.append('password', 'SipatAluno@2026');
    regForm.append('qrCode', activeQrCode);
    regForm.append('isMinor', 'true');
    regForm.append('guardianName', 'Carlos Souza');
    regForm.append('lgpdAccepted', 'true');
    regForm.append('imageConsent', 'false');
    regForm.append(
      'avatar',
      new Blob([VALID_PNG_BUFFER], { type: 'image/png' }),
      'selfie-celular.png'
    );

    const studentReg = await jsonReq('/api/auth/register', {
      method: 'POST',
      body: regForm,
    });
    assert.equal(studentReg.status, 201, `Falha no registro: ${JSON.stringify(studentReg.data)}`);
    const studentToken = studentReg.data.token as string;
    const studentId = studentReg.data.user.id as string;

    // Verifica bloqueio de duplicidade
    const dupReg = await jsonReq('/api/auth/register', {
      method: 'POST',
      body: regForm,
    });
    assert.equal(dupReg.status, 409, 'Deveria impedir cadastro duplicado');

    // Verifica recuperação de acesso
    const recoverRes = await jsonReq('/api/auth/recover-access', {
      method: 'POST',
      body: JSON.stringify({
        email: studentEmail,
        registrationCode: studentRegCode,
        newPassword: 'NovaSenhaAluno@2026',
      }),
    });
    assert.equal(recoverRes.status, 200);
    console.log('✔ [4/10] Inscrição via QR Code Mobile com foto, proteção anti-duplicidade, menor LGPD e recuperação de senha OK');

    // 4. Envio de Evidências: Caça aos Riscos (Foto), Segurança em 60s (Vídeo) e 7 Erros (Auto)
    const dashRes = await jsonReq('/api/participant/dashboard', {}, studentToken);
    assert.equal(dashRes.status, 200);

    const riskHuntMission = dashRes.data.missions.find((m: any) => m.slug === 'caca-aos-riscos');
    const videoMission = dashRes.data.missions.find(
      (m: any) => m.slug === 'seguranca-em-60-segundos'
    );
    const sevenErrorsMission = dashRes.data.missions.find(
      (m: any) => m.slug === 'encontre-os-7-erros'
    );
    assert.ok(riskHuntMission && videoMission && sevenErrorsMission);

    // Envia Caça aos Riscos com Foto
    const rhForm = new FormData();
    rhForm.append(
      'structuredData',
      JSON.stringify({
        environment: 'Escadaria Bloco Oficina Climatização',
        hazardType: 'Mecânico / Acidente',
        hazardDescription: 'Fita antiderrapante desgastada no segundo lance de degraus',
        consequences: 'Risco de escorregamento e queda em nível diferente',
        preventiveMeasures: 'Sinalizar degrau e substituir fita abrasiva antiderrapante',
      })
    );
    rhForm.append('textResponse', 'Identificação preventiva na escadaria');
    rhForm.append(
      'media',
      new Blob([VALID_PNG_BUFFER], { type: 'image/png' }),
      'evidencia-risco.png'
    );

    const rhSubmit = await jsonReq(
      `/api/participant/missions/${riskHuntMission.id}/submit`,
      { method: 'POST', body: rhForm },
      studentToken
    );
    assert.equal(rhSubmit.status, 201);
    const rhSubmissionId = rhSubmit.data.submission.id as string;

    // Verifica privacidade LGPD da evidência: visitante anônimo deve receber 403!
    const anonMediaAttempt = await fetch(`${BASE_URL}/api/media/evidence/${rhSubmissionId}`);
    assert.equal(
      anonMediaAttempt.status,
      403,
      'Evidência deveria estar bloqueada para público não autenticado (LGPD)'
    );

    // Avaliador autenticado deve conseguir visualizar a mídia privada (200)
    const evalMediaAttempt = await fetch(`${BASE_URL}/api/media/evidence/${rhSubmissionId}`, {
      headers: { Authorization: `Bearer ${evalToken}` },
    });
    assert.equal(evalMediaAttempt.status, 200);

    // Envia vídeo em Segurança em 60 Segundos
    const vidForm = new FormData();
    vidForm.append(
      'textResponse',
      'Orientação em vídeo sobre isolamento da área e comunicação imediata ao docente.'
    );
    vidForm.append(
      'media',
      new Blob([VALID_MP4_BUFFER], { type: 'video/mp4' }),
      'seguranca-60s.mp4'
    );
    const vidSubmit = await jsonReq(
      `/api/participant/missions/${videoMission.id}/submit`,
      { method: 'POST', body: vidForm },
      studentToken
    );
    assert.equal(vidSubmit.status, 201);

    // Envia Desafio Encontre os 7 Erros (correção automática no backend)
    const seForm = new FormData();
    seForm.append(
      'structuredData',
      JSON.stringify({
        selectedIds: ['err1', 'err2', 'err3', 'err4', 'err5', 'err6', 'err7'],
      })
    );
    seForm.append('textResponse', 'Bloquear bancada até adequação de EPIs, cabo elétrico e cilindro.');
    const seSubmit = await jsonReq(
      `/api/participant/missions/${sevenErrorsMission.id}/submit`,
      { method: 'POST', body: seForm },
      studentToken
    );
    assert.equal(seSubmit.status, 201);
    assert.equal(seSubmit.data.submission.status, 'APPROVED');
    assert.equal(seSubmit.data.submission.awardedPoints, 50);
    console.log('✔ [5/10] Upload de Foto, Vídeo MP4, privacidade LGPD de mídias e correção automática dos 7 Erros OK');

    // 5. Aprovação pelo Avaliador + Concessão Automática de Pontos e Medalha "Olho de Águia"
    const evalReview = await jsonReq(
      `/api/admin/submissions/${rhSubmissionId}/review`,
      {
        method: 'POST',
        body: JSON.stringify({
          status: 'APPROVED',
          awardedPoints: 100,
          feedback: 'Excelente percepção técnica e medida preventiva pertinente!',
        }),
      },
      evalToken
    );
    assert.equal(evalReview.status, 200);

    // Aprovar também o vídeo
    await jsonReq(
      `/api/admin/submissions/${vidSubmit.data.submission.id}/review`,
      {
        method: 'POST',
        body: JSON.stringify({
          status: 'APPROVED',
          awardedPoints: 50,
          feedback: 'Ótima comunicação preventiva em 60 segundos!',
        }),
      },
      evalToken
    );
    console.log('✔ [6/10] Aprovação pela Central de Evidências (Avaliador) e atribuição segura de pontos OK');

    // 6. Quizzes Técnicos: Anti-cheat (sem vazar gabarito), Correção Automática e Desbloqueio de Medalhas
    const quiz1 = dashRes.data.quizzes.find(
      (q: any) => q.slug === 'quiz-prevencao-percepcao-riscos'
    );
    const quiz2 = dashRes.data.quizzes.find((q: any) => q.slug === 'quiz-mito-ou-verdade');
    assert.ok(quiz1 && quiz2);

    const loadedQ1 = await jsonReq(`/api/participant/quizzes/${quiz1.id}`, {}, studentToken);
    assert.equal(loadedQ1.status, 200);
    assert.equal(
      loadedQ1.data.quiz.questions[0].correctOptionId,
      undefined,
      'Gabarito jamais pode vazar antes do envio!'
    );

    // Busca gabarito real diretamente via Prisma para responder 100% no teste E2E
    const dbQ1Questions = await prisma.quizQuestion.findMany({ where: { quizId: quiz1.id } });
    const answersQ1: Record<string, string> = {};
    for (const q of dbQ1Questions) answersQ1[q.id] = q.correctOptionId;

    const subQ1 = await jsonReq(
      `/api/participant/quizzes/${quiz1.id}/submit`,
      { method: 'POST', body: JSON.stringify({ answers: answersQ1 }) },
      studentToken
    );
    assert.equal(subQ1.status, 201);
    assert.equal(subQ1.data.attempt.scorePercent, 100);
    assert.equal(subQ1.data.attempt.pointsAddedToTotal, 50);

    const dbQ2Questions = await prisma.quizQuestion.findMany({ where: { quizId: quiz2.id } });
    const answersQ2: Record<string, string> = {};
    for (const q of dbQ2Questions) answersQ2[q.id] = q.correctOptionId;

    const subQ2 = await jsonReq(
      `/api/participant/quizzes/${quiz2.id}/submit`,
      { method: 'POST', body: JSON.stringify({ answers: answersQ2 }) },
      studentToken
    );
    assert.equal(subQ2.status, 201);
    assert.equal(subQ2.data.attempt.pointsAddedToTotal, 30);

    // Aluno agora possui: 50 (7 erros) + 100 (Caça aos Riscos) + 50 (Vídeo) + 50 (Quiz 1) + 30 (Quiz 2) = 280 pts
    // E após ajuste manual (+25 pts) ultrapassará 300 pts -> desbloqueando TODAS as 5 medalhas oficiais!
    const manualPts = await jsonReq(
      `/api/admin/participants/${studentId}/points`,
      {
        method: 'POST',
        body: JSON.stringify({
          delta: 25,
          reason: 'Destaque técnico E2E auditado pela coordenação SIPAT',
        }),
      },
      adminToken
    );
    assert.equal(manualPts.status, 200);
    assert.equal(manualPts.data.totalPoints, 305);

    const updatedDash = await jsonReq('/api/participant/dashboard', {}, studentToken);
    const unlockedSlugs = updatedDash.data.badges
      .filter((b: any) => b.unlocked)
      .map((b: any) => b.slug);
    for (const expectedSlug of [
      'olho-de-aguia',
      'atitude-nota-10',
      'guardiao-da-seguranca',
      'mestre-da-prevencao',
      'campeao-da-sipat',
    ]) {
      assert.ok(
        unlockedSlugs.includes(expectedSlug),
        `Medalha ${expectedSlug} deveria ter sido desbloqueada automaticamente!`
      );
    }

    // 6.1 Emissão de Certificado Oficial de 20h e Validação Pública por Hash
    const certRes = await jsonReq('/api/participant/certificate', {}, studentToken);
    assert.equal(certRes.status, 200, 'Falha ao gerar certificado do aluno');
    assert.equal(certRes.data.certificate.studentName, 'Henrique Souza Teste');
    assert.equal(certRes.data.certificate.workloadHours, 20);
    assert.ok(certRes.data.certificate.hash, 'Certificado deve possuir código hash de autenticidade');
    const certHash = certRes.data.certificate.hash;

    const verifyCert = await jsonReq(`/api/public/certificate/verify/${certHash}`);
    assert.equal(verifyCert.status, 200, 'Falha na validação pública do certificado');
    assert.equal(verifyCert.data.valid, true);
    assert.equal(verifyCert.data.workloadHours, 20);

    // 6.2 Feed Social de Atitudes Seguras & Reações Interativas
    const feedRes = await jsonReq('/api/public/feed');
    assert.equal(feedRes.status, 200, 'Falha ao buscar feed social público');
    const posts = feedRes.data.feed || feedRes.data.posts || [];
    assert.ok(Array.isArray(posts), 'Feed deve retornar lista de posts');
    assert.ok(posts.length >= 1, 'Feed deve conter publicações');
    const firstPost = posts[0];

    const reactRes = await jsonReq(`/api/public/feed/${firstPost.id}/react`, {
      method: 'POST',
      body: JSON.stringify({ reaction: 'claps' }),
    });
    assert.equal(reactRes.status, 200, 'Falha ao registrar reação no post do feed');
    assert.equal(reactRes.data.ok, true);
    console.log('✔ [6.1] Emissão de Certificado 20h, Verificação Pública e Feed Social de Atitudes Seguras OK');

    // Verifica Ranking Público e Máscara de Privacidade LGPD ("Henrique S. T.")
    const pubRanking = await jsonReq('/api/public/ranking');
    assert.equal(pubRanking.status, 200);
    const rankedStudent = pubRanking.data.individualRanking.find(
      (r: any) => r.userId === studentId
    );
    assert.ok(rankedStudent);
    assert.equal(rankedStudent.displayName, 'Henrique S. T.');
    assert.equal(rankedStudent.avatarUrl, null, 'Avatar sem consentimento não deve ir ao público');
    assert.equal(rankedStudent.totalPoints, 305);
    console.log('✔ [7/10] Quizzes, ajuste auditado, 5 Medalhas desbloqueadas e Ranking Público LGPD OK');

    // 7. Teste Real do Agendador Automático + Disparo WebSocket em Tempo Real
    const opensSoon = new Date(Date.now() + 1500).toISOString();
    const scheduledMissionRes = await jsonReq(
      '/api/admin/missions',
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'Desafio Relâmpago E2E Agendado',
          summary: 'Teste real do agendador automático com WebSockets',
          description: 'Descrição completa do desafio relâmpago agendado.',
          instructions: 'Instruções de teste do agendador.',
          evaluationCriteria: 'Critérios objetivos.',
          category: 'Desafio Surpresa',
          difficulty: 'SURPRISE',
          participationMode: 'INDIVIDUAL',
          submissionType: 'TEXT',
          eventDay: 1,
          eventDateLabel: '16/11/2026',
          status: 'SCHEDULED',
          opensAt: opensSoon,
          points: 30,
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
          requiresApproval: true,
        }),
      },
      adminToken
    );
    assert.equal(scheduledMissionRes.status, 201);
    createdScheduledMissionId = scheduledMissionRes.data.mission.id as string;

    // Aguarda ciclo do agendador automático (intervalo de 10s no servidor)
    let autoPublished = false;
    for (let attempt = 0; attempt < 25; attempt++) {
      await new Promise((r) => setTimeout(r, 1000));
      const checkMission = await prisma.mission.findUnique({
        where: { id: createdScheduledMissionId },
      });
      if (checkMission?.status === 'PUBLISHED') {
        autoPublished = true;
        // Aguarda breve propagação do evento websocket
        for (let w = 0; w < 10; w++) {
          if (wsEvents.includes('activity:released')) break;
          await new Promise((r) => setTimeout(r, 500));
        }
        break;
      }
    }
    assert.equal(autoPublished, true, 'O agendador automático deveria ter publicado a missão!');
    assert.ok(
      wsEvents.includes('activity:released'),
      'Evento WebSocket activity:released deveria ter sido emitido aos clientes conectados!'
    );
    assert.ok(
      wsEvents.includes('ranking:updated'),
      'Evento WebSocket ranking:updated deveria ter sido emitido!'
    );
    socket.disconnect();
    console.log('✔ [8/10] Agendador automático persistente e eventos WebSocket em tempo real OK');

    // 8. Teste de Importação de Participantes por Planilha (.xlsx)
    const importEmail = `importado.e2e.${Date.now()}@aluno.senai.br`;
    createdTestEmails.push(importEmail);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      {
        nome_completo: 'Beatriz Planilha E2E',
        email: importEmail,
        matricula: `IMP${Date.now().toString().slice(-5)}`,
        codigo_turma: 'TEC-LOG-1M',
        senha_inicial: 'Senai@2026',
        menor_idade: 'NAO',
      },
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Alunos');
    const xlsxBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const impForm = new FormData();
    impForm.append(
      'file',
      new Blob([xlsxBuf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      'turma-teste.xlsx'
    );
    const impRes = await jsonReq(
      '/api/admin/participants/import',
      { method: 'POST', body: impForm },
      adminToken
    );
    assert.equal(impRes.status, 200);
    assert.equal(impRes.data.imported, 1);
    console.log('✔ [9/10] Importação em lote de participantes por planilha Excel (.xlsx) OK');

    // 9. Teste Real de Exportação de Todos os Relatórios (Geral Excel/PDF + Caça aos Riscos Excel/PDF)
    for (const rep of [
      { url: '/api/admin/reports/general.xlsx', magic: 'PK' },
      { url: '/api/admin/reports/general.pdf', magic: '%PDF-' },
      { url: '/api/admin/reports/risk-hunt.xlsx', magic: 'PK' },
      { url: '/api/admin/reports/risk-hunt.pdf', magic: '%PDF-' },
    ]) {
      const r = await fetch(`${BASE_URL}${rep.url}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(r.status, 200, `Falha ao gerar relatório ${rep.url}`);
      const buf = Buffer.from(await r.arrayBuffer());
      assert.ok(buf.length > 500, `Relatório ${rep.url} retornou vazio`);
      assert.equal(buf.subarray(0, rep.magic.length).toString('ascii'), rep.magic);
    }

    // Verifica registro no Log de Auditoria
    const auditRes = await jsonReq('/api/admin/audit-logs', {}, adminToken);
    assert.equal(auditRes.status, 200);
    assert.ok(
      auditRes.data.logs.some((l: any) => l.action === 'POINTS_MANUAL_ADJUSTMENT'),
      'Log de auditoria da pontuação manual deveria estar registrado!'
    );
    console.log('✔ [10/10] Relatórios Excel/PDF (Geral e Caça aos Riscos) e Logs de Auditoria OK');

    console.log('\n======================================================================');
    console.log(' TODOS OS 10 BLOCOS DE TESTES REAIS END-TO-END PASSARAM COM 100%!');
    console.log('======================================================================');
  } finally {
    // Limpeza cirúrgica apenas dos registros efêmeros criados pelo script E2E, preservando 100% da base oficial
    if (createdScheduledMissionId) {
      await prisma.mission.delete({ where: { id: createdScheduledMissionId } }).catch(() => {});
    }
    if (createdTestEmails.length > 0) {
      await prisma.user
        .deleteMany({ where: { email: { in: createdTestEmails } } })
        .catch(() => {});
    }
    // Garante que o QR Code oficial padrão esteja ativo após o teste de regeneração
    await prisma.qrRegistrationToken
      .updateMany({ data: { isActive: false } })
      .catch(() => {});
    await prisma.qrRegistrationToken
      .upsert({
        where: { code: 'SIPAT2026-MORVAN' },
        update: { isActive: true, scansCount: 0, registrationsCount: 0 },
        create: {
          code: 'SIPAT2026-MORVAN',
          label: 'QR Code Oficial de Inscrição – SIPAT 2026 SENAI "Morvan Figueiredo"',
          isActive: true,
        },
      })
      .catch(() => {});

    serverProc.kill('SIGTERM');
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('\n[E2E TEST FAILURE]', err);
  process.exit(1);
});

