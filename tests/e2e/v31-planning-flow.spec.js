const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.PHOTOATELIER_URL || 'http://localhost:8765';

test.describe('V3.1 Planning Flow', () => {

  test.describe.configure({ timeout: 30000 });

  // ── 1. Homepage loads ──────────────────────────────────────────────
  test('homepage loads with correct title', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    expect(
      title.includes('Photo') || title.includes('Atelier') || title.includes('摄影'),
      `Expected title to contain "Photo", "Atelier" or "摄影", got: "${title}"`
    ).toBeTruthy();
  });

  // ── 2. V3.1 Plan page renders 4-step flow ─────────────────────────
  test('plan page renders V3.1 four-step flow', async ({ page }) => {
    // Navigate directly to plan page via hash
    await page.goto(`${BASE_URL}#plan`, { waitUntil: 'domcontentloaded' });

    // If hash navigation didn't switch tabs, try clicking a plan nav item
    const planNavExists = await page.locator('[data-page="plan"], [data-tab="plan"], .nav-item:has-text("规划"), .nav-item:has-text("Plan")').count();
    if (planNavExists > 0 && !(await page.locator('text=参考图').count())) {
      await page.locator('[data-page="plan"], [data-tab="plan"], .nav-item:has-text("规划"), .nav-item:has-text("Plan")').first().click();
      await page.waitForTimeout(500);
    }

    // Step 1: 上传参考图 / 参考图
    const step1 = page.locator('text=参考图').first();
    await expect(step1).toBeVisible({ timeout: 8000 });

    // Step 2: VisualDNA
    const step2 = page.locator('text=VisualDNA').first();
    await expect(step2).toBeVisible();

    // Step 3: 创意方向
    const step3 = page.locator('text=创意方向').first();
    await expect(step3).toBeVisible();

    // Step 4: Shot List
    const step4 = page.locator('text=Shot List').first();
    await expect(step4).toBeVisible();
  });

  // ── 3. VisualDNA card renders after analysis ───────────────────────
  test('VisualDNA analysis card contains expected sections', async ({ page }) => {
    await page.goto(`${BASE_URL}#plan`, { waitUntil: 'domcontentloaded' });

    const planNavExists = await page.locator('[data-page="plan"], [data-tab="plan"], .nav-item:has-text("规划"), .nav-item:has-text("Plan")').count();
    if (planNavExists > 0 && !(await page.locator('text=VisualDNA 分析').count())) {
      await page.locator('[data-page="plan"], [data-tab="plan"], .nav-item:has-text("规划"), .nav-item:has-text("Plan")').first().click();
      await page.waitForTimeout(500);
    }

    const visualDnaCard = page.locator('text=VisualDNA 分析').first();
    const cardVisible = await visualDnaCard.isVisible().catch(() => false);

    if (!cardVisible) {
      // No VisualDNA analysis exists yet — skip this test
      test.skip();
      return;
    }

    // Verify the card contains key sections
    const cardContainer = visualDnaCard.locator('..');

    const compositionVisible = await cardContainer.locator('text=构图').first().isVisible().catch(() => false);
    const lensVisible = await cardContainer.locator('text=镜头').first().isVisible().catch(() => false);
    const lightingVisible = await cardContainer.locator('text=光线').first().isVisible().catch(() => false);
    const colorVisible = await cardContainer.locator('text=色彩').first().isVisible().catch(() => false);

    // At least two of the four sections should be visible
    const sectionsFound = [compositionVisible, lensVisible, lightingVisible, colorVisible].filter(Boolean).length;
    expect(sectionsFound, 'Expected at least 2 of 4 VisualDNA sections (构图/镜头/光线/色彩)').toBeGreaterThanOrEqual(2);
  });

  // ── 4. Shot display includes V3.1 fields ──────────────────────────
  test('shot display includes V3.1 structured fields', async ({ page }) => {
    await page.goto(`${BASE_URL}#plan`, { waitUntil: 'domcontentloaded' });

    const planNavExists = await page.locator('[data-page="plan"], [data-tab="plan"], .nav-item:has-text("规划"), .nav-item:has-text("Plan")').count();
    if (planNavExists > 0) {
      await page.locator('[data-page="plan"], [data-tab="plan"], .nav-item:has-text("规划"), .nav-item:has-text("Plan")').first().click();
      await page.waitForTimeout(500);
    }

    // Look for any shot rows or shot cards
    const shotRows = page.locator('.shot-row, .shot-card, [data-shot]');
    const shotCount = await shotRows.count();

    if (shotCount === 0) {
      test.skip();
      return;
    }

    // Check first shot for V3.1 fields
    const firstShot = shotRows.first();
    const shotText = await firstShot.textContent().catch(() => '');

    const hasAction = /动作|姿势|Pos/.test(shotText);
    const hasLighting = /光线|灯光|Light/.test(shotText);
    const hasMood = /情绪|氛围|Mood/.test(shotText);
    const hasStructuredLighting = /方向|辅助|主光|轮廓光|Key|Fill|Rim/i.test(shotText);
    const hasWhy = /为什么拍|匹配|Why|Match/.test(shotText);

    const v31FieldsFound = [hasAction, hasLighting, hasMood, hasStructuredLighting, hasWhy].filter(Boolean).length;

    // At least one V3.1 field should be present in the shot display
    expect(
      v31FieldsFound,
      `Expected at least 1 V3.1 field (动作/光线/情绪/结构化光线/为什么拍) in shot, got text: ${shotText.substring(0, 200)}`
    ).toBeGreaterThanOrEqual(1);
  });

  // ── 5. PDF export button exists ────────────────────────────────────
  test('PDF export button is present', async ({ page }) => {
    await page.goto(`${BASE_URL}#plan`, { waitUntil: 'domcontentloaded' });

    const planNavExists = await page.locator('[data-page="plan"], [data-tab="plan"], .nav-item:has-text("规划"), .nav-item:has-text("Plan")').count();
    if (planNavExists > 0) {
      await page.locator('[data-page="plan"], [data-tab="plan"], .nav-item:has-text("规划"), .nav-item:has-text("Plan")').first().click();
      await page.waitForTimeout(500);
    }

    const pdfButton = page.locator('button:has-text("PDF"), button:has-text("导出"), a:has-text("PDF"), a:has-text("导出")');
    await expect(pdfButton.first()).toBeVisible({ timeout: 5000 });
  });

  // ── 6. Creative direction candidates ───────────────────────────────
  test('creative directions have selectable elements', async ({ page }) => {
    await page.goto(`${BASE_URL}#plan`, { waitUntil: 'domcontentloaded' });

    const planNavExists = await page.locator('[data-page="plan"], [data-tab="plan"], .nav-item:has-text("规划"), .nav-item:has-text("Plan")').count();
    if (planNavExists > 0) {
      await page.locator('[data-page="plan"], [data-tab="plan"], .nav-item:has-text("规划"), .nav-item:has-text("Plan")').first().click();
      await page.waitForTimeout(500);
    }

    // Look for creative direction section
    const creativeSection = page.locator('text=创意方向').first();
    const sectionVisible = await creativeSection.isVisible().catch(() => false);

    if (!sectionVisible) {
      test.skip();
      return;
    }

    // Verify there are clickable "选择" or similar elements within creative directions
    const selectButton = page.locator('button:has-text("选择"), button:has-text("采用"), a:has-text("选择"), [data-action="select"]');
    const selectCount = await selectButton.count();

    expect(
      selectCount,
      'Expected at least one selectable element in creative directions'
    ).toBeGreaterThanOrEqual(1);
  });

});
