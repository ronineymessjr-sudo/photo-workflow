const { chromium } = require('playwright-core');
const { findBrowserExecutable } = require('./browser');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const url = process.env.PHOTOATELIER_LEGACY_URL || 'http://127.0.0.1:8123/legacy/';
const executablePath = findBrowserExecutable();
const reportDir = path.resolve('artifacts/photoatelier-test-report-2026-07-14');
const children = [];
let browser;

const scenarios = [
  { slug: 'generic-portrait', theme: '通用单人人像流程测试', style: '时尚', scene: '室内主场景与室外备选', mood: '自然、明确', extra: '覆盖全身、中景、近景和细节，交付平台待定' },
  { slug: 'generic-pair', theme: '通用双人拍摄流程测试', style: '文艺', scene: '可控自然光空间', mood: '互动、松弛', extra: '包含双人关系、单人补充和互动细节' },
  { slug: 'generic-product', theme: '通用产品内容流程测试', style: '商业', scene: '影棚产品台与使用场景', mood: '清楚、可信赖', extra: '产品标准图、人物使用图、细节和横竖构图' },
  { slug: 'generic-video', theme: '通用短片内容流程测试', style: '街拍', scene: '一个主场景与一个转场区域', mood: '连贯、自然', extra: '规划开场、主体、转场、细节和收尾，拍摄格式待确认' }
];

async function reachable(target) {
  try { return (await fetch(target)).ok; } catch (_) { return false; }
}

async function waitFor(target) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await reachable(target)) return;
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  throw new Error(`server not reachable: ${target}`);
}

async function screenshot(locator, filename) {
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({ path: path.join(reportDir, filename), animations: 'disabled' });
}

