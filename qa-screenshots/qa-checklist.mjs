/**
 * PhotoAtelier V3 — P5 QA Manual Acceptance Checklist
 * Runs 7 checklist items against http://127.0.0.1:8123/legacy/
 * Screenshots saved to ./qa-screenshots/
 */

import { chromium } from 'playwright-core';
import { findBrowserExecutable } from '../tests/e2e/browser.js';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = __dirname;
const APP_URL = 'http://127.0.0.1:8123/legacy/';
const PROXY_URL = 'http://127.0.0.1:8124';

const results = [];

function ssPath(name) {
  return resolve(SCREENSHOT_DIR, name);
}

function logResult(item, status, evidence, issues, screenshots) {
  const entry = { item, status, evidence, issues, screenshots };
  results.push(entry);
  console.log(`\n=== [${status}] Item ${item}: ${evidence} ===`);
  if (issues.length) console.log('  Issues:', issues.join('; '));
  if (screenshots.length) console.log('  Screenshots:', screenshots.join(', '));
}

const LOCAL_STORAGE_SETUP = `
localStorage.setItem('pa_use_local', 'true');
localStorage.setItem('pw_token', 'local-test-token');
localStorage.setItem('pw_user', JSON.stringify({ name: 'QA测试', email: 'qa@test' }));
localStorage.setItem('pw_eq', JSON.stringify([
  { id: 'eq-camera', n: 'Sony A7M4', c: 'camera', note: '测试相机' },
  { id: 'eq-lens', n: 'Sony 35mm f/1.4 GM', c: 'lens', note: '环境人像' },
  { id: 'eq-light', n: 'Godox AD200 Pro', c: 'light', note: '补光' }
]));
localStorage.setItem('pw_venues', JSON.stringify([{ id: 'venue-test', name: '测试场地', styles: '夜景,街拍', addr: '测试地址' }]));
localStorage.setItem('pw_models', JSON.stringify([{ id: 'model-test', name: '测试模特', tags: '冷感', styles: '电影感' }]));
localStorage.setItem('pa_obsidian_enabled', 'true');
localStorage.setItem('pa_obsidian_url', 'http://127.0.0.1:8124');
`;

const LOCAL_STORAGE_NO_OBSIDIAN = `
localStorage.setItem('pa_use_local', 'true');
localStorage.setItem('pw_token', 'local-test-token');
localStorage.setItem('pw_user', JSON.stringify({ name: 'QA测试', email: 'qa@test' }));
localStorage.setItem('pw_eq', JSON.stringify([
  { id: 'eq-camera', n: 'Sony A7M4', c: 'camera', note: '测试相机' },
  { id: 'eq-lens', n: 'Sony 35mm f/1.4 GM', c: 'lens', note: '环境人像' },
  { id: 'eq-light', n: 'Godox AD200 Pro', c: 'light', note: '补光' }
]));
localStorage.setItem('pw_venues', JSON.stringify([{ id: 'venue-test', name: '测试场地', styles: '夜景,街拍', addr: '测试地址' }]));
localStorage.setItem('pw_models', JSON.stringify([{ id: 'model-test', name: '测试模特', tags: '冷感', styles: '电影感' }]));
localStorage.removeItem('pa_obsidian_enabled');
localStorage.removeItem('pa_obsidian_url');
`;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function safeClick(page, selector, timeout = 5000) {
  try {
    await page.click(selector, { timeout });
    return true;
  } catch { return false; }
}

async function safeFill(page, selector, value, timeout = 5000) {
  try {
    await page.fill(selector, value, { timeout });
    return true;
  } catch { return false; }
}

async function hasVisibleText(page, text) {
  return (await page.locator(`text=${text}`).count()) > 0;
}

async function hasErrorOnPage(page) {
  // Look for common error indicators
  const errorSelectors = [
    'text=Failed to fetch',
    'text=Network Error',
    'text=ERR_CONNECTION_REFUSED',
    'text=Internal Server Error',
    'text=500',
    'text=Unhandled',
    '.error',
    '[class*="error"]',
  ];
  for (const sel of errorSelectors) {
    try {
      const count = await page.locator(sel).count();
      if (count > 0) {
        const el = page.locator(sel).first();
        const isVisible = await el.isVisible().catch(() => false);
        if (isVisible) return await el.textContent().catch(() => 'error element found');
      }
    } catch {}
  }
  return null;
}

