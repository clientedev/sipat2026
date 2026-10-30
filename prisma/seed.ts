import 'dotenv/config';
import { PrismaClient, Role, ActivityStatus, MissionDifficulty, ParticipationMode, SubmissionType, QuestionType, NamePrivacyMode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Verificando e populando dados iniciais da SIPAT 2026 – Escola SENAI "Morvan Figueiredo"...');

  // 1. Configuração Institucional (Upsert seguro - preserva alterações caso já exista)
  const existingConfig = await prisma.systemConfig.findUnique({ where: { id: 'default' } });
  if (!existingConfig) {
    await prisma.systemConfig.create({
      data: {
        id: 'default',
        schoolName: 'Escola SENAI "Morvan Figueiredo"',
        eventTitle: 'SIPAT 2026',
        eventTheme: 'Segurança começa com você: prevenir é uma atitude de todos!',
        eventSlogan: 'Sua atitude faz a diferença!',
        eventStartDate: new Date('2026-11-16T08:00:00.000-03:00'),
        eventEndDate: new Date('2026-11-19T22:00:00.000-03:00'),
        namePrivacyMode: NamePrivacyMode.FIRST_LAST_INITIAL,
        showAvatarsInPublic: false,
        pointsSimpleMission: 20,
        pointsMediumMission: 50,
        pointsAdvancedMission: 100,
        pointsMaxQuiz: 50,
        pointsSurpriseMax: 30,
        registrationEnabled: true,
        tvRotationSeconds: 14,
        lgpdRetentionDays: 90,
      },
    });
    console.log('[SEED] SystemConfig institucional criada.');
  }

  // 2. Primeiro Superadministrador e Avaliador (Idempotente: não sobrescreve contas existentes)
  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin.sipat@senai.br').toLowerCase().trim();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Sipat@Senai2026!ChangeMe';
  const adminName = process.env.INITIAL_ADMIN_NAME || 'Coordenação SIPAT - SENAI Morvan Figueiredo';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  let adminUser = existingAdmin;
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    adminUser = await prisma.user.create({
      data: {
        fullName: adminName,
        email: adminEmail,
        registrationCode: 'STAFF-SUPERADMIN-01',
        passwordHash,
        role: Role.SUPER_ADMIN,
        lgpdConsentAt: new Date(),
        imageConsent: true,
        imageConsentAt: new Date(),
      },
    });
    console.log(`[SEED] Superadministrador inicial criado: ${adminEmail}`);
  }

  const evaluatorEmail = (process.env.INITIAL_EVALUATOR_EMAIL || 'avaliador.sipat@senai.br').toLowerCase().trim();
  const evaluatorPassword = process.env.INITIAL_EVALUATOR_PASSWORD || 'Avalia@Senai2026!ChangeMe';
  const evaluatorName = process.env.INITIAL_EVALUATOR_NAME || 'Comissão Avaliadora CIPA / Docentes';

  const existingEvaluator = await prisma.user.findUnique({ where: { email: evaluatorEmail } });
  if (!existingEvaluator) {
    const passwordHash = await bcrypt.hash(evaluatorPassword, 12);
    await prisma.user.create({
      data: {
        fullName: evaluatorName,
        email: evaluatorEmail,
        registrationCode: 'STAFF-AVALIADOR-01',
        passwordHash,
        role: Role.EVALUATOR,
        lgpdConsentAt: new Date(),
        imageConsent: false,
      },
    });
    console.log(`[SEED] Avaliador inicial criado: ${evaluatorEmail}`);
  }

  // 3. QR Code Oficial de Inscrição (Cria apenas se ainda não houver nenhum token cadastrado)
  const qrCount = await prisma.qrRegistrationToken.count();
  if (qrCount === 0) {
    await prisma.qrRegistrationToken.create({
      data: {
        code: 'SIPAT2026-MORVAN',
        label: 'QR Code Oficial de Inscrição – SIPAT 2026 SENAI "Morvan Figueiredo"',
        isActive: true,
        validFrom: new Date('2026-10-01T00:00:00.000-03:00'),
        validUntil: new Date('2026-11-20T23:59:59.000-03:00'),
        createdById: adminUser?.id,
      },
    });
    console.log('[SEED] QR Code inicial de inscrição criado.');
  }

  // 4. Turmas e Áreas Tecnológicas da Escola SENAI "Morvan Figueiredo"
  const classesData = [
    { code: 'TEC-INF-1M', name: 'Técnico em Informática – 1º Termo (Manhã)', courseArea: 'Informática e TI', shift: 'Manhã' },
    { code: 'TEC-DEV-2T', name: 'Técnico em Desenvolvimento de Sistemas – 2º Termo (Tarde)', courseArea: 'Informática e TI', shift: 'Tarde' },
    { code: 'TEC-LOG-1M', name: 'Técnico em Logística – 1º Termo (Manhã)', courseArea: 'Logística e Transporte', shift: 'Manhã' },
    { code: 'TEC-LOG-2N', name: 'Técnico em Logística – 2º Termo (Noite)', courseArea: 'Logística e Transporte', shift: 'Noite' },
    { code: 'TEC-CLI-1T', name: 'Técnico em Refrigeração e Climatização – 1º Termo (Tarde)', courseArea: 'Climatização e Refrigeração', shift: 'Tarde' },
    { code: 'TEC-CLI-2N', name: 'Técnico em Refrigeração e Climatização – 2º Termo (Noite)', courseArea: 'Climatização e Refrigeração', shift: 'Noite' },
    { code: 'CAI-ELE-1M', name: 'Aprendizagem Industrial – Eletricista de Manutenção Eletroeletrônica (Manhã)', courseArea: 'Eletroeletrônica', shift: 'Manhã' },
    { code: 'CAI-AUT-1T', name: 'Aprendizagem Industrial – Mecânica de Manutenção / Automotiva (Tarde)', courseArea: 'Mecânica e Automotiva', shift: 'Tarde' },
    { code: 'CAI-ADM-1M', name: 'Aprendizagem Industrial – Assistente Administrativo / Logística (Manhã)', courseArea: 'Gestão e Logística', shift: 'Manhã' },
    { code: 'COLAB-SENAI', name: 'Funcionários, Docentes e Equipe Técnica – SENAI Morvan Figueiredo', courseArea: 'Colaboradores SENAI', shift: 'Integral' },
  ];

  for (const cls of classesData) {
    await prisma.classGroup.upsert({
      where: { code: cls.code },
      update: {},
      create: cls,
    });
  }
  console.log(`[SEED] ${classesData.length} turmas institucionais verificadas.`);

  // 5. Medalhas e Conquistas Gamificadas
  const badgesData = [
    {
      slug: 'olho-de-aguia',
      name: 'Olho de Águia',
      description: 'Identificou, documentou e propôs medidas preventivas eficazes na missão Caça aos Riscos.',
      iconName: 'Eye',
      accentColor: '#FFB800',
      criteriaType: 'RISK_HUNT_APPROVED',
      criteriaThreshold: 1,
      bonusPoints: 0,
      sortOrder: 1,
    },
    {
      slug: 'atitude-nota-10',
      name: 'Atitude Nota 10',
      description: 'Demonstrou protagonismo imediato concluindo sua primeira atividade aprovada ou gabaritando um quiz.',
      iconName: 'CheckCircle2',
      accentColor: '#0047B6',
      criteriaType: 'FIRST_EXCELLENCE',
      criteriaThreshold: 1,
      bonusPoints: 0,
      sortOrder: 2,
    },
    {
      slug: 'guardiao-da-seguranca',
      name: 'Guardião da Segurança',
      description: 'Concluiu com aprovação pelo menos 3 missões práticas de prevenção, EPIs, oficinas ou ergonomia.',
      iconName: 'ShieldCheck',
      accentColor: '#15803D',
      criteriaType: 'APPROVED_MISSIONS',
      criteriaThreshold: 3,
      bonusPoints: 0,
      sortOrder: 3,
    },
    {
      slug: 'mestre-da-prevencao',
      name: 'Mestre da Prevenção',
      description: 'Atingiu aproveitamento igual ou superior a 80% em pelo menos 2 quizzes técnicos da SIPAT 2026.',
      iconName: 'Award',
      accentColor: '#0284C7',
      criteriaType: 'HIGH_SCORE_QUIZZES',
      criteriaThreshold: 2,
      bonusPoints: 0,
      sortOrder: 4,
    },
    {
      slug: 'campeao-da-sipat',
      name: 'Campeão da SIPAT',
      description: 'Alcançou 300 ou mais pontos acumulados destacando-se na cultura de prevenção da Escola SENAI "Morvan Figueiredo".',
      iconName: 'Trophy',
      accentColor: '#D97706',
      criteriaType: 'TOTAL_POINTS',
      criteriaThreshold: 300,
      bonusPoints: 0,
      sortOrder: 5,
    },
  ];

  for (const badge of badgesData) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: {},
      create: badge,
    });
  }
  console.log(`[SEED] ${badgesData.length} medalhas oficiais verificadas.`);

  // 6. Programação Inicial Completa de Missões (Dias 16, 17, 18 e 19 de Novembro de 2026)
  // Apenas cria se ainda não existir o slug correspondente, preservando edições do administrador!
  const missionsData = [
    // ======================= DIA 1: 16/11/2026 =======================
    {
      slug: 'caca-aos-riscos',
      title: 'Caça aos Riscos na Escola',
      summary: 'Identifique situações reais ou simuladas de risco em áreas autorizadas da escola, fotografe e proponha medidas preventivas.',
      description:
        'A prevenção começa pela capacidade técnica de enxergar o perigo antes que ele se transforme em incidente ou acidente. Percorra apenas as áreas comuns e espaços expressamente autorizados da Escola SENAI "Morvan Figueiredo" para identificar uma condição insegura ou ponto de melhoria preventiva.',
      instructions:
        '1. Observe com atenção corredores, escadas, pátio, áreas de convivência ou laboratórios/oficinas autorizados pelo docente.\n' +
        '2. Registre uma fotografia nítida da situação observada SEM expor o rosto de colegas sem permissão e SEM se aproximar de áreas restritas ou energizadas.\n' +
        '3. Preencha todos os campos do diagnóstico técnico: Ambiente/Local, Classificação do Risco, Descrição do Perigo, Possíveis Consequências e Medidas Preventivas Recomendadas.',
      evaluationCriteria:
        'Clareza fotográfica (25%), identificação precisa do perigo/condição insegura (25%), coerência das possíveis consequências (25%) e viabilidade técnica das medidas preventivas propostas (25%).',
      safetyNotice:
        'ATENÇÃO TÉCNICA: Realize registros apenas em áreas autorizadas pela coordenação/docentes. Nunca toque em cabos expostos, máquinas em movimento, painéis elétricos ou produtos químicos para fotografar.',
      bannerUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
      category: 'Percepção de Riscos',
      difficulty: MissionDifficulty.ADVANCED,
      participationMode: ParticipationMode.INDIVIDUAL,
      submissionType: SubmissionType.RISK_HUNT,
      eventDay: 1,
      eventDateLabel: '16/11/2026',
      status: ActivityStatus.PUBLISHED,
      opensAt: new Date('2026-10-25T08:00:00.000-03:00'),
      closesAt: new Date('2026-11-19T22:00:00.000-03:00'),
      publishedAt: new Date(),
      points: 100,
      requiresPhoto: true,
      requiresVideo: false,
      requiresText: true,
      requiresApproval: true,
      isFeatured: true,
      sortOrder: 1,
    },
    {
      slug: 'seguranca-comeca-comigo',
      title: 'Missão: Segurança Começa Comigo',
      summary: 'Registre uma atitude preventiva individual que você pratica nos laboratórios, oficinas ou ambientes da escola.',
      description:
        'O tema da SIPAT 2026 reforça que prevenir é uma atitude de todos. Nesta missão inicial, reflita sobre o seu papel diário dentro da Escola SENAI "Morvan Figueiredo" e compartilhe uma ação concreta de prevenção que protege você e sua turma.',
      instructions:
        '1. Descreva de forma objetiva (mínimo de 80 caracteres) uma prática segura que você adota antes, durante ou após suas aulas práticas/atividades.\n' +
        '2. Explique como essa atitude evita acidentes para o coletivo.\n' +
        '3. Opcionalmente, anexe uma fotografia ilustrativa de organização, sinalização ou equipamento de proteção.',
      evaluationCriteria:
        'Pertinência com a rotina escolar/profissional, clareza na descrição da atitude preventiva e senso de responsabilidade coletiva.',
      safetyNotice: 'Mantenha o foco em boas práticas preventivas e respeito às normas internas da unidade.',
      bannerUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1200&q=80',
      category: 'Percepção de Riscos',
      difficulty: MissionDifficulty.SIMPLE,
      participationMode: ParticipationMode.INDIVIDUAL,
      submissionType: SubmissionType.TEXT,
      eventDay: 1,
      eventDateLabel: '16/11/2026',
      status: ActivityStatus.PUBLISHED,
      opensAt: new Date('2026-10-25T08:00:00.000-03:00'),
      closesAt: new Date('2026-11-19T22:00:00.000-03:00'),
      publishedAt: new Date(),
      points: 20,
      requiresPhoto: false,
      requiresVideo: false,
      requiresText: true,
      requiresApproval: true,
      isFeatured: false,
      sortOrder: 2,
    },

    // ======================= DIA 2: 17/11/2026 =======================
    {
      slug: 'encontre-os-7-erros',
      title: 'Desafio Técnico: Encontre os 7 Erros na Oficina',
      summary: 'Analise o relatório de inspeção visual de uma bancada industrial e aponte exatamente os 7 desvios de segurança.',
      description:
        'Em uma inspeção de rotina em uma oficina didática multidisciplinar, foram observados 10 itens operacionais — porém 7 deles configuram erros graves de segurança do trabalho e apenas 3 estão em conformidade. Teste sua visão técnica identificando os 7 erros!',
      instructions:
        '1. Analise atentamente o cenário visual e os 10 itens listados na inspeção da bancada.\n' +
        '2. Selecione exatamente os 7 itens que representam condições ou atos inseguros.\n' +
        '3. Escreva um breve parecer resumindo qual medida imediata deve ser tomada antes de liberar a bancada para aula prática.',
      evaluationCriteria:
        'Identificação correta dos 7 desvios reais de segurança e coerência na recomendação de bloqueio/adequação antes do início da atividade.',
      safetyNotice: 'Atividade analítica de inspeção preventiva baseada nas NRs 06, 10, 12 e 26.',
      bannerUrl: 'https://images.unsplash.com/photo-1581092335397-9583eb92d232?auto=format&fit=crop&w=1200&q=80',
      category: 'Segurança na Prática',
      difficulty: MissionDifficulty.INTERMEDIATE,
      participationMode: ParticipationMode.INDIVIDUAL,
      submissionType: SubmissionType.SEVEN_ERRORS,
      eventDay: 2,
      eventDateLabel: '17/11/2026',
      status: ActivityStatus.PUBLISHED,
      opensAt: new Date('2026-10-25T09:00:00.000-03:00'),
      closesAt: new Date('2026-11-19T22:00:00.000-03:00'),
      publishedAt: new Date(),
      points: 50,
      requiresPhoto: false,
      requiresVideo: false,
      requiresText: true,
      requiresApproval: false,
      isFeatured: true,
      configJson: {
        items: [
          { id: 'err1', label: 'Operador realizando esmerilhamento/ajuste mecânico sem óculos de segurança (EPI)', isError: true },
          { id: 'err2', label: 'Extensão elétrica com emenda improvisada sem isolamento adequado próxima a área úmida', isError: true },
          { id: 'ok1', label: 'Quadro elétrico devidamente fechado, sinalizado com placa NR-10 e identificado', isError: false },
          { id: 'err3', label: 'Cilindro vertical na oficina sem corrente/cinta de fixação contra tombamento', isError: true },
          { id: 'err4', label: 'Extintor de incêndio obstruído por caixas de materiais e ferramentas no piso', isError: true },
          { id: 'ok2', label: 'Demarcação amarela de segurança no piso delimitando a área operacional da máquina', isError: false },
          { id: 'err5', label: 'Chave de fenda com cabo trincado sendo improvisada como talhadeira/alavanca', isError: true },
          { id: 'err6', label: 'Mancha de óleo lubrificante no corredor de circulação sem contenção nem placa de piso escorregadio', isError: true },
          { id: 'ok3', label: 'Coletor seletivo e recipiente fechado específico para panos contaminados', isError: false },
          { id: 'err7', label: 'Bancada superlotada com ferramentas pesadas na borda em risco iminente de queda sobre os pés', isError: true },
        ],
      },
      sortOrder: 3,
    },
    {
      slug: 'tecnico-seguro',
      title: 'Missão: Técnico Seguro nas Oficinas SENAI',
      summary: 'Registre a organização preventiva da bancada, seleção de EPIs, ferramentas e verificação visual de segurança sob supervisão.',
      description:
        'A excelência técnica do profissional formado na Escola SENAI "Morvan Figueiredo" se mede pela disciplina operacional: uso correto de EPIs, ferramentas íntegras, atenção rigorosa às instalações elétricas, armazenamento seguro de cilindros e identificação de gases refrigerantes e organização 5S das bancadas.',
      instructions:
        '1. Sob autorização do docente responsável no seu laboratório ou oficina, organize exemplarmente sua bancada ou posto de estudo.\n' +
        '2. Fotografe o conjunto de EPIs aplicáveis à atividade e a bancada limpa, organizada e desobstruída.\n' +
        '3. No relato técnico, liste: (a) os EPIs utilizados e sua finalidade; (b) os cuidados de inspeção visual em ferramentas/instalações elétricas ou cilindros/fluidos refrigerantes da sua área; (c) como a organização da bancada previne acidentes.',
      evaluationCriteria:
        'Adequação técnica dos EPIs citados (30%), organização visível da bancada/posto (35%) e precisão técnica das medidas preventivas descritas (35%).',
      safetyNotice:
        'REGRA DE OURO: Jamais abra painéis elétricos energizados, não manuseie cilindros pressurizados ou fluidos refrigerantes sem supervisão direta do docente da oficina.',
      bannerUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1200&q=80',
      category: 'Segurança na Prática',
      difficulty: MissionDifficulty.ADVANCED,
      participationMode: ParticipationMode.INDIVIDUAL,
      submissionType: SubmissionType.PHOTO,
      eventDay: 2,
      eventDateLabel: '17/11/2026',
      status: ActivityStatus.PUBLISHED,
      opensAt: new Date('2026-10-25T09:30:00.000-03:00'),
      closesAt: new Date('2026-11-19T22:00:00.000-03:00'),
      publishedAt: new Date(),
      points: 100,
      requiresPhoto: true,
      requiresVideo: false,
      requiresText: true,
      requiresApproval: true,
      isFeatured: true,
      sortOrder: 4,
    },
    {
      slug: 'seguranca-em-60-segundos',
      title: 'Desafio em Vídeo: Segurança em 60 Segundos',
      summary: 'Grave um vídeo curto de até 60 segundos explicando como você agiria preventivamente diante de uma situação de risco.',
      description:
        'Saber comunicar um alerta de segurança com rapidez e clareza salva vidas. Neste desafio prático, grave um vídeo objetivo (até 60 segundos) explicando passo a passo qual deve ser a conduta segura diante de uma condição de risco identificada em sala, laboratório, estoque ou oficina.',
      instructions:
        '1. Escolha uma situação realista da sua área técnica (ex: cabo danificado, vazamento em oficina, empilhamento instável, equipamento sem proteção ou tentativa de golpe digital).\n' +
        '2. Grave um vídeo horizontal ou vertical de até 60 segundos (máx. 60 MB) em local seguro e silencioso.\n' +
        '3. Explique: qual é o risco, por que NÃO se deve improvisar, como sinalizar/isolar a área e quem acionar imediatamente (docente, coordenação ou CIPA).',
      evaluationCriteria:
        'Objetividade dentro de 60 segundos, correção técnica da conduta preventiva orientada (sem incentivar improvisos) e clareza na comunicação.',
      safetyNotice:
        'Grave apenas explicações verbais/educativas em ambiente seguro. NUNCA simule cenas perigosas reais nem coloque ninguém em risco durante a gravação.',
      bannerUrl: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1200&q=80',
      category: 'Segurança na Prática',
      difficulty: MissionDifficulty.INTERMEDIATE,
      participationMode: ParticipationMode.INDIVIDUAL,
      submissionType: SubmissionType.VIDEO,
      eventDay: 2,
      eventDateLabel: '17/11/2026',
      status: ActivityStatus.PUBLISHED,
      opensAt: new Date('2026-10-25T10:00:00.000-03:00'),
      closesAt: new Date('2026-11-19T22:00:00.000-03:00'),
      publishedAt: new Date(),
      points: 50,
      requiresPhoto: false,
      requiresVideo: true,
      requiresText: true,
      requiresApproval: true,
      isFeatured: false,
      sortOrder: 5,
    },

    // ======================= DIA 3: 18/11/2026 =======================
    {
      slug: 'estacao-ergonomica',
      title: 'Ergonomia na Prática: Estação de Trabalho Segura',
      summary: 'Avalie e ajuste postura, altura de monitor, cadeira, iluminação e organização da sua estação de estudo ou trabalho.',
      description:
        'Lesões osteomusculares (LER/DORT) e fadiga visual são prevenidas com ajustes ergonômicos simples e conscientes no dia a dia (NR-17). Avalie sua estação no laboratório de informática, escritório ou bancada de estudos e demonstre a configuração ergonômica adequada.',
      instructions:
        '1. Ajuste sua estação observando: topo do monitor alinhado à altura dos olhos, distância de um braço da tela, apoio lombar na cadeira, pés apoiados, punhos neutros no teclado/mouse e mesa organizada sem reflexos excessivos.\n' +
        '2. Registre uma foto da estação organizada e ajustada.\n' +
        '3. Descreva 3 ajustes ergonômicos realizados e os hábitos de pausa ativa que você passará a adotar.',
      evaluationCriteria:
        'Aplicação correta dos conceitos da NR-17 na organização da estação e qualidade dos ajustes descritos no relato.',
      safetyNotice: 'Ao ajustar cadeiras ou monitores, certifique-se de que os cabos de energia e rede estejam desligados ou com folga segura.',
      bannerUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',
      category: 'Ergonomia e Bem-Estar',
      difficulty: MissionDifficulty.INTERMEDIATE,
      participationMode: ParticipationMode.INDIVIDUAL,
      submissionType: SubmissionType.PHOTO,
      eventDay: 3,
      eventDateLabel: '18/11/2026',
      status: ActivityStatus.PUBLISHED,
      opensAt: new Date('2026-10-25T08:00:00.000-03:00'),
      closesAt: new Date('2026-11-19T22:00:00.000-03:00'),
      publishedAt: new Date(),
      points: 50,
      requiresPhoto: true,
      requiresVideo: false,
      requiresText: true,
      requiresApproval: true,
      isFeatured: false,
      sortOrder: 6,
    },
    {
      slug: 'desafio-surpresa-pausa-ativa',
      title: 'Desafio Surpresa: Check-in de Bem-Estar e Prevenção Postural',
      summary: 'Desafio relâmpago liberado pelo agendador! Registre 3 hábitos preventivos contra fadiga física, visual e sobrecarga.',
      description:
        'A saúde ocupacional combina ergonomia física, iluminação correta, hidratação e pausas de recuperação muscular. Responda ao desafio relâmpago do 3º dia da SIPAT!',
      instructions:
        'Liste 3 hábitos práticos de ergonomia e bem-estar aplicáveis na sua rotina técnica (seja diante do computador, na movimentação logística ou nas bancadas de manutenção).',
      evaluationCriteria: 'Objetividade, aplicabilidade diária e alinhamento às boas práticas de saúde ocupacional.',
      safetyNotice: 'Respeite sempre seus limites físicos nos alongamentos leves.',
      bannerUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80',
      category: 'Desafio Surpresa',
      difficulty: MissionDifficulty.SURPRISE,
      participationMode: ParticipationMode.INDIVIDUAL,
      submissionType: SubmissionType.TEXT,
      eventDay: 3,
      eventDateLabel: '18/11/2026',
      status: ActivityStatus.SCHEDULED,
      opensAt: new Date('2026-11-18T14:00:00.000-03:00'),
      closesAt: new Date('2026-11-19T22:00:00.000-03:00'),
      points: 30,
      requiresPhoto: false,
      requiresVideo: false,
      requiresText: true,
      requiresApproval: true,
      isFeatured: false,
      sortOrder: 7,
    },

    // ======================= DIA 4: 19/11/2026 (GRANDE GINCANA) =======================
    {
      slug: 'gincana-informatica-segura',
      title: 'Grande Gincana – Informática Segura: Phishing e Golpes Digitais',
      summary: 'Analise uma mensagem suspeita de engenharia social, aponte os sinais de golpe digital e defina o protocolo seguro.',
      description:
        'Na era conectada, a segurança do trabalho também protege credenciais, sistemas industriais e dados pessoais (LGPD). Analise o caso prático de tentativa de phishing corporativo/escolar e responda como agir com segurança digital.',
      instructions:
        'Cenário: Você recebeu um e-mail urgente com remetente "suporte-rede@sena1-atualizacao.com" pedindo sua senha institucional e código SMS em até 15 minutos sob ameaça de bloqueio do acesso aos laboratórios.\n\n' +
        '1. Selecione a conduta correta na múltipla escolha.\n' +
        '2. Liste pelo menos 3 sinais claros de tentativa de phishing/engenharia social presentes nesse cenário e os cuidados ao usar computadores compartilhados nos laboratórios.',
      evaluationCriteria:
        'Escolha correta do protocolo de resposta e identificação precisa dos indicadores de fraude digital (domínio falso, senso artificial de urgência, solicitação indevida de senha/MFA).',
      safetyNotice: 'Nunca compartilhe suas senhas reais nem clique em links suspeitos para "testar" do que se trata.',
      bannerUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
      category: 'Informática Segura',
      difficulty: MissionDifficulty.INTERMEDIATE,
      participationMode: ParticipationMode.INDIVIDUAL,
      submissionType: SubmissionType.MULTIPLE_CHOICE,
      eventDay: 4,
      eventDateLabel: '19/11/2026',
      status: ActivityStatus.PUBLISHED,
      opensAt: new Date('2026-10-25T08:00:00.000-03:00'),
      closesAt: new Date('2026-11-19T22:00:00.000-03:00'),
      publishedAt: new Date(),
      points: 50,
      requiresPhoto: false,
      requiresVideo: false,
      requiresText: true,
      requiresApproval: true,
      configJson: {
        question: 'Qual é a ação imediata CORRETA ao receber a mensagem descrita no cenário?',
        options: [
          { id: 'a', text: 'Clicar no link em aba anônima apenas para verificar se o logotipo parece verdadeiro.' },
          { id: 'b', text: 'Não clicar em nenhum link, jamais informar senha ou código MFA e reportar imediatamente à equipe de TI/docente.' },
          { id: 'c', text: 'Responder ao remetente perguntando se ele realmente trabalha no setor de suporte.' },
          { id: 'd', text: 'Encaminhar o link no grupo da turma para que outro colega teste primeiro.' },
        ],
        correctOptionId: 'b',
      },
      sortOrder: 8,
    },
    {
      slug: 'gincana-logistica-segura',
      title: 'Grande Gincana – Logística: Armazenagem e Movimentação Segura',
      summary: 'Desafio individual ou em equipe sobre empilhamento seguro, endereçamento, corredores livres e movimentação de materiais.',
      description:
        'Nas operações logísticas estudadas na Escola SENAI "Morvan Figueiredo", o respeito aos limites de carga, estabilidade de paletes, segregação entre pedestres e equipamentos e postura ergonômica evitam acidentes graves.',
      instructions:
        '1. Individualmente ou com sua equipe de turma, analise os requisitos de segurança em um almoxarifado/centro de distribuição didático.\n' +
        '2. Elabore um checklist prático com 5 regras essenciais para armazenagem em porta-paletes e movimentação manual/mecanizada de materiais (incluindo posicionamento de cargas mais pesadas nas prateleiras inferiores, visibilidade, EPIs e desobstrução de rotas de emergência).\n' +
        '3. Opcionalmente, anexe foto de organização logística/sinalização autorizada.',
      evaluationCriteria:
        'Rigor técnico conforme NR-11 e NR-17, aplicabilidade das 5 regras de armazenagem/movimentação e clareza da equipe/participante.',
      safetyNotice: 'Em áreas logísticas didáticas, circule exclusivamente pelas faixas demarcadas para pedestres e sob supervisão docente.',
      bannerUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
      category: 'Logística Segura',
      difficulty: MissionDifficulty.INTERMEDIATE,
      participationMode: ParticipationMode.TEAM,
      submissionType: SubmissionType.TEXT,
      eventDay: 4,
      eventDateLabel: '19/11/2026',
      status: ActivityStatus.PUBLISHED,
      opensAt: new Date('2026-10-25T08:00:00.000-03:00'),
      closesAt: new Date('2026-11-19T22:00:00.000-03:00'),
      publishedAt: new Date(),
      points: 50,
      requiresPhoto: false,
      requiresVideo: false,
      requiresText: true,
      requiresApproval: true,
      sortOrder: 9,
    },
    {
      slug: 'gincana-climatizacao-refrigeracao',
      title: 'Grande Gincana – Segurança nas Oficinas de Climatização e Refrigeração',
      summary: 'Elabore o protocolo preventivo para atuação segura nas oficinas térmicas: EPIs, ventilação, cilindros, fluidos e elétrica.',
      description:
        'A área de Refrigeração e Climatização da Escola SENAI "Morvan Figueiredo" reúne desafios combinados: eletricidade, sistemas pressurizados, brasagem sob supervisão, movimentação de equipamentos e fluidos refrigerantes.',
      instructions:
        '1. Individualmente ou em equipe, descreva os cuidados indispensáveis antes de iniciar uma atividade didática na oficina de climatização e refrigeração.\n' +
        '2. Aborde obrigatoriamente: (a) EPIs necessários (óculos de segurança, luvas apropriadas, calçado fechado); (b) transporte e fixação vertical de cilindros; (c) ventilação do ambiente e consulta à FDS/FISPQ dos fluidos refrigerantes; (d) conferência de desenergização elétrica antes de intervenção mecânica.',
      evaluationCriteria:
        'Contemplação correta dos 4 eixos preventivos da oficina de climatização e refrigeração, sem improvisos e alinhado às orientações docentes.',
      safetyNotice:
        'Toda atividade prática em sistemas térmicos e pressurizados na escola deve ocorrer estritamente sob validação e acompanhamento do instrutor.',
      bannerUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
      category: 'Climatização e Refrigeração',
      difficulty: MissionDifficulty.INTERMEDIATE,
      participationMode: ParticipationMode.TEAM,
      submissionType: SubmissionType.TEXT,
      eventDay: 4,
      eventDateLabel: '19/11/2026',
      status: ActivityStatus.PUBLISHED,
      opensAt: new Date('2026-10-25T08:00:00.000-03:00'),
      closesAt: new Date('2026-11-19T22:00:00.000-03:00'),
      publishedAt: new Date(),
      points: 50,
      requiresPhoto: false,
      requiresVideo: false,
      requiresText: true,
      requiresApproval: true,
      sortOrder: 10,
    },
    {
      slug: 'compromisso-com-a-seguranca',
      title: 'Compromisso com a Segurança – Sua Atitude Faz a Diferença!',
      summary: 'Firme seu compromisso pessoal e profissional de prevenção encerrando a SIPAT 2026 da Escola SENAI "Morvan Figueiredo".',
      description:
        'A SIPAT dura quatro dias no calendário, mas a cultura de segurança acompanha toda a sua trajetória profissional. Registre seu compromisso oficial com a vida, a integridade física e o cuidado coletivo.',
      instructions:
        '1. Escreva seu Compromisso com a Segurança respondendo: "Qual atitude preventiva inegociável levarei da SIPAT 2026 para minhas aulas no SENAI e para minha futura carreira na indústria?"\n' +
        '2. Seu compromisso validado somará pontos decisivos para o encerramento da competição!',
      evaluationCriteria: 'Autenticidade, alinhamento aos valores de prevenção do SENAI e compromisso prático com a segurança coletiva.',
      safetyNotice: 'Segurança começa com você: prevenir é uma atitude de todos!',
      bannerUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
      category: 'Compromisso Final',
      difficulty: MissionDifficulty.INTERMEDIATE,
      participationMode: ParticipationMode.INDIVIDUAL,
      submissionType: SubmissionType.TEXT,
      eventDay: 4,
      eventDateLabel: '19/11/2026',
      status: ActivityStatus.PUBLISHED,
      opensAt: new Date('2026-10-25T08:00:00.000-03:00'),
      closesAt: new Date('2026-11-19T22:00:00.000-03:00'),
      publishedAt: new Date(),
      points: 50,
      requiresPhoto: false,
      requiresVideo: false,
      requiresText: true,
      requiresApproval: true,
      isFeatured: true,
      sortOrder: 11,
    },
  ];

  for (const m of missionsData) {
    const exists = await prisma.mission.findUnique({ where: { slug: m.slug } });
    if (!exists) {
      await prisma.mission.create({ data: m });
    }
  }
  console.log(`[SEED] ${missionsData.length} missões da programação oficial verificadas.`);

  // 7. Quizzes Educativos e Banco Inicial de Questões Técnicas
  const quizzesData = [
    {
      slug: 'quiz-prevencao-percepcao-riscos',
      title: 'Quiz Dia 1: Prevenção de Acidentes, Condições Inseguras e Sinalização',
      description: 'Avalie sua percepção sobre atos e condições inseguras, cores de sinalização (NR-26) e condutas preventivas imediatas no ambiente escolar e industrial.',
      category: 'Prevenção Geral',
      eventDay: 1,
      eventDateLabel: '16/11/2026',
      status: ActivityStatus.PUBLISHED,
      opensAt: new Date('2026-10-25T08:00:00.000-03:00'),
      closesAt: new Date('2026-11-19T22:00:00.000-03:00'),
      publishedAt: new Date(),
      durationSeconds: 600,
      maxPoints: 50,
      maxAttempts: 2,
      sortOrder: 1,
      questions: [
        {
          questionType: QuestionType.PROBLEM_SITUATION,
          courseTrack: 'GERAL',
          prompt: 'Ao entrar na oficina para uma aula prática, você percebe água acumulada próxima a uma bancada e ausência de sinalização. Qual é a atitude preventiva CORRETA?',
          scenarioContext: 'Considere as diretrizes de percepção de riscos e responsabilidade coletiva na escola.',
          options: [
            { id: 'a', text: 'Ignorar a poça e desviar rapidamente para não atrasar o início da tarefa.' },
            { id: 'b', text: 'Alertar os colegas próximos para ninguém pisar, manter distância de cabos/equipamentos e comunicar imediatamente o docente ou equipe de apoio para sinalização e limpeza segura.' },
            { id: 'c', text: 'Empurrar a água com os próprios pés em direção às tomadas da bancada.' },
            { id: 'd', text: 'Aguardar terminar a aula de 4 horas para avisar alguém na saída.' },
          ],
          correctOptionId: 'b',
          explanation: 'Condições inseguras devem ser comunicadas imediatamente ao responsável pelo ambiente, prevenindo escorregões e riscos elétricos para toda a turma.',
          pointsWeight: 10,
          sortOrder: 1,
        },
        {
          questionType: QuestionType.IMAGE_IDENTIFICATION,
          courseTrack: 'GERAL',
          prompt: 'Na sinalização de segurança padronizada pela NR-26, qual é a finalidade principal da cor AMARELA aplicada em faixas, corrimãos e placas de advertência?',
          imageUrl: '/assets/nr26-warning-sign.svg',
          options: [
            { id: 'a', text: 'Indicar localização exclusiva de hidrantes e equipamentos de combate a incêndio.' },
            { id: 'b', text: 'Indicar "Atenção / Cuidado", sinalizando riscos potenciais, desníveis, barreiras e áreas que exigem cautela.' },
            { id: 'c', text: 'Indicar liberação total para correr ou circular sem EPI.' },
            { id: 'd', text: 'Identificar exclusivamente postos de enfermaria e resgate médico.' },
          ],
          correctOptionId: 'b',
          explanation: 'Pela NR-26, o amarelo é utilizado para indicar "Cuidado / Atenção", alertando contra riscos de tropeço, queda, impacto ou proximidade de equipamentos.',
          pointsWeight: 10,
          sortOrder: 2,
        },
        {
          questionType: QuestionType.MULTIPLE_CHOICE,
          courseTrack: 'GERAL',
          prompt: 'Qual das alternativas abaixo descreve corretamente uma CONDIÇÃO INSEGURA presente no ambiente?',
          options: [
            { id: 'a', text: 'Utilizar óculos de proteção certificado durante toda a aula prática.' },
            { id: 'b', text: 'Degrau de escada com piso antiderrapante solto e iluminação queimada no corredor.' },
            { id: 'c', text: 'Conferir o checklist da bancada antes de ligar o equipamento.' },
            { id: 'd', text: 'Manter mochilas guardadas no local apropriado fora da rota de circulação.' },
          ],
          correctOptionId: 'b',
          explanation: 'Condição insegura é uma falha física, estrutural ou de organização presente no ambiente que compromete a segurança das pessoas.',
          pointsWeight: 10,
          sortOrder: 3,
        },
        {
          questionType: QuestionType.TRUE_FALSE,
          courseTrack: 'GERAL',
          prompt: 'Equipamentos de combate a incêndio (extintores e hidrantes) e saídas de emergência jamais podem ser obstruídos por caixas, cadeiras, paletes ou carrinhos, nem mesmo "por poucos minutos".',
          options: [
            { id: 'true', text: 'Verdadeiro' },
            { id: 'false', text: 'Falso' },
          ],
          correctOptionId: 'true',
          explanation: 'Verdadeiro! Emergências não avisam horário. Extintores, hidrantes e rotas de fuga devem permanecer 100% livres e sinalizados em tempo integral.',
          pointsWeight: 10,
          sortOrder: 4,
        },
        {
          questionType: QuestionType.MULTIPLE_CHOICE,
          courseTrack: 'GERAL',
          prompt: 'Qual é o papel da CIPA e da SIPAT dentro de uma instituição de ensino técnico e ambientes industriais?',
          options: [
            { id: 'a', text: 'Aplicar multas financeiras nos estudantes durante o intervalo.' },
            { id: 'b', text: 'Promover a conscientização, identificar riscos e fortalecer a cultura permanente de prevenção de acidentes e doenças ocupacionais.' },
            { id: 'c', text: 'Substituir a necessidade de usar Equipamentos de Proteção Individual.' },
            { id: 'd', text: 'Funcionar apenas em um único dia do ano sem continuidade.' },
          ],
          correctOptionId: 'b',
          explanation: 'A SIPAT e a CIPA atuam de forma educativa e preventiva, engajando toda a comunidade na identificação de riscos e adoção de práticas seguras.',
          pointsWeight: 10,
          sortOrder: 5,
        },
      ],
    },
    {
      slug: 'quiz-seguranca-pratica-epis-eletrica',
      title: 'Quiz Dia 2: EPIs, Segurança Elétrica, Ferramentas e Bancadas',
      description: 'Questões essenciais sobre conservação e Certificado de Aprovação (CA) de EPIs, prevenção de choques elétricos, ferramentas manuais e organização 5S.',
      category: 'Segurança na Prática',
      eventDay: 2,
      eventDateLabel: '17/11/2026',
      status: ActivityStatus.PUBLISHED,
      opensAt: new Date('2026-10-25T09:00:00.000-03:00'),
      closesAt: new Date('2026-11-19T22:00:00.000-03:00'),
      publishedAt: new Date(),
      durationSeconds: 600,
      maxPoints: 50,
      maxAttempts: 2,
      sortOrder: 2,
      questions: [
        {
          questionType: QuestionType.MULTIPLE_CHOICE,
          courseTrack: 'GERAL',
          prompt: 'De acordo com a NR-06, todo Equipamento de Proteção Individual (EPI) utilizado no Brasil deve possuir obrigatoriamente:',
          options: [
            { id: 'a', text: 'Apenas uma cor chamativa escolhida pelo usuário.' },
            { id: 'b', text: 'Certificado de Aprovação (CA) válido, além de estar em perfeito estado de conservação e higienização.' },
            { id: 'c', text: 'Adaptações caseiras com fita isolante quando estiver trincado.' },
            { id: 'd', text: 'Tamanho único compartilhado sem higienização entre dezenas de pessoas ao mesmo tempo.' },
          ],
          correctOptionId: 'b',
          explanation: 'O Certificado de Aprovação (CA) atesta que o EPI passou pelos ensaios normativos de proteção. EPIs danificados devem ser substituídos imediatamente.',
          pointsWeight: 10,
          sortOrder: 1,
        },
        {
          questionType: QuestionType.PROBLEM_SITUATION,
          courseTrack: 'ELETRICA',
          prompt: 'Durante uma atividade em laboratório, um aluno nota que um plugue ou cabo de alimentação apresenta aquecimento anormal e isolação ressecada. O que ele deve fazer?',
          scenarioContext: 'Segurança preventiva com eletricidade em ambientes de ensino.',
          options: [
            { id: 'a', text: 'Enrolar papel ou plástico comum e continuar usando o equipamento.' },
            { id: 'b', text: 'Não utilizar o equipamento, manter distância segura da parte avariada e avisar imediatamente o docente responsável para desenergização e manutenção qualificada.' },
            { id: 'c', text: 'Desmontar a tomada energizada por conta própria com uma tesoura escolar.' },
            { id: 'd', text: 'Puxar o equipamento diretamente pelo fio com as mãos úmidas.' },
          ],
          correctOptionId: 'b',
          explanation: 'Jamais improvise reparos elétricos nem utilize cabos avariados. Somente profissionais autorizados e com circuito desenergizado/bloqueado devem intervir.',
          pointsWeight: 10,
          sortOrder: 2,
        },
        {
          questionType: QuestionType.TRUE_FALSE,
          courseTrack: 'ELETRICA',
          prompt: 'Adornos metálicos (como anéis, pulseiras, relógios e correntes) devem ser retirados antes de atividades práticas em oficinas mecânicas e elétricas, pois aumentam o risco de agarramento e choque elétrico.',
          options: [
            { id: 'true', text: 'Verdadeiro' },
            { id: 'false', text: 'Falso' },
          ],
          correctOptionId: 'true',
          explanation: 'Verdadeiro! Adornos metálicos conduzem eletricidade (NR-10) e podem prender-se em partes móveis ou ferramentas (NR-12), causando lesões graves.',
          pointsWeight: 10,
          sortOrder: 3,
        },
        {
          questionType: QuestionType.MULTIPLE_CHOICE,
          courseTrack: 'GERAL',
          prompt: 'Sobre a organização de bancadas técnicas e uso de ferramentas manuais, assinale a prática SEGURA:',
          options: [
            { id: 'a', text: 'Utilizar cada ferramenta estritamente para sua finalidade projetada, mantendo a bancada limpa e guardando ferramentas cortantes em seus suportes.' },
            { id: 'b', text: 'Transportar chaves de fenda e estiletes abertos nos bolsos da calça.' },
            { id: 'c', text: 'Empilhar peças pesadas na beirada da bancada sobre cabos de medição.' },
            { id: 'd', text: 'Usar alicate como martelo para ganhar tempo na montagem.' },
          ],
          correctOptionId: 'a',
          explanation: 'Improvisar ferramentas é uma das principais causas de acidentes nas mãos e projeção de fragmentos. A organização 5S mantém o posto seguro e produtivo.',
          pointsWeight: 10,
          sortOrder: 4,
        },
        {
          questionType: QuestionType.MULTIPLE_CHOICE,
          courseTrack: 'CLIMATIZACAO',
          prompt: 'Qual cuidado é indispensável quanto à guarda de cilindros nas oficinas técnicas?',
          options: [
            { id: 'a', text: 'Deixá-los soltos no meio do corredor e expostos ao sol.' },
            { id: 'b', text: 'Mantê-los na posição vertical, devidamente identificados, com capacete de proteção da válvula quando fora de uso e presos por corrente ou cinta em local ventilado.' },
            { id: 'c', text: 'Apoiar caixas pesadas em cima das válvulas e manômetros.' },
            { id: 'd', text: 'Remover os rótulos de identificação para padronizar a cor.' },
          ],
          correctOptionId: 'b',
          explanation: 'Cilindros devem estar sempre identificados, protegidos contra quedas por correntes/cintas em posição vertical e armazenados em área ventilada e sinalizada.',
          pointsWeight: 10,
          sortOrder: 5,
        },
      ],
    },
    {
      slug: 'quiz-ergonomia-bem-estar',
      title: 'Quiz Dia 3: Ergonomia (NR-17), Postura e Organização do Trabalho',
      description: 'Teste seus conhecimentos sobre ajuste de estações de trabalho, postura correta, iluminação, pausas preventivas e levantamento manual de cargas.',
      category: 'Ergonomia',
      eventDay: 3,
      eventDateLabel: '18/11/2026',
      status: ActivityStatus.PUBLISHED,
      opensAt: new Date('2026-10-25T08:00:00.000-03:00'),
      closesAt: new Date('2026-11-19T22:00:00.000-03:00'),
      publishedAt: new Date(),
      durationSeconds: 480,
      maxPoints: 50,
      maxAttempts: 2,
      sortOrder: 3,
      questions: [
        {
          questionType: QuestionType.MULTIPLE_CHOICE,
          courseTrack: 'ERGONOMIA',
          prompt: 'Em uma estação de trabalho com computador, qual deve ser a altura recomendada da borda superior do monitor em relação ao usuário sentado corretamente?',
          options: [
            { id: 'a', text: 'Muito acima da cabeça, obrigando a inclinar o pescoço para trás o tempo todo.' },
            { id: 'b', text: 'Aproximadamente alinhada à linha horizontal dos olhos (ou ligeiramente abaixo), mantendo o pescoço em posição neutra e confortável.' },
            { id: 'c', text: 'Encostada nos joelhos do operador.' },
            { id: 'd', text: 'Lateralmente a 90 graus, exigindo torção contínua do tronco.' },
          ],
          correctOptionId: 'b',
          explanation: 'O alinhamento da borda superior da tela próximo à linha dos olhos evita flexão ou extensão excessiva da coluna cervical e reduz a fadiga visual.',
          pointsWeight: 10,
          sortOrder: 1,
        },
        {
          questionType: QuestionType.MULTIPLE_CHOICE,
          courseTrack: 'LOGISTICA',
          prompt: 'Ao realizar o levantamento manual de uma caixa leve/moderada do piso, qual é a técnica biomecânica segura?',
          options: [
            { id: 'a', text: 'Manter as pernas totalmente esticadas, curvar toda a coluna lombar e girar o tronco bruscamente.' },
            { id: 'b', text: 'Aproximar-se da carga, flexionar os joelhos mantendo a coluna alinhada, segurar firme junto ao corpo e usar a força da musculatura das pernas.' },
            { id: 'c', text: 'Carregar caixas empilhadas acima da linha dos olhos bloqueando toda a visão do caminho.' },
            { id: 'd', text: 'Tentar levantar sozinho cargas acima da sua capacidade sem solicitar auxílio ou carrinho.' },
          ],
          correctOptionId: 'b',
          explanation: 'Flexionar os joelhos mantendo a carga próxima ao centro de gravidade do corpo preserva os discos intervertebrais da região lombar.',
          pointsWeight: 10,
          sortOrder: 2,
        },
        {
          questionType: QuestionType.TRUE_FALSE,
          courseTrack: 'ERGONOMIA',
          prompt: 'Reflexos diretos de janelas ou luminárias na tela do computador e iluminação insuficiente forçam a acomodação visual, gerando cefaleia, fadiga ocular e posturas compensatórias inadequadas.',
          options: [
            { id: 'true', text: 'Verdadeiro' },
            { id: 'false', text: 'Falso' },
          ],
          correctOptionId: 'true',
          explanation: 'Verdadeiro! Posicionar monitores perpendicularmente às janelas e garantir iluminação uniforme e difusa são medidas ergonômicas fundamentais.',
          pointsWeight: 10,
          sortOrder: 3,
        },
        {
          questionType: QuestionType.MULTIPLE_CHOICE,
          courseTrack: 'ERGONOMIA',
          prompt: 'Por que pequenas pausas ativas e alternância postural durante atividades prolongadas são importantes?',
          options: [
            { id: 'a', text: 'Porque permitem a oxigenação muscular, aliviam a sobrecarga estática em tendões e articulações e mantêm o nível de atenção preventiva.' },
            { id: 'b', text: 'Não têm nenhuma relação com saúde ou atenção.' },
            { id: 'c', text: 'Servem apenas para quem trabalha em pé.' },
            { id: 'd', text: 'Substituem o ajuste correto da cadeira e da bancada.' },
          ],
          correctOptionId: 'a',
          explanation: 'A postura estática prolongada reduz a circulação local e favorece desconfortos osteomusculares e queda de concentração.',
          pointsWeight: 10,
          sortOrder: 4,
        },
        {
          questionType: QuestionType.PROBLEM_SITUATION,
          courseTrack: 'ERGONOMIA',
          prompt: 'Em uma bancada de manutenção ou montagem onde o trabalho exige precisão manual em pé, a altura ideal da superfície deve:',
          scenarioContext: 'Aplicação prática de ergonomia em oficinas e laboratórios.',
          options: [
            { id: 'a', text: 'Obrigar o aluno a trabalhar curvado a 45 graus durante horas.' },
            { id: 'b', text: 'Permitir que os ombros fiquem relaxados e a coluna ereta, posicionando a tarefa ligeiramente acima da linha dos cotovelos para trabalhos de precisão.' },
            { id: 'c', text: 'Ficar acima da altura dos ombros mantendo os braços suspensos.' },
            { id: 'd', text: 'Impedir espaço para acomodação dos pés.' },
          ],
          correctOptionId: 'b',
          explanation: 'Na NR-17, bancadas para trabalho em pé variam conforme a tarefa: precisão requer superfície ligeiramente mais alta para não curvar o pescoço e o tronco.',
          pointsWeight: 10,
          sortOrder: 5,
        },
      ],
    },
    {
      slug: 'quiz-mito-ou-verdade',
      title: 'Desafio Dia 4: Mito ou Verdade da Prevenção',
      description: 'Desmistifique crenças perigosas do dia a dia! Julgue cada afirmação como Verdadeira (Fato Técnico) ou Falsa (Mito Perigoso).',
      category: 'Mito ou Verdade',
      eventDay: 4,
      eventDateLabel: '19/11/2026',
      status: ActivityStatus.PUBLISHED,
      opensAt: new Date('2026-10-25T08:00:00.000-03:00'),
      closesAt: new Date('2026-11-19T22:00:00.000-03:00'),
      publishedAt: new Date(),
      durationSeconds: 360,
      maxPoints: 30,
      maxAttempts: 2,
      sortOrder: 4,
      questions: [
        {
          questionType: QuestionType.TRUE_FALSE,
          courseTrack: 'GERAL',
          prompt: '"Se a tarefa na oficina vai durar menos de 1 minuto, não preciso colocar os óculos de proteção." — Essa afirmação é VERDADEIRA?',
          options: [
            { id: 'true', text: 'Verdadeiro (Fato)' },
            { id: 'false', text: 'Falso (Mito!)' },
          ],
          correctOptionId: 'false',
          explanation: 'MITO PERIGOSO! Uma projeção de partícula ocorre em milésimos de segundo. O EPI é obrigatório durante 100% do tempo de exposição ao risco, independentemente da duração.',
          pointsWeight: 10,
          sortOrder: 1,
        },
        {
          questionType: QuestionType.TRUE_FALSE,
          courseTrack: 'GERAL',
          prompt: '"Profissionais experientes também sofrem acidentes quando relaxam nos procedimentos ou confiam no improviso." — Essa afirmação é VERDADEIRA?',
          options: [
            { id: 'true', text: 'Verdadeiro (Fato)' },
            { id: 'false', text: 'Falso (Mito)' },
          ],
          correctOptionId: 'true',
          explanation: 'VERDADEIRO! O excesso de autoconfiança é um fator clássico de risco. O procedimento de segurança vale tanto para o iniciante quanto para o especialista.',
          pointsWeight: 10,
          sortOrder: 2,
        },
        {
          questionType: QuestionType.TRUE_FALSE,
          courseTrack: 'INFORMATICA',
          prompt: '"Bloquear a tela do computador (Win + L) ao se afastar da estação evita acessos indevidos e protege dados pessoais sob a LGPD." — Verdadeiro ou Falso?',
          options: [
            { id: 'true', text: 'Verdadeiro (Fato)' },
            { id: 'false', text: 'Falso (Mito)' },
          ],
          correctOptionId: 'true',
          explanation: 'VERDADEIRO! Estações desbloqueadas permitem uso indevido da sua conta institucional e exposição de informações acadêmicas ou pessoais.',
          pointsWeight: 10,
          sortOrder: 3,
        },
        {
          questionType: QuestionType.TRUE_FALSE,
          courseTrack: 'LOGISTICA',
          prompt: '"Em um corredor de almoxarifado, não há problema em pegar carona nos garfos de uma paleteira ou empilhadeira para andar mais rápido." — Verdadeiro ou Falso?',
          options: [
            { id: 'true', text: 'Verdadeiro (Fato)' },
            { id: 'false', text: 'Falso (Mito!)' },
          ],
          correctOptionId: 'false',
          explanation: 'MITO GRAVÍSSIMO! Equipamentos de movimentação de cargas jamais podem transportar pessoas nos garfos ou estruturas (NR-11).',
          pointsWeight: 10,
          sortOrder: 4,
        },
        {
          questionType: QuestionType.TRUE_FALSE,
          courseTrack: 'CLIMATIZACAO',
          prompt: '"Antes de utilizar qualquer produto químico ou fluido refrigerante na oficina, é fundamental conhecer sua identificação e orientações da Ficha com Dados de Segurança (FDS/FISPQ)." — Verdadeiro ou Falso?',
          options: [
            { id: 'true', text: 'Verdadeiro (Fato)' },
            { id: 'false', text: 'Falso (Mito)' },
          ],
          correctOptionId: 'true',
          explanation: 'VERDADEIRO! A FDS (antiga FISPQ) traz informações indispensáveis sobre riscos, EPIs específicos, ventilação e medidas de emergência.',
          pointsWeight: 10,
          sortOrder: 5,
        },
        {
          questionType: QuestionType.TRUE_FALSE,
          courseTrack: 'GERAL',
          prompt: '"Quase-acidentes (incidentes sem lesão) devem ser comunicados, pois revelam falhas que poderiam gerar acidentes graves no futuro." — Verdadeiro ou Falso?',
          options: [
            { id: 'true', text: 'Verdadeiro (Fato)' },
            { id: 'false', text: 'Falso (Mito)' },
          ],
          correctOptionId: 'true',
          explanation: 'VERDADEIRO! Tratar quase-acidentes elimina a causa raiz antes que alguém se machuque.',
          pointsWeight: 10,
          sortOrder: 6,
        },
      ],
    },
    {
      slug: 'quiz-final-grande-gincana',
      title: 'Quiz Final – Grande Gincana SIPAT 2026 (Multidisciplinar SENAI)',
      description: 'Desafio integrador final reunindo Segurança Digital (Informática), Armazenagem e Cargas (Logística), Oficinas de Climatização & Refrigeração, Segurança Elétrica e Prevenção Geral!',
      category: 'Grande Gincana',
      eventDay: 4,
      eventDateLabel: '19/11/2026',
      status: ActivityStatus.PUBLISHED,
      opensAt: new Date('2026-10-25T08:00:00.000-03:00'),
      closesAt: new Date('2026-11-19T22:00:00.000-03:00'),
      publishedAt: new Date(),
      durationSeconds: 720,
      maxPoints: 50,
      maxAttempts: 1,
      sortOrder: 5,
      questions: [
        {
          questionType: QuestionType.PROBLEM_SITUATION,
          courseTrack: 'INFORMATICA',
          prompt: '[Informática Segura] Você encontra um pendrive desconhecido sem identificação sobre a bancada do laboratório de informática. Qual é a conduta segura?',
          scenarioContext: 'Prevenção contra malware, ransomware e comprometimento de redes escolares/industriais.',
          options: [
            { id: 'a', text: 'Conectar imediatamente no computador logado na rede para ver de quem são os arquivos.' },
            { id: 'b', text: 'Não conectar a nenhum dispositivo e entregá-lo diretamente à coordenação/suporte de TI da escola.' },
            { id: 'c', text: 'Executar todos os arquivos .exe do dispositivo para descobrir o dono.' },
            { id: 'd', text: 'Levar para casa e conectar no notebook pessoal.' },
          ],
          correctOptionId: 'b',
          explanation: 'Dispositivos USB desconhecidos ("USB Drop Attack") podem executar scripts maliciosos ou instalar malwares assim que conectados.',
          pointsWeight: 10,
          sortOrder: 1,
        },
        {
          questionType: QuestionType.MULTIPLE_CHOICE,
          courseTrack: 'INFORMATICA',
          prompt: '[Segurança Digital] Qual das práticas abaixo caracteriza proteção eficaz contra golpes de phishing e invasão de contas?',
          options: [
            { id: 'a', text: 'Usar a mesma senha curta em todas as redes sociais, e-mail e bancos.' },
            { id: 'b', text: 'Conferir atentamente o domínio real do remetente, ativar autenticação em dois fatores (MFA) e nunca informar códigos de verificação a terceiros.' },
            { id: 'c', text: 'Anotar a senha em um adesivo colado no monitor do laboratório.' },
            { id: 'd', text: 'Confiar em qualquer mensagem que contenha palavras como "URGENTE" ou "PRÊMIO".' },
          ],
          correctOptionId: 'b',
          explanation: 'A combinação de verificação de URL/domínio, senhas únicas fortes e MFA bloqueia a imensa maioria dos ataques de credenciais.',
          pointsWeight: 10,
          sortOrder: 2,
        },
        {
          questionType: QuestionType.PROBLEM_SITUATION,
          courseTrack: 'LOGISTICA',
          prompt: '[Logística Segura] Ao organizar uma estante porta-paletes didática com caixas de diferentes pesos, como os materiais devem ser distribuídos?',
          scenarioContext: 'Estabilidade estrutural e ergonomia na armazenagem logística.',
          options: [
            { id: 'a', text: 'Colocar as caixas mais pesadas no nível mais alto e as leves esmagadas embaixo.' },
            { id: 'b', text: 'Respeitar a capacidade máxima sinalizada da estrutura, posicionar cargas mais pesadas nos níveis inferiores/intermediários acessíveis, alinhar os volumes sem ultrapassar as bordas do palete e manter corredores livres.' },
            { id: 'c', text: 'Deixar caixas projetadas 40 cm para fora do corredor de circulação.' },
            { id: 'd', text: 'Escalar as longarinas da estante com os pés para alcançar o topo.' },
          ],
          correctOptionId: 'b',
          explanation: 'Posicionar volumes pesados em níveis baixos reduz o centro de gravidade da estrutura, evita quedas de materiais e melhora a ergonomia de apanha.',
          pointsWeight: 10,
          sortOrder: 3,
        },
        {
          questionType: QuestionType.MULTIPLE_CHOICE,
          courseTrack: 'LOGISTICA',
          prompt: '[Logística Segura] Na circulação interna em áreas com movimentação de cargas e equipamentos logísticos, o pedestre deve:',
          options: [
            { id: 'a', text: 'Caminhar digitando no celular pelo meio da pista de manobra.' },
            { id: 'b', text: 'Respeitar rigorosamente as faixas exclusivas de pedestres, manter atenção visual e sonora aos sinais de alerta e estabelecer contato visual nos cruzamentos.' },
            { id: 'c', text: 'Passar por baixo de cargas suspensas ou garfos elevados.' },
            { id: 'd', text: 'Atravessar correndo atrás de equipamentos dando ré.' },
          ],
          correctOptionId: 'b',
          explanation: 'A segregação homem-máquina, atenção plena (sem uso de celular caminhando) e proibição de passagem sob cargas suspensas são regras vitais na logística.',
          pointsWeight: 10,
          sortOrder: 4,
        },
        {
          questionType: QuestionType.PROBLEM_SITUATION,
          courseTrack: 'CLIMATIZACAO',
          prompt: '[Climatização e Refrigeração] Na oficina de refrigeração e climatização, por que o uso de óculos de segurança e luvas adequadas é obrigatório nas atividades orientadas pelo docente?',
          scenarioContext: 'Prevenção de lesões oculares, térmicas e mecânicas nas oficinas de climatização.',
          options: [
            { id: 'a', text: 'Apenas por exigência estética do uniforme.' },
            { id: 'b', text: 'Porque protegem olhos e mãos contra respingos acidentais de fluidos em baixa temperatura (queimadura por frio), partículas metálicas e arestas cortantes de aletas/tubulações.' },
            { id: 'c', text: 'Para dispensar a necessidade de ventilação no laboratório.' },
            { id: 'd', text: 'Para permitir improvisos fora das normas técnicas.' },
          ],
          correctOptionId: 'b',
          explanation: 'Fluidos refrigerantes em expansão rápida podem causar queimaduras severas por congelamento na pele e nos olhos, além dos riscos mecânicos de chapas e aletas.',
          pointsWeight: 10,
          sortOrder: 5,
        },
        {
          questionType: QuestionType.MULTIPLE_CHOICE,
          courseTrack: 'CLIMATIZACAO',
          prompt: '[Climatização e Refrigeração] Antes de realizar inspeção mecânica interna em uma unidade condensadora ou climatizador didático:',
          options: [
            { id: 'a', text: 'Deve-se confirmar com o docente que o equipamento está totalmente desenergizado, bloqueado/sinalizado e com partes móveis (hélices/ventiladores) paradas.' },
            { id: 'b', text: 'Basta segurar a hélice do ventilador com a mão enquanto estiver ligado.' },
            { id: 'c', text: 'Deve-se trabalhar com ferramentas molhadas sobre o borne elétrico.' },
            { id: 'd', text: 'Retirar todas as grades de proteção definitivamente após o serviço.' },
          ],
          correctOptionId: 'a',
          explanation: 'Desenergização segura, verificação de parada total de ventiladores e recolocação de todas as proteções mecânicas são etapas obrigatórias.',
          pointsWeight: 10,
          sortOrder: 6,
        },
        {
          questionType: QuestionType.MULTIPLE_CHOICE,
          courseTrack: 'GERAL',
          prompt: '[LGPD e Convivência Escolar] Durante o registro fotográfico de atividades da SIPAT na escola, qual cuidado respeita a privacidade e a LGPD?',
          options: [
            { id: 'a', text: 'Fotografar colegas distraídos e publicar em perfis externos sem permissão.' },
            { id: 'b', text: 'Focar na situação técnica/ambiente autorizado, respeitar a autorização de uso de imagem e utilizar apenas os canais oficiais da plataforma.' },
            { id: 'c', text: 'Fotografar documentos pessoais, senhas ou telas com dados cadastrais.' },
            { id: 'd', text: 'Compartilhar dados de matrícula da turma em sites desconhecidos.' },
          ],
          correctOptionId: 'b',
          explanation: 'A proteção de dados pessoais e da imagem — especialmente em instituições de ensino com adolescentes — é dever ético e legal (Lei nº 13.709/2018 - LGPD).',
          pointsWeight: 10,
          sortOrder: 7,
        },
        {
          questionType: QuestionType.MULTIPLE_CHOICE,
          courseTrack: 'GERAL',
          prompt: '[Cultura SIPAT 2026] O que significa na prática o slogan "Sua atitude faz a diferença!" na Escola SENAI "Morvan Figueiredo"?',
          options: [
            { id: 'a', text: 'Que a segurança depende exclusivamente dos bombeiros ou da direção.' },
            { id: 'b', text: 'Que cada aluno e colaborador é protagonista ativo na prevenção diária, cuidando de si, respeitando normas técnicas e zelando pela integridade de todos.' },
            { id: 'c', text: 'Que basta decorar regras apenas durante a semana de novembro.' },
            { id: 'd', text: 'Que velocidade na entrega é mais importante que a integridade física.' },
          ],
          correctOptionId: 'b',
          explanation: 'Segurança começa com você: prevenir é uma atitude permanente, individual e coletiva em todas as áreas técnicas!',
          pointsWeight: 10,
          sortOrder: 8,
        },
      ],
    },
  ];

  for (const qData of quizzesData) {
    const existingQuiz = await prisma.quiz.findUnique({ where: { slug: qData.slug } });
    if (!existingQuiz) {
      const { questions, ...quizFields } = qData;
      await prisma.quiz.create({
        data: {
          ...quizFields,
          questions: {
            create: questions,
          },
        },
      });
    }
  }
  console.log(`[SEED] ${quizzesData.length} quizzes e banco completo de questões verificados.`);
  console.log('[SEED] Concluído com sucesso e sem alterações destrutivas!');
}

main()
  .catch((e) => {
    console.error('[SEED ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

