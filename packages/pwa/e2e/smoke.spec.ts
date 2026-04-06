import { test, expect } from '@playwright/test';

test('PWA loads successfully', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Scryglass/);
  await expect(page.locator('#app')).toBeAttached();
});
