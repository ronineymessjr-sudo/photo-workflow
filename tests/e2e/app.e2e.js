const { chromium } = require('playwright-core');
const { findBrowserExecutable } = require('./browser');
const { spawn } = require('node:child_process');

const url = process.argv[2] || process.env.PHOTOATELIER_URL || 'http://127.0.0.1:8123/';
const executablePath = findBrowserExecutable();

async function reachable(target) {
  try { return (await fetch(target)).ok; } catch (_) { return false; }
}

async function waitFor(target) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await reachable(target)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Server not reachable: ${target}`);
}

let server = null;
let browser = null;

(async () => {
  if (!await reachable(url)) {
    server = spawn('python', ['-m', 'http.server', '8123', '--directory', '.'], { cwd: process.cwd(), windowsHide: true });
  }
  await waitFor(url);

  browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(20000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('pa_v2_')) localStorage.removeItem(key);
    }
  });

  console.log(`Opening ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const navCount = await page.locator('.sidebar .nav-item').count();
  if (navCount !== 8) throw new Error(`Expected 8 nav items, got ${navCount}`);

  console.log('Creating project');
  await page.click('#new-project-btn');
  await page.fill('#project-form [name="title"]', 'E2E 城市夜景人像');
  await page.fill('#project-form [name="shootingType"]', '人像');
  await page.fill('#project-form [name="location"]', '上海街区');
  await page.fill('#project-form [name="style"]', '电影感');
  await page.fill('#project-form [name="brief"]', '夜景、霓虹、自然动作');
  await page.click('#project-form button.primary');
  await page.waitForFunction(() => document.querySelector('#project-select')?.value !== 'legacy-default-project');

  console.log('Adding reference');
  await page.click('[data-page="references"]');
  await page.fill('#reference-form [name="title"]', '霓虹侧光参考');
  await page.selectOption('#reference-form [name="sourcePlatform"]', 'Pexels');
  await page.fill('#reference-form [name="sourceUrl"]', 'https://www.pexels.com/photo/1');
  await page.click('#reference-form button.primary');
  await page.waitForFunction(() => {
    const records = JSON.parse(localStorage.getItem('pa_v2_references') || '[]');
    return records.some(item => item.title === '霓虹侧光参考');
  });
  await page.waitForSelector('text=霓虹侧光参考');

  console.log('Generating plan');
  await page.click('[data-page="plan"]');
  await page.click('#generate-plan-btn');
  await page.waitForSelector('#approve-plan-btn');
  await page.waitForSelector('.shot-row');
  const draftShotCount = await page.locator('.shot-row').count();
  const formalBeforeApproval = await page.evaluate(() => JSON.parse(localStorage.getItem('pa_v2_shots') || '[]').length);
  if (draftShotCount < 3) throw new Error(`Expected at least 3 draft shots, got ${draftShotCount}`);
  if (formalBeforeApproval !== 0) throw new Error(`Draft created ${formalBeforeApproval} formal shots before approval`);

  console.log('Approving plan');
  await page.click('#approve-plan-btn');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('pa_v2_shots') || '[]').length >= 3);
  const shotCount = await page.evaluate(() => JSON.parse(localStorage.getItem('pa_v2_shots') || '[]').length);
  const lutCount = await page.evaluate(() => JSON.parse(localStorage.getItem('pa_v2_luts') || '[]').length);
  if (lutCount !== 1) throw new Error(`Expected 1 approved LUT, got ${lutCount}`);

  console.log('Confirming candidate plan');
  await page.click('#confirm-plan-btn');
  await page.waitForFunction(() => {
    const plans = JSON.parse(localStorage.getItem('pa_v2_plans') || '[]');
    return plans.some(item => item.planStatus === 'confirmed');
  });

  console.log('Preparing team and role workspace');
  await page.click('[data-page="crew"]');
  await page.fill('#person-form [name="name"]', '测试模特');
  await page.selectOption('#person-form [name="role"]', 'model');
  await page.selectOption('#person-form [name="consentStatus"]', 'signed');
  await page.fill('#person-form [name="wardrobe"]', '黑色西装');
  await page.click('#person-form button.primary');
  await page.fill('#equipment-form [name="name"]', 'Sony A7M4');
  await page.selectOption('#equipment-form [name="category"]', '相机');
  await page.click('#equipment-form button.primary');
  await page.fill('#project-operations-form [name="weatherBackup"]', '室内备用棚');
  await page.fill('#project-operations-form [name="deliverables"]', '20 张精修');
  await page.click('#project-operations-form button.secondary');
  await page.click('#create-assistant-checklist-btn');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('pa_v2_tasks') || '[]').some(item => item.role === 'assistant'));

  console.log('Scheduling formal plan');
  await page.click('[data-page="schedule"]');
  await page.waitForSelector('#shoot-call-form');
  await page.fill('#shoot-call-form [name="date"]', '2026-08-01');
  await page.fill('#shoot-call-form [name="time"]', '09:00');
  await page.fill('#shoot-call-form [name="endTime"]', '12:00');
  await page.click('#shoot-call-form button.primary');
  await page.waitForFunction(() => {
    const tasks = JSON.parse(localStorage.getItem('pa_v2_tasks') || '[]');
    return tasks.some(item => item.taskType === 'shoot-call');
  });
  const taskCount = await page.locator('.list-item').count();
  if (taskCount < 4) throw new Error(`Expected generated tasks and shoot call, got ${taskCount}`);

  console.log('Running onsite shot workflow');
  await page.click('#start-shooting-btn');
  for (let index = 0; index < shotCount; index += 1) {
    await page.locator('[data-shot-status="captured"]').nth(index).click();
  }
  await page.waitForFunction(() => {
    const plans = JSON.parse(localStorage.getItem('pa_v2_plans') || '[]');
    return plans.some(item => item.executionStatus === 'completed');
  });
  const shootRecordCount = await page.evaluate(() => JSON.parse(localStorage.getItem('pa_v2_shootRecords') || '[]').length);
  if (shootRecordCount !== shotCount) throw new Error(`Expected ${shotCount} shoot records, got ${shootRecordCount}`);

  console.log('Saving post-production handoff');
  await page.click('[data-page="post"]');
  await page.waitForSelector('#post-handoff-form');
  await page.fill('#post-handoff-form [name="backupPrimary"]', 'RAID/2026/E2E');
  await page.fill('#post-handoff-form [name="backupSecondary"]', 'SSD-B/E2E');
  await page.fill('#post-handoff-form [name="selectedCount"]', '36');
  await page.click('#post-handoff-form button.secondary');
  await page.click('[data-delivery-status="delivered"]');
  await page.waitForFunction(() => {
    const plans = JSON.parse(localStorage.getItem('pa_v2_plans') || '[]');
    return plans.some(item => item.deliveryStatus === 'delivered');
  });
  const canvasReady = await page.evaluate(() => [...document.querySelectorAll('.lut-preview-grid canvas')].every(canvas => canvas.width > 0 && canvas.height > 0));
  if (!canvasReady) throw new Error('LUT preview canvases were not rendered');

  console.log('Saving project review');
  await page.click('[data-page="review"]');
  await page.waitForSelector('#review-form');
  await page.fill('#review-form [name="successes"]', '侧逆光与自然动作有效');
  await page.fill('#review-form [name="reusableInsights"]', '下一次继续保留 35mm 环境建立镜头');
  await page.click('#review-form button.primary');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('pa_v2_reviews') || '[]').length === 1);

  console.log('Checking system audit');
  await page.click('[data-page="system"]');
  await page.waitForSelector('text=系统、迁移与交接');
  const auditText = await page.locator('.page-header .status-pill').textContent();
  if (!auditText.includes('数据完整')) throw new Error(`Integrity audit failed: ${auditText}`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${url}#dashboard`, { waitUntil: 'domcontentloaded' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) throw new Error('Mobile horizontal overflow detected');
  if (errors.length) throw new Error(`Page errors: ${errors.join(' | ')}`);

  console.log(JSON.stringify({ ok: true, navCount, draftShotCount, formalBeforeApproval, shotCount, shootRecordCount, taskCount, lutCount, canvasReady, mobileOverflow: overflow }, null, 2));
  await browser.close();
  server?.kill();
})().catch(error => {
  console.error(error);
  browser?.close().catch(() => {});
  server?.kill();
  process.exit(1);
});
