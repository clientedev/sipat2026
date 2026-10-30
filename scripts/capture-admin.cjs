const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const SHOTS_DIR = path.resolve('public/manual-prints');

if (!fs.existsSync(SHOTS_DIR)) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

async function captureAdminScreenshots() {
  console.log('Iniciando captura de telas administrativas com sessão isolada...');
  
  // Faz login via fetch na API Express para obter o token de SuperAdmin
  const adminLoginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin.sipat@senai.br',
      password: 'Sipat@Senai2026!ChangeMe',
    }),
  });

  const loginData = await adminLoginRes.json();
  const adminToken = loginData.token;
  console.log('Login de SuperAdmin realizado na API com sucesso!');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1366,768'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  try {
    // Define o cookie de autenticação antes de navegar
    await page.setCookie({
      name: 'sipat_token',
      value: adminToken,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
    });

    // Também injeta no localStorage via evaluate em página em branco
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok, usr) => {
      localStorage.setItem('sipat_token', tok);
      localStorage.setItem('sipat_user', JSON.stringify(usr));
    }, adminToken, loginData.user);

    // 9. Visão Geral Administrativa
    console.log('[9/11] Capturando Visão Geral do Painel Administrativo...');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SHOTS_DIR, '09-admin-painel-geral.png') });

    // 10. Central de Avaliação de Evidências (CIPA)
    console.log('[10/11] Capturando Central de Avaliação de Evidências (CIPA)...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const evTab = tabs.find((t) => t.textContent && (t.textContent.includes('Evidências') || t.textContent.includes('Avaliação')));
      if (evTab) evTab.click();
    });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SHOTS_DIR, '10-admin-central-evidencias.png') });

    // 11. Gestão de Missões e Quizzes
    console.log('[11/11] Capturando Gestão de Missões e Agendamento Automático...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const misTab = tabs.find((t) => t.textContent && (t.textContent.includes('Missões') || t.textContent.includes('Atividades')));
      if (misTab) misTab.click();
    });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SHOTS_DIR, '11-admin-gestao-missoes.png') });

    // 12. Participantes, QR Code e Relatórios Oficiais
    console.log('[12/12] Capturando Gestão de QR Code, Participantes e Relatórios...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const qrTab = tabs.find((t) => t.textContent && (t.textContent.includes('Participantes') || t.textContent.includes('QR Code') || t.textContent.includes('Inscrições')));
      if (qrTab) qrTab.click();
    });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SHOTS_DIR, '12-admin-qrcode-relatorios.png') });

    console.log('\n✔ Todas as telas administrativas foram capturadas com sucesso!');
  } finally {
    await browser.close();
  }
}

captureAdminScreenshots().catch((err) => {
  console.error('[ERRO CAPTURA ADMIN]', err);
  process.exit(1);
});

