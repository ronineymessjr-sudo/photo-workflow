import { chromium } from 'playwright-core';
import { findBrowserExecutable } from './browser.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';

const BASE_URL = process.env.PHOTOATELIER_URL || 'http://localhost:8765';
const SCREENSHOT_DIR = resolve(import.meta.dirname, 'screenshots');
const executablePath = findBrowserExecutable();

const TEST_STEPS = [
  { name: '01-homepage',        url: BASE_URL,                                selector: 'body', description: 'Homepage loads' },
  { name: '02-plan-page',       url: `${BASE_URL}#plan`,                      selector: 'body', description: 'Plan page hash navigation' },
  { name: '03-four-step-flow',  url: null,                                     selector: null,   description: 'V3.1 four-step flow' },
  { name: '04-visualdna-card',  url: null,                                     selector: null,   description: 'VisualDNA analysis card' },
  { name: '05-shot-v31-fields', url: null,                                     selector: null,   description: 'Shot V3.1 fields' },
  { name: '06-pdf-export',      url: null,                                     selector: null,   description: 'PDF export button' },
  { name: '07-creative-dir',    url: null,                                     selector: null,   description: 'Creative direction candidates' },
];

async function reachable(target) {
  try { return (await fetch(target)).ok; } catch { return false; }
}

async function waitForServer(target, attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    if (await reachable(target)) return true;
    await new Promise(r => setTimeout(r, 120));
  }
  return false;
}

async function screenshot(page, name) {
  const filePath = join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true, animations: 'disabled' });
  return filePath;
}

async function tryNavToPlan(page) {
  const navSelectors = [
    '[data-page="plan"]',
    '[data-tab="plan"]',
    '.nav-item:has-text("规划")',
    '.nav-item:has-text("Plan")',
  ];
  for (const sel of navSelectors) {
    const count = await page.locator(sel).count();
    if (count > 0) {
      await page.locator(sel).first().click();
      await page.waitForTimeout(500);
      return true;
    }
  }
  return false;
}

