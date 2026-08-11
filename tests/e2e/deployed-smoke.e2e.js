const { chromium } = require('playwright-core');
const { findBrowserExecutable } = require('./browser');

const landingUrl = process.env.PHOTOATELIER_DEPLOY_URL || 'https://photoatelier.pages.dev/';
const workspaceUrl = process.env.PHOTOATELIER_WORKSPACE_URL
  || new URL('/legacy/?mode=public-beta&refresh=deployed-smoke', landingUrl).toString();
const executablePath = findBrowserExecutable();
let browser;

(async () => {
  browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.stack || error.message));
  page.on('console', message => {
    if (message.type() === 'error') pageErrors.push('console: ' + message.text());
  });
  page.on('requestfailed', request => {
    const errorText = request.failure()?.errorText || '';
    if (request.url().includes('cloudflareinsights.com') || errorText === 'net::ERR_ABORTED') return;
    pageErrors.push('request: ' + request.url() + ' ' + errorText);
  });

  await page.goto(landingUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('a[href="/legacy/?mode=public-beta"]', { timeout: 30000 });
  if (!(await page.title()).includes('PhotoAtelier')) throw new Error('landing page title missing');
  const landingOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (landingOverflow) throw new Error('deployed landing page has horizontal overflow');

  await page.goto(workspaceUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('#loginOverlay').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#loginOverlay .auth-guest').click();
  await page.waitForSelector('.nav-item[data-tab="gen"]', { state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1200);
  const navCount = await page.locator('.sidebar .nav-item').count();
  if (navCount !== 6) throw new Error('expected 6 legacy nav items, got ' + navCount);
  const navLabels = await page.locator('.sidebar .nav-label').allTextContents();
  for (const label of ['方案库', '新建方案', '参考图库', '拍摄日程', '拍摄资源', '设置']) {
    if (!navLabels.some(value => value.trim() === label)) throw new Error('missing primary nav: ' + label);
  }
  const apiDefaults = await page.evaluate(() => ({
    old: document.documentElement.innerHTML.includes('https://photoatelier-api.photomagic.workers.dev'),
    current: document.documentElement.innerHTML.includes('https://photoatelier-v2-api.photomagic.workers.dev'),
  }));
  if (apiDefaults.old || !apiDefaults.current) throw new Error('legacy page API default is not the current Worker');

  await page.locator('.nav-item[data-tab="resources"]').click();
  await page.waitForTimeout(250);
  if (!await page.locator('.nav-item[data-tab="resources"].active').count()) {
    throw new Error('resources navigation did not activate');
  }

  const workspaceOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (workspaceOverflow) throw new Error('deployed workspace has horizontal overflow');
  if (pageErrors.length) throw new Error('deployed page errors: ' + pageErrors.join(' | '));

  console.log(JSON.stringify({
    ok: true,
    landingUrl,
    workspaceUrl,
    navCount,
    landingOverflow,
    workspaceOverflow,
    apiDefault: 'photoatelier-v2-api.photomagic.workers.dev',
  }, null, 2));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await browser?.close();
});
