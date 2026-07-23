const { chromium } = require('playwright-core');
const { findBrowserExecutable } = require('./browser');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const url = process.env.PHOTOATELIER_LEGACY_URL || 'http://127.0.0.1:8123/legacy/';
const executablePath = findBrowserExecutable();
const evidenceDir = path.join(__dirname, 'evidence');
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
  await page.locator('.nav-item[data-tab="gen"]').click();
  await page.waitForSelector('#tab-gen.active', { timeout: 15000 });

  // Generate a plan so the Active Plan workspace renders.
  await page.fill('#f-theme', 'R4-C Active Plan verification');
  await page.selectOption('#f-style', { label: '复古胶片风' }).catch(async () => page.selectOption('#f-style', { index: 1 }));
  await page.fill('#f-scene', '室内影棚');
  await page.fill('#f-model', '测试模特');
  await page.click('#genBtn');
  await page.waitForSelector('.r4-active-plan', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Desktop Active Plan structure.
  const layout = await page.evaluate(() => {
    const root = document.querySelector('.r4-active-plan');
    if (!root) return null;
    const referenceTiles = Array.from(root.querySelectorAll('.r4-reference-tile__type'));
    return {
      hasHeader: !!root.querySelector('.r4-plan-header'),
      hasReferencePanel: !!root.querySelector('.r4-reference-panel'),
      hasShotWorkspace: !!root.querySelector('.r4-shot-workspace'),
      hasShotList: !!root.querySelector('.r4-shot-list'),
      shotRows: root.querySelectorAll('.r4-shot-row').length,
      hasLegacyDocument: !!root.querySelector('.r4-legacy-document'),
      hasLifecyclePanel: !!root.querySelector('.workflow-loop'),
      referenceConcepts: referenceTiles.filter(el => el.classList.contains('is-concept')).length
    };
  });
  if (!layout) throw new Error('.r4-active-plan was not rendered');
  if (!layout.hasHeader) throw new Error('missing active plan header');
  if (await page.locator('.r4-active-plan .r4-plan-nav').count()) throw new Error('active plan must not duplicate the global navigation');
  if (!layout.hasReferencePanel) throw new Error('missing reference column');
  if (!layout.hasShotWorkspace) throw new Error('missing shot workspace');
  if (!layout.hasShotList) throw new Error('missing shot list');
  if (layout.shotRows === 0) throw new Error('no shot rows rendered');
  if (!layout.hasLegacyDocument) throw new Error('R3 方案资源 archive is not recoverable');
  if (!layout.hasLifecyclePanel) throw new Error('execution/lifecycle tools are missing');
  if (layout.referenceConcepts > 0) {
    console.log(`note: ${layout.referenceConcepts} reference tile(s) are explicitly labeled as AI concept`);
  }
  const desktopOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  if (desktopOverflow) throw new Error('horizontal overflow detected at 1440px viewport');

  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, 'r4-active-plan-shot-list.png'), fullPage: false });

  // Open the first shot detail.
  await page.click('.r4-shot-row[data-shot-index="0"]');
  await page.waitForTimeout(500);
  const detail = await page.evaluate(() => {
    const container = document.querySelector('.r4-shot-detail-section:not(.is-hidden)');
    if (!container) return null;
    return {
      hasHeader: !!container.querySelector('.r4-shot-detail__header'),
      hasFields: !!container.querySelector('.r4-shot-detail__fields'),
      hasCompleteAction: !!container.querySelector('.r4-shot-detail__complete')
    };
  });
  if (!detail) throw new Error('shot detail did not open');
  if (!detail.hasHeader) throw new Error('shot detail header missing');
  if (!detail.hasFields) throw new Error('shot detail fields missing');
  if (!detail.hasCompleteAction) throw new Error('shot complete action missing');
  const detailElement = await page.$('.r4-shot-detail-section:not(.is-hidden)');
  if (detailElement) {
    await detailElement.screenshot({ path: path.join(evidenceDir, 'r4-active-plan-shot-detail.png') });
  } else {
    await page.screenshot({ path: path.join(evidenceDir, 'r4-active-plan-shot-detail.png'), fullPage: false });
  }

  // Mobile field mode: no horizontal overflow.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => {
    const shell = document.querySelector('.r4-active-plan') || document.body;
    return shell.scrollWidth > shell.clientWidth;
  });
  if (overflow) throw new Error('horizontal overflow detected at 390px viewport');
  await page.evaluate(() => {
    const plan = JSON.parse(localStorage.getItem('pw_plans') || '[]')[0];
    if (plan) window.openOnSetMode(plan.id);
  });
  await page.waitForSelector('#r4-mobile-workspace .r4-field-mode', { timeout: 5000 });
  await page.screenshot({ path: path.join(evidenceDir, 'r4-integrated-mobile-field.png'), fullPage: false });
  const mobileOverflow = await page.evaluate(() => {
    const surface = document.querySelector('#r4-mobile-workspace .r4-field-mode');
    return !!surface && surface.scrollWidth > surface.clientWidth;
  });
  if (mobileOverflow) throw new Error('integrated mobile field mode has horizontal overflow');
  await page.evaluate(() => window.closeR4MobileWorkspace?.());

  if (pageErrors.length) throw new Error(`page errors detected: ${pageErrors.join('; ')}`);

  console.log('r4-active-plan e2e passed');
  console.log('evidence:', evidenceDir);
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
