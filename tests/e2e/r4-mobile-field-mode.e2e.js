const { chromium } = require('playwright-core');
const { findBrowserExecutable } = require('./browser');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const url = process.env.PHOTOATELIER_LEGACY_URL || 'http://127.0.0.1:8123/legacy/';
const executablePath = findBrowserExecutable();
const children = [];
let browser;

const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

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

async function injectR4Assets(page) {
  const cssPath = path.resolve(__dirname, '..', '..', 'src', 'r4-mobile-field-mode.css');
  await page.addStyleTag({ path: cssPath });
  await page.addScriptTag({ url: '/src/r4-mobile-field-mode.js', type: 'module' });
  await page.waitForFunction(() => typeof window.PhotoAtelierR4MobileField !== 'undefined', { timeout: 5000 });
  // Hide legacy feedback trigger so it does not intercept mobile sheet actions.
  await page.addStyleTag({ content: '.pa-beta-feedback-trigger { display: none !important; }' });
}

async function openFieldMode(page, state) {
  return page.evaluate((s) => {
    const existing = document.getElementById('r4-mobile-field-mode');
    if (existing) existing.remove();
    const container = document.createElement('div');
    container.id = 'r4-mobile-field-mode';
    document.body.appendChild(container);
    const instance = window.PhotoAtelierR4MobileField.initMobileFieldMode({
      container,
      state: s,
      handlers: {
        onMarkComplete: (id, completed, st) => {
          window.__r4LastMark = { id, completed, remaining: st.shots.filter(x => !st.completedShotIds.has(x.id)).length };
        },
        onNoteChange: (id, note, st) => {
          window.__r4LastNote = { id, note };
        },
      },
    });
    window.__r4FieldInstance = instance;
    return !!instance;
  }, state);
}

async function openSchedule(page, state) {
  return page.evaluate((s) => {
    const existing = document.getElementById('r4-mobile-schedule');
    if (existing) existing.remove();
    const container = document.createElement('div');
    container.id = 'r4-mobile-schedule';
    document.body.appendChild(container);
    const instance = window.PhotoAtelierR4MobileField.initMobileSchedule({
      container,
      state: s,
      handlers: {
        onDateSelect: (date, st) => {
          window.__r4LastDate = date;
        },
      },
    });
    window.__r4ScheduleInstance = instance;
    return !!instance;
  }, state);
}

