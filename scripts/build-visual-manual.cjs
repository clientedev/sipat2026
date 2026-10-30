const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SHOTS_DIR = path.resolve('public/manual-prints');
const OUT_DIR = path.resolve('public/docs');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const OUT_PATH_PUBLIC = path.join(OUT_DIR, 'MANUAL_SIPAT_2026_SENAI_MOOCA.pdf');
const OUT_PATH_ROOT = path.resolve('MANUAL_SIPAT_2026_SENAI_MOOCA.pdf');

function getBase64Img(fileName) {
  const p = path.join(SHOTS_DIR, fileName);
  if (!fs.existsSync(p)) return '';
  const buf = fs.readFileSync(p);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

const logoBase64 = (() => {
  const p = path.resolve('public/brand/senai-oficial.png');
  if (fs.existsSync(p)) {
    return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
  }
  return '';
})();

console.log('Compilando Manual Visual e Ilustrativo da SIPAT 2026...');

// Carrega todas as 15 imagens em base64
const img01 = getBase64Img('01-aluno-feed-social.png');
const img02 = getBase64Img('02-aluno-inscricao-mobile.png');
const img03 = getBase64Img('03-aluno-login-institucional.png');
const img04 = getBase64Img('04-aluno-dashboard-desafios.png');
const img05 = getBase64Img('05-aluno-envio-missao.png');
const img06 = getBase64Img('06-aluno-quiz-interativo.png');
const img07 = getBase64Img('07-aluno-certificado-20h.png');
const img08 = getBase64Img('08-avaliador-central-evidencias.png');
const img09 = getBase64Img('09-avaliador-analise-parecer.png');
const img10 = getBase64Img('10-admin-visao-geral.png');
const img11 = getBase64Img('11-admin-gestao-missoes.png');
const img12 = getBase64Img('12-admin-qrcode-inscricoes.png');
const img13 = getBase64Img('13-admin-relatorios-auditoria.png');
const img14 = getBase64Img('14-publico-ranking-turmas.png');
const img15 = getBase64Img('15-publico-modo-tv-telao.png');

const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Manual Ilustrado SIPAT 2026 - SENAI Mooca</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&family=Roboto:wght@400;500;700&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: 'Open Sans', sans-serif;
      color: #1E293B;
      background: #F1F5F9;
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    .page {
      width: 210mm;
      height: 297mm;
      page-break-after: always;
      position: relative;
      background: #FFFFFF;
      padding: 12mm 14mm 10mm 14mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* Cabeçalho da Página */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #E30613;
      padding-bottom: 5px;
      margin-bottom: 8px;
    }

    .page-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .page-header-left img {
      height: 22px;
      object-fit: contain;
    }

    .page-header-left span {
      font-size: 10px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .page-header-right {
      font-size: 10px;
      font-weight: 800;
      color: #E30613;
      text-transform: uppercase;
      background: #FEF2F2;
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid #FECDD3;
    }

    /* Rodapé da Página */
    .page-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid #E2E8F0;
      padding-top: 5px;
      margin-top: 6px;
      font-size: 9px;
      color: #94A3B8;
    }

    .page-footer strong {
      color: #E30613;
    }

    /* Conteúdo Principal do Guia Visual */
    .screen-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      border-left: 5px solid #E30613;
    }

    .screen-card.evaluator {
      border-left-color: #F59E0B;
    }

    .screen-card.admin {
      border-left-color: #0F172A;
    }

    .screen-card.public {
      border-left-color: #10B981;
    }

    .screen-meta h2 {
      font-size: 15px;
      font-weight: 800;
      color: #0F172A;
      line-height: 1.2;
    }

    .screen-meta p {
      font-size: 10.5px;
      color: #475569;
      margin-top: 2px;
    }

    .screen-badge {
      font-size: 9px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 4px;
      white-space: nowrap;
      text-transform: uppercase;
    }

    .badge-student { background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE; }
    .badge-evaluator { background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; }
    .badge-admin { background: #F1F5F9; color: #0F172A; border: 1px solid #CBD5E1; }
    .badge-tv { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }

    /* Frame do Print da Tela */
    .print-frame {
      width: 100%;
      height: 140mm;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    }

    .print-frame img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    /* Passos Direto ao Ponto */
    .steps-container {
      margin-top: 8px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .step-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 8px 10px;
    }

    .step-num {
      display: inline-block;
      width: 18px;
      height: 18px;
      background: #E30613;
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 800;
      border-radius: 50%;
      text-align: center;
      line-height: 18px;
      margin-bottom: 4px;
    }

    .step-box.evaluator .step-num { background: #F59E0B; }
    .step-box.admin .step-num { background: #0F172A; }
    .step-box.public .step-num { background: #10B981; }

    .step-title {
      font-size: 10.5px;
      font-weight: 700;
      color: #1E293B;
      display: block;
      margin-bottom: 2px;
    }

    .step-desc {
      font-size: 9.5px;
      color: #64748B;
      line-height: 1.35;
    }

    .tip-box {
      margin-top: 8px;
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 6px;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 9.5px;
      color: #92400E;
    }

    .tip-box strong {
      color: #B45309;
    }

    /* Estilo Especial da Capa */
    .cover-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
    }

    .cover-top {
      text-align: center;
      padding-top: 8mm;
    }

    .cover-logo {
      height: 48px;
      object-fit: contain;
      margin-bottom: 12px;
    }

    .cover-school {
      font-size: 13px;
      font-weight: 700;
      color: #64748B;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .cover-main-title {
      font-size: 26px;
      font-weight: 800;
      color: #0F172A;
      margin-top: 18px;
      line-height: 1.15;
    }

    .cover-main-title span {
      color: #E30613;
      display: block;
    }

    .cover-sub {
      font-size: 13px;
      color: #475569;
      margin-top: 8px;
      font-weight: 600;
    }

    .cover-banner {
      background: #FEF2F2;
      border: 2px solid #FECDD3;
      border-radius: 8px;
      padding: 12px;
      margin: 18px 0;
      text-align: center;
    }

    .cover-banner h3 {
      font-size: 12px;
      color: #E30613;
      font-weight: 800;
      text-transform: uppercase;
    }

    .cover-banner p {
      font-size: 13px;
      font-weight: 700;
      color: #0F172A;
      margin-top: 3px;
    }

    .cover-banner small {
      font-size: 10.5px;
      color: #E30613;
      font-weight: 600;
      display: block;
      margin-top: 4px;
    }

    /* Tabela de Credenciais da Capa */
    .cred-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      background: #FFFFFF;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #E2E8F0;
      font-size: 9.5px;
      text-align: left;
    }

    .cred-table th {
      background: #0F172A;
      color: #FFFFFF;
      padding: 6px 10px;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9px;
    }

    .cred-table td {
      padding: 6px 10px;
      border-bottom: 1px solid #E2E8F0;
    }

    .cred-table tr:nth-child(even) {
      background: #F8FAFC;
    }

    .cred-table strong {
      color: #E30613;
    }
  </style>
</head>
<body>

  <!-- ============================================================== -->
  <!-- PÁGINA 1: CAPA INSTITUCIONAL & ACESSO IMEDIATO                -->
  <!-- ============================================================== -->
  <div class="page">
    <div class="cover-container">
      <div class="cover-top">
        <img class="cover-logo" src="${logoBase64}" alt="SENAI" />
        <div class="cover-school">Escola SENAI "Morvan Figueiredo" • Mooca, São Paulo</div>
        
        <h1 class="cover-main-title">
          MANUAL VISUAL COMPLETO
          <span>PLATAFORMA SIPAT 2026</span>
        </h1>
        <div class="cover-sub">Guia Ilustrado Tela a Tela na Visão de Cada Usuário</div>

        <div class="cover-banner">
          <h3>Tema Oficial da Campanha:</h3>
          <p>"Segurança começa com você: prevenir é uma atitude de todos!"</p>
          <small>Slogan: "Sua atitude faz a diferença!" • Evento: 16 a 19 de novembro de 2026</small>
        </div>
      </div>

      <div style="text-align: left;">
        <h4 style="font-size: 11px; font-weight: 800; color: #0F172A; margin-bottom: 4px; text-transform: uppercase;">
          🔑 Credenciais Pré-Cadastradas para Testes e Demonstração:
        </h4>
        <table class="cred-table">
          <thead>
            <tr>
              <th>Perfil / Visão</th>
              <th>E-mail Institucional</th>
              <th>Senha</th>
              <th>Finalidade na Demonstração</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Aluno Líder (1º Lugar)</strong></td>
              <td>mariana.silva@aluno.senai.br</td>
              <td>Aluno@Senai2026</td>
              <td>520 pts, Nível 5, todas as medalhas e certificado de 20h liberado</td>
            </tr>
            <tr>
              <td><strong>Aluno Demonstração</strong></td>
              <td>aluno.silva@aluno.senai.br</td>
              <td>Aluno@Senai2026</td>
              <td>470 pts, missões concluídas e conta preparada para navegação</td>
            </tr>
            <tr>
              <td><strong>Aluno Logística</strong></td>
              <td>carlos.mendes@aluno.senai.br</td>
              <td>Aluno@Senai2026</td>
              <td>415 pts, 2º lugar geral, destaque em armazenagem didática</td>
            </tr>
            <tr>
              <td><strong>Avaliador CIPA / Docente</strong></td>
              <td>avaliador.sipat@senai.br</td>
              <td>Avalia@Senai2026!ChangeMe</td>
              <td>Central de Evidências: aprovação de fotos/vídeos e feedbacks</td>
            </tr>
            <tr>
              <td><strong>SuperAdministrador</strong></td>
              <td>admin.sipat@senai.br</td>
              <td>Sipat@Senai2026!ChangeMe</td>
              <td>Controle total, agendamento de missões, QR Code e relatórios</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="page-footer">
        <div>Escola SENAI "Morvan Figueiredo" — Rua Oratório, 215 - Mooca, São Paulo - SP • Telefone: (11) 2076-3200</div>
        <div>Página <strong>1</strong> de 16</div>
      </div>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- PÁGINA 2: VISÃO GERAL DAS 4 JORNADAS DE USUÁRIO                -->
  <!-- ============================================================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="page-header-left">
          <img src="${logoBase64}" alt="SENAI" />
          <span>Estrutura de Acesso e Perfis</span>
        </div>
        <div class="page-header-right">Visão Geral</div>
      </div>

      <div class="screen-card">
        <div class="screen-meta">
          <h2>Como a Plataforma Atende Cada Pessoa no Evento</h2>
          <p>O sistema possui 4 ambientes especializados, interligados em tempo real por WebSockets e PostgreSQL.</p>
        </div>
        <span class="screen-badge badge-admin">Arquitetura Integrada</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;">
        <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-top: 4px solid #4338CA; border-radius: 8px; padding: 12px;">
          <h3 style="font-size: 13px; color: #4338CA; font-weight: 800;">1. Visão do Aluno / Participante</h3>
          <p style="font-size: 10px; color: #475569; margin-top: 4px; line-height: 1.4;">
            Ambiente gamificado voltado ao protagonismo do estudante. Acessa pelo smartphone ou computador para participar das missões práticas de Caça aos Riscos, gravar vídeos de 60s, resolver quizzes diários, interagir no feed social e emitir o <strong>Certificado Oficial de 20 horas</strong>.
          </p>
          <div style="margin-top: 8px; font-size: 9.5px; font-weight: 700; color: #0F172A;">
            Telas: Feed Social • Inscrição QR Code • Painel do Aluno • Missões • Quizzes • Certificado 20h
          </div>
        </div>

        <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-top: 4px solid #F59E0B; border-radius: 8px; padding: 12px;">
          <h3 style="font-size: 13px; color: #B45309; font-weight: 800;">2. Visão do Avaliador CIPA / Docente</h3>
          <p style="font-size: 10px; color: #475569; margin-top: 4px; line-height: 1.4;">
            Espaço de auditoria técnica da Comissão Interna de Prevenção de Acidentes e professores. Permite revisar fotos e vídeos submetidos pelos alunos, atribuir pontuações justas, registrar orientações pedagógicas (feedbacks) e solicitar correções.
          </p>
          <div style="margin-top: 8px; font-size: 9.5px; font-weight: 700; color: #0F172A;">
            Telas: Central de Evidências • Fila de Pendentes • Ficha de Julgamento • Feedbacks Técnicos
          </div>
        </div>

        <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-top: 4px solid #0F172A; border-radius: 8px; padding: 12px;">
          <h3 style="font-size: 13px; color: #0F172A; font-weight: 800;">3. Visão do Administrador Geral</h3>
          <p style="font-size: 10px; color: #475569; margin-top: 4px; line-height: 1.4;">
            Painel da Coordenação Geral da SIPAT. Gerencia a abertura e encerramento de missões com agendador automático persistente, gera e controla o QR Code oficial de inscrições, importa participantes em lote via Excel (.xlsx) e exporta relatórios formais em PDF e Excel.
          </p>
          <div style="margin-top: 8px; font-size: 9.5px; font-weight: 700; color: #0F172A;">
            Telas: Métricas em Tempo Real • Gestor de Missões • Gestor de QR Code • Relatórios Oficiais
          </div>
        </div>

        <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-top: 4px solid #10B981; border-radius: 8px; padding: 12px;">
          <h3 style="font-size: 13px; color: #047857; font-weight: 800;">4. Visão Pública & Telões (Modo TV)</h3>
          <p style="font-size: 10px; color: #475569; margin-top: 4px; line-height: 1.4;">
            Transmissão contínua para TVs e projetores instalados nos corredores, pátio e recepção da escola. Apresenta o pódio ao vivo, liderança entre as turmas técnicas (com anonimização LGPD) e rotação automática de gráficos e fotos de destaque.
          </p>
          <div style="margin-top: 8px; font-size: 9.5px; font-weight: 700; color: #0F172A;">
            Telas: Ranking Oficial LGPD • Pódio ao Vivo • Disputa por Turmas • Acompanhamento TV
          </div>
        </div>
      </div>

      <div class="tip-box" style="margin-top: 14px;">
        <span>💡</span>
        <div><strong>Como usar este manual:</strong> Cada uma das próximas páginas apresenta uma tela real do sistema com explicação objetiva de <strong>Quem usa</strong>, <strong>Para que serve</strong> e <strong>3 passos diretos ao ponto</strong>.</div>
      </div>
    </div>

    <div class="page-footer">
      <div>Manual Visual da SIPAT 2026 — Escola SENAI "Morvan Figueiredo"</div>
      <div>Página <strong>2</strong> de 16</div>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- PÁGINA 3: [ALUNO] FEED SOCIAL & STORIES                        -->
  <!-- ============================================================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="page-header-left">
          <img src="${logoBase64}" alt="SENAI" />
          <span>Parte I: Visão do Aluno / Participante</span>
        </div>
        <div class="page-header-right">Tela 01: Feed Social</div>
      </div>

      <div class="screen-card">
        <div class="screen-meta">
          <h2>Feed Social de Atitudes Seguras & Stories</h2>
          <p>Página inicial pública: rede social gamificada com posts de desafios dos alunos, stories do evento e pódio.</p>
        </div>
        <span class="screen-badge badge-student">Acesso Público / Alunos</span>
      </div>

      <div class="print-frame">
        <img src="${img01}" alt="Feed Social da SIPAT 2026" />
      </div>

      <div class="steps-container">
        <div class="step-box">
          <span class="step-num">1</span>
          <span class="step-title">Veja os Stories no Topo</span>
          <span class="step-desc">Clique nos círculos de stories para ver cobertura ao vivo, dicas de ergonomia e atalho para o Certificado de 20h.</span>
        </div>
        <div class="step-box">
          <span class="step-num">2</span>
          <span class="step-title">Curta Atitudes Seguras</span>
          <span class="step-desc">Clique no botão "👏 Atitude Nota 10!" nos posts dos colegas. Os aplausos atualizam em tempo real para toda a escola.</span>
        </div>
        <div class="step-box">
          <span class="step-num">3</span>
          <span class="step-title">Acompanhe a Liderança</span>
          <span class="step-desc">Consulte o minipódio e as turmas na lateral direita para ver a classificação atualizada antes de enviar suas evidências.</span>
        </div>
      </div>

      <div class="tip-box">
        <span>💡</span>
        <div><strong>Dica do Aluno:</strong> No canto superior direito, use o botão <strong>"Manual em PDF"</strong> para baixar este guia ou clique em <strong>"Inscrever-se"</strong> caso seja seu primeiro acesso.</div>
      </div>
    </div>

    <div class="page-footer">
      <div>Manual Visual da SIPAT 2026 — Escola SENAI "Morvan Figueiredo"</div>
      <div>Página <strong>3</strong> de 16</div>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- PÁGINA 4: [ALUNO] INSCRIÇÃO MOBILE & QR CODE                   -->
  <!-- ============================================================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="page-header-left">
          <img src="${logoBase64}" alt="SENAI" />
          <span>Parte I: Visão do Aluno / Participante</span>
        </div>
        <div class="page-header-right">Tela 02: Inscrição Mobile</div>
      </div>

      <div class="screen-card">
        <div class="screen-meta">
          <h2>Cadastro Simplificado por QR Code no Smartphone</h2>
          <p>O aluno aponta a câmera do celular para o cartaz nos murais da escola e realiza o cadastro em menos de 1 minuto.</p>
        </div>
        <span class="screen-badge badge-student">Mobile First</span>
      </div>

      <div class="print-frame">
        <img src="${img02}" alt="Inscrição Mobile" />
      </div>

      <div class="steps-container">
        <div class="step-box">
          <span class="step-num">1</span>
          <span class="step-title">Aponte a Câmera</span>
          <span class="step-desc">Escaneie o QR Code oficial ou abra o link /inscricao no navegador do celular. O código oficial é validado na hora.</span>
        </div>
        <div class="step-box">
          <span class="step-num">2</span>
          <span class="step-title">Preencha seus Dados</span>
          <span class="step-desc">Informe Nome Completo, E-mail, Matrícula (RA) e escolha sua Turma Técnica na lista suspensa do SENAI Mooca.</span>
        </div>
        <div class="step-box">
          <span class="step-num">3</span>
          <span class="step-title">Selfie & Consentimento LGPD</span>
          <span class="step-desc">Tire uma foto de perfil pela câmera frontal, aceite os termos LGPD e clique em "Finalizar Inscrição" para entrar direto.</span>
        </div>
      </div>

      <div class="tip-box">
        <span>🔒</span>
        <div><strong>Proteção ao Menor:</strong> Caso tenha menos de 18 anos, marque a opção indicada e informe o nome do responsável para garantir conformidade legal com o ECA e a LGPD.</div>
      </div>
    </div>

    <div class="page-footer">
      <div>Manual Visual da SIPAT 2026 — Escola SENAI "Morvan Figueiredo"</div>
      <div>Página <strong>4</strong> de 16</div>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- PÁGINA 5: [ALUNO] LOGIN INSTITUCIONAL                          -->
  <!-- ============================================================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="page-header-left">
          <img src="${logoBase64}" alt="SENAI" />
          <span>Parte I: Visão do Aluno / Participante</span>
        </div>
        <div class="page-header-right">Tela 03: Login Único</div>
      </div>

      <div class="screen-card">
        <div class="screen-meta">
          <h2>Autenticação Institucional Unificada</h2>
          <p>Portal único de acesso seguro tanto para alunos quanto para docentes, avaliadores e equipe administrativa.</p>
        </div>
        <span class="screen-badge badge-student">Login Geral</span>
      </div>

      <div class="print-frame">
        <img src="${img03}" alt="Login Institucional" />
      </div>

      <div class="steps-container">
        <div class="step-box">
          <span class="step-num">1</span>
          <span class="step-title">Identificador</span>
          <span class="step-desc">Digite seu e-mail cadastrado ou número de matrícula / RA.</span>
        </div>
        <div class="step-box">
          <span class="step-num">2</span>
          <span class="step-title">Senha de Acesso</span>
          <span class="step-desc">Digite sua senha segura. Para as contas de teste de alunos, use: <code>Aluno@Senai2026</code>.</span>
        </div>
        <div class="step-box">
          <span class="step-num">3</span>
          <span class="step-title">Redirecionamento Automático</span>
          <span class="step-desc">O sistema identifica se você é Aluno (vai para /app) ou CIPA/Admin (vai para /admin).</span>
        </div>
      </div>

      <div class="tip-box">
        <span>🔑</span>
        <div><strong>Esqueceu a senha?</strong> Clique em "Esqueceu a senha?" para receber as instruções de recuperação imediata da credencial.</div>
      </div>
    </div>

    <div class="page-footer">
      <div>Manual Visual da SIPAT 2026 — Escola SENAI "Morvan Figueiredo"</div>
      <div>Página <strong>5</strong> de 16</div>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- PÁGINA 6: [ALUNO] DASHBOARD DO PARTICIPANTE                    -->
  <!-- ============================================================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="page-header-left">
          <img src="${logoBase64}" alt="SENAI" />
          <span>Parte I: Visão do Aluno / Participante</span>
        </div>
        <div class="page-header-right">Tela 04: Painel do Aluno</div>
      </div>

      <div class="screen-card">
        <div class="screen-meta">
          <h2>Painel do Participante (Central de Desafios & Gamificação)</h2>
          <p>Visão do aluno logado: saldo de pontos, nível de segurança, 5 medalhas comemorativas e missões por dia.</p>
        </div>
        <span class="screen-badge badge-student">Aluno Logado</span>
      </div>

      <div class="print-frame">
        <img src="${img04}" alt="Painel do Aluno" />
      </div>

      <div class="steps-container">
        <div class="step-box">
          <span class="step-num">1</span>
          <span class="step-title">Confira seus Pontos & Nível</span>
          <span class="step-desc">No topo, veja sua pontuação total (ex: 520 pts), posição no ranking e sua barra de nível (1 ao 5).</span>
        </div>
        <div class="step-box">
          <span class="step-num">2</span>
          <span class="step-title">Filtre pelos Dias da SIPAT</span>
          <span class="step-desc">Use os botões "Dia 1 (16/11)" a "Dia 4 (19/11)" para navegar pelas missões práticas e quizzes liberados.</span>
        </div>
        <div class="step-box">
          <span class="step-num">3</span>
          <span class="step-title">Emita seu Certificado</span>
          <span class="step-desc">Clique no botão dourado "Certificado 20h" no topo para visualizar e imprimir seu diploma oficial.</span>
        </div>
      </div>

      <div class="tip-box">
        <span>🏆</span>
        <div><strong>As 5 Medalhas Oficiais:</strong> Olho de Águia (100 pts), Atitude Nota 10 (20 pts), Guardião da Segurança (180 pts), Mestre da Prevenção (250 pts) e Campeão da SIPAT (300 pts).</div>
      </div>
    </div>

    <div class="page-footer">
      <div>Manual Visual da SIPAT 2026 — Escola SENAI "Morvan Figueiredo"</div>
      <div>Página <strong>6</strong> de 16</div>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- PÁGINA 7: [ALUNO] ENVIO DE EVIDÊNCIA DE MISSÃO                 -->
  <!-- ============================================================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="page-header-left">
          <img src="${logoBase64}" alt="SENAI" />
          <span>Parte I: Visão do Aluno / Participante</span>
        </div>
        <div class="page-header-right">Tela 05: Envio de Missão</div>
      </div>

      <div class="screen-card">
        <div class="screen-meta">
          <h2>Submissão de Evidência Prática (Caça aos Riscos)</h2>
          <p>O aluno registra o perigo encontrado na escola, indica a causa e propõe a medida corretiva preventiva.</p>
        </div>
        <span class="screen-badge badge-student">Ação Prática</span>
      </div>

      <div class="print-frame">
        <img src="${img05}" alt="Envio de Evidência" />
      </div>

      <div class="steps-container">
        <div class="step-box">
          <span class="step-num">1</span>
          <span class="step-title">Capture Foto ou Vídeo</span>
          <span class="step-desc">Clique em "Usar Câmera" para tirar a foto na hora ou selecione o arquivo de mídia do seu celular/PC.</span>
        </div>
        <div class="step-box">
          <span class="step-num">2</span>
          <span class="step-title">Preencha o Diagnóstico</span>
          <span class="step-desc">Indique o local (ex: Oficina Mecânica), o perigo identificado, possíveis consequências e medidas preventivas.</span>
        </div>
        <div class="step-box">
          <span class="step-num">3</span>
          <span class="step-title">Envie para a CIPA</span>
          <span class="step-desc">Clique em "Enviar Participação". A evidência entra na fila de avaliação e gera notificação no seu painel.</span>
        </div>
      </div>

      <div class="tip-box">
        <span>📸</span>
        <div><strong>Regra de Ouro:</strong> Nunca se coloque em risco para tirar uma foto. A Caça aos Riscos é um exercício de percepção educativa em áreas autorizadas pelo docente.</div>
      </div>
    </div>

    <div class="page-footer">
      <div>Manual Visual da SIPAT 2026 — Escola SENAI "Morvan Figueiredo"</div>
      <div>Página <strong>7</strong> de 16</div>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- PÁGINA 8: [ALUNO] QUIZ INTERATIVO COM CRONÔMETRO               -->
  <!-- ============================================================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="page-header-left">
          <img src="${logoBase64}" alt="SENAI" />
          <span>Parte I: Visão do Aluno / Participante</span>
        </div>
        <div class="page-header-right">Tela 06: Quiz Interativo</div>
      </div>

      <div class="screen-card">
        <div class="screen-meta">
          <h2>Quiz Educativo com Correção Instantânea</h2>
          <p>Desafio de perguntas e respostas sobre EPIs, NR-10, NR-12, Ergonomia, Mito ou Verdade e Segurança Digital.</p>
        </div>
        <span class="screen-badge badge-student">Desafio Diário</span>
      </div>

      <div class="print-frame">
        <img src="${img06}" alt="Quiz Interativo" />
      </div>

      <div class="steps-container">
        <div class="step-box">
          <span class="step-num">1</span>
          <span class="step-title">Atenção ao Tempo</span>
          <span class="step-desc">O cronômetro regressivo no canto superior mostra o tempo restante para responder todas as questões.</span>
        </div>
        <div class="step-box">
          <span class="step-num">2</span>
          <span class="step-title">Selecione a Alternativa</span>
          <span class="step-desc">Clique nos cartões grandes de resposta (A, B, C ou D). O card selecionado fica destacado com a borda vermelha SENAI.</span>
        </div>
        <div class="step-box">
          <span class="step-num">3</span>
          <span class="step-title">Feedback Técnico</span>
          <span class="step-desc">Ao concluir, o sistema corrige na hora, mostra sua porcentagem de acertos e credita os pontos no ranking.</span>
        </div>
      </div>

      <div class="tip-box">
        <span>⏱</span>
        <div><strong>Pontuação Máxima:</strong> Cada quiz vale até 50 pontos. Caso atinja 100% de acertos, você recebe pontuação máxima e avança no nível de segurança!</div>
      </div>
    </div>

    <div class="page-footer">
      <div>Manual Visual da SIPAT 2026 — Escola SENAI "Morvan Figueiredo"</div>
      <div>Página <strong>8</strong> de 16</div>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- PÁGINA 9: [ALUNO] CERTIFICADO OFICIAL DE 20 HORAS              -->
  <!-- ============================================================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="page-header-left">
          <img src="${logoBase64}" alt="SENAI" />
          <span>Parte I: Visão do Aluno / Participante</span>
        </div>
        <div class="page-header-right">Tela 07: Certificado Oficial</div>
      </div>

      <div class="screen-card">
        <div class="screen-meta">
          <h2>Emissão do Certificado Oficial de 20 Horas</h2>
          <p>Documento diplomático comprobatório de participação com 20 horas complementares e validação digital por hash.</p>
        </div>
        <span class="screen-badge badge-student">Diploma Digital</span>
      </div>

      <div class="print-frame">
        <img src="${img07}" alt="Certificado Oficial de 20 Horas" />
      </div>

      <div class="steps-container">
        <div class="step-box">
          <span class="step-num">1</span>
          <span class="step-title">Conquiste suas Horas</span>
          <span class="step-desc">O certificado reúne suas 20 horas de atividades e detalha as NRs trabalhadas (NR-01, 06, 10, 12, 17 e 26).</span>
        </div>
        <div class="step-box">
          <span class="step-num">2</span>
          <span class="step-title">Autenticidade Garantida</span>
          <span class="step-desc">Possui código hash SENAI-SIPAT2026-MF-XXXX e QR Code para qualquer empresa verificar online.</span>
        </div>
        <div class="step-box">
          <span class="step-num">3</span>
          <span class="step-title">Salvar em PDF ou Imprimir</span>
          <span class="step-desc">Clique no botão "Imprimir Certificado". A página já está configurada para gerar folha A4 paisagem perfeita.</span>
        </div>
      </div>

      <div class="tip-box">
        <span>📜</span>
        <div><strong>Compartilhamento Social:</strong> Use os botões abaixo do certificado para compartilhar sua conquista no LinkedIn e WhatsApp com seus contatos!</div>
      </div>
    </div>

    <div class="page-footer">
      <div>Manual Visual da SIPAT 2026 — Escola SENAI "Morvan Figueiredo"</div>
      <div>Página <strong>9</strong> de 16</div>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- PÁGINA 10: [AVALIADOR] CENTRAL DE EVIDÊNCIAS                   -->
  <!-- ============================================================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="page-header-left">
          <img src="${logoBase64}" alt="SENAI" />
          <span>Parte II: Visão do Avaliador CIPA / Docente</span>
        </div>
        <div class="page-header-right" style="color: #B45309; background: #FEF3C7; border-color: #FDE68A;">Tela 08: Central CIPA</div>
      </div>

      <div class="screen-card evaluator">
        <div class="screen-meta">
          <h2>Central de Avaliação de Evidências da CIPA</h2>
          <p>Painel de julgamento técnico: fila com todas as fotos, vídeos e descrições enviadas pelos estudantes.</p>
        </div>
        <span class="screen-badge badge-evaluator">Uso do Avaliador</span>
      </div>

      <div class="print-frame">
        <img src="${img08}" alt="Central de Evidências da CIPA" />
      </div>

      <div class="steps-container">
        <div class="step-box evaluator">
          <span class="step-num">1</span>
          <span class="step-title">Filtre a Fila de Espera</span>
          <span class="step-desc">Selecione a aba "Pendentes" para visualizar apenas as atividades que aguardam seu parecer técnico.</span>
        </div>
        <div class="step-box evaluator">
          <span class="step-num">2</span>
          <span class="step-title">Inspecione a Mídia</span>
          <span class="step-desc">Visualize a foto em tamanho real ou assista ao vídeo de 60 segundos gravado pelo aluno no laboratório.</span>
        </div>
        <div class="step-box evaluator">
          <span class="step-num">3</span>
          <span class="step-title">Abra a Ficha de Decisão</span>
          <span class="step-desc">Clique no botão "Avaliar Evidência" para abrir a gaveta lateral de atribuição de nota e parecer.</span>
        </div>
      </div>

      <div class="tip-box">
        <span>⚖</span>
        <div><strong>Critério Técnico da CIPA:</strong> Verifique se a condição insegura apontada tem fundamento com as Normas Regulamentadoras e se a medida preventiva indicada pelo aluno é aplicável na rotina da escola.</div>
      </div>
    </div>

    <div class="page-footer">
      <div>Manual Visual da SIPAT 2026 — Escola SENAI "Morvan Figueiredo"</div>
      <div>Página <strong>10</strong> de 16</div>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- PÁGINA 11: [AVALIADOR] FICHA DE JULGAMENTO & PARECER          -->
  <!-- ============================================================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="page-header-left">
          <img src="${logoBase64}" alt="SENAI" />
          <span>Parte II: Visão do Avaliador CIPA / Docente</span>
        </div>
        <div class="page-header-right" style="color: #B45309; background: #FEF3C7; border-color: #FDE68A;">Tela 09: Julgamento CIPA</div>
      </div>

      <div class="screen-card evaluator">
        <div class="screen-meta">
          <h2>Ficha de Julgamento, Pontuação e Parecer Educativo</h2>
          <p>O avaliador decide o resultado da submissão: Aprovação, Solicitação de Correção com orientação ou Reprovação.</p>
        </div>
        <span class="screen-badge badge-evaluator">Decisão Técnica</span>
      </div>

      <div class="print-frame">
        <img src="${img09}" alt="Ficha de Julgamento e Feedback" />
      </div>

      <div class="steps-container">
        <div class="step-box evaluator">
          <span class="step-num">1</span>
          <span class="step-title">Aprovar com Pontos</span>
          <span class="step-desc">Se a análise de risco estiver correta, clique em "Aprovar". Os pontos entram no saldo do aluno na mesma hora.</span>
        </div>
        <div class="step-box evaluator">
          <span class="step-num">2</span>
          <span class="step-title">Solicitar Correção</span>
          <span class="step-desc">Foto borrada ou diagnóstico incompleto? Clique em "Solicitar Correção" e digite a instrução educativa para refação.</span>
        </div>
        <div class="step-box evaluator">
          <span class="step-num">3</span>
          <span class="step-title">Feedback Transparente</span>
          <span class="step-desc">Seu parecer fica visível no painel do aluno e no feed social com a assinatura oficial da comissão CIPA.</span>
        </div>
      </div>

      <div class="tip-box">
        <span>💬</span>
        <div><strong>Exemplo de Feedback Construtivo:</strong> "Parabéns, Carlos! Ótima percepção na estante porta-paletes (NR-11). A descida do palete avariado evitou o desmoronamento da carga."</div>
      </div>
    </div>

    <div class="page-footer">
      <div>Manual Visual da SIPAT 2026 — Escola SENAI "Morvan Figueiredo"</div>
      <div>Página <strong>11</strong> de 16</div>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- PÁGINA 12: [ADMIN] DASHBOARD GERAL & MÉTRICAS                  -->
  <!-- ============================================================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="page-header-left">
          <img src="${logoBase64}" alt="SENAI" />
          <span>Parte III: Visão do Administrador Geral (SuperAdmin)</span>
        </div>
        <div class="page-header-right" style="color: #0F172A; background: #F1F5F9; border-color: #CBD5E1;">Tela 10: Painel Geral</div>
      </div>

      <div class="screen-card admin">
        <div class="screen-meta">
          <h2>Painel Geral de Controle da Coordenação</h2>
          <p>Visão executiva em tempo real: participantes ativos, total de evidências submetidas, quizzes respondidos e auditoria.</p>
        </div>
        <span class="screen-badge badge-admin">SuperAdmin</span>
      </div>

      <div class="print-frame">
        <img src="${img10}" alt="Painel Geral do Administrador" />
      </div>

      <div class="steps-container">
        <div class="step-box admin">
          <span class="step-num">1</span>
          <span class="step-title">Métricas de Engajamento</span>
          <span class="step-desc">Veja a contagem exata de inscritos, submissões aprovadas, pendências e total de certificados emitidos.</span>
        </div>
        <div class="step-box admin">
          <span class="step-num">2</span>
          <span class="step-title">Navegação por Módulos</span>
          <span class="step-desc">Alterne entre Visão Geral, Central de Evidências, Missões & Quizzes, Participantes/QR e Relatórios.</span>
        </div>
        <div class="step-box admin">
          <span class="step-num">3</span>
          <span class="step-title">Auditoria em Tempo Real</span>
          <span class="step-desc">Acompanhe cada ação administrativa registrada com carimbo de data/hora e identificação do usuário responsável.</span>
        </div>
      </div>

      <div class="tip-box">
        <span>📊</span>
        <div><strong>Controle Institucional:</strong> Todas as alterações manuais de pontos exigem motivo formal e ficam registradas no livro-razão digital auditável.</div>
      </div>
    </div>

    <div class="page-footer">
      <div>Manual Visual da SIPAT 2026 — Escola SENAI "Morvan Figueiredo"</div>
      <div>Página <strong>12</strong> de 16</div>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- PÁGINA 13: [ADMIN] GESTÃO DE MISSÕES & AGENDADOR              -->
  <!-- ============================================================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="page-header-left">
          <img src="${logoBase64}" alt="SENAI" />
          <span>Parte III: Visão do Administrador Geral (SuperAdmin)</span>
        </div>
        <div class="page-header-right" style="color: #0F172A; background: #F1F5F9; border-color: #CBD5E1;">Tela 11: Gestão de Missões</div>
      </div>

      <div class="screen-card admin">
        <div class="screen-meta">
          <h2>Módulo de Missões & Agendador Automático Persistente</h2>
          <p>Crie, edite, duplique e agende atividades para abertura automática em horários exatos sem mexer no código.</p>
        </div>
        <span class="screen-badge badge-admin">Automação Backend</span>
      </div>

      <div class="print-frame">
        <img src="${img11}" alt="Gestão de Missões e Agendador" />
      </div>

      <div class="steps-container">
        <div class="step-box admin">
          <span class="step-num">1</span>
          <span class="step-title">Criar ou Editar Missão</span>
          <span class="step-desc">Configure título, instruções, pontuação, exigência de foto/vídeo e critérios de avaliação da CIPA.</span>
        </div>
        <div class="step-box admin">
          <span class="step-num">2</span>
          <span class="step-title">Agendamento por Horário</span>
          <span class="step-desc">Defina a data e hora de abertura (ex: 16/11 às 09h30). O servidor publica sozinho sem intervenção humana.</span>
        </div>
        <div class="step-box admin">
          <span class="step-num">3</span>
          <span class="step-title">Disparo via WebSockets</span>
          <span class="step-desc">Assim que o horário chega, os celulares e PCs dos alunos recebem o alerta em tempo real sem precisar dar F5.</span>
        </div>
      </div>

      <div class="tip-box">
        <span>⚙</span>
        <div><strong>Resiliente a Reinicializações:</strong> O agendador é gravado no PostgreSQL. Mesmo se o servidor reiniciar no Railway, nenhuma atividade perde o horário programado.</div>
      </div>
    </div>

    <div class="page-footer">
      <div>Manual Visual da SIPAT 2026 — Escola SENAI "Morvan Figueiredo"</div>
      <div>Página <strong>13</strong> de 16</div>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- PÁGINA 14: [ADMIN] GESTÃO DE QR CODE & IMPORTAÇÃO EXCEL       -->
  <!-- ============================================================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="page-header-left">
          <img src="${logoBase64}" alt="SENAI" />
          <span>Parte III: Visão do Administrador Geral (SuperAdmin)</span>
        </div>
        <div class="page-header-right" style="color: #0F172A; background: #F1F5F9; border-color: #CBD5E1;">Tela 12: Inscrições & QR</div>
      </div>

      <div class="screen-card admin">
        <div class="screen-meta">
          <h2>Gestão de Inscrições, QR Code Dinâmico e Planilha Excel</h2>
          <p>Controle do período de inscrições, geração de cartazes promocionais em PDF e importação de turmas inteiras.</p>
        </div>
        <span class="screen-badge badge-admin">Gestão Escolar</span>
      </div>

      <div class="print-frame">
        <img src="${img12}" alt="Gestão de QR Code e Inscrições" />
      </div>

      <div class="steps-container">
        <div class="step-box admin">
          <span class="step-num">1</span>
          <span class="step-title">Cartaz Promocional PDF</span>
          <span class="step-desc">Clique em "Baixar Cartaz em PDF" para obter a folha A4 oficial pronta para imprimir e colar nos murais da escola.</span>
        </div>
        <div class="step-box admin">
          <span class="step-num">2</span>
          <span class="step-title">Importação em Lote (.xlsx)</span>
          <span class="step-desc">Envie a lista da secretaria escolar em Excel. O sistema cria as contas e vincula os alunos às turmas na hora.</span>
        </div>
        <div class="step-box admin">
          <span class="step-num">3</span>
          <span class="step-title">Controle do QR Code</span>
          <span class="step-desc">Acompanhe a contagem de leituras (scans), pause o código se necessário ou regenere com nova validade.</span>
        </div>
      </div>

      <div class="tip-box">
        <span>📋</span>
        <div><strong>Template da Planilha:</strong> O painel disponibiliza o modelo padrão do Excel com colunas para Nome Completo, E-mail, Matrícula, Turma e Menoridade.</div>
      </div>
    </div>

    <div class="page-footer">
      <div>Manual Visual da SIPAT 2026 — Escola SENAI "Morvan Figueiredo"</div>
      <div>Página <strong>14</strong> de 16</div>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- PÁGINA 15: [ADMIN] RELATÓRIOS OFICIAIS & AUDITORIA            -->
  <!-- ============================================================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="page-header-left">
          <img src="${logoBase64}" alt="SENAI" />
          <span>Parte III: Visão do Administrador Geral (SuperAdmin)</span>
        </div>
        <div class="page-header-right" style="color: #0F172A; background: #F1F5F9; border-color: #CBD5E1;">Tela 13: Relatórios</div>
      </div>

      <div class="screen-card admin">
        <div class="screen-meta">
          <h2>Central de Relatórios Oficiais (Excel & Dossiê PDF)</h2>
          <p>Exportação documental completa para auditorias internas do SENAI-SP, SESI e comprovação formal da CIPA.</p>
        </div>
        <span class="screen-badge badge-admin">Prestação de Contas</span>
      </div>

      <div class="print-frame">
        <img src="${img13}" alt="Relatórios Oficiais e Auditoria" />
      </div>

      <div class="steps-container">
        <div class="step-box admin">
          <span class="step-num">1</span>
          <span class="step-title">Relatório Geral (Excel)</span>
          <span class="step-desc">Planilha detalhada com todos os alunos, turmas, notas de quizzes, horas complementares e pontos finais.</span>
        </div>
        <div class="step-box admin">
          <span class="step-num">2</span>
          <span class="step-title">Dossiê de Riscos (PDF)</span>
          <span class="step-desc">Relatório formal de Caça aos Riscos com todas as fotos anexadas, perigos mapeados e pareceres da CIPA.</span>
        </div>
        <div class="step-box admin">
          <span class="step-num">3</span>
          <span class="step-title">Auditoria de Alterações</span>
          <span class="step-desc">Histórico completo de modificações manuais, criação de atividades e logs de segurança do sistema.</span>
        </div>
      </div>

      <div class="tip-box">
        <span>📑</span>
        <div><strong>Documento Formal:</strong> O Dossiê da Caça aos Riscos em PDF é assinado digitalmente e serve como subsídio técnico para o Plano de Gerenciamento de Riscos (PGR) da unidade Mooca.</div>
      </div>
    </div>

    <div class="page-footer">
      <div>Manual Visual da SIPAT 2026 — Escola SENAI "Morvan Figueiredo"</div>
      <div>Página <strong>15</strong> de 16</div>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- PÁGINA 16: [MODO TV] TELÕES NOS CORREDORES & RANKINGS         -->
  <!-- ============================================================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="page-header-left">
          <img src="${logoBase64}" alt="SENAI" />
          <span>Parte IV: Visão Pública & Modo TV (Telões Escolares)</span>
        </div>
        <div class="page-header-right" style="color: #047857; background: #ECFDF5; border-color: #A7F3D0;">Telas 14 e 15: Telão TV</div>
      </div>

      <div class="screen-card public">
        <div class="screen-meta">
          <h2>Ranking Oficial LGPD e Modo TV para Telões nos Corredores</h2>
          <p>Exibição contínua para Smart TVs e projetores no pátio e recepção do SENAI Mooca com rotação automática.</p>
        </div>
        <span class="screen-badge badge-tv">Transmissão Escolar</span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; height: 135mm;">
        <div class="print-frame" style="height: 100%;">
          <img src="${img14}" alt="Ranking Oficial com LGPD" />
        </div>
        <div class="print-frame" style="height: 100%;">
          <img src="${img15}" alt="Acompanhamento Modo TV" />
        </div>
      </div>

      <div class="steps-container">
        <div class="step-box public">
          <span class="step-num">1</span>
          <span class="step-title">Pódio Individual ao Vivo</span>
          <span class="step-desc">Exibe os líderes da SIPAT com medalhas de Ouro, Prata e Bronze e nomes protegidos (ex: "Mariana S. S.").</span>
        </div>
        <div class="step-box public">
          <span class="step-num">2</span>
          <span class="step-title">Disputa entre Turmas</span>
          <span class="step-desc">Ranking em tempo real das turmas técnicas mais engajadas (TEC-DEV, TEC-LOG, CAI-AUT, CAI-ELE, TEC-CLI).</span>
        </div>
        <div class="step-box public">
          <span class="step-num">3</span>
          <span class="step-title">Modo TV Automático</span>
          <span class="step-desc">Acesse /acompanhamento no navegador da Smart TV. A tela alterna entre ranking, gráficos e destaques a cada 14 segundos.</span>
        </div>
      </div>

      <div class="tip-box">
        <span>🛡</span>
        <div><strong>Privacidade Escolar (LGPD):</strong> O modo público preserva a privacidade dos adolescentes: fotos sem consentimento são omitidas e os nomes são exibidos com o padrão de iniciais regulamentar.</div>
      </div>
    </div>

    <div class="page-footer">
      <div>Manual Visual da SIPAT 2026 — Escola SENAI "Morvan Figueiredo" • Unidade Mooca</div>
      <div>Página <strong>16</strong> de 16 (Fim do Manual)</div>
    </div>
  </div>

</body>
</html>
`;

async function generateVisualPdf() {
  console.log('Iniciando renderização pixel-perfect do Manual HTML para PDF com Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'load', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));

  console.log('Gerando PDF com formato A4 sem margens artificiais...');
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  });

  fs.writeFileSync(OUT_PATH_PUBLIC, pdfBuffer);
  fs.writeFileSync(OUT_PATH_ROOT, pdfBuffer);

  // Também garante cópia em dist/client/docs caso a pasta dist exista
  const distDocsDir = path.resolve('dist/client/docs');
  if (fs.existsSync(distDocsDir)) {
    fs.writeFileSync(path.join(distDocsDir, 'MANUAL_SIPAT_2026_SENAI_MOOCA.pdf'), pdfBuffer);
  }

  console.log('\n========================================================================');
  console.log(' NOVO MANUAL VISUAL E ILUSTRATIVO CONCLUÍDO COM SUCESSO!');
  console.log('========================================================================');
  console.log(`✔ Arquivo público: ${OUT_PATH_PUBLIC} (${fs.statSync(OUT_PATH_PUBLIC).size} bytes)`);
  console.log(`✔ Arquivo raiz: ${OUT_PATH_ROOT} (${fs.statSync(OUT_PATH_ROOT).size} bytes)`);
  console.log('✔ Total de páginas geradas: 16 páginas A4 exatamente alinhadas');
  console.log('✔ Estrutura: 1 tela por página com passos direto ao ponto e visão de todos os users');
  console.log('========================================================================\n');

  await browser.close();
}

generateVisualPdf().catch((err) => {
  console.error('[ERRO GERANDO PDF]', err);
  process.exit(1);
});
