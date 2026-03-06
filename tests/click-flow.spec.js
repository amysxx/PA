import { test, expect } from '@playwright/test';

async function navigateTo(page, hash) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  if (hash && hash !== '/') {
    await page.evaluate(h => {
      window.location.hash = h;
    }, hash);
  }
  await page.waitForTimeout(400);
}

async function createAndLoginUser(page, name = 'click-user', birthDate = '2015-08-20', gender = '男') {
  await navigateTo(page, '/user-info');
  await page.fill('#input-name', name);
  await page.fill('#input-birthdate', birthDate);
  await page.locator(`.gender-option[data-gender="${gender}"]`).click();
  await page.click('#btn-submit');
  await page.waitForURL(/#\/test-select/);
  await expect(page.locator('#test-cards')).toBeVisible();
}

async function completeCurrentDimensionByClick(page) {
  for (let i = 0; i < 260; i++) {
    const backBtn = page.locator('#btn-back');
    if (await backBtn.isVisible().catch(() => false)) {
      await backBtn.click();
      await expect(page.locator('#test-cards')).toBeVisible({ timeout: 7000 });
      return;
    }

    const nextBtn = page.locator('#btn-next');
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(250);
      continue;
    }

    const skipBtn = page.locator('#btn-skip');
    if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(250);
      continue;
    }

    const option = page.locator('.test-option').first();
    if (await option.isVisible().catch(() => false)) {
      await option.click({ force: true, timeout: 2500 });
      await page.waitForTimeout(250);
      continue;
    }

    const confirmBtn = page.locator('#btn-confirm');
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click({ force: true });
      await page.waitForTimeout(250);
      continue;
    }

    await page.waitForTimeout(250);
  }
  throw new Error('Did not return to test-select after click flow.');
}

test.describe('Click Flow', () => {
  test('click through all test cards and reach report', async ({ page }) => {
    test.setTimeout(180000);

    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await createAndLoginUser(page);

    const dimensionKeys = ['attention', 'memory', 'comprehension', 'execution', 'spatial', 'processing'];

    for (const key of dimensionKeys) {
      const card = page.locator(`[data-test="${key}"]`);
      await expect(card).toBeVisible();
      await card.click();
      await expect(page.locator('.test-header')).toBeVisible({ timeout: 7000 });
      await completeCurrentDimensionByClick(page);
    }

    await expect(page.locator('#btn-report')).toBeVisible({ timeout: 7000 });
    await page.click('#btn-report');
    await expect(page.locator('#report-container')).toBeVisible({ timeout: 7000 });
  });
});
