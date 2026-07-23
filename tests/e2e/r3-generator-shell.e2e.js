const { chromium } = require('playwright-core');
const { findBrowserExecutable } = require('./browser');
const { spawn } = require('node:child_process');

const url = process.env.PHOTOATELIER_LEGACY_URL || 'http://127.0.0.1:8123/legacy/';
const executablePath = findBrowserExecutable();
const children = [];
let browser;

async function isReachable(target) {
  try { return (await fetch(target)).ok; } catch (_) { return false; }
}

async function waitFor(target) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await isReachable(target)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`server not reachable: ${target}`);
}

async function runChecks(page) {
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.stack || error.message);
    console.error('PAGE ERROR:', error.stack || error.message);
  });

  await page.addInitScript(() => {
    localStorage.setItem('pa_use_local', 'true');
    localStorage.setItem('pw_token', 'local-test-token');
    localStorage.setItem('pw_user', JSON.stringify({ name: '本地用户', email: 'user@local' }));
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#tab-gen.active', { timeout: 15000 });

  // R3-A: proposal entry is the first meaningful plan content
  const briefPanelFirst = await page.evaluate(() => {
    const brief = document.querySelector('.plan-brief-panel');
    const output = document.querySelector('.plan-output-panel');
    if (!brief) return false;
    if (!output) return true; // brief exists and no output yet is acceptable
    return !!(brief.compareDocumentPosition(output) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  if (!briefPanelFirst) throw new Error('plan-brief-panel should be the first meaningful plan content');

  // R3-A: compact hero title and intro
  const heroTitle = await page.locator('.plan-brief-panel h2, .plan-brief-panel h3, .plan-brief-panel .hero-title').first().textContent().catch(() => '');
  if (!heroTitle.includes('快速建立拍摄提案') && !heroTitle.includes('Quickly create')) {
    throw new Error(`expected compact proposal title, got: ${heroTitle}`);
  }

  const forbiddenLabels = ['风格+场景', '风格+道具', '场景+焦距', '参考专辑', '道具推荐'];
  const visibleForbidden = await page.evaluate(forbidden => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const found = [];
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.trim();
      for (const label of forbidden) {
        if (text.includes(label)) {
          const rect = node.parentElement ? node.parentElement.getBoundingClientRect() : null;
          if (rect && rect.width > 0 && rect.height > 0) {
            found.push(label);
          }
        }
      }
    }
    return [...new Set(found)];
  }, forbiddenLabels);
  if (visibleForbidden.length) throw new Error(`forbidden labels still visible: ${visibleForbidden.join(', ')}`);

  // R3-A/R3-D integration: context action and the real plan-resource detail exist
  await page.fill('#f-theme', 'R3 generator shell verification');
  await page.selectOption('#f-style', { label: '复古胶片风' }).catch(async () => page.selectOption('#f-style', { index: 1 }));
  await page.fill('#f-scene', '室内影棚');
  await page.fill('#f-model', '测试模特');
  await page.click('#genBtn');
  await page.waitForSelector('.plan-output-wrapper', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const mountPoints = await page.evaluate(() => {
    const r3b = document.querySelector('.r3b-context-mount');
    const r3d = document.querySelector('.plan-resources');
    return { r3b: !!r3b, r3d: !!r3d };
  });
  if (!mountPoints.r3b) throw new Error('R3-B context mount point missing');
  if (!mountPoints.r3d) throw new Error('R3-D plan resources detail missing');

  // R3-A: no old direct platform source buttons remain in the generator result area
  const oldPlatformButtons = await page.evaluate(() => {
    const labels = ['花瓣网', '站酷', '小红书', 'Pinterest', 'Unsplash'];
    const output = document.querySelector('.plan-output-wrapper');
    if (!output) return 0;
    const buttons = Array.from(output.querySelectorAll('button, a'));
    return buttons.filter(btn => labels.some(l => (btn.textContent || '').includes(l))).length;
  });
  if (oldPlatformButtons > 0) throw new Error('old direct platform buttons should be removed from generator result area');

  // R3-A: mobile 390px has no horizontal overflow
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => {
    const shell = document.querySelector('.plan-shell') || document.body;
    return shell.scrollWidth > shell.clientWidth;
  });
  if (overflow) throw new Error('horizontal overflow detected at 390px viewport');

  if (pageErrors.length) throw new Error(`page errors detected: ${pageErrors.join('; ')}`);

  console.log('r3-generator-shell e2e passed');
}

(async () => {
  if (!await isReachable(url)) {
    children.push(spawn('python', ['-m', 'http.server', '8123', '--directory', '.'], { cwd: process.cwd(), windowsHide: true }));
  }
  await waitFor(url);
  browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await runChecks(page);
})().catch(async error => {
  console.error('E2E FAILED:', error.stack || error.message);
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  children.forEach(child => child.kill());
});
