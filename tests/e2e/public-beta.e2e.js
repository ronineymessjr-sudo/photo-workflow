const { chromium } = require('playwright-core');
const { findBrowserExecutable } = require('./browser');
const fs = require('node:fs');
const path = require('node:path');

const baseUrl = process.argv[2] || process.env.PHOTOATELIER_URL || 'http://127.0.0.1:8123/';
const reportDir = path.resolve('artifacts/public-beta-qa');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function inspectLanding(page, label, route = '', expectedLanguage = 'zh-CN', verifyProductImage = true) {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(new URL(route, baseUrl).href, { waitUntil: 'domcontentloaded' });
  await page.locator('.hero').waitFor({ state: 'visible' });
  if (verifyProductImage) {
    await page.waitForFunction(() => {
      const image = document.querySelector('.product-visual img');
      return image?.complete && image.naturalWidth > 0;
    });
  }
  const metrics = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.trim(),
    language: document.documentElement.lang,
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    cta: document.querySelector('[data-track="open_public_beta"]')?.getAttribute('href'),
    feedbackForm: Boolean(document.querySelector('[data-feedback-form]')),
    visibleNav: [...document.querySelectorAll('.site-header nav a')]
      .filter(item => getComputedStyle(item).display !== 'none').map(item => item.textContent.trim()),
  }));
  assert(metrics.title.includes('PhotoAtelier'), `${label}: title missing`);
  assert(metrics.h1 === 'PhotoAtelier', `${label}: H1 mismatch`);
  assert(metrics.language === expectedLanguage, `${label}: language mismatch ${metrics.language}`);
  assert(metrics.scrollWidth <= metrics.width, `${label}: horizontal overflow ${metrics.scrollWidth}/${metrics.width}`);
  const expectedCta = expectedLanguage === 'zh-CN'
    ? '/legacy/?mode=public-beta'
    : `/legacy/?mode=public-beta&lang=${expectedLanguage}`;
  assert(metrics.cta === expectedCta, `${label}: CTA target mismatch`);
  assert(metrics.feedbackForm, `${label}: feedback form missing`);
  assert(pageErrors.length === 0, `${label}: page errors: ${pageErrors.join('; ')}`);
  return metrics;
}

(async () => {
  fs.mkdirSync(reportDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: findBrowserExecutable() });
  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    const desktopMetrics = await inspectLanding(desktop, 'desktop');
    await desktop.screenshot({ path: path.join(reportDir, 'landing-desktop.png'), fullPage: true, animations: 'disabled' });

    for (const locale of [
      { route: 'en/', language: 'en', phrase: 'Turn visual ideas into plans you can actually shoot.' },
      { route: 'ja/', language: 'ja', phrase: 'アイデアを、実際に撮れるプランへ。' },
      { route: 'ko/', language: 'ko', phrase: '아이디어를 실제 촬영 가능한 플랜으로.' },
    ]) {
      const localized = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
      await inspectLanding(localized, locale.language, locale.route, locale.language, false);
      assert((await localized.locator('.hero-copy').textContent()).trim() === locale.phrase, `${locale.language}: body translation missing`);
      if (locale.language === 'en') await localized.screenshot({ path: path.join(reportDir, 'landing-en-desktop.png'), fullPage: true, animations: 'disabled' });
      await localized.close();
    }

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const mobileMetrics = await inspectLanding(mobile, 'mobile');
    assert(mobileMetrics.visibleNav.length === 1 && mobileMetrics.visibleNav[0] === '反馈', 'mobile: compact navigation not applied');
    await mobile.screenshot({ path: path.join(reportDir, 'landing-mobile.png'), fullPage: false, animations: 'disabled' });

    const app = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    await app.goto(new URL('legacy/?mode=public-beta&lang=en', baseUrl).href, { waitUntil: 'domcontentloaded' });
    const feedbackButton = app.getByRole('button', { name: 'Submit product feedback' });
    await feedbackButton.waitFor({ state: 'visible' });
    if (!(await app.locator('#appLanguage').isVisible())) {
      const photographer = app.locator('button[onclick="enterApp(\'photographer\')"]');
      await photographer.waitFor({ state: 'visible' });
      assert((await photographer.textContent()).trim() === 'Photographer', 'app: first-run role selector was not localized');
      await photographer.click();
    }
    await app.locator('#appLanguage').waitFor({ state: 'visible' });
    assert((await app.locator('[data-tab="reference"] .nav-label').textContent()).trim() === 'References', 'app: English navigation missing');
    await app.locator('#appLanguage').selectOption('ja');
    assert((await app.locator('[data-tab="reference"] .nav-label').textContent()).trim() === 'リファレンス', 'app: Japanese language switch failed');
    await app.locator('#appLanguage').selectOption('en');
    await app.screenshot({ path: path.join(reportDir, 'workspace-en.png'), fullPage: false, animations: 'disabled' });
    await feedbackButton.click();
    const dialog = app.locator('.pa-beta-feedback-dialog');
    assert(await dialog.getAttribute('open') !== null, 'app: feedback dialog did not open');
    assert(await dialog.locator('textarea[name="friction"]').count() === 1, 'app: feedback fields missing');
    await dialog.screenshot({ path: path.join(reportDir, 'feedback-dialog.png'), animations: 'disabled' });

    fs.writeFileSync(path.join(reportDir, 'results.json'), JSON.stringify({ desktop: desktopMetrics, mobile: mobileMetrics }, null, 2));
    console.log('Public beta browser checks passed at 1440px and 390px.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
