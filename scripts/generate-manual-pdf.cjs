const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const SHOTS_DIR = path.resolve('public/manual-prints');
const OUT_DIR = path.resolve('public/docs');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const OUT_PATH_PUBLIC = path.join(OUT_DIR, 'MANUAL_SIPAT_2026_SENAI_MOOCA.pdf');
const OUT_PATH_ROOT = path.resolve('MANUAL_SIPAT_2026_SENAI_MOOCA.pdf');

console.log('Iniciando compilação do Manual Oficial da SIPAT 2026 em PDF...');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 45, bottom: 45, left: 45, right: 45 },
  bufferPages: true,
  autoFirstPage: true,
  info: {
    Title: 'Manual do Usuário e da Organização – SIPAT 2026 SENAI Morvan Figueiredo',
    Author: 'Escola SENAI "Morvan Figueiredo" - Mooca',
    Subject: 'Manual Completo com Prints e Diretrizes da SIPAT 2026',
    Keywords: 'SENAI, SIPAT, Segurança do Trabalho, Manual, Gamificação, CIPA',
  },
});

const writeStreamPublic = fs.createWriteStream(OUT_PATH_PUBLIC);
const writeStreamRoot = fs.createWriteStream(OUT_PATH_ROOT);

doc.pipe(writeStreamPublic);
doc.pipe(writeStreamRoot);

// Paleta Oficial SENAI Mooca
const RED = '#E30613';
const DARK = '#111827';
const GRAY = '#4B5563';
const LIGHT_BG = '#F9FAFB';
const BORDER = '#E5E7EB';
const GOLD = '#D97706';

function addHeader(sectionTitle) {
  const currentY = doc.y;
  doc.save();
  doc.rect(45, 20, 505, 2).fill(RED);
  doc.fontSize(8).fillColor(GRAY).font('Helvetica');
  doc.text('ESCOLA SENAI "MORVAN FIGUEIREDO" • SIPAT 2026', 45, 10, { align: 'left' });
  doc.text(sectionTitle, 45, 10, { align: 'right' });
  doc.restore();
  doc.y = Math.max(currentY, 45);
}

function addSectionTitle(num, title) {
  doc.moveDown(0.8);
  const y = doc.y;
  doc.rect(45, y, 6, 22).fill(RED);
  doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK);
  doc.text(`${num}. ${title}`, 58, y + 4);
  doc.moveDown(0.6);
}

function addSubTitle(title) {
  doc.moveDown(0.4);
  doc.fontSize(11).font('Helvetica-Bold').fillColor(RED);
  doc.text(title, 45);
  doc.moveDown(0.3);
}

function addParagraph(text) {
  doc.fontSize(9.5).font('Helvetica').fillColor(DARK).lineGap(2.5);
  doc.text(text, 45, doc.y, { align: 'justify', width: 505 });
  doc.moveDown(0.5);
}

function addBullet(bulletTitle, text) {
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(DARK);
  doc.text(`• ${bulletTitle}: `, 55, doc.y, { continued: true });
  doc.font('Helvetica').fillColor(GRAY).text(text, { align: 'justify', width: 495 });
  doc.moveDown(0.3);
}

function addAlertBox(title, text, type = 'info') {
  const boxY = doc.y;
  const borderColor = type === 'warning' ? '#D97706' : RED;
  const bgColor = type === 'warning' ? '#FEF3C7' : '#FEF2F2';
  
  doc.rect(45, boxY, 505, 48).fillAndStroke(bgColor, borderColor);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(borderColor);
  doc.text(`⚠ ${title}`, 55, boxY + 8);
  doc.fontSize(8.5).font('Helvetica').fillColor(DARK);
  doc.text(text, 55, boxY + 24, { width: 485 });
  doc.y = boxY + 56;
}

