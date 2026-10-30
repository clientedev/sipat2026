const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const SHOTS_DIR = path.resolve('public/manual-prints');

if (!fs.existsSync(SHOTS_DIR)) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

async function captureAllVisions() {
  console.log('Iniciando captura sistemática de TODAS as telas na visão de cada usuário...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1366,768'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  try {
    // -------------------------------------------------------------
    // SEÇÃO 1: VISÃO PÚBLICA E DE CADASTRO
    // -------------------------------------------------------------
    console.log('[1/15] Capturando 01-aluno-feed-social.png...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SHOTS_DIR, '01-aluno-feed-social.png') });

    console.log('[2/15] Capturando 02-aluno-inscricao-mobile.png...');
    await page.goto(`${BASE_URL}/inscricao`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SHOTS_DIR, '02-aluno-inscricao-mobile.png') });

    console.log('[3/15] Capturando 03-aluno-login-institucional.png...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SHOTS_DIR, '03-aluno-login-institucional.png') });

    // -------------------------------------------------------------
    // SEÇÃO 2: VISÃO DO ALUNO / PARTICIPANTE (Mariana Souza - Campeã)
    // -------------------------------------------------------------
    console.log('Autenticando como Aluna Líder (Mariana Souza)...');
    const studentLogin = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'mariana.silva@aluno.senai.br',
        password: 'Aluno@Senai2026',
      }),
    });
    const { token: studentToken } = await studentLogin.json();

    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok) => {
      localStorage.setItem('sipat2026_auth_token', tok);
    }, studentToken);

    console.log('[4/15] Capturando 04-aluno-dashboard-desafios.png...');
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2500));
    await page.screenshot({ path: path.join(SHOTS_DIR, '04-aluno-dashboard-desafios.png') });

    console.log('[5/15] Capturando 05-aluno-envio-missao.png...');
    // Clica no card de missão para abrir o modal de submissão
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('button, [role="button"], a'));
      const btn = cards.find((el) => el.textContent && (el.textContent.includes('Enviar Evidência') || el.textContent.includes('Ver Missão') || el.textContent.includes('Participar')));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SHOTS_DIR, '05-aluno-envio-missao.png') });
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 800));

    console.log('[6/15] Capturando 06-aluno-quiz-interativo.png...');
    // Clica em um quiz para abrir o modal interativo do Quiz
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const qBtn = buttons.find((b) => b.textContent && (b.textContent.includes('Quiz') || b.textContent.includes('Responder') || b.textContent.includes('Iniciar')));
      if (qBtn) qBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SHOTS_DIR, '06-aluno-quiz-interativo.png') });
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 800));

    console.log('[7/15] Capturando 07-aluno-certificado-20h.png...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const cBtn = buttons.find((b) => b.textContent && (b.textContent.includes('Certificado') || b.textContent.includes('Diploma')));
      if (cBtn) cBtn.click();
    });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SHOTS_DIR, '07-aluno-certificado-20h.png') });
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 800));

    // -------------------------------------------------------------
    // SEÇÃO 3: VISÃO DO AVALIADOR CIPA / DOCENTE
    // -------------------------------------------------------------
    console.log('Autenticando como Avaliador CIPA...');
    const evalLogin = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'avaliador.sipat@senai.br',
        password: 'Avalia@Senai2026!ChangeMe',
      }),
    });
    const { token: evalToken } = await evalLogin.json();

    await page.evaluate((tok) => {
      localStorage.setItem('sipat2026_auth_token', tok);
    }, evalToken);

    console.log('[8/15] Capturando 08-avaliador-central-evidencias.png...');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SHOTS_DIR, '08-avaliador-central-evidencias.png') });

    console.log('[9/15] Capturando 09-avaliador-analise-parecer.png...');
    // Clica no card de evidência pendente para abrir o detalhe de julgamento
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div, button'));
      const pCard = cards.find((c) => c.textContent && (c.textContent.includes('Pendente') || c.textContent.includes('Avaliar')));
      if (pCard) pCard.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SHOTS_DIR, '09-avaliador-analise-parecer.png') });

    // -------------------------------------------------------------
    // SEÇÃO 4: VISÃO DO ADMINISTRADOR GERAL (SUPERADMIN)
    // -------------------------------------------------------------
    console.log('Autenticando como SuperAdmin SIPAT...');
    const adminLogin = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin.sipat@senai.br',
        password: 'Sipat@Senai2026!ChangeMe',
      }),
    });
    const { token: adminToken } = await adminLogin.json();

    await page.evaluate((tok) => {
      localStorage.setItem('sipat2026_auth_token', tok);
    }, adminToken);

    console.log('[10/15] Capturando 10-admin-visao-geral.png...');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));
    // Clica na aba Visão Geral
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const t = tabs.find((x) => x.textContent && x.textContent.includes('Visão Geral'));
      if (t) t.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SHOTS_DIR, '10-admin-visao-geral.png') });

    console.log('[11/15] Capturando 11-admin-gestao-missoes.png...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const t = tabs.find((x) => x.textContent && (x.textContent.includes('Missões') || x.textContent.includes('Atividades')));
      if (t) t.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SHOTS_DIR, '11-admin-gestao-missoes.png') });

    console.log('[12/15] Capturando 12-admin-qrcode-inscricoes.png...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const t = tabs.find((x) => x.textContent && (x.textContent.includes('Participantes') || x.textContent.includes('QR Code')));
      if (t) t.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SHOTS_DIR, '12-admin-qrcode-inscricoes.png') });

    console.log('[13/15] Capturando 13-admin-relatorios-auditoria.png...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const t = tabs.find((x) => x.textContent && (x.textContent.includes('Relatórios') || x.textContent.includes('Configurações')));
      if (t) t.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SHOTS_DIR, '13-admin-relatorios-auditoria.png') });

    // -------------------------------------------------------------
    // SEÇÃO 5: VISÃO PÚBLICA & MODO TV (TELÕES)
    // -------------------------------------------------------------
    console.log('[14/15] Capturando 14-publico-ranking-turmas.png...');
    await page.goto(`${BASE_URL}/ranking`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SHOTS_DIR, '14-publico-ranking-turmas.png') });

    console.log('[15/15] Capturando 15-publico-modo-tv-telao.png...');
    await page.goto(`${BASE_URL}/acompanhamento`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SHOTS_DIR, '15-publico-modo-tv-telao.png') });

    console.log('\n✔ TODAS AS 15 TELAS FORAM CAPTURADAS COM SUCESSO E EM ALTA DEFINIÇÃO!');
  } finally {
    await browser.close();
  }
}

captureAllVisions().catch((err) => {
  console.error('[ERRO NA CAPTURA]', err);
  process.exit(1);
});
