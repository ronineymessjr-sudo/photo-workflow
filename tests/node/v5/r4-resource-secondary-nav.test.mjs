import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { chromium } from 'playwright-core';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const browserJsPath = path.join(repoRoot, 'tests', 'e2e', 'browser.js');
const htmlPath = path.join(repoRoot, 'legacy', 'index.html');

function findBrowserExecutable() {
  const { findBrowserExecutable: finder } = require(browserJsPath);
  return finder();
}

function startServer(port = 8765) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, ['-e', `
      const http = require('http');
      const fs = require('fs');
      const path = require('path');
      const root = ${JSON.stringify(repoRoot)};
      const server = http.createServer((req, res) => {
        const filePath = path.join(root, req.url === '/' ? '/legacy/index.html' : req.url.split('?')[0]);
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404); res.end('Not found'); return;
          }
          const ext = path.extname(filePath);
          const ct = {
            '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
            '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png'
          }[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': ct });
          res.end(data);
        });
      });
      server.listen(${port}, () => { console.log('ready'); });
    `], { stdio: ['ignore', 'pipe', 'pipe'] });

    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('ready')) {
        resolve({ proc, url: `http://localhost:${port}/legacy/index.html` });
      }
    });

    proc.stderr.on('data', (data) => {
      output += data.toString();
    });

    setTimeout(() => {
      reject(new Error('Server failed to start: ' + output));
    }, 10000);
  });
}

const html = fs.readFileSync(htmlPath, 'utf8');

test('P1 resource secondary nav markup', async (t) => {
  await t.test('primary nav renamed to 拍摄资源', () => {
    assert.ok(html.includes('data-tab="resources"'), 'primary nav data-tab should be resources');
    assert.ok(html.includes('data-i18n="nav.resources">拍摄资源'), 'primary nav label should be 拍摄资源');
  });

  await t.test('secondary nav has five sections', () => {
    const sections = ['summary', 'venue', 'talent', 'equipment', 'lut'];
    for (const section of sections) {
      assert.ok(html.includes(`data-r4-resource-section="${section}"`), `missing secondary nav section ${section}`);
    }
  });

  await t.test('openResourceWorkspace contract exists', () => {
    assert.ok(html.includes('function openResourceWorkspace'), 'openResourceWorkspace should be defined');
    assert.ok(html.includes('function closeResourceWorkspace'), 'closeResourceWorkspace should be defined');
    assert.ok(html.includes('function showResourceSection'), 'showResourceSection should be defined');
  });

  await t.test('module mounts exist for P2-P4', () => {
    const modules = ['summary', 'venue', 'talent', 'equipment', 'lut'];
    for (const m of modules) {
      assert.ok(html.includes(`class="r4-resource-module-mount" data-module="${m}"`), `missing module mount ${m}`);
    }
  });

  await t.test('old equipment-lut functions removed', () => {
    assert.ok(!html.includes('function ensureEquipmentLutModeControls'), 'old ensure function should be removed');
    assert.ok(!html.includes('function showEquipmentLutMode'), 'old show function should be removed');
  });
});

test('compatibility V5 bridge migrates legacy resources before schema v5 resources', () => {
  const bridge = fs.readFileSync(path.join(repoRoot, 'src', 'legacy-v5-bridge.js'), 'utf8');
  const legacyMigration = bridge.indexOf('data.migrateLegacy({ commit: true, returnReport: true })');
  const schemaMigration = bridge.indexOf('application.migration.migrate({');
  assert.ok(legacyMigration >= 0);
  assert.ok(schemaMigration > legacyMigration);
});

test('P1 resource secondary nav browser behavior', { timeout: 60000 }, async (t) => {
  const server = await startServer(8765);
  const executablePath = findBrowserExecutable();
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  try {
    await page.goto(server.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Primary nav click
    const resourcesNav = page.locator('.nav-item[data-tab="resources"]');
    await resourcesNav.click();
    await page.waitForTimeout(200);

    await t.test('shows resource secondary nav after clicking primary nav', async () => {
      const secondaryNav = page.locator('.r4-resource-secondary-nav');
      await assert.doesNotReject(secondaryNav.waitFor({ state: 'visible', timeout: 5000 }));
      const items = await page.locator('.r4-resource-nav-item').count();
      assert.equal(items, 5, 'should have five secondary nav items');
    });

    await t.test('summary is active by default', async () => {
      const summaryContent = page.locator('#r4-resource-summary');
      await assert.doesNotReject(summaryContent.waitFor({ state: 'visible', timeout: 5000 }));
      const isActive = await summaryContent.evaluate(el => el.classList.contains('active'));
      assert.ok(isActive, 'summary content should be active');
    });

    await t.test('clicking venue shows venue content', async () => {
      await page.locator('.r4-resource-nav-item[data-r4-resource-section="venue"]').click();
      await page.waitForTimeout(200);
      const venueContent = page.locator('#resource-venue');
      const isActive = await venueContent.evaluate(el => el.classList.contains('active'));
      assert.ok(isActive, 'venue content should be active');
      const navActive = await page.locator('.r4-resource-nav-item[data-r4-resource-section="venue"]').evaluate(el => el.classList.contains('active'));
      assert.ok(navActive, 'venue nav item should be active');
    });

    await t.test('clicking talent shows talent content', async () => {
      await page.locator('.r4-resource-nav-item[data-r4-resource-section="talent"]').click();
      await page.waitForTimeout(200);
      const talentContent = page.locator('#resource-model');
      const isActive = await talentContent.evaluate(el => el.classList.contains('active'));
      assert.ok(isActive, 'talent content should be active');
    });

    await t.test('clicking equipment shows equipment content', async () => {
      await page.locator('.r4-resource-nav-item[data-r4-resource-section="equipment"]').click();
      await page.waitForTimeout(200);
      const eqContent = page.locator('#resource-eq');
      const isActive = await eqContent.evaluate(el => el.classList.contains('active'));
      assert.ok(isActive, 'equipment content should be active');
    });

    await t.test('clicking lut shows lut content', async () => {
      await page.locator('.r4-resource-nav-item[data-r4-resource-section="lut"]').click();
      await page.waitForTimeout(200);
      const lutContent = page.locator('#r4-resource-lut');
      const isActive = await lutContent.evaluate(el => el.classList.contains('active'));
      assert.ok(isActive, 'lut content should be active');
    });

    await t.test('openResourceWorkspace in select mode shows return bar', async () => {
      await page.evaluate(() => {
        openResourceWorkspace({ section: 'venue', mode: 'select', returnTo: 'brief', returnLabel: '返回 brief' });
      });
      await page.waitForTimeout(200);
      const returnBar = page.locator('#r4ResourceReturnBar');
      const isVisible = await returnBar.evaluate(el => el.style.display !== 'none');
      assert.ok(isVisible, 'return bar should be visible in select mode');
      const label = await page.locator('#r4ResourceReturnLabel').textContent();
      assert.equal(label, '返回 brief', 'return label should match');
    });

    await t.test('closeResourceWorkspace returns to source tab', async () => {
      await page.evaluate(() => closeResourceWorkspace());
      await page.waitForTimeout(200);
      const genTab = page.locator('#tab-gen');
      const isActive = await genTab.evaluate(el => el.classList.contains('active'));
      assert.ok(isActive, 'should return to gen tab when returnTo is brief');
    });
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