function addPrintImage(fileName, caption) {
  const imgPath = path.join(SHOTS_DIR, fileName);
  if (fs.existsSync(imgPath)) {
    const availableHeight = 750 - doc.y;
    if (availableHeight < 240) {
      doc.addPage();
    }
    const yPos = doc.y;
    // Moldura do print
    doc.rect(45, yPos, 505, 220).fillAndStroke('#F3F4F6', BORDER);
    try {
      doc.image(imgPath, 46, yPos + 1, { fit: [503, 218], align: 'center', valign: 'center' });
    } catch (e) {
      console.warn('Erro ao carregar imagem:', imgPath, e.message);
    }
    doc.y = yPos + 224;
    doc.fontSize(8).font('Helvetica-Oblique').fillColor(GRAY);
    doc.text(`Figura: ${caption}`, 45, doc.y, { align: 'center', width: 505 });
    doc.moveDown(0.8);
  }
}

// =========================================================================
// PÁGINA 1: CAPA INSTITUCIONAL
// =========================================================================
doc.rect(0, 0, 595, 842).fill('#FAFAFA');
doc.rect(0, 0, 595, 12).fill(RED);

// Logo oficial
const logoPath = path.resolve('public/brand/senai-oficial.png');
if (fs.existsSync(logoPath)) {
  doc.image(logoPath, 45, 55, { width: 140 });
}

doc.y = 120;
doc.fontSize(10).font('Helvetica-Bold').fillColor(RED);
doc.text('SERVIÇO NACIONAL DE APRENDIZAGEM INDUSTRIAL — SENAI-SP', 45);
doc.fontSize(12).font('Helvetica-Bold').fillColor(DARK);
doc.text('ESCOLA SENAI "MORVAN FIGUEIREDO" — MOOCA, SÃO PAULO', 45);

doc.moveDown(2);
doc.rect(45, doc.y, 505, 4).fill(RED);
doc.moveDown(1);

doc.fontSize(24).font('Helvetica-Bold').fillColor(DARK);
doc.text('MANUAL OFICIAL DO USUÁRIO', 45);
doc.fontSize(20).font('Helvetica-Bold').fillColor(RED);
doc.text('E DA ORGANIZAÇÃO', 45);
doc.fontSize(16).font('Helvetica').fillColor(GRAY);
doc.text('Plataforma Web Gamificada da SIPAT 2026', 45);

doc.moveDown(1.5);
doc.rect(45, doc.y, 505, 68).fillAndStroke('#FFF1F2', '#FECDD3');
const bannerY = doc.y - 62;
doc.fontSize(10).font('Helvetica-Bold').fillColor(RED);
doc.text('TEMA OFICIAL:', 55, bannerY + 6);
doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK);
doc.text('"Segurança começa com você: prevenir é uma atitude de todos!"', 55, bannerY + 18);
doc.fontSize(10).font('Helvetica-Bold').fillColor(RED);
doc.text('SLOGAN: "Sua atitude faz a diferença!" • DATA DO EVENTO: 16 a 19 de novembro de 2026', 55, bannerY + 36);

doc.y = bannerY + 80;
doc.moveDown(1);

doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK);
doc.text('PÚBLICO-ALVO DESTE DOCUMENTO:', 45);
addBullet('Alunos e Participantes', 'Instruções de cadastro, missões, quizzes, pontuação, feed social e emissão de certificado.');
addBullet('Comissão CIPA & Docentes', 'Avaliação de evidências fotográficas e em vídeo, aplicação de notas e feedbacks técnicos.');
addBullet('SuperAdministradores', 'Gestão de QR Code, agendamento de atividades, relatórios gerenciais e governança LGPD.');

doc.y = 700;
doc.rect(45, doc.y, 505, 52).fillAndStroke(LIGHT_BG, BORDER);
const footY = doc.y - 46;
doc.fontSize(8.5).font('Helvetica-Bold').fillColor(DARK);
doc.text('Escola SENAI "Morvan Figueiredo" • Unidade Mooca', 55, footY + 4);
doc.fontSize(8).font('Helvetica').fillColor(GRAY);
doc.text('Rua Oratório, 215 - Mooca, São Paulo - SP | Telefone: (11) 2076-3200', 55, footY + 16);
doc.text('Repositório Oficial: github.com/clientedev/sipat2026 | Versão do Sistema: 1.0.0 Estável (Novembro/2026)', 55, footY + 28);

