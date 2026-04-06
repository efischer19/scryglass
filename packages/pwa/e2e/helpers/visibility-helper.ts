import type { Page } from '@playwright/test';

/**
 * Clicks "Show Player X's cards" to make that player's cards visible.
 * Use when visiblePlayer is null (no cards are currently visible).
 */
export async function showPlayerCards(page: Page, player: 'A' | 'B'): Promise<void> {
  await page.getByRole('button', { name: `Show Player ${player}'s cards` }).click();
}

/**
 * Clicks "Hide all cards" to return to the neutral state where no cards are visible.
 * Use after a player has finished viewing their cards.
 */
export async function hideAllCards(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Hide all cards' }).click();
}
