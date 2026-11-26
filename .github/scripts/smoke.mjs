import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];

page.on('pageerror', e => errors.push('JS xətası: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('Console: ' + m.text()); });

await page.goto(pathToFileURL(resolve('index.html')).href);
await page.waitForTimeout(5000); // oyun 5 saniyə işləsin

await browser.close();

if (errors.length) {
  console.error('Oyunda xəta tapıldı:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('Oyun xətasız açıldı ✔');
