import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { chromium } from 'playwright-core';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const cssPath = path.join(repoRoot, 'src', 'r4-design-system.css');
const jsPath = path.join(repoRoot, 'src', 'r4-icon-system.js');
const browserJsPath = path.join(repoRoot, 'tests', 'e2e', 'browser.js');

function findBrowserExecutable() {
  const { findBrowserExecutable: finder } = require(browserJsPath);
  return finder();
}

const css = fs.readFileSync(cssPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');

function tokenExists(token) {
  return css.includes(token);
}

function extractRadiusValues() {
  const values = [];
  const regex = /border-radius:\s*([^;]+);/g;
  let match;
  while ((match = regex.exec(css)) !== null) {
    values.push(match[1].trim());
  }
  return values;
}

test('R4 design system tokens', async (t) => {
  await t.test('defines all required color tokens', () => {
    const required = [
      '--r4-surface-canvas',
      '--r4-surface-raised',
      '--r4-surface-pressed',
      '--r4-border-subtle',
      '--r4-text-primary',
      '--r4-text-secondary',
      '--r4-text-tertiary',
      '--r4-action-primary',
      '--r4-status-warning',
      '--r4-status-danger',
      '--r4-status-success',
    ];
    for (const token of required) {
      assert.ok(tokenExists(token), `missing color token ${token}`);
    }
  });

  await t.test('defines typography and spacing tokens', () => {
    assert.ok(tokenExists('--r4-font-family'));
    assert.ok(tokenExists('--r4-letter-spacing'));
    assert.ok(tokenExists('--r4-type-page'));
    assert.ok(tokenExists('--r4-type-section'));
    assert.ok(tokenExists('--r4-type-shot'));
    assert.ok(tokenExists('--r4-type-body'));
    assert.ok(tokenExists('--r4-type-label'));
    assert.ok(tokenExists('--r4-type-metadata'));
    assert.ok(tokenExists('--r4-space-4'));
    assert.ok(tokenExists('--r4-space-8'));
    assert.ok(tokenExists('--r4-space-16'));
    assert.ok(tokenExists('--r4-space-24'));
    assert.ok(tokenExists('--r4-space-32'));
  });

  await t.test('defines radius and control tokens', () => {
    assert.ok(tokenExists('--r4-radius-0'));
    assert.ok(tokenExists('--r4-radius-8'));
    assert.ok(tokenExists('--r4-radius-16'));
    assert.ok(tokenExists('--r4-radius-full'));
    assert.ok(tokenExists('--r4-control-36'));
    assert.ok(tokenExists('--r4-control-40'));
    assert.ok(tokenExists('--r4-control-44'));
  });

  await t.test('defines motion and elevation tokens', () => {
    assert.ok(tokenExists('--r4-duration-fast'));
    assert.ok(tokenExists('--r4-duration-base'));
    assert.ok(tokenExists('--r4-ease-out'));
    assert.ok(tokenExists('--r4-shadow-sheet'));
  });

  await t.test('exposes light mode and high contrast variants', () => {
    assert.ok(css.includes('prefers-color-scheme: light'));
    assert.ok(css.includes('prefers-contrast: more'));
  });
});

test('R4 design system acceptance', async (t) => {
  await t.test('does not use purple or neon cyan in product chrome', () => {
    const forbiddenColors = ['#8b5cf6', '#a855f7', '#d946ef', '#c026d3', '#7c3aed', '#06b6d4', '#22d3ee', '#67e8f9'];
    for (const color of forbiddenColors) {
      assert.ok(!css.toLowerCase().includes(color), `forbidden color ${color} found`);
    }
  });

  await t.test('does not contain emoji characters', () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]/u;
    assert.ok(!emojiRegex.test(css), 'emoji found in CSS');
    assert.ok(!emojiRegex.test(js), 'emoji found in JS');
  });

  await t.test('does not use negative letter spacing', () => {
    assert.ok(!css.includes('letter-spacing: -'), 'negative letter-spacing found');
  });

  await t.test('keeps border-radius within permitted rules', () => {
    const values = extractRadiusValues();
    for (const value of values) {
      const numeric = parseFloat(value);
      if (!Number.isNaN(numeric) && value.includes('px')) {
        assert.ok(
          numeric <= 16 || value.includes('999') || value.includes('full'),
          `border-radius ${value} exceeds permitted 16px`
        );
      }
    }
  });

  await t.test('supports reduced motion', () => {
    assert.ok(css.includes('prefers-reduced-motion: reduce'));
  });

  await t.test('provides a 44x44 mobile touch target class', () => {
    assert.ok(css.includes('.r4-touch-target'));
    assert.ok(css.includes('min-width: 44px'));
    assert.ok(css.includes('min-height: 44px'));
  });
});

