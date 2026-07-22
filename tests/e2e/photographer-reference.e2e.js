const { chromium } = require('playwright-core');
const { findBrowserExecutable } = require('./browser');
const fs = require('node:fs');
const path = require('node:path');

const baseUrl = process.argv[2] || process.env.PHOTOATELIER_URL || 'http://127.0.0.1:8123/';
const reportDir = path.resolve('artifacts/photographer-reference-qa');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function enterWorkspace(page) {
  await page.goto(new URL('legacy/?mode=public-beta', baseUrl).href, { waitUntil: 'domcontentloaded' });
  const roleButton = page.locator('button[onclick="enterApp(\'photographer\')"]');
  if (await roleButton.isVisible().catch(() => false)) await roleButton.click();
  await page.locator('[data-tab="reference"]').waitFor({ state: 'visible' });
}

async function inspectReferencePage(page, label) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  await enterWorkspace(page);
  await page.evaluate(() => showTab('reference'));
  await page.locator('#easyReferenceTitle').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelectorAll('#easyReferenceGallery .reference-photo-card').length >= 12);
  await page.waitForFunction(() => [...document.querySelectorAll('#easyReferenceGallery img')].every(image => image.complete && image.naturalWidth > 0));

  const metrics = await page.evaluate(() => ({
    cards: document.querySelectorAll('#easyReferenceGallery .reference-photo-card').length,
    loadedImages: [...document.querySelectorAll('#easyReferenceGallery img')].filter(image => image.naturalWidth > 0).length,
    title: document.querySelector('#easyReferenceTitle')?.textContent.trim(),
    upload: Boolean(document.querySelector('#easyReferenceUpload')),
    advancedOpen: Boolean(document.querySelector('.reference-advanced-tools')?.open),
    localPanel: Boolean(document.querySelector('#liveLocalLibrary')),
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflowers: [...document.querySelectorAll('body *')].map(element => ({
      tag: element.tagName,
      id: element.id,
      className: typeof element.className === 'string' ? element.className : '',
      right: Math.round(element.getBoundingClientRect().right),
      width: Math.round(element.getBoundingClientRect().width),
    })).filter(item => item.right > document.documentElement.clientWidth + 1).slice(0, 8),
    layout: ['html', 'body', '.app-layout', '.main-content', '.mobile-header', '.top-header', '#tab-reference', '.reference-easy-header', '#easyReferenceTitle', '.reference-easy-header p'].map(selector => {
      const element = document.querySelector(selector);
      const rect = element?.getBoundingClientRect();
      const style = element ? getComputedStyle(element) : null;
      return { selector, top: Math.round(rect?.top || 0), height: Math.round(rect?.height || 0), left: Math.round(rect?.left || 0), width: Math.round(rect?.width || 0), cssWidth: style?.width, display: style?.display };
    }),
  }));
  assert(metrics.title === '找参考图', `${label}: photographer-facing title missing`);
  assert(metrics.cards >= 12 && metrics.loadedImages >= 12, `${label}: real reference images missing`);
  assert(metrics.upload, `${label}: upload control missing`);
  assert(!metrics.advancedOpen, `${label}: advanced database should be collapsed`);
  assert(!metrics.localPanel, `${label}: personal local library panel should not load by default`);
  assert(metrics.scrollWidth <= metrics.width, `${label}: horizontal overflow ${metrics.scrollWidth}/${metrics.width} ${JSON.stringify(metrics.overflowers)}`);

  await page.getByRole('button', { name: '坐姿', exact: true }).click();
  const filtered = await page.locator('#easyReferenceGallery .reference-photo-card').count();
  assert(filtered > 0 && filtered < metrics.cards, `${label}: quick pose filter did not narrow results`);

  await page.getByRole('button', { name: '开放图库', exact: true }).click();
  assert(await page.locator('#easyReferenceOpenSources .reference-open-source').count() === 4, `${label}: open library choices missing`);
  await page.getByRole('button', { name: '推荐图片', exact: true }).click();

  await page.evaluate(() => showTab('settings'));
  await page.locator('#personalLibrarySummary').waitFor({ state: 'visible' });
  assert((await page.locator('#personalLibrarySummary').textContent()).includes('不影响方案生成'), `${label}: optional-library explanation missing`);
  assert(!(await page.locator('#settingsObsidianUrl').isVisible()), `${label}: API field visible before advanced settings are opened`);
  assert(!(await page.locator('#settingsObsidianHelperUrl').isVisible()), `${label}: helper service field visible before advanced settings are opened`);
  assert(errors.length === 0, `${label}: page errors: ${errors.join('; ')}`);
  return metrics;
}

(async () => {
  fs.mkdirSync(reportDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: findBrowserExecutable() });
  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    await inspectReferencePage(desktop, 'desktop');
    await desktop.evaluate(() => showTab('reference'));
    await desktop.evaluate(() => setEasyReferenceFilter(''));
    await desktop.screenshot({ path: path.join(reportDir, 'reference-desktop.png'), fullPage: false, animations: 'disabled' });

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await inspectReferencePage(mobile, 'mobile');
    await mobile.evaluate(() => showTab('reference'));
    await mobile.evaluate(() => setEasyReferenceFilter(''));
    await mobile.screenshot({ path: path.join(reportDir, 'reference-mobile.png'), fullPage: false, animations: 'disabled' });
    console.log('Photographer reference UX checks passed at 1440px and 390px.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
