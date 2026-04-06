import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drawCard } from './helpers/draw-card-helper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const goodDeck = readFileSync(resolve(__dirname, 'fixtures/good.txt'), 'utf-8');
const evilDeck = readFileSync(resolve(__dirname, 'fixtures/evil.txt'), 'utf-8');

/** Reads the numeric library size from the player's zone card-count element. */
async function getLibrarySize(page: Page, player: 'A' | 'B'): Promise<number> {
  const zone = page.locator(`section[aria-label="Player ${player}'s zone"]`);
  const text = await zone.locator('.player-zone__card-count').textContent();
  const match = text?.match(/Cards:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Loads both decks and keeps both players' opening hands, ending in the #/app view. */
async function setupGame(page: Page): Promise<void> {
  await page.goto('/');

  await expect(page.locator('section[aria-label="Deck input for Player A"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(goodDeck);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  await expect(page.locator('section[aria-label="Deck input for Player B"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(evilDeck);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  await page.waitForURL('**/#/app');

  const playerAZone = page.locator("section[aria-label=\"Player A's zone\"]");
  const playerBZone = page.locator("section[aria-label=\"Player B's zone\"]");

  await playerAZone.getByRole('button', { name: "Deal initial hand for Player A" }).click();
  await playerBZone.getByRole('button', { name: "Deal initial hand for Player B" }).click();

  await playerAZone.getByRole('button', { name: "Keep Player A's opening hand" }).click();
  await playerBZone.getByRole('button', { name: "Keep Player B's opening hand" }).click();

  // Confirm the mulligan phase has ended for both players
  await expect(playerAZone.locator('section[aria-label="Player A\'s opening hand"]')).not.toBeVisible();
  await expect(playerBZone.locator('section[aria-label="Player B\'s opening hand"]')).not.toBeVisible();
}

test.describe('Draw card action', () => {
  test.beforeEach(async ({ page }) => {
    await setupGame(page);
  });

  test('Player A draws a card: library decreases by 1', async ({ page }) => {
    const sizeBefore = await getLibrarySize(page, 'A');

    await drawCard(page, 'A');

    const sizeAfter = await getLibrarySize(page, 'A');
    expect(sizeAfter).toBe(sizeBefore - 1);
  });

  test('Player A draws a card: drawn card is displayed in the UI', async ({ page }) => {
    await drawCard(page, 'A');

    const playerAZone = page.locator("section[aria-label=\"Player A's zone\"]");
    await expect(playerAZone.locator('.card-display__content')).toBeVisible();
  });

  test('Player B draws a card: library decreases by 1', async ({ page }) => {
    const sizeBefore = await getLibrarySize(page, 'B');

    await drawCard(page, 'B');

    const sizeAfter = await getLibrarySize(page, 'B');
    expect(sizeAfter).toBe(sizeBefore - 1);
  });

  test('Player B draws a card: drawn card is displayed in the UI', async ({ page }) => {
    await drawCard(page, 'B');

    const playerBZone = page.locator("section[aria-label=\"Player B's zone\"]");
    await expect(playerBZone.locator('.card-display__content')).toBeVisible();
  });

  test('drawing for one player does not affect the other player', async ({ page }) => {
    const initialSizeA = await getLibrarySize(page, 'A');
    const initialSizeB = await getLibrarySize(page, 'B');

    // Draw for Player A — Player B's library must be unchanged
    await drawCard(page, 'A');
    expect(await getLibrarySize(page, 'A')).toBe(initialSizeA - 1);
    expect(await getLibrarySize(page, 'B')).toBe(initialSizeB);

    // Draw for Player B — Player A's library must remain at initialSizeA - 1
    await drawCard(page, 'B');
    expect(await getLibrarySize(page, 'B')).toBe(initialSizeB - 1);
    expect(await getLibrarySize(page, 'A')).toBe(initialSizeA - 1);
  });
});