// =========================================================================
// PÁGINA 2: CREDENCIAIS RÁPIDAS DE ACESSO & ARQUITETURA
// =========================================================================
doc.addPage();
addHeader('CREDENCIAS E AMBIENTE');
addSectionTitle(1, 'Acesso Rápido e Contas Pré-Cadastradas');

addParagraph(
  'A plataforma SIPAT 2026 já se encontra em pleno funcionamento local e possui contas oficiais criadas para testes, homologação e simulação de todas as jornadas de usuário (Aluno Líder, Aluno de Demonstração, Avaliador CIPA e SuperAdmin).'
);

// Tabela de contas
const startTableY = doc.y;
doc.rect(45, startTableY, 505, 20).fill(RED);
doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');
doc.text('Perfil / Papel', 55, startTableY + 5);
doc.text('E-mail Institucional', 170, startTableY + 5);
doc.text('Senha de Acesso', 350, startTableY + 5);
doc.text('Privilégio', 460, startTableY + 5);

const rows = [
  ['Aluno Campeão', 'mariana.silva@aluno.senai.br', 'Aluno@Senai2026', '520 pts / Certif.'],
  ['Aluno Demonstração', 'aluno.silva@aluno.senai.br', 'Aluno@Senai2026', '470 pts / Nível 5'],
  ['Aluno Logística', 'carlos.mendes@aluno.senai.br', 'Aluno@Senai2026', '415 pts / 2º Lugar'],
  ['Avaliador CIPA', 'avaliador.sipat@senai.br', 'Avalia@Senai2026!ChangeMe', 'Auditoria/Notas'],
  ['SuperAdministrador', 'admin.sipat@senai.br', 'Sipat@Senai2026!ChangeMe', 'Controle Total'],
];

let curY = startTableY + 20;
rows.forEach((r, idx) => {
  const bg = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
  doc.rect(45, curY, 505, 20).fillAndStroke(bg, BORDER);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor(DARK);
  doc.text(r[0], 55, curY + 5);
  doc.font('Helvetica').fillColor(GRAY);
  doc.text(r[1], 170, curY + 5);
  doc.text(r[2], 350, curY + 5);
  doc.font('Helvetica-Bold').fillColor(RED);
  doc.text(r[3], 460, curY + 5);
  curY += 20;
});

doc.y = curY + 15;

addSectionTitle(2, 'URLs do Sistema em Operação');
addBullet('Feed Social & Página Pública', 'http://localhost:5173/ (Feed de publicações, stories e atitudes seguras)');
addBullet('Portal de Inscrições Mobile', 'http://localhost:5173/inscricao (Otimizado para smartphones e QR Code)');
addBullet('Login Institucional Único', 'http://localhost:5173/login (Autenticação unificada para alunos e staff)');
addBullet('Painel do Aluno (Desafios)', 'http://localhost:5173/app (Missões, Quizzes, Medalhas e Certificado 20h)');
addBullet('Painel Administrativo CIPA', 'http://localhost:5173/admin (Gestão de evidências, agendador e relatórios)');
addBullet('Ranking Oficial & Modo TV', 'http://localhost:5173/ranking e http://localhost:5173/acompanhamento');

addAlertBox(
  'SEGURANÇA E ACESSO CORPORATIVO (LGPD)',
  'A plataforma opera com autenticação baseada em JSON Web Tokens (JWT) com assinatura HS256 e cookies HttpOnly seguros. Todas as fotos enviadas por menores de idade são protegidas por camadas de consentimento explícito dos responsáveis legais.',
  'info'
);

// =========================================================================
// PÁGINA 3: PARTE I - GUIA DO ALUNO (FEED SOCIAL & STORIES)
// =========================================================================
doc.addPage();
addHeader('GUIA DO ALUNO: FEED SOCIAL & STORIES');
addSectionTitle(3, 'A Tela Principal: Feed Social de Atitudes Seguras');

