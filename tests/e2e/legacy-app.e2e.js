const { chromium } = require('playwright-core');
const { findBrowserExecutable } = require('./browser');
const { spawn } = require('node:child_process');
const fs = require('node:fs');

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
    const target = new URL(url);
    const localServer = spawn(process.execPath, ['-e', `
      const http = require('http');
      const fs = require('fs');
      const path = require('path');
      const root = process.cwd();
      http.createServer((req, res) => {
        const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
        const relative = pathname === '/'
          ? 'legacy/index.html'
          : pathname.replace(/^\\/+/, '').replace(/\\/+$/, '') + (pathname.endsWith('/') ? '/index.html' : '');
        const filePath = path.resolve(root, relative);
        if (!filePath.startsWith(root)) { res.writeHead(403); res.end('Forbidden'); return; }
        fs.readFile(filePath, (error, data) => {
          if (error) { res.writeHead(404); res.end('Not found'); return; }
          const type = {
            '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
            '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.cube': 'text/plain'
          }[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': type }); res.end(data);
        });
      }).listen(Number(${JSON.stringify(target.port || '80')}), ${JSON.stringify(target.hostname)});
    `], { cwd: process.cwd(), windowsHide: true });
    localServer.stderr.on('data', data => console.error('LOCAL SERVER:', data.toString()));
    children.push(localServer);
  }
  const obsidianProxyPort = Number(process.env.PHOTOATELIER_OBSIDIAN_PROXY_PORT || 8124);
  if (!await isReachable(`http://127.0.0.1:${obsidianProxyPort}/v1/health`)) {
    children.push(spawn('node', ['tools/local-obsidian-proxy.js'], { cwd: process.cwd(), windowsHide: true, env: { ...process.env, PHOTOATELIER_OBSIDIAN_PROXY_PORT: String(obsidianProxyPort) } }));
  }
  await Promise.all([waitFor(url), waitFor(`http://127.0.0.1:${obsidianProxyPort}/v1/health`)]);
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
    localStorage.setItem('pw_role', 'photographer');
    localStorage.setItem('pw_eq', JSON.stringify([
      { id: 'eq-camera', n: 'Sony A7M4', c: 'camera', note: '夜景主力机' },
      { id: 'eq-lens', n: 'Sony 35mm f/1.4 GM', c: 'lens', note: '环境人像' },
      { id: 'eq-light', n: 'Godox AD200 Pro', c: 'light', note: '夜景便携补光' }
    ]));
    localStorage.setItem('pw_venues', JSON.stringify([{ id: 'venue-night', name: '霓虹街区', styles: '夜景,街拍,电影感', addr: '本地测试场地' }]));
    localStorage.setItem('pw_models', JSON.stringify([{ id: 'model-one', name: '测试模特', tags: '冷感,街拍', styles: '电影感,时尚' }]));
    localStorage.setItem('pa_obsidian_enabled', 'true');
    localStorage.setItem('pa_obsidian_url', 'http://127.0.0.1:8124');
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.locator('.nav-item[data-tab="gen"]').click();
  await page.waitForSelector('#tab-gen.active');
  const navCount = await page.locator('.sidebar .nav-item').count();
  if (navCount !== 6) throw new Error(`expected 6 primary nav items, got ${navCount}`);
  const navLabels = await page.locator('.sidebar .nav-label').allTextContents();
  for (const label of ['方案库', '新建方案', '参考图库', '拍摄日程', '拍摄资源', '设置']) {
    if (!navLabels.includes(label)) throw new Error(`missing primary nav: ${label}`);
  }
  if (navLabels.includes('消息看板') || navLabels.includes('历史记录')) throw new Error('message/history should not remain primary navigation');
  await page.locator('.plan-quick-template', { hasText: '产品内容' }).click();
  if (await page.inputValue('#f-style') !== '商业' || !(await page.inputValue('#f-extra')).includes('产品标准图')) throw new Error('generic quick template did not fill the brief');
  if (await page.inputValue('#f-theme') !== '产品内容拍摄') throw new Error('generic quick template did not set a visible default theme');
  if (!(await page.locator('#planTemplatePreview').innerText()).includes('已载入：产品内容')) throw new Error('generic quick template feedback was not visible');
  if (!(await page.locator('#outEmpty').innerText()).includes('产品内容模板已载入')) throw new Error('working plan did not reflect the loaded template');
  if (await page.locator('#genBtn').innerText() !== '生成产品内容预选方案') throw new Error('generate action did not identify the loaded template');
  if (await page.locator('#genBtn').isEnabled()) throw new Error('incomplete brief should not be eligible for plan generation');
  await page.fill('#f-theme', '通用单人人像流程测试');
  await page.fill('#f-model', '一位测试模特，短发，黑色外套');
  await page.selectOption('#f-style', { label: '时尚杂志风' }).catch(async () => page.selectOption('#f-style', { index: 1 }));
  await page.fill('#f-scene', '室内主场景与室外备选');
  if (!await page.locator('#genBtn').isEnabled()) throw new Error('complete brief should be eligible for plan generation');
  await page.locator('.brief-advanced > summary').click();
  await page.fill('#f-mood', '自然，明确');
  await page.fill('#f-extra', '覆盖全身、中景、近景和细节，需要海外版发布和 SEO 关键词');
  await page.click('#genBtn');
  try {
    await page.waitForSelector('.workflow-loop', { state: 'attached', timeout: 15000 });
  } catch (error) {
    console.error('PLAN OUTPUT:', (await page.locator('#outCnt').innerText().catch(() => '')).slice(0, 1200));
    console.error('PLAN STATE:', await page.evaluate(() => ({
      button: document.getElementById('genBtn')?.outerHTML,
      loading: document.getElementById('outLoad')?.className,
      empty: document.getElementById('outEmpty')?.className,
      output: document.getElementById('outCnt')?.className,
      toast: document.getElementById('toast')?.textContent,
      plans: JSON.parse(localStorage.getItem('pw_plans') || '[]').length,
    })));
    console.error('PAGE ERRORS:', pageErrors.join('\n'));
    throw error;
  }
  const candidatePlan = await page.evaluate(() => JSON.parse(localStorage.getItem('pw_plans') || '[]')[0]);
  if (candidatePlan.lifecycleStatus !== 'candidate') throw new Error('new plan did not enter candidate state');
  if (await page.locator('#planLibraryTabs [aria-selected="true"] span').textContent() !== '预选方案') throw new Error('candidate library tab was not selected');
  if (await page.locator('.plan-primary-toggle[open], .workflow-loop[open]').count()) throw new Error('new plan should keep execution sections collapsed initially');
  await page.locator('.r4-legacy-document').evaluate(element => { element.open = true; });
  await page.locator('.plan-primary-toggle[id^="plan-blueprint-"] > summary').click();
  const planOutputText = await page.locator('#outCnt').innerText();
  for (const label of ['拍摄总控', '建议携带', '设备库核对', '执行顺序']) {
    if (!planOutputText.includes(label)) throw new Error(`generated plan missing the ${label} decision surface`);
  }
  if (await page.locator('.shoot-phase').count() !== 4) throw new Error('generated plan did not group shots into the expected shoot phases');
  if (await page.locator('.shoot-take').count() !== 8) throw new Error('generated plan did not render the planned shoot takes');
  if (!planOutputText.includes('2 支')) throw new Error('generated plan did not summarize the compact lens kit');
  const csvDownloadPromise = page.waitForEvent('download');
  await page.locator('.plan-summary-card').getByRole('button', { name: '表格' }).click();
  const csvDownload = await csvDownloadPromise;
  if (!csvDownload.suggestedFilename().endsWith('-shot-list.csv')) throw new Error('plan CSV export missing');
  if (!fs.readFileSync(await csvDownload.path(), 'utf8').includes('镜头')) throw new Error('plan CSV export has no shot data');
  const txtDownloadPromise = page.waitForEvent('download');
  await page.locator('.plan-summary-card').getByRole('button', { name: '文字版' }).click();
  const txtDownload = await txtDownloadPromise;
  if (!txtDownload.suggestedFilename().endsWith('-shoot-plan.txt')) throw new Error('plan text export missing');
  if (!fs.readFileSync(await txtDownload.path(), 'utf8').includes('## 镜头表')) throw new Error('plan text export has no structured shot list');
  const printPopupPromise = page.waitForEvent('popup');
  await page.locator('.plan-summary-card').getByRole('button', { name: 'PDF / 打印' }).click();
  const printPopup = await printPopupPromise;
  await printPopup.waitForFunction(() => document.body?.innerText.includes('镜头执行表'));
  await printPopup.close();
  await page.locator('.plan-summary-card').getByRole('button', { name: '确认采用' }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('pw_plans') || '[]')[0]?.lifecycleStatus === 'confirmed');
  await page.locator('.workflow-loop > summary').click();
  await page.locator('.workflow-extended-details > summary').click();
  await page.locator('.workflow-phase-toggle[id^="workflow-references-"] > summary').click();
  const relationVisible = await page.locator('text=智能关联工作台').count() > 0;
  const lifecycleVisible = await page.locator('text=执行与交付').isVisible();
  const optionalAgentVisible = await page.locator('text=通用方案 Agent（可选）').isVisible();
  const planResourcesAvailable = await page.locator('.plan-resources').count() > 0;
  if (relationVisible) throw new Error('legacy relation workspace should be removed from the main plan path');
  if (!lifecycleVisible || !optionalAgentVisible || !planResourcesAvailable) {
    throw new Error('lifecycle, optional Agent, or archived plan resources missing');
  }
  if (!await page.locator('.production-map').count()) throw new Error('photography production workflow map missing');
  if (await page.locator('.shot-reference-board').count()) throw new Error('legacy repeated shot reference board should be removed');
  await page.locator('.production-map').getByRole('button', { name: '匹配镜头参考' }).click();
  const referenceAssignments = await page.evaluate(() => JSON.parse(localStorage.getItem('pw_plans') || '[]')[0]?.shotReferenceAssignments || {});
  const assignedReferences = Object.keys(referenceAssignments).length;
  if (!assignedReferences) throw new Error('shot-to-reference assignments were not persisted');
  if (!Object.values(referenceAssignments).some(id => String(id).startsWith('asset-'))) throw new Error('real local images were not prioritized for shot references');
  const uniqueAssignedReferences = new Set(Object.values(referenceAssignments)).size;
  if (uniqueAssignedReferences !== assignedReferences) throw new Error('shot references were repeated even though the local library had enough alternatives');
  await page.locator('.workflow-loop').evaluate(element => { element.open = true; });
  await page.locator('.workflow-extended-details').evaluate(element => { element.open = true; });
  await page.locator('.workflow-phase-toggle[id^="workflow-references-"]').evaluate(element => { element.open = true; });
  await page.locator('.plan-resources').evaluate(element => { element.open = true; });
  const loadedReferenceImages = await page.locator('.plan-resource-thumb img').evaluateAll(images => images.filter(image => image.complete && image.naturalWidth > 0).length);
  const planResourcesEmpty = await page.locator('.plan-resources__empty').count() > 0;
  const archivedResourceSections = await page.locator('.plan-resource-section').count();
  if (!loadedReferenceImages && !planResourcesEmpty && !archivedResourceSections) {
    throw new Error('archived plan resources rendered neither content nor an empty state');
  }
  await page.waitForSelector('.workflow-resource-drawer');
  const resourcePlan = await page.evaluate(() => JSON.parse(localStorage.getItem('pw_plans') || '[]')[0]);
  await page.locator('.workflow-resource-v5-summary section', { hasText: '设备' }).getByRole('button').click();
  await page.waitForSelector('#resource-eq.active .r4-resource-workspace');
  if (!await page.locator('#resource-eq .r4-resource-list-card').count()) {
    await page.locator('#resource-eq [data-r4-resource-add="equipment"]').click();
    await page.locator('#resource-eq [data-r4-resource-form="equipment"] [name="name"]').fill('Sony A7M4');
    await page.locator('#resource-eq [data-r4-resource-form="equipment"] button[type="submit"]').click();
  }
  await page.locator('#resource-eq .r4-resource-list-card').first().click();
  await page.locator('#resource-eq [data-r4-resource-select]').click();
  const selectedEquipment = await page.evaluate(planId => {
    const app = window.PhotoAtelierV5.application;
    const projectId = `legacy-${planId}`;
    return app.queries.resourceCatalog.get(projectId).equipment
      .filter(item => item.assignments.some(assignment => assignment.status === 'selected'))
      .map(item => item.displayName);
  }, resourcePlan.id);
  if (!selectedEquipment.length) throw new Error('V5 equipment assignment was not linked to plan');
  await page.locator('.workflow-loop').evaluate(element => { element.open = true; });
  await page.locator('.workflow-extended-details').evaluate(element => { element.open = true; });
  await page.locator('#plan-post-' + resourcePlan.id).evaluate(element => { element.open = true; });
  // Plan-level LUT is intentionally not locked in the brief; the resource workspace owns LUT.
  await page.waitForFunction((planId) => {
    const container = document.querySelector('#plan-post-' + planId);
    return container?.textContent?.includes('后期交接暂不锁定 LUT');
  }, resourcePlan.id);
  await page.locator('.r4-resource-nav-item[data-r4-resource-section="lut"]').click();
  await page.locator('#r4-resource-lut.active .lut-simple-details').evaluateAll(elements => { elements.forEach(el => { el.open = true; }); });
  const lutList = page.locator('#r4-resource-lut.active #lut-library-list');
  await lutList.waitFor({ state: 'visible', timeout: 5000 });
  if (!await page.locator('#lut-library-select option').count()) throw new Error('LUT library workspace missing');
  await page.waitForFunction(() => document.querySelectorAll('#open-lut-list .open-lut-card').length === 8);
  const srgbOpenLutCount = await page.locator('#open-lut-list .open-lut-card').count();
  if (!await page.locator('#open-lut-list .open-lut-card').first().getByRole('link', { name: '下载 .cube' }).count()) throw new Error('downloadable CUBE delivery missing');
  await page.locator('#open-lut-list .open-lut-card').first().getByRole('button', { name: '安装到工作台' }).click();
  await page.waitForFunction(() => document.querySelector('#open-lut-list .open-lut-card button')?.disabled === true);
  const installedOpenLutId = await page.evaluate(() => JSON.parse(localStorage.getItem('pa_lut_profiles') || '[]')[0]?.id);
  await page.selectOption('#lut-library-select', installedOpenLutId);
  if (!await page.locator('#curated-lut-list .curated-lut-card').count()) throw new Error('one-click LUT effect missing');
  const cubeDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '转换并下载 CUBE' }).click();
  const cubeDownload = await cubeDownloadPromise;
  if (!cubeDownload.suggestedFilename().endsWith('-33point.cube')) throw new Error('CUBE converter did not export 33-point file');
  const redPixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=', 'base64');
  await page.locator('#tab-lut input[accept="image/*"]').first().setInputFiles({ name: 'red-pixel.png', mimeType: 'image/png', buffer: redPixelPng });
  await page.waitForFunction(() => document.getElementById('lut-library-output')?.getContext('2d').getImageData(0, 0, 1, 1).data[3] > 0);
  const lutPreviewRendered = await page.evaluate(() => document.getElementById('lut-library-output').getContext('2d').getImageData(0, 0, 1, 1).data[3] > 0);
  await page.selectOption('#open-lut-input', 'panasonic-vlog');
  await page.waitForFunction(() => document.querySelectorAll('#open-lut-list .open-lut-card').length === 4);
  const vlogOpenLutCount = await page.locator('#open-lut-list .open-lut-card').count();
  await page.selectOption('#open-lut-input', 'dji-dlogm');
  await page.waitForFunction(() => document.querySelector('#lut-pipeline')?.textContent.includes('DJI D-Log M'));
  if (!await page.locator('#lut-transform-list').getByText('必须先选择具体机型', { exact: false }).count()) throw new Error('DJI model-specific warning missing');
  await page.selectOption('#lut-software', 'pixelcake');
  await page.waitForFunction(() => document.querySelector('#lut-pipeline')?.textContent.includes('成片/XMP'));
  if (!await page.locator('#lut-transform-list').getByText('未确认直接导入 .cube', { exact: false }).count()) throw new Error('PixelCake delivery boundary missing');
  await page.click('.nav-item[data-tab="reference"]');
  await page.locator('.reference-advanced-tools').evaluate(el => { el.open = true; });
  await page.waitForSelector('#tab-reference.active #liveLocalLibrary');
  await page.waitForFunction(() => {
    const meta = document.getElementById('liveLocalMeta');
    const results = document.getElementById('liveLocalResults');
    return Boolean(meta?.textContent?.trim()) && !results?.querySelector('.spinner');
  }, null, { timeout: 15000 });
  const referenceImageCount = await page.locator('#liveLocalResults img').count();
  await page.waitForSelector('#referenceDbList [data-reference-id]');
  const firstReference = page.locator('#referenceDbList [data-reference-id]').first();
  if ((await firstReference.innerText()).includes('标准化：') || (await firstReference.innerText()).includes('风险：')) throw new Error('reference browse list should not expose full metadata');
  await firstReference.getByRole('button', { name: '详情', exact: true }).click();
  await page.waitForSelector('#referenceDetailModal:not([hidden])');
  if (!await page.locator('#referenceDetailContent').innerText().then(text => text.includes('素材概览'))) throw new Error('reference detail did not open at the overview section');