test('R4 shared component classes', async (t) => {
  const required = [
    '.r4-btn',
    '.r4-btn-primary',
    '.r4-btn-secondary',
    '.r4-btn-quiet',
    '.r4-btn-destructive',
    '.r4-btn-icon',
    '.r4-btn-loading',
    '.r4-segmented',
    '.r4-field',
    '.r4-input',
    '.r4-menu',
    '.r4-sheet',
    '.r4-toast',
    '.r4-status',
    '.r4-empty-state',
    '.r4-toolbar',
    '.r4-nav-item',
    '.r4-reference-tile',
    '.r4-shot-row',
  ];
  for (const selector of required) {
    await t.test(`includes ${selector}`, () => {
      assert.ok(css.includes(`${selector}`), `missing component class ${selector}`);
    });
  }
});

test('R4 icon system', async (t) => {
  await t.test('exports semantic icon mapping', () => {
    assert.ok(js.includes('ClipboardList'));
    assert.ok(js.includes('Images'));
    assert.ok(js.includes('CalendarDays'));
    assert.ok(js.includes('Camera'));
    assert.ok(js.includes('Palette'));
    assert.ok(js.includes('ExternalLink'));
  });

  await t.test('provides createIcon, refreshIcons, and registerIcon', () => {
    assert.ok(js.includes('createIcon'));
    assert.ok(js.includes('refreshIcons'));
    assert.ok(js.includes('registerIcon'));
    assert.ok(js.includes('PhotoAtelierR4IconSystem'));
  });

  await t.test('does not use emoji in icon system', () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]/u;
    assert.ok(!emojiRegex.test(js));
  });
});