addParagraph(
  'A tela inicial da SIPAT 2026 funciona como uma rede social temática da Escola SENAI "Morvan Figueiredo". Nela, alunos e docentes acompanham em tempo real os desafios realizados, evidências aprovadas, novos comunicados da CIPA e stories do evento.'
);

addPrintImage('01-feed-social-principal.png', 'Tela Inicial da SIPAT 2026 com Feed Social Interativo, Stories e Pódio ao Vivo.');

addSubTitle('Principais Recursos da Tela Principal:');
addBullet('Barra de Stories no Topo', 'Apresenta círculos interativos com cobertura ao vivo dos 4 dias de evento, regras de Caça aos Riscos, dicas de Ergonomia e o botão direto para emissão do Certificado de 20h.');
addBullet('Publicações dos Desafios', 'Cada post apresenta o aluno autor, a turma técnica correspondente, a categoria da atividade, diagnóstico estruturado do perigo e o parecer de aprovação da comissão CIPA.');
addBullet('Reação "👏 Atitude Nota 10!"', 'Os participantes podem interagir com as publicações de seus colegas. A contagem de aplausos é transmitida instantaneamente a todos os navegadores conectados via WebSockets.');
addBullet('Barra Lateral Dinâmica', 'Exibe o pódio individual ao vivo, o ranking das turmas líderes e o atalho para gerar o crachá e o certificado.');

// =========================================================================
// PÁGINA 4: INSCRIÇÃO MOBILE & ACESSO POR QR CODE
// =========================================================================
doc.addPage();
addHeader('GUIA DO ALUNO: INSCRIÇÃO & LOGIN');
addSectionTitle(4, 'Cadastro Simplificado via QR Code nos Cartazes');

addParagraph(
  'Para ingressar na SIPAT 2026, o aluno não precisa de formulários burocráticos. Basta apontar a câmera do celular para o cartaz oficial afixado na entrada e nas oficinas da unidade Mooca.'
);

addPrintImage('02-inscricao-mobile.png', 'Página de Inscrição Mobile com Leitura de QR Code, Seleção de Turma e LGPD.');

addSubTitle('Passo a Passo da Inscrição:');
addBullet('1. Abertura da Câmera', 'Escaneie o QR Code oficial ou acesse diretamente o link /inscricao.');
addBullet('2. Dados Cadastrais', 'Informe seu Nome Completo, E-mail institucional (ou pessoal), RA (Matrícula) e Turma Técnica.');
addBullet('3. Foto de Perfil / Selfie', 'Capture uma foto diretamente pela câmera do celular ou selecione uma imagem da galeria.');
addBullet('4. Declaração de Menoridade & LGPD', 'Se for menor de 18 anos, marque a opção e indique o nome do responsável.');
addBullet('5. Conclusão e Acesso Imediato', 'Ao clicar em "Finalizar Inscrição", sua conta é autenticada e você é direcionado ao Painel individual.');

// =========================================================================
// PÁGINA 5: DASHBOARD DO ALUNO & GAMIFICAÇÃO
// =========================================================================
doc.addPage();
addHeader('GUIA DO ALUNO: DASHBOARD & GAMIFICAÇÃO');
addSectionTitle(5, 'Painel do Participante: Níveis, Missões e Quizzes');

addParagraph(
  'O Dashboard do Aluno centraliza o progresso individual. Conforme realiza atividades e responde quizzes diários, o participante ganha pontos, sobe de nível e desbloqueia medalhas comemorativas.'
);

addPrintImage('04-dashboard-aluno.png', 'Painel Individual do Aluno com Pontuação, Nível 5, Medalhas e Missões do Dia.');

addSubTitle('Sistema de Níveis de Gamificação:');
addBullet('Nível 1 – Iniciante na Segurança', '0 a 49 pontos: Aluno recém-inscrito descobrindo os conceitos básicos.');
addBullet('Nível 2 – Aluno Consciente', '50 a 119 pontos: Primeira missão aprovada ou quiz inicial concluído.');
addBullet('Nível 3 – Praticante da Segurança', '120 a 199 pontos: Domínio de boas práticas de ergonomia e EPIs.');
addBullet('Nível 4 – Guardião da Segurança', '200 a 299 pontos: Destaque na percepção de riscos em oficinas e laboratórios.');
addBullet('Nível 5 – Mestre da Prevenção / Campeão', '300+ pontos: Pontuação máxima, apto a receber a medalha de ouro e o certificado.');

