const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'http://localhost:5173/';
const outPath = path.resolve('scripts/test-shot.png');

console.log('Running chrome from:', chromePath);
try {
  execSync(`"${chromePath}" --headless=new --disable-gpu --no-sandbox --window-size=1280,800 --virtual-time-budget=3000 --screenshot="${outPath}" "${targetUrl}"`, { stdio: 'inherit' });
  console.log('Success! Exists:', fs.existsSync(outPath), 'Size:', fs.existsSync(outPath) ? fs.statSync(outPath).size : 0);
} catch (err) {
  console.error('Execution error:', err.message);
}
