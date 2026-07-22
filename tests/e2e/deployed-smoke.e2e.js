const { chromium } = require('playwright-core');
const { findBrowserExecutable } = require('./browser');

const url = process.env.PHOTOATELIER_DEPLOY_URL || 'https://photoatelier.pages.dev/';
const executablePath = findBrowserExecutable();
let browser;

(async () => {
  browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.stack || error.message));
  page.on('console', message => { if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`); });
  page.on('requestfailed', request => pageErrors.push(`request: ${request.url()} ${request.failure()?.errorText || ''}`));
  page.on('response', response => {
    const type = response.headers()['content-type'] || '';
    if (response.url().includes('/src/') && type.includes('text/html')) pageErrors.push(`module-html: ${response.url()}`);
  });
  await page.addInitScript(() => {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('pa_v2_')) localStorage.removeItem(key);
    }
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('[data-page="system"]', { timeout: 30000 });
  await page.waitForTimeout(1500);
  if (pageErrors.length) throw new Error(`deployed page errors: ${pageErrors.join(' | ')}`);
  await page.waitForSelector('#app .page-header h1', { timeout: 30000 });
  const navCount = await page.locator('.sidebar .nav-item').count();
  if (navCount !== 8) throw new Error(`expected 8 V2 nav items, got ${navCount}`);
  if (page.url().includes('/legacy/')) throw new Error('canonical deployed entry redirected to Classic');
  await page.click('[data-page="system"]');
  await page.waitForSelector('text=V2 Canonical');
  await page.click('[data-page="post"]');
  await page.waitForSelector('#lut-source-canvas');
  await page.waitForFunction(() => ['lut-source-canvas', 'lut-preview-canvas', 'lut-target-canvas'].every(id => document.getElementById(id)?.getContext('2d').getImageData(20, 20, 1, 1).data[3] > 0));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) throw new Error('deployed V2 has horizontal overflow');
  if (pageErrors.length) throw new Error(`deployed page errors: ${pageErrors.join(' | ')}`);
  console.log(JSON.stringify({ ok: true, url: page.url(), navCount, lutCanvases: 3, horizontalOverflow: overflow }, null, 2));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await browser?.close();
});
