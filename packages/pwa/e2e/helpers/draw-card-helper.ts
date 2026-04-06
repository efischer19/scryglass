import type { Page } from '@playwright/test';

/**
 * Draws a card for the given player by clicking their Draw button and
 * confirming the ConfirmationGate prompt.
 *
 * Usage:
 *   await drawCard(page, 'A');
 *   await drawCard(page, 'B');
 */
export async function drawCard(page: Page, player: 'A' | 'B'): Promise<void> {
  const zone = page.locator(`section[aria-label="Player ${player}'s zone"]`);
  await zone.getByRole('button', { name: `Draw card from Player ${player}'s library` }).click();
  await page.getByRole('button', { name: 'Yes' }).click();
}
