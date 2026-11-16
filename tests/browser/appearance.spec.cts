import { test, expect } from '@playwright/test';
test('appearance: shared character previews, default arena and mobile', async ({ page }) => {
  await page.goto('/?diagnostics=1');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('.scoreboard').getByRole('img', { name: /14세 승현.*네모 안경/ })).toBeVisible();
  await expect(page.locator('.scoreboard').getByRole('img', { name: /35세 승현.*넓은 어깨/ })).toBeVisible();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'evidence/appearance-default.png', fullPage: true });
  await page.locator('.scoreboard').screenshot({ path: 'evidence/appearance-previews.png' });
  await page.locator('.arena').screenshot({ path: 'evidence/appearance-arena.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'evidence/appearance-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
