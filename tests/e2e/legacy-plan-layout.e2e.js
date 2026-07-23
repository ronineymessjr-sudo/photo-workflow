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

(async () => {
  if (!await isReachable(url)) {
    children.push(spawn('python', ['-m', 'http.server', '8123', '--directory', '.'], { cwd: process.cwd(), windowsHide: true }));
  }
  await waitFor(url);
  browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
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

  // P0.1: plan output panel (library/current plan area) appears before brief form in DOM/page flow
  const orderCorrect = await page.evaluate(() => {
    const output = document.querySelector('.plan-output-panel');
    const brief = document.querySelector('.plan-brief-panel');
    if (!output || !brief) return false;
    return !!(output.compareDocumentPosition(brief) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  if (!orderCorrect) throw new Error('plan output panel should appear before brief panel in page flow');

  // Fill brief and generate a candidate plan
  await page.fill('#f-theme', 'P0 layout verification test');
  await page.selectOption('#f-style', { label: '复古胶片风' }).catch(async () => page.selectOption('#f-style', { index: 1 }));
  await page.fill('#f-scene', '室内影棚');
  await page.fill('#f-model', '测试模特');
  await page.click('#genBtn');
  await page.waitForSelector('.plan-output-wrapper', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // P0.2: complete storyboard / shot list is the first expanded result
  const firstOpenDetails = page.locator('.plan-output-wrapper .plan-detail-toggle[open]').first();
  await firstOpenDetails.waitFor({ state: 'visible', timeout: 15000 });
  const firstSummary = await firstOpenDetails.locator('> summary').textContent();
  if (!firstSummary.includes('分镜') && !firstSummary.includes('storyboard')) {
    throw new Error(`expected first expanded result to be storyboard/shot list, got: ${firstSummary}`);
  }

  // P0.4: shooting control area is lower and collapsed by default
  const blueprintToggle = page.locator('.plan-output-wrapper .plan-primary-toggle').filter({ has: page.locator('strong:has-text("拍摄总控")') });
  if (await blueprintToggle.count() !== 1) throw new Error('shooting control toggle not found');
  const isBlueprintOpen = await blueprintToggle.evaluate(el => el.open);
  if (isBlueprintOpen) throw new Error('shooting control should be collapsed by default');

  // P0.5: standalone main visual / pose variations areas are hidden
  const mainVisualButton = await page.locator('#action-gen-img-btn').count();
  if (mainVisualButton > 0) throw new Error('standalone main visual generation button should be hidden');
  const imageGallery = await page.locator('.img-gallery').count();
  if (imageGallery > 0) throw new Error('standalone image gallery should be hidden');

  // P0.6: creative direction and styling/props appear after storyboard
  const storyboardBox = await firstOpenDetails.boundingBox();
  const creativeToggle = await page.locator('.plan-output-wrapper .plan-detail-toggle').filter({ hasText: '创意方向、妆造与道具细节' }).first();
  const creativeBox = await creativeToggle.boundingBox();
  if (!storyboardBox || !creativeBox) throw new Error('storyboard or creative direction section not found');
  if (creativeBox.y <= storyboardBox.y) throw new Error('creative direction should appear after storyboard');

  // P0.3: shot controls are present and work
  const addBtn = await page.locator('button', { hasText: '添加镜头' }).count();
  const reorderBtn = await page.locator('button', { hasText: '调整顺序' }).count();
  const conciseBtn = await page.locator('button', { hasText: '简洁视图' }).count();
  if (addBtn === 0 || reorderBtn === 0 || conciseBtn === 0) throw new Error('shot controls missing');

  // Toggle concise view and verify class change
  await page.locator('button', { hasText: '简洁视图' }).click();
  const wrapperHasConcise = await page.locator('.plan-output-wrapper.is-concise').count();
  if (wrapperHasConcise === 0) throw new Error('concise view toggle did not add is-concise class');

  if (pageErrors.length) throw new Error(`page errors detected: ${pageErrors.join('; ')}`);

  console.log('legacy-plan-layout e2e passed');
})().catch(async error => {
  console.error('E2E FAILED:', error.stack || error.message);
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  children.forEach(child => child.kill());
});