await page.locator('#referenceDetailContent').getByRole('tab', { name: '拍摄解读', exact: true }).click();
  if (!await page.locator('#referenceDetailContent').innerText().then(text => text.includes('拍摄解读'))) throw new Error('reference detail did not switch to the shooting section');
await page.locator('#referenceDetailContent').getByRole('tab', { name: '项目动作', exact: true }).click();
  await page.locator('#referenceDetailContent').getByRole('button', { name: '验证', exact: true }).click();
  const assetDecisionCount = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('pa_asset_decisions') || '{}')).length);
  if (!assetDecisionCount) throw new Error('reference verification decision was not persisted');
  await page.locator('#referenceDetailModal').getByRole('button', { name: '返回条目列表', exact: true }).click();
  if (await page.locator('#referenceDetailModal').evaluate(element => !element.hidden) !== false) throw new Error('reference detail did not close back to the browse list');
  await page.evaluate(() => {
    const plan = JSON.parse(localStorage.getItem('pw_plans') || '[]')[0];
    if (plan) window.loadPlan(plan.id);
  });
  await page.locator('.workflow-loop').evaluate(element => { element.open = true; });
  await page.locator('.workflow-extended-details').evaluate(element => { element.open = true; });
  await page.locator('.workflow-phase-toggle[id^="workflow-references-"]').evaluate(element => { element.open = true; });
  await page.click('text=创建/打开日程');
  await page.waitForSelector('#planScheduleDialog[open]');
  await page.fill('#planScheduleDate', '2030-06-09');
  await page.fill('#planScheduleTime', '09:30');
  await page.fill('#planScheduleLocation', '测试影棚 A');
  await page.getByRole('button', { name: '确认并加入日程' }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('pw_plans') || '[]')[0]?.lifecycleStatus === 'scheduled');
  await page.locator('.workflow-loop').evaluate(element => { element.open = true; });
  await page.locator('.plan-package-summary').getByRole('button', { name: '查看日程' }).click();
  await page.waitForSelector('#tab-calendar.active');
  await page.waitForSelector('#scheduleWorkflowBoard .schedule-board__card');
  if (await page.locator('.calendar-day.is-selected[data-date="2030-06-09"]').count() !== 1) throw new Error('scheduled date was not selected in calendar');
  const monthBefore = await page.locator('#calendarMonthLabel').textContent();
  await page.getByRole('button', { name: '下个月' }).click();
  const monthAfter = await page.locator('#calendarMonthLabel').textContent();
  if (monthBefore === monthAfter) throw new Error('calendar month navigation did not change');
  const adjacentDate = await page.locator('#calendarGrid .calendar-day.other-month').first().getAttribute('data-date');
  await page.locator(`#calendarGrid .calendar-day[data-date="${adjacentDate}"]`).click();
  if (await page.locator(`#calendarGrid .calendar-day.is-selected[data-date="${adjacentDate}"]`).count() !== 1) throw new Error('adjacent-month day was not clickable');
  await page.locator('#scheduleWorkflowBoard .schedule-prep button').first().click();
  const schedules = await page.evaluate(() => JSON.parse(localStorage.getItem('pw_schedule') || '[]'));
  if (!schedules.some(item => item.planId && item.preparation?.brief)) throw new Error('schedule or preparation checklist was not linked to plan');
  const starterContext = await browser.newContext();
  const starterPage = await starterContext.newPage();
  await starterPage.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('pa_use_local', 'true');
    localStorage.setItem('pw_token', 'local-test-token');
    localStorage.setItem('pw_user', JSON.stringify({ name: '本地用户', email: 'user@local' }));
    localStorage.setItem('pw_role', 'photographer');
  });
  await starterPage.goto(url, { waitUntil: 'domcontentloaded' });
  await starterPage.locator('.nav-item[data-tab="gen"]').click();
  await starterPage.waitForFunction(() => window.PhotoAtelierResourceWorkspace
    && document.querySelectorAll('#importVenueSelect option').length >= 2
    && document.querySelectorAll('#importModelSelect option').length >= 2);
  await starterPage.locator('.plan-quick-template', { hasText: '单人人像' }).click();
  if (await starterPage.locator('#genBtn').isEnabled()) throw new Error('starter template should still require real brief details');
  await starterPage.locator('#importVenueSelect').selectOption({ index: 1 });
  await starterPage.locator('.brief-scene-field .brief-inline').getByRole('button', { name: '导入', exact: true }).click();
  await starterPage.locator('#importModelSelect').selectOption({ index: 1 });
  await starterPage.locator('.brief-subject-field .brief-inline').getByRole('button', { name: '导入', exact: true }).click();
  await starterPage.selectOption('#f-style', { label: '时尚杂志风' }).catch(async () => starterPage.selectOption('#f-style', { index: 1 }));
  if (!await starterPage.locator('#f-scene').inputValue()) throw new Error('starter venue was not imported into the brief');
  if (!await starterPage.locator('#f-model').inputValue()) throw new Error('starter subject was not imported into the brief');
  if (!await starterPage.locator('#genBtn').isEnabled()) throw new Error('starter options did not unlock a complete brief');
  await starterContext.close();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) throw new Error('mobile horizontal overflow detected');
  if (pageErrors.length) throw new Error(`page errors: ${pageErrors.join(' | ')}`);
  console.log(JSON.stringify({ ok: true, navCount, navLabels, relationVisible, lifecycleVisible, optionalAgentVisible, assignedReferences, uniqueAssignedReferences, loadedReferenceImages, equipmentLinked: selectedEquipment.length, lutLinked: false, srgbOpenLutCount, vlogOpenLutCount, lutPreviewRendered, referenceImageCount, assetDecisionCount, scheduleCount: schedules.length, mobileOverflow: overflow }, null, 2));
  await browser.close();
  browser = null;
  children.forEach(child => child.kill());
})().catch(async error => {
  console.error(error);
  if (browser) await browser.close().catch(() => {});
  children.forEach(child => child.kill());
  process.exitCode = 1;
});