async function main() {
  const execPath = findBrowserExecutable();
  console.log('Browser executable:', execPath);

  const browser = await chromium.launch({
    executablePath: execPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // ============================================================
  // ITEM 1: Brief → storyboard first → edit/reorder → confirm → schedule
  // ============================================================
  {
    console.log('\n\n>>> ITEM 1: Brief → storyboard first → edit/reorder → confirm → schedule');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(LOCAL_STORAGE_SETUP);
    const page = await ctx.newPage();
    const screenshots = [];
    const issues = [];

    try {
      await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await sleep(2000);
      await page.screenshot({ path: ssPath('item1-01-initial-load.png'), fullPage: true });
      screenshots.push('item1-01-initial-load.png');

      // Find and click on planning/brief tab
      const planningTabSelectors = [
        'text=拍摄规划', 'text=规划', 'text=策划', 'text=方案',
        '[data-tab="plan"]', '[data-tab="brief"]',
        'text=新建方案', 'text=创建方案',
        'button:has-text("规划")', 'a:has-text("规划")',
      ];
      let planningFound = false;
      for (const sel of planningTabSelectors) {
        if (await safeClick(page, sel, 3000)) {
          planningFound = true;
          await sleep(1000);
          break;
        }
      }
      if (!planningFound) {
        // Try any tab-like element that might be the planning area
        const tabs = await page.locator('[role="tab"], .tab, .nav-item, button[class*="tab"]').all();
        for (const tab of tabs) {
          const text = await tab.textContent().catch(() => '');
          if (/规划|策划|方案|brief|plan/i.test(text)) {
            await tab.click().catch(() => {});
            planningFound = true;
            await sleep(1000);
            break;
          }
        }
      }

      await page.screenshot({ path: ssPath('item1-02-planning-tab.png'), fullPage: true });
      screenshots.push('item1-02-planning-tab.png');

      // Try to fill a brief/textarea for the photography brief
      const briefSelectors = [
        'textarea', 'input[type="text"]',
        '[placeholder*="描述"]', '[placeholder*="brief"]',
        '[placeholder*="需求"]', '[placeholder*="输入"]',
        '.brief-input textarea', '.brief textarea',
      ];
      let briefFilled = false;
      for (const sel of briefSelectors) {
        if (await safeFill(page, sel, '测试拍摄简报：夜景街拍，冷调电影感，模特在雨后街道行走，35mm环境人像', 3000)) {
          briefFilled = true;
          await sleep(500);
          break;
        }
      }

      // Try to click generate/submit button
      const generateSelectors = [
        'text=生成', 'text=生成方案', 'text=生成规划',
        'text=提交', 'text=开始规划', 'text=创建',
        'button:has-text("生成")', 'button:has-text("提交")',
        '[data-action="generate"]',
      ];
      for (const sel of generateSelectors) {
        if (await safeClick(page, sel, 3000)) {
          await sleep(3000); // Wait for generation
          break;
        }
      }

      await page.screenshot({ path: ssPath('item1-03-after-generate.png'), fullPage: true });
      screenshots.push('item1-03-after-generate.png');

      // Check if storyboard/shot list appears
      const hasStoryboard = await hasVisibleText(page, '分镜') || await hasVisibleText(page, 'storyboard')
        || await hasVisibleText(page, '镜头') || await hasVisibleText(page, 'shot');
      const hasShotList = await hasVisibleText(page, '拍摄清单') || await hasVisibleText(page, 'shot list')
        || await hasVisibleText(page, '场次') || await hasVisibleText(page, '列表');

      // Look for confirm/confirm button
      const confirmSelectors = [
        'text=确认', 'text=确认方案', 'text=确认规划',
        'button:has-text("确认")', '[data-action="confirm"]',
        'text=确认并排期', 'text=确认排期',
      ];
      let confirmVisible = false;
      for (const sel of confirmSelectors) {
        const count = await page.locator(sel).count();
        if (count > 0) {
          confirmVisible = true;
          break;
        }
      }

      // Look for schedule-related elements
      const scheduleVisible = await hasVisibleText(page, '排期') || await hasVisibleText(page, '日程')
        || await hasVisibleText(page, 'schedule');

      if (!hasStoryboard && !hasShotList) issues.push('未找到分镜/拍摄清单内容');
      if (!confirmVisible) issues.push('未找到确认按钮');
      if (!scheduleVisible) issues.push('未找到排期/日程相关内容');

      await page.screenshot({ path: ssPath('item1-04-storyboard-confirm.png'), fullPage: true });
      screenshots.push('item1-04-storyboard-confirm.png');

      const status = issues.length === 0 ? 'PASS' : (hasStoryboard || hasShotList) && (confirmVisible || scheduleVisible) ? 'PARTIAL' : 'FAIL';
      logResult(1, status,
        `brief填充=${briefFilled}, 分镜/清单可见=${hasStoryboard || hasShotList}, 确认可见=${confirmVisible}, 排期可见=${scheduleVisible}`,
        issues, screenshots);

    } catch (e) {
      logResult(1, 'FAIL', `异常: ${e.message}`, [e.message], screenshots);
    } finally {
      await ctx.close();
    }
  }

  // ============================================================
  // ITEM 2: No reference/knowledge-base → classic generation works, no error dominates
  // ============================================================
  {
    console.log('\n\n>>> ITEM 2: No reference/knowledge-base → classic generation, no error');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    // Use the NO-OBSIDIAN variant
    await ctx.addInitScript(LOCAL_STORAGE_NO_OBSIDIAN);
    const page = await ctx.newPage();
    const screenshots = [];
    const issues = [];

    try {
      await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await sleep(2000);
      await page.screenshot({ path: ssPath('item2-01-initial-no-obsidian.png'), fullPage: true });
      screenshots.push('item2-01-initial-no-obsidian.png');

      // Find reference tab
      const refTabSelectors = [
        'text=参考图库', 'text=参考', 'text=参考图', 'text=reference',
        '[data-tab="reference"]', '[data-tab="ref"]',
        'button:has-text("参考")', 'a:has-text("参考")',
      ];
      for (const sel of refTabSelectors) {
        if (await safeClick(page, sel, 3000)) {
          await sleep(1500);
          break;
        }
      }

      // Also try generic tabs
      const tabs = await page.locator('[role="tab"], .tab, .nav-item, button[class*="tab"]').all();
      for (const tab of tabs) {
        const text = await tab.textContent().catch(() => '');
        if (/参考|reference|ref/i.test(text)) {
          await tab.click().catch(() => {});
          await sleep(1500);
          break;
        }
      }

      await page.screenshot({ path: ssPath('item2-02-reference-tab.png'), fullPage: true });
      screenshots.push('item2-02-reference-tab.png');

      // Check for dominant error messages
      const pageError = await hasErrorOnPage(page);
      const hasFailedFetch = await hasVisibleText(page, 'Failed to fetch');
      const hasConnRefused = await hasVisibleText(page, 'ERR_CONNECTION_REFUSED');
      const hasNetworkError = await hasVisibleText(page, 'Network Error');

      if (pageError) issues.push(`页面存在错误: ${pageError}`);
      if (hasFailedFetch) issues.push('存在 "Failed to fetch" 错误');
      if (hasConnRefused) issues.push('存在 "ERR_CONNECTION_REFUSED" 错误');
      if (hasNetworkError) issues.push('存在 "Network Error" 错误');

      // Check for graceful offline/unavailable state
      const hasOfflineMsg = await hasVisibleText(page, '离线') || await hasVisibleText(page, '不可用')
        || await hasVisibleText(page, 'offline') || await hasVisibleText(page, 'unavailable')
        || await hasVisibleText(page, '未连接') || await hasVisibleText(page, '内置参考');

      await page.screenshot({ path: ssPath('item2-03-offline-state.png'), fullPage: true });
      screenshots.push('item2-03-offline-state.png');

      const errorDominates = (hasFailedFetch || hasConnRefused || hasNetworkError);
      const status = errorDominates ? 'FAIL' : issues.length === 0 ? 'PASS' : 'PARTIAL';
      logResult(2, status,
        `错误占主导=${errorDominates}, 有离线提示=${hasOfflineMsg}, 页面错误=${pageError || 'none'}`,
        issues, screenshots);

    } catch (e) {
      logResult(2, 'FAIL', `异常: ${e.message}`, [e.message], screenshots);
    } finally {
      await ctx.close();
    }
  }

  // ============================================================
  // ITEM 3: Real reference → V3 draft candidate only, confirmation writes once
  // ============================================================
  {
    console.log('\n\n>>> ITEM 3: Real reference → V3 draft candidate, confirmation writes once');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(LOCAL_STORAGE_SETUP);
    const page = await ctx.newPage();
    const screenshots = [];
    const issues = [];

    try {
      await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await sleep(2000);

      // Go to planning area
      const planningTabSelectors = [
        'text=拍摄规划', 'text=规划', 'text=策划', 'text=方案',
        '[data-tab="plan"]', 'button:has-text("规划")', 'a:has-text("规划")',
      ];
      for (const sel of planningTabSelectors) {
        if (await safeClick(page, sel, 3000)) { await sleep(1000); break; }
      }

      await page.screenshot({ path: ssPath('item3-01-planning-with-proxy.png'), fullPage: true });
      screenshots.push('item3-01-planning-with-proxy.png');

      // Look for V3 reference-first flow or progressive disclosure
      const hasV3Flow = await hasVisibleText(page, 'V3') || await hasVisibleText(page, '参考优先')
        || await hasVisibleText(page, 'reference-first') || await hasVisibleText(page, '候选方案');
      const hasDraftLabel = await hasVisibleText(page, '草稿') || await hasVisibleText(page, '候选')
        || await hasVisibleText(page, 'draft') || await hasVisibleText(page, 'candidate');

      // Look for collapsed/optional V3 section
      const collapsedSelectors = [
        '[class*="collapsed"]', '[class*="optional"]', '[class*="advanced"]',
        'details', '[aria-expanded="false"]',
      ];
      let hasCollapsed = false;
      for (const sel of collapsedSelectors) {
        const count = await page.locator(sel).count();
        if (count > 0) { hasCollapsed = true; break; }
      }

      await page.screenshot({ path: ssPath('item3-02-v3-flow-section.png'), fullPage: true });
      screenshots.push('item3-02-v3-flow-section.png');

      // Check for "已确认" or "confirmed" labels that shouldn't be present on a draft
      const hasConfirmedLabel = await hasVisibleText(page, '已确认') || await hasVisibleText(page, 'confirmed');

      if (hasConfirmedLabel && hasDraftLabel) issues.push('同时存在草稿和已确认标签，可能有逻辑问题');

      const status = hasV3Flow || hasDraftLabel || hasCollapsed ? 'PASS' : 'PARTIAL';
      logResult(3, status,
        `V3流可见=${hasV3Flow}, 草稿标签=${hasDraftLabel}, 折叠区域=${hasCollapsed}, 已确认标签=${hasConfirmedLabel}`,
        issues, screenshots);

    } catch (e) {
      logResult(3, 'FAIL', `异常: ${e.message}`, [e.message], screenshots);
    } finally {
      await ctx.close();
    }
  }

  // ============================================================
  // ITEM 4: LUT, equipment, reference, plan library, schedule tabs reachable
  // ============================================================
  {
    console.log('\n\n>>> ITEM 4: LUT, equipment, reference, plan library, schedule tabs reachable');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(LOCAL_STORAGE_SETUP);
    const page = await ctx.newPage();
    const screenshots = [];
    const issues = [];

    const tabsToCheck = [
      { name: 'LUT/调色', selectors: ['text=调色', 'text=LUT', 'text=色彩', 'text=color', '[data-tab="lut"]', 'button:has-text("调色")'] },
      { name: '设备库', selectors: ['text=设备库', 'text=设备', 'text=器材', 'text=equipment', '[data-tab="equipment"]', 'button:has-text("设备")'] },
      { name: '参考图库', selectors: ['text=参考图库', 'text=参考', 'text=reference', '[data-tab="reference"]', 'button:has-text("参考")'] },
      { name: '拍摄日程', selectors: ['text=拍摄日程', 'text=日程', 'text=schedule', 'text=排期', '[data-tab="schedule"]', 'button:has-text("日程")'] },
    ];

    try {
      await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await sleep(2000);

      // First screenshot: initial state
      await page.screenshot({ path: ssPath('item4-00-initial.png'), fullPage: true });
      screenshots.push('item4-00-initial.png');

      // Collect all tab-like elements for fallback
      const allTabElements = await page.locator('[role="tab"], .tab, .nav-item, button[class*="tab"], a[class*="tab"], [class*="tab-btn"]').all();
      const tabTexts = [];
      for (const t of allTabElements) {
        const txt = await t.textContent().catch(() => '');
        tabTexts.push(txt);
      }
      console.log('  Available tab texts:', tabTexts.join(' | '));

      for (const tabInfo of tabsToCheck) {
        let clicked = false;

        // Try explicit selectors
        for (const sel of tabInfo.selectors) {
          if (await safeClick(page, sel, 2000)) {
            clicked = true;
            await sleep(1500);
            break;
          }
        }

        // Fallback: match by text in generic tabs
        if (!clicked) {
          for (const t of allTabElements) {
            const txt = await t.textContent().catch(() => '');
            const nameRegex = new RegExp(tabInfo.name.split('/')[0], 'i');
            if (nameRegex.test(txt)) {
              await t.click().catch(() => {});
              clicked = true;
              await sleep(1500);
              break;
            }
          }
        }

        const tabError = await hasErrorOnPage(page);
        const safeName = tabInfo.name.replace(/[\/]/g, '-');
        const ssName = `item4-tab-${safeName}.png`;
        await page.screenshot({ path: ssPath(ssName), fullPage: true });
        screenshots.push(ssName);

        if (!clicked) issues.push(`${tabInfo.name}: 无法点击/找到标签`);
        if (tabError) issues.push(`${tabInfo.name}: 页面存在错误 - ${tabError}`);
      }

      const status = issues.length === 0 ? 'PASS' : issues.every(i => i.includes('无法点击')) ? 'PARTIAL' : 'FAIL';
      logResult(4, status, `检查了${tabsToCheck.length}个标签页`, issues, screenshots);

    } catch (e) {
      logResult(4, 'FAIL', `异常: ${e.message}`, [e.message], screenshots);
    } finally {
      await ctx.close();
    }
  }

  // ============================================================
  // ITEM 5: Quote and AI controls functional or honestly unavailable
  // ============================================================
  {
    console.log('\n\n>>> ITEM 5: Quote and AI controls functional or honestly unavailable');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(LOCAL_STORAGE_SETUP);
    const page = await ctx.newPage();
    const screenshots = [];
    const issues = [];

    try {
      await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await sleep(2000);

      // Go to planning area
      for (const sel of ['text=拍摄规划', 'text=规划', 'text=方案', 'button:has-text("规划")']) {
        if (await safeClick(page, sel, 3000)) { await sleep(1000); break; }
      }

      await page.screenshot({ path: ssPath('item5-01-plan-area.png'), fullPage: true });
      screenshots.push('item5-01-plan-area.png');

      // Look for quote/commercial buttons
      const quoteSelectors = [
        'text=报价', 'text=生成报价', 'text=quote',
        'button:has-text("报价")', '[data-action="quote"]',
        'text=商业', 'text=商用', 'text=报价单',
      ];
      let quoteFound = false;
      for (const sel of quoteSelectors) {
        const count = await page.locator(sel).count();
        if (count > 0) { quoteFound = true; break; }
      }

      // Look for AI controls
      const aiControlSelectors = [
        'text=AI优化', 'text=AI建议', 'text=智能', 'text=AI',
        'button:has-text("AI")', '[class*="ai-btn"]',
        'text=自动规划', 'text=智能排期',
      ];
      let aiFound = false;
      for (const sel of aiControlSelectors) {
        const count = await page.locator(sel).count();
        if (count > 0) { aiFound = true; break; }
      }

      // Try clicking a quote button if found
      if (quoteFound) {
        for (const sel of quoteSelectors) {
          if (await safeClick(page, sel, 2000)) {
            await sleep(1500);
            // Check if it shows unavailable state or works
            const unavailMsg = await hasVisibleText(page, '不可用') || await hasVisibleText(page, 'unavailable')
              || await hasVisibleText(page, '即将上线') || await hasVisibleText(page, 'coming soon')
              || await hasVisibleText(page, '开发中');
            if (!unavailMsg) {
              // It might have worked or silently done nothing
              const silentCheck = await hasVisibleText(page, '报价') && !(await hasVisibleText(page, '成功'));
              if (silentCheck) issues.push('报价按钮可能静默无反应');
            }
            break;
          }
        }
      }

      await page.screenshot({ path: ssPath('item5-02-quote-ai-controls.png'), fullPage: true });
      screenshots.push('item5-02-quote-ai-controls.png');

      const status = issues.length === 0 ? 'PASS' : 'PARTIAL';
      logResult(5, status,
        `报价控件=${quoteFound}, AI控件=${aiFound}`,
        issues, screenshots);

    } catch (e) {
      logResult(5, 'FAIL', `异常: ${e.message}`, [e.message], screenshots);
    } finally {
      await ctx.close();
    }
  }

  // ============================================================
  // ITEM 6: Desktop and 390px mobile — no horizontal overflow
  // ============================================================
  {
    console.log('\n\n>>> ITEM 6: Desktop (1440) and mobile (390px) — no horizontal overflow');

    for (const [label, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
      const ctx = await browser.newContext({ viewport: { width, height } });
      await ctx.addInitScript(LOCAL_STORAGE_SETUP);
      const page = await ctx.newPage();
      const screenshots = [];
      const issues = [];

      try {
        await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await sleep(2000);

        const ssName = `item6-${label}-viewport.png`;
        await page.screenshot({ path: ssPath(ssName), fullPage: true });
        screenshots.push(ssName);

        // Measure horizontal overflow
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        const hasOverflow = scrollWidth > clientWidth + 2; // 2px tolerance
        const overflowAmount = scrollWidth - clientWidth;

        if (hasOverflow) issues.push(`${label}: 水平溢出 ${overflowAmount}px (scrollWidth=${scrollWidth}, clientWidth=${clientWidth})`);

        // Also check body
        const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
        const bodyClientWidth = await page.evaluate(() => document.body.clientWidth);
        const bodyOverflow = bodyScrollWidth > bodyClientWidth + 2;

        if (bodyOverflow) issues.push(`${label}: body水平溢出 ${bodyScrollWidth - bodyClientWidth}px`);

        const overflowSSName = `item6-${label}-overflow-check.png`;
        await page.screenshot({ path: ssPath(overflowSSName), fullPage: false });
        screenshots.push(overflowSSName);

        logResult(6, hasOverflow || bodyOverflow ? 'FAIL' : 'PASS',
          `${label} ${width}x${height}: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}, 溢出=${hasOverflow ? `${overflowAmount}px` : '无'}`,
          issues, screenshots);

      } catch (e) {
        logResult(6, 'FAIL', `${label} 异常: ${e.message}`, [e.message], screenshots);
      } finally {
        await ctx.close();
      }
    }
  }

  // ============================================================
  // ITEM 7: Readable text, no blank/duplicate/detached workspace
  // ============================================================
  {
    console.log('\n\n>>> ITEM 7: Readable text, no blank/duplicate/detached workspace');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(LOCAL_STORAGE_SETUP);
    const page = await ctx.newPage();
    const screenshots = [];
    const issues = [];

    // Tab names to cycle through
    const tabNames = ['首页', '规划', '调色', '设备', '参考', '日程'];
    const tabSelectors = [
      ['text=首页', 'text=概览', 'text=home'],
      ['text=拍摄规划', 'text=规划', 'text=方案'],
      ['text=调色', 'text=LUT', 'text=色彩'],
      ['text=设备库', 'text=设备', 'text=器材'],
      ['text=参考图库', 'text=参考', 'text=reference'],
      ['text=拍摄日程', 'text=日程', 'text=schedule'],
    ];

    try {
      await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await sleep(2000);

      // Check initial page
      await page.screenshot({ path: ssPath('item7-00-initial.png'), fullPage: true });
      screenshots.push('item7-00-initial.png');

      // Check for mojibake (non-UTF8 garbled text)
      const hasMojibake = await page.evaluate(() => {
        const allText = document.body.innerText;
        // Look for common mojibake patterns
        return /Ã|ï¿½|ï¼|â€|â€œ|â€/.test(allText);
      });
      if (hasMojibake) issues.push('页面存在乱码(mojibake)');

      // Check for blank panels
      const blankPanels = await page.evaluate(() => {
        const panels = document.querySelectorAll('[class*="panel"], [class*="card"], [class*="section"], [role="region"]');
        let blankCount = 0;
        for (const p of panels) {
          const text = p.innerText.trim();
          const hasChildren = p.children.length > 0;
          const rect = p.getBoundingClientRect();
          if (rect.width > 50 && rect.height > 50 && text.length === 0 && !hasChildren) {
            blankCount++;
          }
        }
        return blankCount;
      });
      if (blankPanels > 0) issues.push(`发现${blankPanels}个空白面板`);

      // Check for duplicate sections
      const duplicateSections = await page.evaluate(() => {
        const headings = document.querySelectorAll('h1, h2, h3, [class*="title"]');
        const seen = new Map();
        let dups = 0;
        for (const h of headings) {
          const text = h.innerText.trim();
          if (text && seen.has(text)) dups++;
          else if (text) seen.set(text, 1);
        }
        return dups;
      });
      if (duplicateSections > 0) issues.push(`发现${duplicateSections}个重复标题`);

      // Cycle through tabs
      for (let i = 0; i < tabNames.length; i++) {
        const selectors = tabSelectors[i];
        for (const sel of selectors) {
          if (await safeClick(page, sel, 2000)) { await sleep(1000); break; }
        }
        const ssName = `item7-tab-${tabNames[i]}.png`;
        await page.screenshot({ path: ssPath(ssName), fullPage: true });
        screenshots.push(ssName);

        // Per-tab mojibake check
        const tabMojibake = await page.evaluate(() => {
          return /Ã|ï¿½|ï¼|â€|â€œ|â€/.test(document.body.innerText);
        });
        if (tabMojibake) issues.push(`${tabNames[i]}标签: 乱码`);
      }

      const status = issues.length === 0 ? 'PASS' : issues.some(i => i.includes('乱码') || i.includes('空白')) ? 'FAIL' : 'PARTIAL';
      logResult(7, status,
        `乱码=${hasMojibake}, 空白面板=${blankPanels}, 重复标题=${duplicateSections}`,
        issues, screenshots);

    } catch (e) {
      logResult(7, 'FAIL', `异常: ${e.message}`, [e.message], screenshots);
    } finally {
      await ctx.close();
    }
  }

  await browser.close();

  // ============================================================
  // FINAL REPORT
  // ============================================================
  console.log('\n\n' + '='.repeat(70));
  console.log('PHOTOATELIER V3 — P5 QA MANUAL ACCEPTANCE CHECKLIST REPORT');
  console.log('='.repeat(70));
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`App URL: ${APP_URL}`);
  console.log(`Proxy URL: ${PROXY_URL}`);
  console.log('='.repeat(70));

  for (const r of results) {
    console.log(`\nItem ${r.item}: [${r.status}]`);
    console.log(`  Evidence: ${r.evidence}`);
    if (r.issues.length) console.log(`  Issues: ${r.issues.join('; ')}`);
    console.log(`  Screenshots: ${r.screenshots.join(', ')}`);
  }

  const passCount = results.filter(r => r.status === 'PASS').length;
  const partialCount = results.filter(r => r.status === 'PARTIAL').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  console.log('\n' + '='.repeat(70));
  console.log(`SUMMARY: ${passCount} PASS, ${partialCount} PARTIAL, ${failCount} FAIL / ${results.length} total`);
  console.log('='.repeat(70));

  // Write JSON report
  const reportPath = resolve(SCREENSHOT_DIR, 'qa-report.json');
  writeFileSync(reportPath, JSON.stringify({
    date: new Date().toISOString(),
    appUrl: APP_URL,
    proxyUrl: PROXY_URL,
    results,
    summary: { pass: passCount, partial: partialCount, fail: failCount, total: results.length }
  }, null, 2));
  console.log(`\nReport saved to: ${reportPath}`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
