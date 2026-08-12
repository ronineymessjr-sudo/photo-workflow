const { chromium } = require('playwright-core');
const { findBrowserExecutable } = require('./browser');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

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

function shotFolder() {
  const folder = path.join(process.cwd(), 'artifacts', 'r4-d');
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

(async () => {
  if (!await isReachable(url)) {
    children.push(spawn('python', ['-m', 'http.server', '8123', '--directory', '.'], { cwd: process.cwd(), windowsHide: true }));
  }
  await waitFor(url);
  browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1024 }, colorScheme: 'dark' });
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
  await page.waitForSelector('#tab-gen.active');
  await page.waitForFunction(() => window.PhotoAtelierV5?.ready === true, null, { timeout: 10000 });

  // Create a project and confirmed plan directly so reference actions have context.
  const plan = await page.evaluate(() => {
    const application = window.PhotoAtelierV5?.application;
    if (!application) throw new Error('V5 application not ready');
    const project = application.repositories.projects.create({ title: 'R4 参考详情测试' });
    const created = application.repositories.plans.create({
      projectId: project.id,
      title: 'R4 参考详情测试',
      input: { theme: 'R4 参考详情测试', model: '一位测试模特', scene: '城市街道', style: '时尚杂志风' },
      lifecycleStatus: 'confirmed',
    });
    application.repositories.shots.create({
      projectId: project.id,
      planId: created.id,
      sequence: 1,
      scene: '街道主镜头',
    });
    return { id: created.id, projectId: project.id };
  });
  if (!plan?.projectId) throw new Error('test plan was not created');
  await page.evaluate(id => { window.currentPlanId = id; }, plan.id);

  // Open reference library.
  await page.click('.nav-item[data-tab="reference"]');
  await page.waitForSelector('#tab-reference.active');
  await page.waitForFunction(() => document.querySelectorAll('#easyReferenceGallery .r4-reference-card').length > 0, null, { timeout: 15000 });

  const cards = await page.locator('#easyReferenceGallery .r4-reference-card').all();
  if (cards.length === 0) throw new Error('R4 reference grid did not render cards');

  const firstCard = cards[0];
  const firstTitle = await firstCard.locator('.r4-reference-card__title').textContent();
  const firstKind = await firstCard.locator('.r4-reference-card__kind').textContent();
  if (!firstTitle) throw new Error('R4 reference card missing title');
  if (!firstKind) throw new Error('R4 reference card missing kind label');

  // Screenshot the grid.
  const folder = shotFolder();
  await page.screenshot({ path: path.join(folder, 'r4-reference-grid.png'), fullPage: false });

  // Open detail.
  await firstCard.click();
  await page.waitForSelector('#r4ReferenceDetailModal:not([hidden])');

  // Verify three-panel layout.
  const imageZone = await page.locator('.r4-reference-detail__image-zone').count();
  const analysisPanel = await page.locator('.r4-reference-detail__panel--analysis').count();
  const linksPanel = await page.locator('.r4-reference-detail__panel--links').count();
  if (imageZone !== 1 || analysisPanel !== 1 || linksPanel !== 1) {
    throw new Error('R4 reference detail missing one of the three panels');
  }

  const detailTitle = await page.locator('#r4ReferenceDetailTitle').textContent();
  if (!detailTitle) throw new Error('R4 reference detail missing title');

  // Source section must be honest: exact source link or explicit missing description.
  const analysisText = await page.locator('#r4ReferenceDetailAnalysis').innerText();
  if (!analysisText.includes('素材与来源')) throw new Error('R4 reference detail missing source section');
  if (!analysisText.includes('来源')) throw new Error('R4 reference detail missing source field');

  // Linked projects/shots sections present.
  const linksText = await page.locator('#r4ReferenceDetailLinks').innerText();
  if (!linksText.includes('关联方案')) throw new Error('R4 reference detail missing linked projects section');
  if (!linksText.includes('关联镜头')) throw new Error('R4 reference detail missing linked shots section');

  // Primary action present.
  const primaryAction = page.locator('.r4-reference-detail__primary-action');
  if (await primaryAction.count() !== 1) throw new Error('R4 reference detail missing primary action');

  // Screenshot detail.
  await page.screenshot({ path: path.join(folder, 'r4-reference-detail.png'), fullPage: false });

  // Test image fit toggle.
  await page.click('#r4ReferenceFitCover');
  const isCover = await page.locator('#r4ReferenceDetailImageFrame').evaluate(el => el.classList.contains('is-cover'));
  if (!isCover) throw new Error('image fit cover did not apply');
  await page.click('#r4ReferenceFitContain');
  const isContain = await page.locator('#r4ReferenceDetailImageFrame').evaluate(el => !el.classList.contains('is-cover'));
  if (!isContain) throw new Error('image fit contain did not apply');

  // Test add-to-project action from detail.
  const actionText = await primaryAction.textContent();
  if (actionText.includes('加入当前方案')) {
    await primaryAction.click();
    await page.waitForFunction(() => document.querySelectorAll('#r4ReferenceDetailLinks .r4-reference-detail__linked-plan').length > 0, null, { timeout: 5000 });
  }

  // Close detail and return to grid.
  await page.click('.r4-reference-detail__close');
  const hidden = await page.locator('#r4ReferenceDetailModal').evaluate(el => el.hidden);
  if (!hidden) throw new Error('R4 reference detail did not close');

  // Verify no horizontal overflow at desktop and mobile widths while on the reference tab.
  for (const size of [{ width: 1440, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    await page.waitForFunction(() => document.documentElement.scrollWidth > 0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    if (overflow) throw new Error(`horizontal overflow at ${size.width}x${size.height}`);
  }

  if (pageErrors.length) throw new Error(`page errors: ${pageErrors.join(' | ')}`);
  console.log(JSON.stringify({ ok: true, cards: cards.length, firstTitle, firstKind, detailTitle }, null, 2));
  await browser.close();
  browser = null;
  children.forEach(child => child.kill());
})().catch(async error => {
  console.error(error);
  if (browser) await browser.close().catch(() => {});
  children.forEach(child => child.kill());
  process.exitCode = 1;
});