test('R4 component-state screenshot', async () => {
  const executablePath = findBrowserExecutable();
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } });

  const cssContent = css.replace(/`/g, '\\`');
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>R4 Component State Sheet</title>
<style>
  body { margin: 0; }
  .sheet { padding: 32px; }
  .group { margin-bottom: 32px; }
  .group-title { margin: 0 0 16px; }
  .row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
  .dark-box { background: var(--r4-surface-raised); padding: 16px; border-radius: 8px; }
</style>
<style>${cssContent}</style>
</head>
<body class="r4-root">
<div class="sheet">
  <h1 class="r4-type-page group-title">R4 Component State Sheet</h1>

  <div class="group">
    <h2 class="r4-type-section group-title">Buttons</h2>
    <div class="row">
      <button class="r4-btn r4-btn-primary">Primary</button>
      <button class="r4-btn r4-btn-secondary">Secondary</button>
      <button class="r4-btn r4-btn-quiet">Quiet</button>
      <button class="r4-btn r4-btn-destructive">Destructive</button>
      <button class="r4-btn r4-btn-primary" disabled>Disabled</button>
      <button class="r4-btn r4-btn-primary r4-btn-loading">Loading</button>
    </div>
  </div>

  <div class="group">
    <h2 class="r4-type-section group-title">Icon Buttons</h2>
    <div class="row">
      <button class="r4-btn r4-btn-icon r4-btn-secondary" aria-label="Search">S</button>
      <button class="r4-btn r4-btn-icon r4-btn-primary" aria-label="Add">+</button>
      <button class="r4-btn r4-btn-icon r4-btn-quiet" aria-label="More">…</button>
    </div>
  </div>

  <div class="group">
    <h2 class="r4-type-section group-title">Segmented Control</h2>
    <div class="r4-segmented" role="tablist">
      <button aria-selected="true">Brief</button>
      <button>Shots</button>
      <button>Resources</button>
    </div>
  </div>

  <div class="group">
    <h2 class="r4-type-section group-title">Fields</h2>
    <div class="row">
      <div class="r4-field">
        <label class="r4-field-label">Theme</label>
        <input class="r4-input" type="text" placeholder="Enter theme">
      </div>
      <div class="r4-field">
        <label class="r4-field-label">Style</label>
        <select class="r4-select"><option>Film</option><option>Clean</option></select>
      </div>
    </div>
  </div>

  <div class="group">
    <h2 class="r4-type-section group-title">Menu</h2>
    <div class="r4-menu" role="menu">
      <button class="r4-menu-item" role="menuitem">Open shot</button>
      <button class="r4-menu-item" role="menuitem">Duplicate</button>
      <button class="r4-menu-item" role="menuitem" aria-disabled="true">Delete</button>
    </div>
  </div>

  <div class="group">
    <h2 class="r4-type-section group-title">Toast & Status</h2>
    <div class="row">
      <div class="r4-toast r4-toast-success">Shot saved</div>
      <div class="r4-toast r4-toast-warning">Check lens data</div>
      <div class="r4-toast r4-toast-danger">Connection lost</div>
      <span class="r4-status r4-status-success"><span class="r4-status-dot"></span>Ready</span>
      <span class="r4-status r4-status-warning"><span class="r4-status-dot"></span>Attention</span>
    </div>
  </div>

  <div class="group">
    <h2 class="r4-type-section group-title">Empty State</h2>
    <div class="r4-empty-state">
      <div class="r4-empty-state-title">No references yet</div>
      <div class="r4-empty-state-body">Add images or choose a starter collection.</div>
      <button class="r4-btn r4-btn-primary">Add reference</button>
    </div>
  </div>

  <div class="group">
    <h2 class="r4-type-section group-title">Toolbar</h2>
    <div class="r4-toolbar">
      <button class="r4-btn r4-btn-icon r4-btn-secondary" aria-label="Fit">F</button>
      <button class="r4-btn r4-btn-icon r4-btn-secondary" aria-label="Compare">C</button>
      <button class="r4-btn r4-btn-icon r4-btn-secondary" aria-label="Grid">G</button>
      <button class="r4-btn r4-btn-icon r4-btn-secondary" aria-label="Info">I</button>
      <button class="r4-btn r4-btn-icon r4-btn-secondary" aria-label="More">…</button>
    </div>
  </div>

  <div class="group">
    <h2 class="r4-type-section group-title">Navigation Item</h2>
    <div class="dark-box" style="width: 216px;">
      <button class="r4-nav-item">Plans</button>
      <button class="r4-nav-item r4-selected" aria-current="page">References</button>
      <button class="r4-nav-item">Schedule</button>
    </div>
  </div>

  <div class="group">
    <h2 class="r4-type-section group-title">Shot Row</h2>
    <div class="r4-shot-row">
      <div class="r4-type-metadata">01</div>
      <div>
        <div class="r4-type-shot">Portrait by window</div>
        <div class="r4-type-metadata" style="color: var(--r4-text-tertiary);">50mm · soft light</div>
      </div>
      <div class="r4-status r4-status-success"><span class="r4-status-dot"></span>Done</div>
    </div>
  </div>
</div>
</body>
</html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const screenshotDir = path.join(repoRoot, 'screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, 'r4-component-state-sheet.png');

  await page.screenshot({ path: screenshotPath, fullPage: true });
  await browser.close();

  assert.ok(fs.existsSync(screenshotPath), 'screenshot was not created');
  const stats = fs.statSync(screenshotPath);
  assert.ok(stats.size > 0, 'screenshot file is empty');
  console.log('screenshot saved to', screenshotPath);
});