// =========================================================================
// PÁGINA 6: CERTIFICADO OFICIAL DE 20 HORAS
// =========================================================================
doc.addPage();
addHeader('GUIA DO ALUNO: CERTIFICADO OFICIAL');
addSectionTitle(6, 'Emissão e Validação do Certificado de 20 Horas');

addParagraph(
  'Todos os alunos participantes da SIPAT 2026 têm direito à emissão do Certificado Oficial de Participação com carga horária de 20 horas complementares, válido para comprovação acadêmica e curricular.'
);

addPrintImage('05-certificado-oficial-20h.png', 'Certificado Oficial de 20 Horas no Padrão Diplomático SENAI-SP com Hash Digital.');

addSubTitle('Características do Certificado Oficial:');
addBullet('Carga Horária Reconhecida', '20 horas de atividades complementares em Segurança e Saúde no Trabalho.');
addBullet('Normas Regulamentadoras Abordadas', 'Conteúdo formativo cobrindo NR-01, NR-06 (EPIs), NR-10 (Elétrica), NR-12 (Máquinas), NR-17 (Ergonomia) e NR-26 (Sinalização).');
addBullet('Hash de Autenticidade Digital', 'Cada certificado possui um código único verificável online por empresas e docentes em /api/public/certificate/verify/[CÓDIGO].');
addBullet('Exportação A4 Paisagem', 'Ao clicar em "Imprimir Certificado", a folha de estilo garante impressão perfeita em alta resolução, sem cabeçalhos de navegador.');

// =========================================================================
// PÁGINA 7: ENVIO DE EVIDÊNCIAS & RESOLUÇÃO DE QUIZZES
// =========================================================================
doc.addPage();
addHeader('GUIA DO ALUNO: MISSÕES & QUIZZES');
addSectionTitle(7, 'Como Realizar Missões e Enviar Evidências');

addParagraph(
  'As missões da SIPAT desafiam o aluno a colocar a prevenção em prática nos ambientes reais da escola. O envio de evidências é otimizado com suporte direto à câmera do smartphone.'
);

addPrintImage('06-envio-missao-evidencia.png', 'Modal de Envio de Evidência com Descrição Técnica de Perigo e Medida Preventiva.');

addSubTitle('Tipos de Desafios Disponíveis:');
addBullet('Caça aos Riscos (Dia 16/11)', 'Fotografe uma condição insegura em área autorizada, descreva o perigo, consequências e a medida preventiva.');
addBullet('Encontre os 7 Erros (Dia 17/11)', 'Inspecione a bancada mecânica didática e aponte os desvios de segurança antes do início dos trabalhos.');
addBullet('Segurança em 60 Segundos (Dia 17/11)', 'Grave um vídeo curto de até 1 minuto demonstrando a conduta correta diante de uma situação de emergência.');
addBullet('Ergonomia e Postura (Dia 18/11)', 'Ajuste sua cadeira, monitor e bancada conforme a NR-17 e faça o checklist fotográfico.');
addBullet('Grande Gincana Integrada (Dia 19/11)', 'Desafios de TI (phishing), Logística (cargas) e Refrigeração (gases e fluidos).');

// =========================================================================
// PÁGINA 8: RANKINGS PÚBLICOS & MODO TV
// =========================================================================
doc.addPage();
addHeader('VISUALIZAÇÃO PÚBLICA & MODO TV');
addSectionTitle(8, 'Acompanhamento do Evento e Modo TV para Telões');

addParagraph(
  'A SIPAT 2026 conta com um sistema de transmissão contínua projetado para ser exibido nas TVs dos corredores, pátio e recepção da Escola SENAI "Morvan Figueiredo".'
);

addPrintImage('07-ranking-publico-turmas.png', 'Ranking Geral com Máscara de Privacidade LGPD e Disputa entre Turmas.');

