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

async function createAndLoginUser(page, name = 'e2e-user', birthDate = '2016-06-15', gender = '男') {
  await navigateTo(page, '/user-info');
  await page.fill('#input-name', name);
  await page.fill('#input-birthdate', birthDate);
  await page.locator(`.gender-option[data-gender="${gender}"]`).click();
  await page.click('#btn-submit');
  await page.waitForURL(/#\/test-select/);
}

test.describe('Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('home title renders', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.home-title')).toHaveText('智趣认知乐园');
  });

  test('can create user and enter test select', async ({ page }) => {
    await createAndLoginUser(page, 'smoke-user', '2015-01-10', '男');
    await expect(page.locator('[data-test="attention"]')).toBeVisible();
  });
});

test.describe('Framework Extension', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await createAndLoginUser(page, 'framework-user', '2014-05-01', '男');
  });

  test('test-select shows spatial and processing cards', async ({ page }) => {
    await expect(page.locator('[data-test="spatial"]')).toBeVisible();
    await expect(page.locator('[data-test="processing"]')).toBeVisible();
  });
});

