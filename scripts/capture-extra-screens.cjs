const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const SHOTS_DIR = path.resolve('public/manual-prints');

async function captureExtra() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1366,768'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  try {
    // 1. Log in as student Carlos Eduardo (Logística) and open Quiz Runner
    console.log('Capturando Tela do Quiz Runner Interativo...');
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'carlos.mendes@aluno.senai.br',
        password: 'Aluno@Senai2026',
      }),
    });
    const { token, user } = await loginRes.json();

    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok, usr) => {
      localStorage.setItem('sipat_token', tok);
      localStorage.setItem('sipat_user', JSON.stringify(usr));
    }, token, user);

    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    // Clica no primeiro botão de quiz disponível
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const qBtn = btns.find((b) => b.textContent && (b.textContent.includes('Quiz') || b.textContent.includes('Responder')));
      if (qBtn) qBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SHOTS_DIR, '05b-quiz-runner-interativo.png') });
    console.log('✔ Quiz Runner capturado!');

    // 2. Log in as Evaluator and open Evaluation Review Box
    console.log('Capturando Modal de Avaliação Detalhada da CIPA...');
    const evalLoginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'avaliador.sipat@senai.br',
        password: 'Avalia@Senai2026!ChangeMe',
      }),
    });
    const evalData = await evalLoginRes.json();

    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok, usr) => {
      localStorage.setItem('sipat_token', tok);
      localStorage.setItem('sipat_user', JSON.stringify(usr));
    }, evalData.token, evalData.user);

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    // Clica na aba de Evidências
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const evTab = tabs.find((t) => t.textContent && (t.textContent.includes('Evidências') || t.textContent.includes('Avaliação')));
      if (evTab) evTab.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    // Clica no primeiro card de evidência para abrir o detalhe de julgamento
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div, button'));
      const card = cards.find((c) => c.textContent && (c.textContent.includes('Avaliar Evidência') || c.textContent.includes('Pendente')));
      if (card) card.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SHOTS_DIR, '10b-admin-modal-avaliacao.png') });
    console.log('✔ Modal de Avaliação da CIPA capturado!');

  } finally {
    await browser.close();
  }
}

captureExtra().catch((e) => {
  console.error('[ERRO CAPTURA EXTRA]', e);
  process.exit(1);
});
