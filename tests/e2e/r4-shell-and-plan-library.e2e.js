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

  const demoPlans = [
    {
      id: 'plan-r4b-001',
      title: 'R4-B 方案库验证',
      input: { theme: '品牌春夏大片', style: '时尚杂志风', scene: '外滩街景', model: '测试模特', duration: '2小时' },
      lifecycleStatus: 'confirmed',
      images: []
    },
    {
      id: 'plan-r4b-002',
      title: 'R4-B 预选方案',
      input: { theme: '复古胶片人像', style: '复古胶片风', scene: '室内影棚', model: '测试模特', duration: '1小时' },
      lifecycleStatus: 'candidate',
      images: []
    }
  ];

  const demoSchedules = [
    { planId: 'plan-r4b-001', title: '品牌春夏大片', date: '2026-08-01', time: '14:00' },
    { planId: 'plan-r4b-002', title: '复古胶片人像', date: '2026-07-30', time: '10:00' }
  ];

  await page.addInitScript(({ plans, schedules }) => {
    localStorage.setItem('pa_use_local', 'true');
    localStorage.setItem('pw_token', 'local-test-token');
    localStorage.setItem('pw_user', JSON.stringify({ name: '本地用户', email: 'user@local' }));
    localStorage.setItem('pw_role', 'photographer');
    localStorage.setItem('pw_plans', JSON.stringify(plans));
    localStorage.setItem('pw_schedule', JSON.stringify(schedules));
  }, { plans: demoPlans, schedules: demoSchedules });

  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Wait for either the plan library tab or a fallback gen tab to be active.
  await page.waitForSelector('#tab-plans.active, #tab-gen.active', { timeout: 15000 });

  // R4-B: Plan Library is the default work surface.
  const plansTabActive = await page.locator('#tab-plans.active').count();
  if (plansTabActive === 0) throw new Error('Plan Library should be the default active tab');
  const navPlansActive = await page.locator('.nav-item[data-tab="plans"].active').count();
  if (navPlansActive === 0) throw new Error('Plan Library nav item should be selected');

  // R4-B: Navigation has six destinations with Lucide icons.
  await page.waitForSelector('.sidebar-nav .nav-item[data-tab="plans"]', { timeout: 5000 });
  const navLabels = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.sidebar-nav .nav-item')).map(btn => ({
      label: (btn.querySelector('.nav-label') || btn).textContent.trim(),
      hasIcon: !!btn.querySelector('svg, i[data-lucide], .lucide')
    }));
  });
  const expectedLabels = ['方案库', '新建方案', '参考图库', '拍摄日程', '设备与 LUT', '设置'];
  const actualLabels = navLabels.map(n => n.label);
  for (const label of expectedLabels) {
    if (!actualLabels.includes(label)) throw new Error(`missing nav destination: ${label}`);
  }
  const missingIcon = navLabels.find(n => !n.hasIcon);
  if (missingIcon) throw new Error(`nav item missing icon: ${missingIcon.label}`);

  // R4-B: Plan Library renders seeded plan cards.
  const cards = await page.locator('.r4-plan-card').count();
  if (cards < 2) throw new Error(`expected at least 2 plan cards, got ${cards}`);
  const firstTitle = await page.locator('.r4-plan-card__title').first().textContent();
  if (!firstTitle) throw new Error('first plan card title is empty');
  const openButtons = await page.locator('.r4-plan-card__action button').count();
  if (openButtons < 2) throw new Error('plan cards should have open buttons');

  // R4-B: New Plan is a compact brief with required fields visible and secondary collapsed.
  await page.locator('.nav-item[data-tab="gen"]').click();
  await page.waitForSelector('#tab-gen.active', { timeout: 5000 });
  await page.waitForTimeout(300);

  const briefVisible = await page.locator('#briefForm').isVisible();
  if (!briefVisible) throw new Error('New Plan brief form should be visible');
  const requiredFields = ['#f-theme', '#f-style', '#f-dur', '#f-scene', '#f-model'];
  for (const selector of requiredFields) {
    const visible = await page.locator(selector).first().isVisible();
    if (!visible) throw new Error(`required field should be visible: ${selector}`);
  }
  const advancedOpen = await page.locator('details.brief-advanced').evaluate(el => el.open);
  if (advancedOpen) throw new Error('secondary constraints should be collapsed by default');

  // R4-B: Equipment and LUT are combined under one destination.
  await page.locator('.nav-item[data-tab="venue"]').click();
  await page.waitForSelector('#tab-venue.active', { timeout: 5000 });
  await page.waitForTimeout(300);
  const venueTabActive = await page.locator('#tab-venue.active').count();
  if (venueTabActive === 0) throw new Error('Equipment & LUT destination should activate venue tab');
  const lutTabActive = await page.locator('#tab-lut.active').count();
  if (lutTabActive === 0) throw new Error('Equipment & LUT destination should also activate lut tab');

  // No old standalone LUT nav item remains.
  const lutNav = await page.locator('.sidebar-nav .nav-item[data-tab="lut"]').count();
  if (lutNav > 0) throw new Error('standalone LUT nav item should be removed');

  // R4-B: Feedback button is a quiet secondary command.
  const feedback = await page.locator('.pa-beta-feedback-trigger, button.pa-beta-feedback-trigger').first();
  const feedbackBox = await feedback.boundingBox();
  if (!feedbackBox) throw new Error('feedback trigger not found');
  if (feedbackBox.width > 180) throw new Error(`feedback trigger too prominent: width ${feedbackBox.width}`);

  // Screenshots at 1440px.
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.waitForTimeout(300);

  await page.locator('.nav-item[data-tab="plans"]').click();
  await page.waitForSelector('#tab-plans.active', { timeout: 5000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(evidenceDir, 'r4-plan-library-1440.png'), fullPage: false });

  await page.locator('.nav-item[data-tab="gen"]').click();
  await page.waitForSelector('#tab-gen.active', { timeout: 5000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(evidenceDir, 'r4-new-plan-1440.png'), fullPage: false });

  // Responsive checks: 1024px.
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(300);
  const overflow1024 = await page.evaluate(() => {
    const shell = document.querySelector('.main-content') || document.body;
    return shell.scrollWidth > shell.clientWidth;
  });
  if (overflow1024) throw new Error('horizontal overflow detected at 1024px viewport');

  // Responsive checks: 390px.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const overflow390 = await page.evaluate(() => {
    const shell = document.querySelector('.main-content') || document.body;
    return shell.scrollWidth > shell.clientWidth;
  });
  if (overflow390) throw new Error('horizontal overflow detected at 390px viewport');

  if (pageErrors.length) throw new Error(`page errors detected: ${pageErrors.join('; ')}`);

  console.log('r4-shell-and-plan-library e2e passed');
  console.log('evidence:', evidenceDir);
}

(async () => {
  if (!await isReachable(url)) {
    children.push(spawn('python', ['-m', 'http.server', '8123', '--directory', '.'], { cwd: process.cwd(), windowsHide: true }));
  }
  await waitFor(url);
  browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
  await runChecks(page);
})().catch(async error => {
  console.error('E2E FAILED:', error.stack || error.message);
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  children.forEach(child => child.kill());
});
