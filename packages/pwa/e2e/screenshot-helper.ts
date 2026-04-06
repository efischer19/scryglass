import type { Page } from '@playwright/test';

const SCREENSHOTS_DIR = 'e2e/screenshots';

export async function captureScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `${SCREENSHOTS_DIR}/${name}`,
    fullPage: true,
  });
}
