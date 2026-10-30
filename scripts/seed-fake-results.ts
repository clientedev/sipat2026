import 'dotenv/config';
import {
  PrismaClient,
  Role,
  SubmissionStatus,
  PointSourceType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function calculateLevel(points: number): number {
  if (points >= 300) return 5;
  if (points >= 200) return 4;
  if (points >= 120) return 3;
  if (points >= 50) return 2;
  return 1;
}

async function runFakeResultsPopulation() {
  console.log('========================================================================');
  console.log(' POPULANDO DADOS FAKES REALISTAS COM RESULTADOS – SIPAT 2026 SENAI MOOCA');
  console.log('========================================================================');

  const [classes, missions, quizzes, badges, evaluator] = await Promise.all([
    prisma.classGroup.findMany(),
    prisma.mission.findMany(),
    prisma.quiz.findMany({ include: { questions: true } }),
    prisma.badge.findMany(),
    prisma.user.findFirst({ where: { role: Role.EVALUATOR } }),
  ]);

  const defaultPasswordHash = await bcrypt.hash('Aluno@Senai2026', 10);
  const evaluatorId = evaluator?.id || null;

  const classMap = new Map(classes.map((c) => [c.code, c.id]));
  const badgeMap = new Map(badges.map((b) => [b.slug, b.id]));

  // 1. Alunos Fakes Realistas distribuídos pelas turmas oficiais da Escola SENAI "Morvan Figueiredo"
  const studentsToSeed = [
    {
      fullName: 'Mariana Souza Silva',
      email: 'mariana.silva@aluno.senai.br',
      registrationCode: 'RA2026-DEV-001',
      classCode: 'TEC-DEV-2T',
      isMinor: false,
      imageConsent: true,
    },
    {
      fullName: 'Carlos Eduardo Mendes',
      email: 'carlos.mendes@aluno.senai.br',
      registrationCode: 'RA2026-LOG-002',
      classCode: 'TEC-LOG-1M',
      isMinor: false,
      imageConsent: true,
    },
    {
      fullName: 'Fernando Henrique Dias',
      email: 'fernando.dias@aluno.senai.br',
      registrationCode: 'RA2026-AUT-003',
      classCode: 'CAI-AUT-1T',
      isMinor: false,
      imageConsent: true,
    },
    {
      fullName: 'Diego Nascimento Rocha',
      email: 'diego.nascimento@aluno.senai.br',
      registrationCode: 'RA2026-CLI-004',
      classCode: 'TEC-CLI-1T',
      isMinor: false,
      imageConsent: true,
    },
    {
      fullName: 'Thiago Barbosa Castro',
      email: 'thiago.barbosa@aluno.senai.br',
      registrationCode: 'RA2026-ELE-005',
      classCode: 'CAI-ELE-1M',
      isMinor: false,
      imageConsent: true,
    },
    {
      fullName: 'Camila Rocha Nogueira',
      email: 'camila.rocha@aluno.senai.br',
      registrationCode: 'RA2026-LOG-006',
      classCode: 'TEC-LOG-1M',
      isMinor: true,
      guardianName: 'Marcos Nogueira',
      imageConsent: false,
    },
    {
      fullName: 'Gabriel Costa Ribeiro',
      email: 'gabriel.costa@aluno.senai.br',
      registrationCode: 'RA2026-INF-007',
      classCode: 'TEC-INF-1M',
      isMinor: false,
      imageConsent: true,
    },
    {
      fullName: 'Aline Martins Ferreira',
      email: 'aline.martins@aluno.senai.br',
      registrationCode: 'RA2026-AUT-008',
      classCode: 'CAI-AUT-1T',
      isMinor: false,
      imageConsent: true,
    },
    {
      fullName: 'Larissa Carvalho Pires',
      email: 'larissa.carvalho@aluno.senai.br',
      registrationCode: 'RA2026-ELE-009',
      classCode: 'CAI-ELE-1M',
      isMinor: false,
      imageConsent: true,
    },
    {
      fullName: 'Amanda Silveira Santos',
      email: 'amanda.silveira@aluno.senai.br',
      registrationCode: 'RA2026-CLI-010',
      classCode: 'TEC-CLI-2N',
      isMinor: false,
      imageConsent: true,
    },
    {
      fullName: 'Lucas Ferreira Guimarães',
      email: 'lucas.ferreira@aluno.senai.br',
      registrationCode: 'RA2026-DEV-011',
      classCode: 'TEC-DEV-2T',
      isMinor: true,
      guardianName: 'Regina Guimarães',
      imageConsent: true,
    },
    {
      fullName: 'Rodrigo Alves Moreira',
      email: 'rodrigo.alves@aluno.senai.br',
      registrationCode: 'RA2026-LOG-012',
      classCode: 'TEC-LOG-2N',
      isMinor: false,
      imageConsent: true,
    },
    {
      fullName: 'Pedro Henrique Prado',
      email: 'pedro.prado@aluno.senai.br',
      registrationCode: 'RA2026-ADM-013',
      classCode: 'CAI-ADM-1M',
      isMinor: true,
      guardianName: 'Silvana Prado',
      imageConsent: true,
    },
    {
      fullName: 'Sofia Guimarães Neves',
      email: 'sofia.neves@aluno.senai.br',
      registrationCode: 'RA2026-ADM-014',
      classCode: 'CAI-ADM-1M',
      isMinor: true,
      guardianName: 'Paulo Neves',
      imageConsent: false,
    },
    {
      fullName: 'Beatriz Lima Tavares',
      email: 'beatriz.lima@aluno.senai.br',
      registrationCode: 'RA2026-INF-015',
      classCode: 'TEC-INF-1M',
      isMinor: false,
      imageConsent: true,
    },
    {
      fullName: 'Vinicius Oliveira Toledo',
      email: 'vinicius.toledo@aluno.senai.br',
      registrationCode: 'RA2026-AUT-016',
      classCode: 'CAI-AUT-1T',
      isMinor: false,
      imageConsent: true,
    },
    {
      fullName: 'Marcelo Ribeiro Peixoto',
      email: 'marcelo.peixoto@aluno.senai.br',
      registrationCode: 'RA2026-LOG-017',
      classCode: 'TEC-LOG-2N',
      isMinor: false,
      imageConsent: false,
    },
    {
      fullName: 'Bruno Henrique Santana',
      email: 'bruno.santana@aluno.senai.br',
      registrationCode: 'RA2026-ELE-018',
      classCode: 'CAI-ELE-1M',
      isMinor: false,
      imageConsent: true,
    },
    {
      fullName: 'Rafael Monteiro Dantas',
      email: 'rafael.dantas@aluno.senai.br',
      registrationCode: 'RA2026-CLI-019',
      classCode: 'TEC-CLI-1T',
      isMinor: false,
      imageConsent: true,
    },
    {
      fullName: 'Enzo Gabriel Castro',
      email: 'enzo.castro@aluno.senai.br',
      registrationCode: 'RA2026-ADM-020',
      classCode: 'CAI-ADM-1M',
      isMinor: true,
      guardianName: 'Eliane Castro',
      imageConsent: true,
    },
    {
      fullName: 'Henrique Silva Teste (Demonstração)',
      email: 'aluno.silva@aluno.senai.br',
      registrationCode: 'RA2026-DEMO-099',
      classCode: 'TEC-DEV-2T',
      isMinor: false,
      imageConsent: true,
    },
  ];

  console.log(`[SEED-FAKES] Atualizando ${studentsToSeed.length} alunos com turmas e credenciais...`);

  const createdUsers: any[] = [];
  for (const s of studentsToSeed) {
    const classId = classMap.get(s.classCode) || classes[0].id;
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {
        fullName: s.fullName,
        registrationCode: s.registrationCode,
        classGroupId: classId,
        isMinor: s.isMinor,
        guardianName: s.guardianName || null,
        imageConsent: s.imageConsent,
        isActive: true,
      },
      create: {
        fullName: s.fullName,
        email: s.email,
        registrationCode: s.registrationCode,
        passwordHash: defaultPasswordHash,
        classGroupId: classId,
        role: Role.PARTICIPANT,
        isMinor: s.isMinor,
        guardianName: s.guardianName || null,
        lgpdConsentAt: new Date('2026-10-15T09:00:00Z'),
        imageConsent: s.imageConsent,
        imageConsentAt: s.imageConsent ? new Date('2026-10-15T09:00:00Z') : null,
        isActive: true,
      },
    });
    createdUsers.push(user);
  }

  // 2. Mapeamento preciso de Missões
  const missionRiskHunt = missions.find((m) => m.slug === 'caca-aos-riscos');
  const missionStartWithMe = missions.find((m) => m.slug === 'seguranca-comeca-comigo');
  const mission7Errors = missions.find((m) => m.slug === 'encontre-os-7-erros');
  const missionTecSafe = missions.find((m) => m.slug === 'tecnico-seguro');
  const missionVideo60s = missions.find((m) => m.slug === 'seguranca-em-60-segundos');
  const missionErgo = missions.find((m) => m.slug === 'estacao-ergonomica');
  const missionPausa = missions.find((m) => m.slug === 'desafio-surpresa-pausa-ativa');
  const missionGincanaInfo = missions.find((m) => m.slug === 'gincana-informatica-segura');
  const missionGincanaLog = missions.find((m) => m.slug === 'gincana-logistica-segura');
  const missionGincanaClima = missions.find((m) => m.slug === 'gincana-climatizacao-refrigeracao');
  const missionCompromisso = missions.find((m) => m.slug === 'compromisso-com-a-seguranca');

  console.log('[SEED-FAKES] Montando submissões técnicas...');

  const submissionsToCreate: any[] = [];

  // Helper para cadastrar submissão
  const addSub = (
    userEmail: string,
    missionObj: any,
    status: SubmissionStatus,
    points: number,
    text: string,
    structured?: any,
    feedback?: string,
    isHighlight = false,
    dateOffsetHours = 0
  ) => {
    if (!missionObj) return;
    const u = createdUsers.find((x) => x.email === userEmail);
    if (!u) return;

    submissionsToCreate.push({
      userId: u.id,
      classGroupId: u.classGroupId,
      missionId: missionObj.id,
      status,
      awardedPoints: status === SubmissionStatus.APPROVED ? points : 0,
      textResponse: text,
      structuredData: structured || null,
      feedback: feedback || (status === SubmissionStatus.APPROVED ? 'Aprovado pela Comissão CIPA.' : null),
      isPublicHighlight: isHighlight,
      evaluatedById: status === SubmissionStatus.APPROVED ? evaluatorId : null,
      evaluatedAt: status === SubmissionStatus.APPROVED ? new Date() : null,
      submittedAt: new Date(Date.now() - dateOffsetHours * 3600 * 1000),
    });
  };

  // Mariana Souza Silva (Líder geral - TEC-DEV-2T)
  addSub(
    'mariana.silva@aluno.senai.br',
    missionRiskHunt,
    SubmissionStatus.APPROVED,
    100,
    'Identifiquei um cabo elétrico de extensão parcialmente descascado na passagem entre a bancada de testes e o armário de ferramentas do Lab 03. Sinalizei temporariamente a área com fita zebrada amarela/preta e notifiquei o docente responsável para substituição imediata pelo setor de manutenção.',
    {
      location: 'Laboratório de Redes e Sistemas (Lab 03) - Mooca',
      perigoIdentificado: 'Condutor elétrico flexível com isolamento rompido sob piso de passagem de alunos',
      consequencias: 'Risco de choque elétrico direto, curto-circuito e tropeçamento',
      medidasPreventivas: 'Substituição do cabo e fixação com canaleta passa-cabos de borracha antiderrapante',
    },
    'Parabéns, Mariana! Percepção exemplar de risco na área de TI (NR-10). Nota 10!',
    true,
    72
  );
  addSub(
    'mariana.silva@aluno.senai.br',
    missionStartWithMe,
    SubmissionStatus.APPROVED,
    20,
    'Minha atitude segura: sempre desligo os estabilizadores da bancada após a aula e organizo os fios sob a canaleta.',
    null,
    'Ótimo hábito preventivo!',
    true,
    70
  );
  addSub(
    'mariana.silva@aluno.senai.br',
    mission7Errors,
    SubmissionStatus.APPROVED,
    50,
    'Identificação completa dos 7 erros da bancada mecânica didática.',
    { identifiedCount: 7, errors: ['Proteção de mandril solta', 'Óleo no chão', 'Extintor obstruído', 'Óculos ausente', 'Fio exposto', 'Chave trincada', 'Solvente destampado'] },
    '100% de precisão nos 7 itens de segurança!',
    true,
    50
  );
  addSub(
    'mariana.silva@aluno.senai.br',
    missionVideo60s,
    SubmissionStatus.APPROVED,
    50,
    'Vídeo de 58 segundos explicando como proceder na evacuação do prédio em caso de simulação de incêndio no SENAI Mooca.',
    null,
    'Excelente oratória, objetividade e clareza nos procedimentos de rota de fuga!',
    true,
    45
  );
  addSub(
    'mariana.silva@aluno.senai.br',
    missionErgo,
    SubmissionStatus.APPROVED,
    50,
    'Checklist de ergonomia da estação de computação: monitor na altura dos olhos, cadeira regulada a 90 graus e apoio lombar firme (NR-17).',
    null,
    'Conformidade perfeita com a NR-17!',
    true,
    26
  );
  addSub(
    'mariana.silva@aluno.senai.br',
    missionGincanaInfo,
    SubmissionStatus.APPROVED,
    30,
    'Análise de phishing simulado: identifiquei cabeçalho forjado, remetente falso (@senai-atualizacao.xyz) e link malicioso.',
    null,
    'Detecção certeira de engenharia social! Segurança da informação protegida.',
    true,
    8
  );
  addSub(
    'mariana.silva@aluno.senai.br',
    missionCompromisso,
    SubmissionStatus.APPROVED,
    20,
    'Meu compromisso: "Segurança começa com você: prevenir é uma atitude de todos! Sua atitude faz a diferença."',
    null,
    'Compromisso homologado!',
    true,
    2
  );

  // Carlos Eduardo Mendes (Logística - TEC-LOG-1M)
  addSub(
    'carlos.mendes@aluno.senai.br',
    missionRiskHunt,
    SubmissionStatus.APPROVED,
    100,
    'Identifiquei um palete de madeira com travessa quebrada armazenado a 3 metros de altura na estante porta-paletes do galpão logístico. Havia risco de desabamento da carga no corredor de circulação.',
    {
      location: 'Galpão Logístico Didático - Rua 2, Nível 3',
      perigoIdentificado: 'Palete avariado em nível elevado',
      consequencias: 'Queda de carga sobre pedestres ou equipamentos de movimentação',
      medidasPreventivas: 'Descida imediata com paleteira didática e substituição por palete PBR normatizado',
    },
    'Ação de prevenção essencial para a logística escolar! Evitou risco crítico de queda de materiais.',
    true,
    71
  );
  addSub(
    'carlos.mendes@aluno.senai.br',
    missionTecSafe,
    SubmissionStatus.APPROVED,
    50,
    'Uso de botina de segurança com biqueira, colete refletivo amarelo e luvas de proteção mecânica na separação de pedidos.',
    null,
    'EPIs adequados e postura impecável.',
    true,
    48
  );
  addSub(
    'carlos.mendes@aluno.senai.br',
    missionErgo,
    SubmissionStatus.APPROVED,
    50,
    'Demonstração da técnica ergonômica correta para levantamento de cargas do solo: flexão dos joelhos e coluna reta mantendo a carga rente ao tronco.',
    null,
    'Técnica de movimentação manual nota 10!',
    true,
    25
  );
  addSub(
    'carlos.mendes@aluno.senai.br',
    missionGincanaLog,
    SubmissionStatus.APPROVED,
    50,
    'Inspeção do layout de circulação: desobstrução das faixas de pedestre sinalizadas em amarelo e verificação da capacidade da estante.',
    null,
    'Segregação homem-máquina respeitada com excelência.',
    true,
    6
  );
  addSub(
    'carlos.mendes@aluno.senai.br',
    missionCompromisso,
    SubmissionStatus.APPROVED,
    20,
    'Compromisso: "Na logística, cada palete bem alinhado é um acidente prevenido."',
    null,
    'Excelente!',
    false,
    1
  );

  // Fernando Henrique Dias (Mecânica/Automotiva - CAI-AUT-1T)
  addSub(
    'fernando.dias@aluno.senai.br',
    missionRiskHunt,
    SubmissionStatus.APPROVED,
    100,
    'Proteção móvel intertravada da fresadora didática estava com o sensor desalinhado, permitindo o giro da ferramenta com a proteção aberta. Acionei o docente e bloqueamos a máquina.',
    {
      location: 'Oficina de Ajustagem e Usinagem - Mooca',
      perigoIdentificado: 'Intertravamento NR-12 inoperante',
      consequencias: 'Risco de corte, esmagamento e projeção de cavacos metálicos',
      medidasPreventivas: 'Bloqueio imediato LOTO e reajuste do sensor magnético de segurança',
    },
    'Intervenção técnica crucial com a NR-12! Bloqueio preventivo impecável.',
    true,
    69
  );
  addSub(
    'fernando.dias@aluno.senai.br',
    missionTecSafe,
    SubmissionStatus.APPROVED,
    50,
    'Organização da bancada mecânica: retirada de limalhas com pincel (nunca com as mãos) e uso de óculos de proteção ampla visão com proteção lateral.',
    null,
    'Regra de ouro de oficina técnica respeitada.',
    true,
    47
  );
  addSub(
    'fernando.dias@aluno.senai.br',
    mission7Errors,
    SubmissionStatus.APPROVED,
    50,
    'Checklist de 7 erros concluído com sucesso.',
    null,
    'Aprovado.',
    false,
    46
  );

  // Diego Nascimento Rocha (Refrigeração & Climatização - TEC-CLI-1T)
  addSub(
    'diego.nascimento@aluno.senai.br',
    missionRiskHunt,
    SubmissionStatus.APPROVED,
    100,
    'Cilindro de fluido refrigerante didático R-410A estava no chão próximo à área de passagem, sem a corrente de fixação de segurança obrigatória na parede e sem a tampa de proteção da válvula de alívio.',
    {
      location: 'Oficina de Refrigeração e Climatização - Bloco D',
      perigoIdentificado: 'Cilindro de gás pressurizado sem amarração',
      consequencias: 'Risco de queda, quebra da válvula e projeção descontrolada',
      medidasPreventivas: 'Fixação imediata no suporte vertical com corrente e rosca de capacete.',
    },
    'Identificação de risco vital! Cilindros de gases e refrigerantes devem estar sempre encadeados.',
    true,
    68
  );
  addSub(
    'diego.nascimento@aluno.senai.br',
    missionGincanaClima,
    SubmissionStatus.APPROVED,
    50,
    'Procedimento seguro de evacuação e carga de fluido refrigerante com bomba de vácuo, óculos de ampla visão e luvas de proteção térmica contra congelamento.',
    null,
    'Excelente procedimento técnico de oficina frigorífica!',
    true,
    5
  );

  // Thiago Barbosa Castro (Eletroeletrônica - CAI-ELE-1M)
  addSub(
    'thiago.barbosa@aluno.senai.br',
    missionRiskHunt,
    SubmissionStatus.APPROVED,
    100,
    'Quadro geral didático de distribuição de força estava destrancado com barramento vivo acessível a menos de 1 metro da bancada dos alunos. Ausência de placa de aviso "Perigo - Alta Tensão".',
    {
      location: 'Laboratório de Instalações Elétricas Prediais',
      perigoIdentificado: 'Painel energizado destrancado sem aviso de segurança',
      consequencias: 'Choque elétrico por contato acidental, arco elétrico e queimaduras severas',
      medidasPreventivas: 'Trancamento do painel com chave sob tutela do docente e fixação de placa NR-10 e NR-26.',
    },
    'Excelente rigor com a NR-10! Chave entregue ao instrutor e sinalização afixada.',
    true,
    67
  );
  addSub(
    'thiago.barbosa@aluno.senai.br',
    missionTecSafe,
    SubmissionStatus.APPROVED,
    50,
    'Aferição de ausência de tensão com multímetro CAT III 600V e uso de luvas isolantes de borracha testadas.',
    null,
    'Segurança elétrica é prioridade zero!',
    true,
    46
  );

  // Henrique Silva Teste (Aluno Demonstração Oficial)
  addSub(
    'aluno.silva@aluno.senai.br',
    missionRiskHunt,
    SubmissionStatus.APPROVED,
    100,
    '[Demonstração Oficial] Inspeção geral de rotas de fuga e extintores de incêndio da escola SENAI Morvan Figueiredo.',
    { location: 'Corredor Central', perigoIdentificado: 'Extintor com manômetro despressurizado' },
    'Aprovado com distinção!',
    true,
    75
  );
  addSub(
    'aluno.silva@aluno.senai.br',
    mission7Errors,
    SubmissionStatus.APPROVED,
    50,
    '[Demonstração Oficial] Identificação dos 7 desvios de segurança na bancada técnica.',
    null,
    '100% de acertos!',
    true,
    52
  );
  addSub(
    'aluno.silva@aluno.senai.br',
    missionVideo60s,
    SubmissionStatus.APPROVED,
    50,
    '[Demonstração Oficial] Vídeo de 60 segundos sobre a cultura da prevenção na indústria 4.0.',
    null,
    'Excelente trabalho demonstrativo!',
    true,
    44
  );
  addSub(
    'aluno.silva@aluno.senai.br',
    missionErgo,
    SubmissionStatus.APPROVED,
    50,
    '[Demonstração Oficial] Checklist de postura e organização de posto de trabalho.',
    null,
    'Aprovado!',
    true,
    24
  );
  addSub(
    'aluno.silva@aluno.senai.br',
    missionCompromisso,
    SubmissionStatus.APPROVED,
    20,
    'Compromisso oficial firmado com a SIPAT 2026.',
    null,
    'Certificado de 20h liberado!',
    true,
    2
  );

  // Submissão PENDENTE (para testar a fila de avaliação do avaliador CIPA)
  addSub(
    'camila.rocha@aluno.senai.br',
    missionRiskHunt,
    SubmissionStatus.PENDING,
    0,
    'Registro fotográfico de uma mancha de óleo hidráulico próxima à rampa de carga e descarga da logística. Aguardando avaliação dos docentes da CIPA.',
    { location: 'Rampa de Carga - Logística', perigo: 'Piso escorregadio' },
    undefined,
    false,
    3
  );

  // Submissão COM CORREÇÃO SOLICITADA (para demonstrar a interação com o aluno)
  addSub(
    'aline.martins@aluno.senai.br',
    missionRiskHunt,
    SubmissionStatus.NEEDS_CORRECTION,
    0,
    'Fotografei a máquina mas a foto ficou com reflexo de luz e não dá para ver bem a etiqueta do botão de parada.',
    null,
    'Aline, por favor reenvie a foto com iluminação direta ou em ângulo diferente para podermos validar a placa do botão de emergência. Você ainda pode pontuar!',
    false,
    4
  );

  // Salva no banco
  for (const s of submissionsToCreate) {
    await prisma.missionSubmission.upsert({
      where: {
        missionId_userId: {
          missionId: s.missionId,
          userId: s.userId,
        },
      },
      update: {
        status: s.status,
        textResponse: s.textResponse,
        structuredData: s.structuredData,
        feedback: s.feedback,
        awardedPoints: s.awardedPoints,
        isPublicHighlight: s.isPublicHighlight,
        evaluatedById: s.evaluatedById,
        evaluatedAt: s.evaluatedAt,
        submittedAt: s.submittedAt,
        classGroupId: s.classGroupId,
      },
      create: s,
    });
  }

  // 3. Quizzes Realistas
  console.log('[SEED-FAKES] Gravando tentativas de quizzes...');
  const quiz1 = quizzes.find((q) => q.slug === 'quiz-prevencao-percepcao-riscos');
  const quiz2 = quizzes.find((q) => q.slug === 'quiz-seguranca-pratica-epis-eletrica');
  const quiz3 = quizzes.find((q) => q.slug === 'quiz-ergonomia-bem-estar');
  const quiz4 = quizzes.find((q) => q.slug === 'quiz-mito-ou-verdade');
  const quizFinal = quizzes.find((q) => q.slug === 'quiz-final-grande-gincana');

  const recordQuiz = async (email: string, quizObj: any, scorePct: number, points: number) => {
    if (!quizObj) return;
    const u = createdUsers.find((x) => x.email === email);
    if (!u) return;

    const answersObj: Record<string, string> = {};
    for (const q of quizObj.questions) {
      answersObj[q.id] = q.correctOptionId;
    }

    await prisma.quizAttempt.upsert({
      where: {
        quizId_userId_attemptNumber: {
          quizId: quizObj.id,
          userId: u.id,
          attemptNumber: 1,
        },
      },
      update: {
        scorePercent: scorePct,
        awardedPoints: points,
        correctCount: quizObj.questions.length,
        totalQuestions: quizObj.questions.length,
        answersJson: answersObj,
        completedAt: new Date(Date.now() - 10 * 3600 * 1000),
      },
      create: {
        quizId: quizObj.id,
        userId: u.id,
        attemptNumber: 1,
        scorePercent: scorePct,
        awardedPoints: points,
        correctCount: quizObj.questions.length,
        totalQuestions: quizObj.questions.length,
        answersJson: answersObj,
        startedAt: new Date(Date.now() - 11 * 3600 * 1000),
        completedAt: new Date(Date.now() - 10 * 3600 * 1000),
      },
    });
  };

  // Quizzes para os principais participantes
  await recordQuiz('mariana.silva@aluno.senai.br', quiz1, 100, 50);
  await recordQuiz('mariana.silva@aluno.senai.br', quiz2, 100, 50);
  await recordQuiz('mariana.silva@aluno.senai.br', quiz3, 100, 50);
  await recordQuiz('mariana.silva@aluno.senai.br', quizFinal, 100, 50);

  await recordQuiz('carlos.mendes@aluno.senai.br', quiz1, 100, 50);
  await recordQuiz('carlos.mendes@aluno.senai.br', quiz2, 90, 45);
  await recordQuiz('carlos.mendes@aluno.senai.br', quizFinal, 100, 50);

  await recordQuiz('fernando.dias@aluno.senai.br', quiz1, 95, 45);
  await recordQuiz('fernando.dias@aluno.senai.br', quiz2, 100, 50);
  await recordQuiz('fernando.dias@aluno.senai.br', quizFinal, 90, 45);

  await recordQuiz('diego.nascimento@aluno.senai.br', quiz1, 90, 45);
  await recordQuiz('diego.nascimento@aluno.senai.br', quiz2, 95, 45);
  await recordQuiz('diego.nascimento@aluno.senai.br', quizFinal, 90, 45);

  await recordQuiz('thiago.barbosa@aluno.senai.br', quiz1, 100, 50);
  await recordQuiz('thiago.barbosa@aluno.senai.br', quiz2, 100, 50);
  await recordQuiz('thiago.barbosa@aluno.senai.br', quizFinal, 95, 45);

  await recordQuiz('aluno.silva@aluno.senai.br', quiz1, 100, 50);
  await recordQuiz('aluno.silva@aluno.senai.br', quiz2, 100, 50);
  await recordQuiz('aluno.silva@aluno.senai.br', quiz3, 100, 50);
  await recordQuiz('aluno.silva@aluno.senai.br', quizFinal, 100, 50);

  await recordQuiz('gabriel.costa@aluno.senai.br', quiz1, 90, 45);
  await recordQuiz('gabriel.costa@aluno.senai.br', quiz4, 100, 40);

  await recordQuiz('amanda.silveira@aluno.senai.br', quiz1, 85, 40);
  await recordQuiz('amanda.silveira@aluno.senai.br', quiz3, 90, 45);

  await recordQuiz('lucas.ferreira@aluno.senai.br', quiz1, 90, 45);
  await recordQuiz('lucas.ferreira@aluno.senai.br', quiz2, 85, 40);

  // 4. Recalcular pontuações, níveis, medalhas e ledger
  console.log('[SEED-FAKES] Atualizando pontuação geral, níveis e medalhas...');

  for (const u of createdUsers) {
    const [subPoints, quizPoints] = await Promise.all([
      prisma.missionSubmission.aggregate({
        where: { userId: u.id, status: SubmissionStatus.APPROVED },
        _sum: { awardedPoints: true },
      }),
      prisma.quizAttempt.aggregate({
        where: { userId: u.id },
        _sum: { awardedPoints: true },
      }),
    ]);

    const totalPts = (subPoints._sum.awardedPoints || 0) + (quizPoints._sum.awardedPoints || 0);
    const lvl = calculateLevel(totalPts);

    await prisma.user.update({
      where: { id: u.id },
      data: {
        totalPoints: totalPts,
        level: lvl,
      },
    });

    const userBadgesToAssign: string[] = [];
    if (totalPts >= 20) userBadgesToAssign.push('atitude-nota-10');
    if (totalPts >= 100) userBadgesToAssign.push('olho-de-aguia');
    if (totalPts >= 180) userBadgesToAssign.push('guardiao-da-seguranca');
    if (totalPts >= 250) userBadgesToAssign.push('mestre-da-prevencao');
    if (totalPts >= 300) userBadgesToAssign.push('campeao-da-sipat');

    for (const badgeSlug of userBadgesToAssign) {
      const badgeId = badgeMap.get(badgeSlug);
      if (badgeId) {
        await prisma.userBadge.upsert({
          where: {
            id: `${u.id}-${badgeId}`,
          },
          update: {},
          create: {
            id: `${u.id}-${badgeId}`,
            userId: u.id,
            badgeId,
            awardedById: evaluatorId,
            reason: `Conquista automática da SIPAT 2026 por pontuação acumulada (${totalPts} pts)`,
            awardedAt: new Date(),
          },
        });
      }
    }

    if (totalPts > 0) {
      await prisma.pointLedger.upsert({
        where: {
          id: `ledger-seed-${u.id}`,
        },
        update: {
          delta: totalPts,
          balanceAfter: totalPts,
        },
        create: {
          id: `ledger-seed-${u.id}`,
          userId: u.id,
          sourceType: PointSourceType.MISSION,
          delta: totalPts,
          balanceAfter: totalPts,
          reason: 'Total acumulado em missões práticas e quizzes da SIPAT 2026',
        },
      });
    }
  }

  // 5. Estatísticas Finais
  const [totalParticipants, totalSubmissions, totalAttempts, topRanked, classStats] = await Promise.all([
    prisma.user.count({ where: { role: Role.PARTICIPANT } }),
    prisma.missionSubmission.count(),
    prisma.quizAttempt.count(),
    prisma.user.findMany({
      where: { role: Role.PARTICIPANT },
      orderBy: { totalPoints: 'desc' },
      take: 6,
      select: { fullName: true, totalPoints: true, level: true, classGroup: { select: { code: true } } },
    }),
    prisma.classGroup.findMany({
      include: {
        users: {
          where: { role: Role.PARTICIPANT },
          select: { totalPoints: true },
        },
      },
    }),
  ]);

  console.log('\n========================================================================');
  console.log(' BANCO POVOADO COM SUCESSO – DADOS REAIS DA SIPAT 2026 SENAI MOOCA');
  console.log('========================================================================');
  console.log(`✔ Total de Participantes Alunos: ${totalParticipants}`);
  console.log(`✔ Total de Submissões de Missões: ${totalSubmissions}`);
  console.log(`✔ Total de Tentativas de Quizzes: ${totalAttempts}`);
  console.log('\n--- TOP RANKING INDIVIDUAL ---');
  topRanked.forEach((p, idx) => {
    console.log(`${idx + 1}º. ${p.fullName} [${p.classGroup?.code}] – ${p.totalPoints} pontos (Nível ${p.level})`);
  });

  console.log('\n--- RANKING POR TURMAS (LIDERANÇA) ---');
  const classScores = classStats
    .map((c) => ({
      code: c.code,
      name: c.name,
      totalPoints: c.users.reduce((acc, u) => acc + u.totalPoints, 0),
      alumniCount: c.users.length,
    }))
    .filter((c) => c.totalPoints > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints);

  classScores.forEach((c, idx) => {
    console.log(`${idx + 1}º. ${c.code} – ${c.name}: ${c.totalPoints} pontos (${c.alumniCount} alunos)`);
  });

  console.log('\n--- CREDENCIAIS OFICIAIS DE TESTE ---');
  console.log('• Mariana (1ª Colocada): mariana.silva@aluno.senai.br | Senha: Aluno@Senai2026');
  console.log('• Carlos (2º Colocado - Logística): carlos.mendes@aluno.senai.br | Senha: Aluno@Senai2026');
  console.log('• Henrique (Aluno Demo): aluno.silva@aluno.senai.br | Senha: Aluno@Senai2026');
  console.log('• Avaliador CIPA: avaliador.sipat@senai.br | Senha: Avalia@Senai2026!ChangeMe');
  console.log('• SuperAdmin SIPAT: admin.sipat@senai.br | Senha: Sipat@Senai2026!ChangeMe');
  console.log('========================================================================\n');
}

runFakeResultsPopulation()
  .catch((err) => {
    console.error('[ERRO]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