async function run() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });

  let server = null;
  if (!await reachable(BASE_URL)) {
    console.log(`[run-e2e] Server not reachable at ${BASE_URL}, starting dist-v2 server...`);
    server = spawn('python', ['-m', 'http.server', '8765', '--directory', 'dist-v2'], {
      cwd: process.cwd(),
      windowsHide: true,
      stdio: 'ignore',
    });
  }

  if (!await waitForServer(BASE_URL)) {
    console.error(`[run-e2e] FATAL: Server never became reachable at ${BASE_URL}`);
    server?.kill();
    process.exit(1);
  }

  console.log(`[run-e2e] Server reachable at ${BASE_URL}`);

  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(20000);

  const results = [];
  const errors = [];

  page.on('pageerror', err => errors.push(err.message));

  // ── Step 1: Homepage ────────────────────────────────────────
  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    const titleOk = /Photo|Atelier|摄影/.test(title);
    const shotPath = await screenshot(page, '01-homepage');
    results.push({ step: '01-homepage', description: 'Homepage loads', status: titleOk ? 'PASS' : 'FAIL', detail: `title="${title}"`, screenshot: shotPath });
  } catch (err) {
    results.push({ step: '01-homepage', description: 'Homepage loads', status: 'ERROR', detail: err.message });
  }

  // ── Step 2: Enter app + Plan page ────────────────────────────
  try {
    // Click CTA to enter app
    const ctaSelectors = ['text=开启公开测试', 'text=开始使用', 'text=进入工作台', 'a[href*="app"]', 'button[href*="app"]'];
    let enteredApp = false;
    for (const sel of ctaSelectors) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        await page.locator(sel).first().click();
        await page.waitForTimeout(1500);
        enteredApp = true;
        break;
      }
    }
    // Navigate to app entry then plan page
    const appEntries = [`${BASE_URL}/workspace.html`, `${BASE_URL}/legacy/index.html`, `${BASE_URL}/#plan`];
    for (const entry of appEntries) {
      const resp = await page.goto(entry, { waitUntil: 'domcontentloaded' });
      if (resp && resp.ok()) {
        await page.waitForTimeout(1500);
        // Check if this looks like the SPA app (has nav or project UI)
        const hasApp = await page.locator('nav, [data-page], .app-layout, #app, .topbar, .sidebar').first().isVisible().catch(() => false);
        if (hasApp) break;
      }
    }
    // Try hash nav to plan
    await page.goto(`${BASE_URL}/workspace.html#plan`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await tryNavToPlan(page);
    await page.waitForTimeout(500);
    const shotPath = await screenshot(page, '02-plan-page');
    results.push({ step: '02-plan-page', description: 'Plan page renders', status: 'PASS', detail: enteredApp ? 'Entered app via CTA' : 'Direct hash nav', screenshot: shotPath });
  } catch (err) {
    results.push({ step: '02-plan-page', description: 'Plan page renders', status: 'ERROR', detail: err.message });
  }

  // ── Step 3: Four-step flow ─────────────────────────────────
  try {
    const steps = [
      { label: '参考图', key: 'step1' },
      { label: 'VisualDNA', key: 'step2' },
      { label: '创意方向', key: 'step3' },
      { label: 'Shot List', key: 'step4' },
    ];
    const found = {};
    for (const s of steps) {
      const count = await page.locator(`text=${s.label}`).count();
      found[s.key] = count > 0;
    }
    const allFound = Object.values(found).every(Boolean);
    const shotPath = await screenshot(page, '03-four-step-flow');
    results.push({
      step: '03-four-step-flow',
      description: 'V3.1 four-step flow',
      status: allFound ? 'PASS' : 'PARTIAL',
      detail: JSON.stringify(found),
      screenshot: shotPath,
    });
  } catch (err) {
    results.push({ step: '03-four-step-flow', description: 'V3.1 four-step flow', status: 'ERROR', detail: err.message });
  }

  // ── Step 4: VisualDNA card ─────────────────────────────────
  try {
    const vdnaCard = page.locator('text=VisualDNA 分析').first();
    const cardVisible = await vdnaCard.isVisible().catch(() => false);
    if (!cardVisible) {
      results.push({ step: '04-visualdna-card', description: 'VisualDNA analysis card', status: 'SKIP', detail: 'No VisualDNA analysis card visible' });
    } else {
      const sections = ['构图', '镜头', '光线', '色彩'];
      const sectionResults = {};
      for (const sec of sections) {
        const container = vdnaCard.locator('..');
        sectionResults[sec] = await container.locator(`text=${sec}`).first().isVisible().catch(() => false);
      }
      const foundCount = Object.values(sectionResults).filter(Boolean).length;
      const shotPath = await screenshot(page, '04-visualdna-card');
      results.push({
        step: '04-visualdna-card',
        description: 'VisualDNA analysis card',
        status: foundCount >= 2 ? 'PASS' : 'PARTIAL',
        detail: JSON.stringify(sectionResults),
        screenshot: shotPath,
      });
    }
  } catch (err) {
    results.push({ step: '04-visualdna-card', description: 'VisualDNA analysis card', status: 'ERROR', detail: err.message });
  }

  // ── Step 5: Shot V3.1 fields ───────────────────────────────
  try {
    const shotRows = page.locator('.shot-row, .shot-card, [data-shot]');
    const shotCount = await shotRows.count();
    if (shotCount === 0) {
      results.push({ step: '05-shot-v31-fields', description: 'Shot V3.1 fields', status: 'SKIP', detail: 'No shot rows found' });
    } else {
      const shotText = await shotRows.first().textContent().catch(() => '');
      const checks = {
        动作: /动作|姿势|Pos/.test(shotText),
        光线: /光线|灯光|Light/.test(shotText),
        情绪: /情绪|氛围|Mood/.test(shotText),
        结构化光线: /方向|辅助|主光|轮廓光|Key|Fill|Rim/i.test(shotText),
        为什么拍: /为什么拍|匹配|Why|Match/.test(shotText),
      };
      const foundCount = Object.values(checks).filter(Boolean).length;
      const shotPath = await screenshot(page, '05-shot-v31-fields');
      results.push({
        step: '05-shot-v31-fields',
        description: 'Shot V3.1 fields',
        status: foundCount >= 1 ? 'PASS' : 'PARTIAL',
        detail: `${foundCount}/5 fields found: ${JSON.stringify(checks)}`,
        screenshot: shotPath,
      });
    }
  } catch (err) {
    results.push({ step: '05-shot-v31-fields', description: 'Shot V3.1 fields', status: 'ERROR', detail: err.message });
  }

  // ── Step 6: PDF export button ──────────────────────────────
  try {
    const pdfButton = page.locator('button:has-text("PDF"), button:has-text("导出"), a:has-text("PDF"), a:has-text("导出")');
    const buttonVisible = await pdfButton.first().isVisible().catch(() => false);
    const shotPath = await screenshot(page, '06-pdf-export');
    results.push({
      step: '06-pdf-export',
      description: 'PDF export button',
      status: buttonVisible ? 'PASS' : 'FAIL',
      detail: buttonVisible ? 'Button visible' : 'No PDF/export button found',
      screenshot: shotPath,
    });
  } catch (err) {
    results.push({ step: '06-pdf-export', description: 'PDF export button', status: 'ERROR', detail: err.message });
  }

  // ── Step 7: Creative direction candidates ──────────────────
  try {
    const creativeSection = page.locator('text=创意方向').first();
    const sectionVisible = await creativeSection.isVisible().catch(() => false);
    if (!sectionVisible) {
      results.push({ step: '07-creative-dir', description: 'Creative direction candidates', status: 'SKIP', detail: 'No creative direction section visible' });
    } else {
      const selectButton = page.locator('button:has-text("选择"), button:has-text("采用"), a:has-text("选择"), [data-action="select"]');
      const selectCount = await selectButton.count();
      const shotPath = await screenshot(page, '07-creative-dir');
      results.push({
        step: '07-creative-dir',
        description: 'Creative direction candidates',
        status: selectCount >= 1 ? 'PASS' : 'PARTIAL',
        detail: `${selectCount} selectable element(s) found`,
        screenshot: shotPath,
      });
    }
  } catch (err) {
    results.push({ step: '07-creative-dir', description: 'Creative direction candidates', status: 'ERROR', detail: err.message });
  }

  // ── Summary ────────────────────────────────────────────────
  await browser.close();
  server?.kill();

  const summary = {
    pass:  results.filter(r => r.status === 'PASS').length,
    fail:  results.filter(r => r.status === 'FAIL').length,
    skip:  results.filter(r => r.status === 'SKIP').length,
    partial: results.filter(r => r.status === 'PARTIAL').length,
    error: results.filter(r => r.status === 'ERROR').length,
    total: results.length,
  };

  console.log('\n═══════════════════════════════════════════════');
  console.log('  V3.1 Planning Flow E2E Test Summary');
  console.log('═══════════════════════════════════════════════');
  for (const r of results) {
    const icon = { PASS: '✅', FAIL: '❌', SKIP: '⏭️', PARTIAL: '⚠️', ERROR: '💥' }[r.status] || '?';
    console.log(`  ${icon} ${r.step.padEnd(22)} ${r.status.padEnd(7)} ${r.detail || ''}`);
  }
  console.log('───────────────────────────────────────────────');
  console.log(`  PASS: ${summary.pass}  FAIL: ${summary.fail}  SKIP: ${summary.skip}  PARTIAL: ${summary.partial}  ERROR: ${summary.error}  TOTAL: ${summary.total}`);
  console.log(`  Screenshots: ${SCREENSHOT_DIR}`);
  console.log('═══════════════════════════════════════════════\n');

  const reportPath = join(SCREENSHOT_DIR, 'results.json');
  await writeFile(reportPath, JSON.stringify({ summary, results, errors, timestamp: new Date().toISOString() }, null, 2), 'utf8');

  if (summary.fail > 0 || summary.error > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('[run-e2e] Unhandled error:', err);
  process.exit(1);
});
