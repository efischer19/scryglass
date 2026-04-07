import type { Page } from '@playwright/test';

/**
 * Clicks "Start Game" on the PreGameSettings screen to proceed
 * to the deck input flow with default settings (2 players, no mulligan toggle).
 *
 * Call this after `page.goto('/')` and before interacting with the DeckInput.
 */
export async function confirmDefaultSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Start Game' }).click();
}
