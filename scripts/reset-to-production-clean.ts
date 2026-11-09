import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetClean() {
  console.log('========================================================================');
  console.log(' ZERANDO DADOS FAKES – PREPARANDO PLATAFORMA PARA OPERAÇÃO REAL');
  console.log(' Escola SENAI "Morvan Figueiredo" • SIPAT 2026');
  console.log('========================================================================\n');

  // 1. Limpeza de submissões, tentativas e pontuações
  console.log('[1/6] Removendo submissões de missões, tentativas de quizzes e medalhas de participantes...');
  const deletedSubs = await prisma.missionSubmission.deleteMany({});
  console.log(`  ✔ Submissões de missões removidas: ${deletedSubs.count}`);

  const deletedAttempts = await prisma.quizAttempt.deleteMany({});
  console.log(`  ✔ Tentativas de quizzes removidas: ${deletedAttempts.count}`);

  const deletedBadges = await prisma.userBadge.deleteMany({});
  console.log(`  ✔ Medalhas atribuídas removidas: ${deletedBadges.count}`);

  const deletedLedger = await prisma.pointLedger.deleteMany({});
  console.log(`  ✔ Histórico de pontos (PointLedger) limpo: ${deletedLedger.count}`);

  const deletedNotifs = await prisma.notification.deleteMany({});
  console.log(`  ✔ Notificações apagadas: ${deletedNotifs.count}`);

  const deletedSubsPush = await prisma.pushSubscription.deleteMany({});
  console.log(`  ✔ Inscrições de push apagadas: ${deletedSubsPush.count}`);

  const deletedAudit = await prisma.auditLog.deleteMany({});
  console.log(`  ✔ Logs antigos de auditoria limpos: ${deletedAudit.count}`);

  const deletedCerts = await prisma.certificate.deleteMany({});
  console.log(`  ✔ Certificados emitidos limpos: ${deletedCerts.count}`);

  // 2. Remoção de todos os alunos/participantes fakes
  console.log('\n[2/6] Removendo contas de alunos e participantes fakes...');
  const deletedParticipants = await prisma.user.deleteMany({
    where: {
      role: Role.PARTICIPANT,
    },
  });
  console.log(`  ✔ Participantes/alunos removidos: ${deletedParticipants.count}`);

  // 3. Garantir contas oficiais da CIPA e SuperAdmin
  console.log('\n[3/6] Verificando e configurando contas oficiais de Staff...');
  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin.sipat@senai.br').toLowerCase().trim();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Sipat@Senai2026!ChangeMe';
  const adminHash = await bcrypt.hash(adminPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: 'Coordenação Geral da SIPAT 2026 / CIPA',
      role: Role.SUPER_ADMIN,
      passwordHash: adminHash,
      totalPoints: 0,
      level: 1,
      isActive: true,
      anonymizedAt: null,
    },
    create: {
      fullName: 'Coordenação Geral da SIPAT 2026 / CIPA',
      email: adminEmail,
      registrationCode: 'STAFF-SUPERADMIN-01',
      passwordHash: adminHash,
      role: Role.SUPER_ADMIN,
      totalPoints: 0,
      level: 1,
      isActive: true,
      lgpdConsentAt: new Date(),
      imageConsent: true,
    },
  });
  console.log(`  ✔ SuperAdmin oficial: ${superAdmin.email}`);

  const evalEmail = (process.env.INITIAL_EVALUATOR_EMAIL || 'avaliador.sipat@senai.br').toLowerCase().trim();
  const evalPassword = process.env.INITIAL_EVALUATOR_PASSWORD || 'Avalia@Senai2026!ChangeMe';
  const evalHash = await bcrypt.hash(evalPassword, 12);

  const evaluator = await prisma.user.upsert({
    where: { email: evalEmail },
    update: {
      fullName: 'Comissão Avaliadora CIPA / Docentes SENAI',
      role: Role.EVALUATOR,
      passwordHash: evalHash,
      totalPoints: 0,
      level: 1,
      isActive: true,
      anonymizedAt: null,
    },
    create: {
      fullName: 'Comissão Avaliadora CIPA / Docentes SENAI',
      email: evalEmail,
      registrationCode: 'STAFF-AVALIADOR-01',
      passwordHash: evalHash,
      role: Role.EVALUATOR,
      totalPoints: 0,
      level: 1,
      isActive: true,
      lgpdConsentAt: new Date(),
      imageConsent: false,
    },
  });
  console.log(`  ✔ Avaliador CIPA oficial: ${evaluator.email}`);

  // 4. Resetar QR Code Oficial para zero scans e zero inscrições
  console.log('\n[4/6] Resetando QR Code Oficial de Inscrição...');
  await prisma.qrRegistrationToken.updateMany({
    data: { isActive: false },
  });

  const qrToken = await prisma.qrRegistrationToken.upsert({
    where: { code: 'SIPAT2026-MORVAN' },
    update: {
      label: 'QR Code Oficial de Inscrição – SIPAT 2026 SENAI "Morvan Figueiredo"',
      isActive: true,
      scansCount: 0,
      registrationsCount: 0,
      validFrom: new Date('2026-10-01T00:00:00.000-03:00'),
      validUntil: new Date('2026-11-20T23:59:59.000-03:00'),
      createdById: superAdmin.id,
    },
    create: {
      code: 'SIPAT2026-MORVAN',
      label: 'QR Code Oficial de Inscrição – SIPAT 2026 SENAI "Morvan Figueiredo"',
      isActive: true,
      scansCount: 0,
      registrationsCount: 0,
      validFrom: new Date('2026-10-01T00:00:00.000-03:00'),
      validUntil: new Date('2026-11-20T23:59:59.000-03:00'),
      createdById: superAdmin.id,
    },
  });
  console.log(`  ✔ QR Code ativo: ${qrToken.code} (Scans: 0, Inscrições: 0)`);

  // 5. Garantir que a Configuração do Sistema e Estrutura Oficial estejam intactas
  console.log('\n[5/6] Verificando parâmetros institucionais do evento...');
  await prisma.systemConfig.upsert({
    where: { id: 'default' },
    update: {
      schoolName: 'Escola SENAI "Morvan Figueiredo"',
      eventTitle: 'SIPAT 2026',
      eventTheme: 'Segurança começa com você: prevenir é uma atitude de todos!',
      eventSlogan: 'Sua atitude faz a diferença!',
      eventStartDate: new Date('2026-11-16T08:00:00.000-03:00'),
      eventEndDate: new Date('2026-11-19T22:00:00.000-03:00'),
      registrationEnabled: true,
      pointsSimpleMission: 20,
      pointsMediumMission: 50,
      pointsAdvancedMission: 100,
      pointsMaxQuiz: 50,
      pointsSurpriseMax: 30,
      tvRotationSeconds: 14,
    },
    create: {
      id: 'default',
      schoolName: 'Escola SENAI "Morvan Figueiredo"',
      eventTitle: 'SIPAT 2026',
      eventTheme: 'Segurança começa com você: prevenir é uma atitude de todos!',
      eventSlogan: 'Sua atitude faz a diferença!',
      eventStartDate: new Date('2026-11-16T08:00:00.000-03:00'),
      eventEndDate: new Date('2026-11-19T22:00:00.000-03:00'),
      registrationEnabled: true,
      pointsSimpleMission: 20,
      pointsMediumMission: 50,
      pointsAdvancedMission: 100,
      pointsMaxQuiz: 50,
      pointsSurpriseMax: 30,
      tvRotationSeconds: 14,
    },
  });
  console.log('  ✔ SystemConfig: Inscrições Abertas, Unidade Mooca, Datas 16-19/Nov/2026');

  // 6. Resumo e Estatísticas de Prontidão Operacional
  const [
    totalUsers,
    participantUsers,
    totalClasses,
    totalMissions,
    totalQuizzes,
    totalQuestions,
    totalBadges,
    totalSubmissions,
    totalAttempts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: Role.PARTICIPANT } }),
    prisma.classGroup.count({ where: { isActive: true } }),
    prisma.mission.count(),
    prisma.quiz.count(),
    prisma.quizQuestion.count(),
    prisma.badge.count(),
    prisma.missionSubmission.count(),
    prisma.quizAttempt.count(),
  ]);

  console.log('\n========================================================================');
  console.log(' PLATAFORMA 100% PRONTA E ZERADA PARA O EVENTO REAL!');
  console.log('========================================================================');
  console.log(`• Alunos Participantes Cadastrados: ${participantUsers} (Base totalmente limpa)`);
  console.log(`• Submissões de Evidências: ${totalSubmissions} (Aguardando alunos)`);
  console.log(`• Tentativas de Quizzes: ${totalAttempts} (Aguardando alunos)`);
  console.log(`• Turmas Técnicas Disponíveis: ${totalClasses} turmas do SENAI Mooca`);
  console.log(`• Missões Cadastradas (Dias 1 a 4): ${totalMissions} atividades`);
  console.log(`• Quizzes Oficiais: ${totalQuizzes} quizzes (${totalQuestions} questões técnicas)`);
  console.log(`• Medalhas Oficiais da Gamificação: ${totalBadges} medalhas`);
  console.log(`• QR Code Oficial de Inscrição: "${qrToken.code}" (Ativo)`);
  console.log(`• Contas de Administração: 2 (SuperAdmin + Avaliador CIPA)`);
  console.log('========================================================================\n');
}

resetClean()
  .catch((err) => {
    console.error('[ERRO RESET]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