addPrintImage('08-acompanhamento-modo-tv.png', 'Painel de Acompanhamento Geral com Rotação Automática e Gráficos de Participação.');

// =========================================================================
// PÁGINA 9: PARTE II - GUIA DO AVALIADOR CIPA
// =========================================================================
doc.addPage();
addHeader('GUIA DO AVALIADOR CIPA');
addSectionTitle(9, 'Central de Avaliação de Evidências (Docentes e CIPA)');

addParagraph(
  'Os membros da comissão julgadora e professores possuem acesso à Central de Evidências, onde analisam fotos, vídeos e descrições técnicas submetidas pelos alunos.'
);

addPrintImage('10-admin-central-evidencias.png', 'Central de Avaliação da CIPA com Fila de Espera, Foto da Evidência e Botões de Decisão.');

addSubTitle('Fluxo de Avaliação Técnica:');
addBullet('1. Aprovação com Pontuação Máxima', 'Utilize quando a evidência cumpre rigorosamente as normas técnicas. Os pontos são creditados instantaneamente no saldo do aluno e de sua turma.');
addBullet('2. Solicitação de Correção com Feedback', 'Se a foto estiver borrada ou o perigo mal fundamentado, solicite refação com uma orientação educativa. O aluno recebe notificação para reenvio.');
addBullet('3. Reprovação Justificada', 'Aplicável apenas para submissões manifestamente inadequadas ou desrespeitosas.');

// =========================================================================
// PÁGINA 10: PARTE III - GUIA DO ADMINISTRADOR GERAL
// =========================================================================
doc.addPage();
addHeader('GUIA DO ADMINISTRADOR GERAL');
addSectionTitle(10, 'Gestão de Missões e Agendamento Automático');

addParagraph(
  'O SuperAdministrador possui autonomia para criar, duplicar e programar a abertura automática de missões e quizzes nos dias e horários estipulados no cronograma escolar.'
);

addPrintImage('11-admin-gestao-missoes.png', 'Módulo de Gestão de Missões e Quizzes com Agendamento e Notificação em Tempo Real.');

addSubTitle('Recursos Administrativos Exclusivos:');
addBullet('Agendador Automático Persistente', 'Permite configurar uma missão para abrir às 09h30 e fechar às 17h00. O agendador roda no backend em PostgreSQL e dispara notificações via WebSockets.');
addBullet('Controle de QR Code Oficial', 'Geração de novos códigos, visualização da contagem de leituras e download imediato do cartaz promocional em PDF para impressão A4.');
addBullet('Importação em Lote via Excel (.xlsx)', 'Permite cadastrar centenas de alunos de uma vez a partir da lista oficial da secretaria escolar.');
addBullet('Exportação de Relatórios Oficiais', 'Geração instantânea de planilhas Excel e dossiês PDF completos de Caça aos Riscos com todas as fotos e pareceres.');

// =========================================================================
// PÁGINA 11: RELATÓRIOS OFICIAIS & AUDITORIA
// =========================================================================
doc.addPage();
addHeader('RELATÓRIOS & AUDITORIA CIPA');
addSectionTitle(11, 'Gestão de QR Code e Relatórios de Auditoria');

addParagraph(
  'Para prestar contas à Direção Escolar e aos auditores do SESI/SENAI, a plataforma disponibiliza relatórios com assinatura digital dos relatórios de risco.'
);

addPrintImage('12-admin-qrcode-relatorios.png', 'Painel de Gestão de Inscrições, QR Code Dinâmico e Download de Relatórios.');

addSubTitle('Relatórios Disponíveis para Download:');
addBullet('Relatório Geral do Evento (Excel)', 'Planilha completa contendo todos os alunos, turmas, notas de quizzes, horas registradas e pontuação final.');
addBullet('Dossiê da Caça aos Riscos (PDF)', 'Documento formal contendo o levantamento fotográfico de todas as condições inseguras identificadas na escola com as ações corretivas recomendadas.');
addBullet('Livro de Auditoria de Pontos', 'Registro imutável de cada alteração de pontuação, registrando o usuário ator, data/hora e justificativa obrigatória.');

