const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const SHOTS_DIR = path.resolve('public/manual-prints');

if (!fs.existsSync(SHOTS_DIR)) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

async function capture() {
  console.log('Iniciando captura automatizada completa de telas com Puppeteer...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1366,768'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  try {
    // 1. Landing Page / Feed Social
    console.log('[1/11] Capturando Feed Social e Página Principal...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SHOTS_DIR, '01-feed-social-principal.png') });

    // 2. Inscrição do Aluno e QR Code
    console.log('[2/11] Capturando Tela de Inscrição Mobile e Validação de QR Code...');
    await page.goto(`${BASE_URL}/inscricao`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SHOTS_DIR, '02-inscricao-mobile.png') });

    // 3. Login Institucional
    console.log('[3/11] Capturando Tela de Login Institucional...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SHOTS_DIR, '03-login-institucional.png') });

    // 4. Login como Aluna Campeã (Mariana Souza - TEC-DEV-2T)
    console.log('[4/11] Efetuando login e capturando Dashboard do Aluno (Gamificação)...');
    await page.type('input[type="text"], input[name="identifier"], input[placeholder*="E-mail"], input[type="email"]', 'mariana.silva@aluno.senai.br');
    await page.type('input[type="password"]', 'Aluno@Senai2026');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2500));
    await page.screenshot({ path: path.join(SHOTS_DIR, '04-dashboard-aluno.png') });

    // 5. Certificado Oficial de 20h
    console.log('[5/11] Abrindo e capturando Certificado Oficial Diplomático de 20h...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const b = buttons.find((btn) => btn.textContent && (btn.textContent.includes('Certificado') || btn.textContent.includes('Diploma')));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SHOTS_DIR, '05-certificado-oficial-20h.png') });

    // Fecha o modal do certificado
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 800));

    // 6. Modal de Envio de Evidência de Missão (Caça aos Riscos / Câmera)
    console.log('[6/11] Abrindo modal de submissão de missão...');
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('button, [role="button"], a'));
      const sendBtn = cards.find((el) => el.textContent && (el.textContent.includes('Enviar Evidência') || el.textContent.includes('Ver Missão') || el.textContent.includes('Participar')));
      if (sendBtn) sendBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SHOTS_DIR, '06-envio-missao-evidencia.png') });

    // Fecha modal
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 500));

    // 7. Ranking Público e Pódio
    console.log('[7/11] Capturando Ranking Público Geral e por Turmas...');
    await page.goto(`${BASE_URL}/ranking`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SHOTS_DIR, '07-ranking-publico-turmas.png') });

    // 8. Modo TV / Acompanhamento em Tempo Real
    console.log('[8/11] Capturando Acompanhamento em Tempo Real (Modo TV)...');
    await page.goto(`${BASE_URL}/acompanhamento`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SHOTS_DIR, '08-acompanhamento-modo-tv.png') });

    // 9. Login como Administrador da SIPAT
    console.log('[9/11] Efetuando login como Administrador SIPAT...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.type('input[type="text"], input[name="identifier"], input[placeholder*="E-mail"], input[type="email"]', 'admin.sipat@senai.br');
    await page.type('input[type="password"]', 'Sipat@Senai2026!ChangeMe');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2500));
    await page.screenshot({ path: path.join(SHOTS_DIR, '09-admin-painel-geral.png') });

    // 10. Central de Evidências da CIPA
    console.log('[10/11] Capturando Central de Avaliação de Evidências (CIPA)...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const evTab = tabs.find((t) => t.textContent && (t.textContent.includes('Evidências') || t.textContent.includes('Avaliação')));
      if (evTab) evTab.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SHOTS_DIR, '10-admin-central-evidencias.png') });

    // 11. Gestão de Missões e Agendamento Automático
    console.log('[11/11] Capturando Gestão de Missões, Quizzes e QR Code de Inscrições...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const misTab = tabs.find((t) => t.textContent && (t.textContent.includes('Missões') || t.textContent.includes('Atividades')));
      if (misTab) misTab.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SHOTS_DIR, '11-admin-gestao-missoes.png') });

    console.log('\n✔ Todas as 11 telas oficiais foram capturadas com sucesso!');
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error('[ERRO NA CAPTURA]', err);
  process.exit(1);
});