async function runChecks(page) {
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.stack || error.message);
    console.error('PAGE ERROR:', error.stack || error.message);
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await injectR4Assets(page);

  const mockState = {
    plan: { id: 'plan-r4-e', name: 'R4-E 移动现场测试方案' },
    shots: [
      { id: 's1', number: 1, title: '窗边自然光半身', lens: '85mm f/1.8', pose: '侧身回眸', lighting: '侧逆光', estimatedMinutes: 15 },
      { id: 's2', number: 2, title: '沙发坐姿', lens: '50mm f/1.4', pose: '慵懒靠垫', lighting: '窗光主光', estimatedMinutes: 20 },
      { id: 's3', number: 3, title: '地板俯视', lens: '35mm f/1.8', pose: '手撑脸颊', lighting: '顶光+反光板', estimatedMinutes: 10 },
    ],
    references: [
      { id: 'ref-1', title: '窗边参考', url: 'assets/demo/references/pose-01.jpg', synthetic: false },
      { id: 'ref-2', title: 'AI 氛围参考', url: 'assets/demo/references/pose-02.jpg', synthetic: true },
    ],
    currentShotIndex: 0,
    completedShotIds: new Set(),
    notes: {},
    selectedScheduleDate: '2026-07-12',
    schedules: [
      { date: '2026-08-15', title: '毕业季校园人像', location: '湖边草坪', time: '09:00' },
      { date: '2026-08-20', title: '室内影棚产品', location: '影棚 A', time: '14:00' },
    ],
    activeTab: 'plans',
  };

  // === Field mode ===
  await openFieldMode(page, mockState);

  // Content order: reference image, shot number/title, lens, pose/movement, lighting, estimated time,
  // mark complete, view reference, add note, bottom navigation.
  const order = await page.evaluate(() => {
    const ref = document.querySelector('.r4-shot-reference');
    const title = document.querySelector('.r4-shot-title');
    const metaLabels = Array.from(document.querySelectorAll('.r4-shot-meta__label')).map(el => el.textContent.trim());
    const primary = document.querySelector('[data-action="mark-complete"]');
    const viewRef = document.querySelector('[data-action="view-reference"]');
    const addNote = document.querySelector('[data-action="add-note"]');
    const nav = document.querySelector('.r4-bottom-nav');
    return {
      referenceFirst: !!ref,
      titleAfterReference: !!title && ref?.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
      metaLabels,
      primaryVisible: !!primary,
      viewReferenceVisible: !!viewRef,
      addNoteVisible: !!addNote,
      navVisible: !!nav,
    };
  });

  if (!order.referenceFirst) throw new Error('real reference should be rendered first');
  if (!order.titleAfterReference) throw new Error('shot title should follow reference');
  const expectedLabels = ['镜头', '姿势 / 动作', '光线方向', '预计用时'];
  for (const label of expectedLabels) {
    if (!order.metaLabels.includes(label)) throw new Error(`missing meta label: ${label}`);
  }
  if (!order.primaryVisible) throw new Error('mark-complete primary action missing');
  if (!order.viewReferenceVisible) throw new Error('view-reference action missing');
  if (!order.addNoteVisible) throw new Error('add-note action missing');
  if (!order.navVisible) throw new Error('bottom navigation missing');

  // Bottom navigation has four destinations.
  const navItems = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.r4-bottom-nav__item')).map(el => ({
      label: el.querySelector('.r4-bottom-nav__label')?.textContent?.trim(),
      selected: el.classList.contains('r4-bottom-nav__item--selected'),
    }))
  );
  const expectedNav = ['方案', '参考', '日程', '我的'];
  if (navItems.length !== 4) throw new Error(`expected 4 nav items, got ${navItems.length}`);
  for (let i = 0; i < 4; i += 1) {
    if (navItems[i].label !== expectedNav[i]) throw new Error(`nav item ${i}: expected ${expectedNav[i]}, got ${navItems[i].label}`);
  }
  if (!navItems[0].selected) throw new Error('Plans tab should be selected by default');

  // Touch targets are at least 44 x 44 px.
  const touchTargetsOk = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('.r4-btn, .r4-bottom-nav__item, .r4-cal-cell'));
    return buttons.every(btn => {
      const rect = btn.getBoundingClientRect();
      return rect.width >= 44 && rect.height >= 44;
    });
  });
  if (!touchTargetsOk) throw new Error('some touch targets are smaller than 44 x 44 px');

  // Screenshot of field mode at 390 x 844.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(screenshotDir, 'r4-mobile-field-mode.png'), fullPage: false });

  // No horizontal overflow at 390 x 844.
  const overflow = await page.evaluate(() => {
    const body = document.body;
    return body.scrollWidth > body.clientWidth;
  });
  if (overflow) throw new Error('horizontal overflow detected at 390px viewport');

  // Mark complete persists and advances to next shot.
  await page.click('[data-action="mark-complete"]');
  await page.waitForTimeout(200);
  const afterFirstComplete = await page.evaluate(() => window.__r4LastMark);
  if (!afterFirstComplete?.completed) throw new Error('mark complete should report completed=true');

  const secondShotTitle = await page.evaluate(() => document.querySelector('.r4-shot-title')?.textContent);
  if (!secondShotTitle?.includes('沙发坐姿')) throw new Error(`expected advancing to shot 2, got: ${secondShotTitle}`);

  // Mark second complete and verify advance to third.
  await page.click('[data-action="mark-complete"]');
  await page.waitForTimeout(200);
  const thirdShotTitle = await page.evaluate(() => document.querySelector('.r4-shot-title')?.textContent);
  if (!thirdShotTitle?.includes('地板俯视')) throw new Error(`expected advancing to shot 3, got: ${thirdShotTitle}`);

  // Add note opens a sheet with 16px top corners.
  await page.click('[data-action="add-note"]');
  await page.waitForSelector('.r4-sheet', { timeout: 5000 });
  const sheetCorners = await page.evaluate(() => {
    const panel = document.querySelector('.r4-sheet__panel');
    if (!panel) return null;
    const style = window.getComputedStyle(panel);
    return {
      topLeft: style.borderTopLeftRadius,
      topRight: style.borderTopRightRadius,
    };
  });
  if (!sheetCorners || sheetCorners.topLeft !== '16px' || sheetCorners.topRight !== '16px') {
    throw new Error(`sheet should have 16px top corners, got: ${JSON.stringify(sheetCorners)}`);
  }
  await page.fill('.r4-sheet__textarea', '现场光线偏暖，需要降低色温。');
  // Wait for the sheet opening animation to settle before clicking.
  await page.waitForTimeout(350);
  await page.evaluate(() => document.querySelector('[data-sheet-save]')?.click());
  await page.waitForFunction(() => !document.querySelector('.r4-sheet'), { timeout: 5000 });
  const savedNote = await page.evaluate(() => window.__r4LastNote);
  if (!savedNote?.note?.includes('现场光线偏暖')) throw new Error('note was not saved');

  // === Mobile schedule ===
  await openSchedule(page, { ...mockState, activeTab: 'schedule' });

  // Default selected date is today; navigate to August and select a different date that has a plan.
  const today = new Date().toISOString().slice(0, 10);
  const targetDate = '2026-08-15';
  await page.locator('#r4-mobile-schedule [data-action="next-month"]').click();
  await page.waitForTimeout(200);
  await page.locator(`#r4-mobile-schedule [data-date="${targetDate}"]`).click();
  await page.waitForTimeout(200);
  const selectedDate = await page.evaluate(() => window.__r4LastDate);
  if (selectedDate !== targetDate) throw new Error(`expected selected date ${targetDate}, got ${selectedDate}`);

  const schedulePlanVisible = await page.evaluate(() => {
    const text = document.body.textContent;
    return text.includes('毕业季校园人像') && text.includes('湖边草坪');
  });
  if (!schedulePlanVisible) throw new Error('scheduled plan should be visible after selecting its date');

  // Screenshot of mobile schedule at 390 x 844.
  await page.screenshot({ path: path.join(screenshotDir, 'r4-mobile-schedule.png'), fullPage: false });

  // === Reduced motion ===
  await openFieldMode(page, { ...mockState, reducedMotion: true, activeTab: 'plans' });
  await page.click('[data-action="add-note"]');
  await page.waitForSelector('.r4-sheet', { timeout: 5000 });
  const reducedMotionUsable = await page.evaluate(() => {
    const sheet = document.querySelector('.r4-sheet');
    const panel = document.querySelector('.r4-sheet__panel');
    return sheet?.classList.contains('r4-sheet--open') && panel?.offsetHeight > 0;
  });
  if (!reducedMotionUsable) throw new Error('reduced-motion sheet should open without animation');
  await page.click('[data-sheet-close]', { force: true });
  await page.waitForFunction(() => !document.querySelector('.r4-sheet'), { timeout: 5000 });

  if (pageErrors.length) throw new Error(`page errors detected: ${pageErrors.join('; ')}`);

  console.log('r4-mobile-field-mode e2e passed');
}

(async () => {
  if (!await isReachable(url)) {
    children.push(spawn('python', ['-m', 'http.server', '8123', '--directory', '.'], { cwd: process.cwd(), windowsHide: true }));
  }
  await waitFor(url);
  browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await runChecks(page);
})().catch(async error => {
  console.error('E2E FAILED:', error.stack || error.message);
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  children.forEach(child => child.kill());
});
