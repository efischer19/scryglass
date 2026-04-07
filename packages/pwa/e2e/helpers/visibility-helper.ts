import type { Page } from '@playwright/test';

/**
 * Shows a specific player's cards by clicking their "Show Player X's cards" button.
 * Requires that no player's cards are currently visible (visiblePlayer === null).
 */
export async function showPlayerCards(page: Page, player: 'A' | 'B'): Promise<void> {
  const zone = page.locator(`section[aria-label="Player ${player}'s zone"]`);
  await zone.getByRole('button', { name: `Show Player ${player}'s cards` }).click();
}

/**
 * Hides all cards by clicking the "Hide all cards" button.
 * Requires that a player's cards are currently visible.
 */
export async function hideAllCards(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Hide all cards' }).click();
}