(async () => {
  fs.mkdirSync(reportDir, { recursive: true });
  if (!await reachable(url)) children.push(spawn('python', ['-m', 'http.server', '8123', '--directory', '.'], { cwd: process.cwd(), windowsHide: true }));
  if (!await reachable('http://127.0.0.1:8124/v1/health')) children.push(spawn('node', ['tools/local-obsidian-proxy.js'], { cwd: process.cwd(), windowsHide: true }));
  await Promise.all([waitFor(url), waitFor('http://127.0.0.1:8124/v1/health')]);

  browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.stack || error.message));
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('pa_use_local', 'true');
    localStorage.setItem('pw_token', 'local-test-token');
    localStorage.setItem('pw_user', JSON.stringify({ name: '本地测试', email: 'local@photoatelier' }));
    localStorage.setItem('pw_eq', JSON.stringify([
      { id: 'eq-camera', n: 'Sony A7M4', c: 'camera', note: 'S-Log3 与人像主机', imageUrl: 'assets/demo/equipment-kit.jpg' },
      { id: 'eq-lens-35', n: 'Sony 35mm f/1.4 GM', c: 'lens', note: '环境人像与夜景', imageUrl: 'assets/demo/equipment-kit.jpg' },
      { id: 'eq-lens-85', n: 'Sony 85mm f/1.8', c: 'lens', note: '特写与肤色', imageUrl: 'assets/demo/equipment-kit.jpg' },
      { id: 'eq-light', n: 'Godox AD200 Pro', c: 'light', note: '棚拍与外景补光', imageUrl: 'assets/demo/equipment-kit.jpg' },
      { id: 'eq-tripod', n: 'DJI RS 4', c: 'tripod', note: '短片稳定器', imageUrl: 'assets/demo/equipment-kit.jpg' }
    ]));
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#planLibraryPanel');
  await page.waitForFunction(() => document.querySelectorAll('#open-lut-list .open-lut-card').length === 8);
  await screenshot(page.locator('.plan-brief-panel'), '22-compact-brief.png');

  const results = [];
  for (let index = 0; index < scenarios.length; index += 1) {
    const scenario = scenarios[index];
    await page.click('.nav-item[data-tab="gen"]');
    await page.fill('#f-theme', scenario.theme);
    await page.selectOption('#f-style', scenario.style);
    await page.fill('#f-scene', scenario.scene);
    if (!await page.locator('.brief-advanced').evaluate(element => element.open)) await page.locator('.brief-advanced > summary').click();
    await page.fill('#f-mood', scenario.mood);
    await page.fill('#f-extra', scenario.extra);
    await page.click('#genBtn');
    await page.waitForSelector('.workflow-loop', { timeout: 20000 });
    const planId = await page.evaluate(() => JSON.parse(localStorage.getItem('pw_plans') || '[]')[0]?.id);
    const candidateStatus = await page.evaluate(id => JSON.parse(localStorage.getItem('pw_plans') || '[]').find(plan => String(plan.id) === String(id))?.lifecycleStatus, planId);
    if (candidateStatus !== 'candidate') throw new Error(`${scenario.theme}: generated plan did not enter candidate state`);
    if (index === 0) await screenshot(page.locator('#planLibraryPanel'), '18-candidate-plans.png');
    await page.locator('.plan-summary-card').getByRole('button', { name: '确认采用' }).click();
    await page.waitForFunction(id => JSON.parse(localStorage.getItem('pw_plans') || '[]').find(plan => String(plan.id) === String(id))?.lifecycleStatus === 'confirmed', planId);
    if (index === 0) await screenshot(page.locator('#planLibraryPanel'), '19-confirmed-plans.png');
    await page.locator('.plan-package-summary').getByRole('button', { name: '补齐拍前资料' }).click();
    await page.waitForFunction(id => JSON.parse(localStorage.getItem('pw_plans') || '[]').find(plan => String(plan.id) === String(id))?.packageStatus === 'preflight-ready', planId);
    const scheduleBeforeConfirm = await page.evaluate(id => JSON.parse(localStorage.getItem('pw_schedule') || '[]').some(item => String(item.planId) === String(id)), planId);
    if (scheduleBeforeConfirm) throw new Error(`${scenario.theme}: schedule was created before explicit confirmation`);
    await page.locator('.plan-package-summary').getByRole('button', { name: '安排拍摄' }).click();
    await page.fill('#planScheduleDate', `2030-07-${String(index + 10).padStart(2, '0')}`);
    await page.fill('#planScheduleTime', `${String(9 + index).padStart(2, '0')}:00`);
    await page.fill('#planScheduleLocation', scenario.scene);
    if (index === 0) await screenshot(page.locator('#planScheduleDialog'), '23-schedule-confirmation.png');
    await page.getByRole('button', { name: '确认并加入日程' }).click();
    await page.waitForFunction(id => JSON.parse(localStorage.getItem('pw_plans') || '[]').find(plan => String(plan.id) === String(id))?.lifecycleStatus === 'scheduled', planId);
    await page.waitForSelector('.plan-package-post-placeholder');
    await page.waitForFunction(() => Array.from(document.querySelectorAll('.plan-package-thumbnails img')).every(image => image.complete && image.naturalWidth > 0));

    const state = await page.evaluate(id => {
      const plans = JSON.parse(localStorage.getItem('pw_plans') || '[]');
      const schedules = JSON.parse(localStorage.getItem('pw_schedule') || '[]');
      const plan = plans.find(item => String(item.id) === String(id));
      const shots = window.generateShotList(plan);
      const refs = Object.values(plan.shotReferenceAssignments || {});
      return {
        id: plan.id,
        title: plan.title || plan.input?.theme,
        shots: shots.length,
        references: refs.length,
        uniqueReferences: new Set(refs).size,
        lutProfileId: plan.lutProfileId,
        postProductionStatus: plan.postProductionStatus,
        equipment: plan.resourceSelections?.equipmentIds?.length || 0,
        schedule: Boolean(schedules.find(item => String(item.planId) === String(plan.id))),
        packageStatus: plan.packageStatus,
        lifecycleStatus: plan.lifecycleStatus
      };
    }, planId);
    if (state.shots < 6) throw new Error(`${scenario.theme}: expected at least 6 shots`);
    if (state.references !== state.shots || state.uniqueReferences !== state.references) throw new Error(`${scenario.theme}: references were missing or repeated`);
    if (state.lutProfileId) throw new Error(`${scenario.theme}: a creative LUT was selected without user or specialist approval`);
    if (!state.schedule || state.packageStatus !== 'preflight-ready' || state.lifecycleStatus !== 'scheduled' || state.postProductionStatus !== 'specialist-required') throw new Error(`${scenario.theme}: incomplete scheduled handoff`);
    if (await page.locator('.plan-package-card').count() < 5) throw new Error(`${scenario.theme}: package summary missing sections`);
    const filename = `${String(index + 1).padStart(2, '0')}-${scenario.slug}-package.png`;
    await screenshot(page.locator('.plan-package-summary'), filename);
    if (index === 0) {
      await screenshot(page.locator('#planLibraryPanel'), '20-scheduled-plans.png');
      await screenshot(page.locator('.plan-summary-card'), '14-working-plan-header.png');
      await screenshot(page.locator(`#plan-outline-${planId}`), '15-plan-outline.png');
      await screenshot(page.locator(`#plan-shots-${planId}`), '16-shot-execution.png');
      await page.locator('.workflow-extended-details').evaluate(element => { element.open = true; });
      await screenshot(page.locator(`#plan-post-${planId}`), '17-post-handoff.png');
    }
    results.push({ ...state, screenshot: filename });
  }

  await screenshot(page.locator('.production-map'), '05-production-workflow.png');
  await page.locator('.workflow-extended-details').evaluate(element => { element.open = true; });
  await screenshot(page.locator('.shot-reference-board'), '06-shot-reference-board.png');
  await screenshot(page.locator('#planLibraryPanel'), '07-plan-library.png');
  if (await page.locator('#planLibraryList .plan-library-card').count() < scenarios.length) throw new Error('plan library did not retain all generated plans');

  await page.click('.nav-item[data-tab="lut"]');
  await page.waitForSelector('#tab-lut.active');
  await page.waitForFunction(() => ['lut-library-original', 'lut-library-output', 'lut-library-reference'].every(id => document.getElementById(id)?.getContext('2d').getImageData(20, 20, 1, 1).data[3] > 0));
  await screenshot(page.locator('#tab-lut section.panel').first(), '08-lut-real-preview.png');
  await page.selectOption('#open-lut-input', 'sony-slog3-sgamut3cine');
  await page.waitForFunction(() => document.querySelector('#lut-transform-list')?.textContent.includes('Sony S-Log3 对应的是技术还原流程'));
  await screenshot(page.locator('#tab-lut section.panel').nth(1), '09-sony-slog3-workflow.png');

  await page.click('.nav-item[data-tab="venue"]');
  await page.waitForSelector('#resource-eq.active');
  await screenshot(page.locator('#resource-eq'), '10-equipment-library.png');

  await page.click('.nav-item[data-tab="calendar"]');
  await page.waitForSelector('#scheduleWorkflowBoard .schedule-board__card');
  await page.evaluate(() => window.selectCalendarDate('2030-07-10'));
  await screenshot(page.locator('#tab-calendar > div > .panel').nth(1), '21-calendar-navigation.png');
  await screenshot(page.locator('#scheduleWorkflowBoard'), '11-shooting-schedule.png');

  await page.click('.nav-item[data-tab="settings"]');
  await page.waitForSelector('#settingsWorkflowDefaults');
  await screenshot(page.locator('#settingsWorkflowDefaults'), '12-workflow-settings.png');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.showTab('gen'));
  await page.evaluate(() => window.scrollTo(0, 0));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) throw new Error('390px viewport has horizontal overflow');
  await page.screenshot({ path: path.join(reportDir, '13-mobile-plan.png'), fullPage: false, animations: 'disabled' });

  if (pageErrors.length) throw new Error(`page errors: ${pageErrors.join(' | ')}`);
  const report = `# PhotoAtelier 通用工作流验收报告\n\n生成时间：${new Date().toISOString()}\n\n这些输入只用于验证通用工作流，不代表产品内置题材模板或专项后期方案。\n\n## 结果\n\n${results.map((result, index) => `### ${index + 1}. ${result.title}\n\n- 镜头：${result.shots}\n- 参考图：${result.references}，不重复 ${result.uniqueReferences}\n- 后期状态：${result.postProductionStatus}\n- 自动选择创意 LUT：${result.lutProfileId ? '错误' : '否'}\n- 已选设备：${result.equipment}\n- 日程关联：${result.schedule ? '通过' : '失败'}\n- 方案状态：${result.lifecycleStatus}\n- 拍前资料状态：${result.packageStatus}\n\n![${result.title}](./${result.screenshot})`).join('\n\n')}\n\n## 三段式方案状态\n\n![预选方案](./18-candidate-plans.png)\n\n![正式方案库](./19-confirmed-plans.png)\n\n![已排期方案](./20-scheduled-plans.png)\n\n## 新交互\n\n![精简 Brief](./22-compact-brief.png)\n\n![确认拍摄日程](./23-schedule-confirmation.png)\n\n![跨月日历与所选日期](./21-calendar-navigation.png)\n\n## 方案正文截图\n\n![工作稿标题和摘要](./14-working-plan-header.png)\n\n![拍摄要点](./15-plan-outline.png)\n\n![镜头执行](./16-shot-execution.png)\n\n![后期交接](./17-post-handoff.png)\n\n## 功能截图\n\n![完整摄影流程](./05-production-workflow.png)\n\n![镜头参考板](./06-shot-reference-board.png)\n\n![方案库](./07-plan-library.png)\n\n![LUT 真实预览](./08-lut-real-preview.png)\n\n![Sony S-Log3 工作流](./09-sony-slog3-workflow.png)\n\n![设备库](./10-equipment-library.png)\n\n![拍摄日程](./11-shooting-schedule.png)\n\n![设置](./12-workflow-settings.png)\n\n![390px 手机视图](./13-mobile-plan.png)\n`;
  fs.writeFileSync(path.join(reportDir, 'README.md'), report, 'utf8');
  fs.writeFileSync(path.join(reportDir, 'results.json'), JSON.stringify({ ok: true, results, mobileOverflow: overflow, pageErrors }, null, 2));
  console.log(JSON.stringify({ ok: true, scenarios: results.length, results, mobileOverflow: overflow, reportDir }, null, 2));

  await browser.close(); browser = null;
  children.forEach(child => child.kill());
})().catch(async error => {
  console.error(error);
  if (browser) await browser.close().catch(() => {});
  children.forEach(child => child.kill());
  process.exitCode = 1;
});