// =========================================================================
// PÁGINA 12: CONCLUSÃO & DIRETRIZES TÉCNICAS
// =========================================================================
doc.addPage();
addHeader('DIRETRIZES FINAIS & SUPORTE');
addSectionTitle(12, 'Compromisso Institucional com a Segurança');

addParagraph(
  'A SIPAT 2026 da Escola SENAI "Morvan Figueiredo" reafirma o compromisso histórico da instituição com a formação profissional de excelência, onde a segurança do trabalho e a saúde mental não são meros tópicos teóricos, mas valores fundamentais incorporados na rotina das oficinas, laboratórios e setores administrativos.'
);

addAlertBox(
  'ATENDIMENTO E DÚVIDAS OPERACIONAIS',
  'Em caso de dúvidas sobre a plataforma, regras da gincana ou problemas no acesso, procure a Comissão Interna de Prevenção de Acidentes (CIPA) na Sala da Coordenação Técnica ou envie e-mail para: cipasipat@sp.senai.br.',
  'info'
);

doc.moveDown(1);
addSubTitle('Tabela de Normas Regulamentadoras da SIPAT 2026:');
addBullet('NR-01', 'Disposições Gerais e Gerenciamento de Riscos Ocupacionais (PGR)');
addBullet('NR-06', 'Equipamentos de Proteção Individual (EPIs)');
addBullet('NR-10', 'Segurança em Instalações e Serviços em Eletricidade');
addBullet('NR-11', 'Transporte, Movimentação, Armazenagem e Manuseio de Materiais');
addBullet('NR-12', 'Segurança no Trabalho em Máquinas e Equipamentos');
addBullet('NR-17', 'Ergonomia no Trabalho e Postos Informatizados');
addBullet('NR-26', 'Sinalização de Segurança e Classificação de Produtos Químicos');

doc.moveDown(2);
doc.rect(45, doc.y, 505, 30).fill(RED);
const endY = doc.y - 24;
doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF');
doc.text('SEGURANÇA COMEÇA COM VOCÊ: PREVENIR É UMA ATITUDE DE TODOS!', 45, endY + 4, { align: 'center', width: 505 });
doc.fontSize(8.5).font('Helvetica').fillColor('#FFFFFF');
doc.text('Escola SENAI "Morvan Figueiredo" • Mooca, São Paulo • SIPAT 2026', 45, endY + 16, { align: 'center', width: 505 });

// Finaliza a numeração de páginas em todas as páginas
const totalPages = doc.bufferedPageRange().count;
for (let i = 0; i < totalPages; i++) {
  doc.switchToPage(i);
  doc.fontSize(8).font('Helvetica').fillColor(GRAY);
  doc.text(`Página ${i + 1} de ${totalPages}`, 45, 815, { align: 'center', width: 505 });
  doc.text('Escola SENAI "Morvan Figueiredo" — SIPAT 2026', 45, 815, { align: 'left' });
  doc.text('SENAI-SP Mooca', 45, 815, { align: 'right' });
}

doc.end();

let publicDone = false;
let rootDone = false;

function checkFinished() {
  if (publicDone && rootDone) {
    console.log('\n========================================================================');
    console.log(' SUCESSO: MANUAL EM PDF GERADO COM PRINTS REAIS DO SISTEMA!');
    console.log('========================================================================');
    console.log(`✔ Arquivo público: ${OUT_PATH_PUBLIC} (${fs.statSync(OUT_PATH_PUBLIC).size} bytes)`);
    console.log(`✔ Arquivo na raiz: ${OUT_PATH_ROOT} (${fs.statSync(OUT_PATH_ROOT).size} bytes)`);
    console.log(`✔ Total de páginas geradas: ${totalPages}`);
    console.log('========================================================================\n');
  }
}

writeStreamPublic.on('finish', () => {
  publicDone = true;
  checkFinished();
});

writeStreamRoot.on('finish', () => {
  rootDone = true;
  checkFinished();
});

