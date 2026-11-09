const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = process.argv[2] || 'http://localhost:5173/';
const windowSize = process.argv[3] || '390,844';
const outName = process.argv[4] || 'mobile-landing.png';
const outPath = path.resolve('scripts', outName);

console.log(`Capturing ${targetUrl} at ${windowSize} -> ${outName}`);
try {
  execSync(`"${chromePath}" --headless=new --disable-gpu --no-sandbox --window-size=${windowSize} --virtual-time-budget=3000 --screenshot="${outPath}" "${targetUrl}"`, { stdio: 'inherit' });
  console.log('Success! Exists:', fs.existsSync(outPath), 'Size:', fs.existsSync(outPath) ? fs.statSync(outPath).size : 0);
} catch (err) {
  console.error('Execution error:', err.message);
}
