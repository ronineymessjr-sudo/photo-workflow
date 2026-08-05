import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');
const modulePath = path.join(repoRoot, 'src', 'legacy-resource-workspace.js');
const htmlPath = path.join(repoRoot, 'legacy', 'index.html');

function startServer(port = 8876) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, ['-e', `
      const http = require('http');
      const fs = require('fs');
      const path = require('path');
      const root = ${JSON.stringify(repoRoot)};
      const server = http.createServer((req, res) => {
        const clean = req.url.split('?')[0];
        const filePath = path.join(root, clean === '/' ? 'legacy/index.html' : clean);
        fs.readFile(filePath, (error, data) => {
          if (error) { res.writeHead(404); res.end('Not found'); return; }
          const type = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.svg': 'image/svg+xml',
            '.png': 'image/png',
          }[path.extname(filePath)] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': type });
          res.end(data);
        });
      });
      server.listen(${port}, () => console.log('ready'));
    `], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    proc.stdout.on('data', data => {
      output += data.toString();
      if (output.includes('ready')) resolve({ proc, url: `http://localhost:${port}/legacy/index.html` });
    });
    proc.stderr.on('data', data => { output += data.toString(); });
    setTimeout(() => reject(new Error(`Server failed to start: ${output}`)), 10000);
  });
}

test('R4 resource workspace is a V5-only interactive adapter', () => {
  const source = fs.readFileSync(modulePath, 'utf8');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const enhancements = fs.readFileSync(path.join(repoRoot, 'src', 'app-enhancements.js'), 'utf8');
  for (const api of [
    'queries.resourceCatalog.get',
    'catalog.saveVenue',
    'catalog.saveTalentProfile',
    'catalog.addEquipmentItem',
    'catalog.assignResourceToProject',
    'catalog.removeResourceAssignment',
  ]) {
    assert.match(source, new RegExp(api.replaceAll('.', '\\.')));
  }
  assert.doesNotMatch(source, /localStorage|pw_venues|pw_models|pw_eq/);
  assert.match(html, /import\('\.\.\/src\/legacy-resource-workspace\.js'\)/);
  assert.doesNotMatch(html, /function delVenue\(id\).*ss\(SK\.V/s);
  assert.doesNotMatch(html, /function delModel\(id\).*ss\(SK\.M/s);
  assert.doesNotMatch(html, /function delEq\(id\).*ss\(SK\.EQ/s);
  assert.match(enhancements, /function v5ResourceCatalog/);
  assert.match(enhancements, /application\.queries\.resourceCatalog\.get/);
  assert.doesNotMatch(enhancements, /function matchEquipment|function scoreResource|function quickAddPlanResource/);
  assert.match(source, /function ensureSectionMounts/);
  assert.match(source, /registerSourceProvider/);
  assert.match(source, /importProviderRecord/);
  assert.match(source, /portfolioUrls: splitLines/);

  const serviceWorker = fs.readFileSync(path.join(repoRoot, 'sw.js'), 'utf8');
  assert.match(serviceWorker, /legacy-resource-workspace\.js/);
  assert.match(serviceWorker, /const IS_LOCAL = \['127\.0\.0\.1', 'localhost'\]/);
  assert.match(serviceWorker, /if \(IS_LOCAL\) \{\s*event\.respondWith\(fetch\(event\.request\)/);
});

test('R4 resource workspace saves, assigns, removes and reuses resources', { timeout: 90000 }, async () => {
  const server = await startServer();
  const { findBrowserExecutable } = require(path.join(repoRoot, 'tests', 'e2e', 'browser.js'));
  const browser = await chromium.launch({ headless: true, executablePath: findBrowserExecutable() });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript(() => {
    localStorage.setItem('pa_use_local', 'true');
    localStorage.setItem('pw_token', 'local-test-token');
    localStorage.setItem('pw_user', JSON.stringify({ name: '本地用户', email: 'user@local' }));
    localStorage.setItem('pw_role', 'photographer');
  });

  try {
    await page.goto(server.url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.PhotoAtelierV5?.ready && window.PhotoAtelierResourceWorkspace);
    await page.locator('.nav-item[data-tab="resources"]').click();

    await page.locator('.r4-resource-nav-item[data-r4-resource-section="venue"]').click();
    await page.getByRole('button', { name: '添加场地', exact: true }).click();
    const venueForm = page.locator('[data-r4-resource-form="venue"]');
    await venueForm.locator('[name="name"]').fill('R4 测试摄影棚');
    await venueForm.locator('[name="address"]').fill('上海市徐汇区');
    await venueForm.locator('[name="features"]').fill('白墙, 南向窗');
    await venueForm.locator('button[type="submit"]').click();
    await assert.doesNotReject(page.getByText('R4 测试摄影棚', { exact: true }).first().waitFor());

    await page.getByText('R4 测试摄影棚', { exact: true }).first().click();
    await page.locator('#resource-venue [data-r4-resource-select]').click();
    await assert.doesNotReject(page.getByText(/已用于当前方案/).waitFor());
    await page.locator('#resource-venue [data-r4-resource-remove]').click();
    await assert.doesNotReject(page.getByText('R4 测试摄影棚', { exact: true }).first().waitFor());
    assert.equal(await page.locator('#resource-venue [data-r4-resource-remove]').count(), 0);

    await page.locator('.r4-resource-nav-item[data-r4-resource-section="talent"]').click();
    await page.getByRole('button', { name: '添加人员', exact: true }).click();
    const talentForm = page.locator('[data-r4-resource-form="talent"]');
    await talentForm.locator('[name="displayName"]').fill('R4 待授权人员');
    await talentForm.locator('[name="consentStatus"]').selectOption('denied');
    await talentForm.locator('button[type="submit"]').click();
    await page.getByText('R4 待授权人员', { exact: true }).first().click();
    assert.equal(await page.locator('#resource-model [data-r4-resource-select]').isDisabled(), true);
    await assert.doesNotReject(page.getByText(/拒绝授权/).last().waitFor());

    await page.locator('.r4-resource-nav-item[data-r4-resource-section="equipment"]').click();
    await page.getByRole('button', { name: '添加设备', exact: true }).click();
    const equipmentForm = page.locator('[data-r4-resource-form="equipment"]');
    await equipmentForm.locator('[name="name"]').fill('自定义轻量灯架');
    await equipmentForm.locator('[name="quantity"]').fill('2');
    await equipmentForm.locator('button[type="submit"]').click();
    await page.locator('#resource-eq').getByText('自定义轻量灯架', { exact: true }).first().click();
    await page.locator('#resource-eq [data-r4-assignment-quantity]').fill('2');
    await page.locator('#resource-eq [data-r4-assignment-required]').check();
    await page.locator('#resource-eq [data-r4-resource-select]').click();
    await assert.doesNotReject(page.getByText(/2 件 · 必需/).waitFor());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.PhotoAtelierV5?.ready && window.PhotoAtelierResourceWorkspace);
    await page.locator('.nav-item[data-tab="resources"]').click();
    await page.locator('.r4-resource-nav-item[data-r4-resource-section="equipment"]').click();
    await page.locator('#resource-eq').getByText('自定义轻量灯架', { exact: true }).first().click();
    await assert.doesNotReject(page.getByText(/2 件 · 必需/).waitFor());

    await page.locator('.r4-resource-nav-item[data-r4-resource-section="lut"]').click();
    assert.equal(await page.locator('#r4-resource-lut #tab-lut').count(), 1);
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
