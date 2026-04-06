import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const goodDeck = readFileSync(resolve(__dirname, 'fixtures/good.txt'), 'utf-8');
const evilDeck = readFileSync(resolve(__dirname, 'fixtures/evil.txt'), 'utf-8');

test('loads good.txt for Player A and evil.txt for Player B, then transitions to shuffler view', async ({ page }) => {
  await page.goto('/');

  // --- Player A: load good.txt (Fellowship) ---
  await expect(page.locator('section[aria-label="Deck input for Player A"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(goodDeck);
  await expect(page.locator('.deck-input__counts')).toContainText(/Total cards: [1-9][0-9]*/);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  // --- Player B: load evil.txt (Sauron) ---
  // DeckInput re-mounts for Player B after Player A's deck is stored
  await expect(page.locator('section[aria-label="Deck input for Player B"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(evilDeck);
  await expect(page.locator('.deck-input__counts')).toContainText(/Total cards: [1-9][0-9]*/);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  // --- Verify navigation to shuffler view (#/app) ---
  await page.waitForURL('**/#/app');

  // --- Verify both players' libraries are populated (non-zero card count) ---
  const playerAZone = page.locator('section[aria-label="Player A\'s zone"]');
  const playerBZone = page.locator('section[aria-label="Player B\'s zone"]');

  await expect(playerAZone.locator('.player-zone__card-count')).toContainText(/Cards: [1-9][0-9]*/);
  await expect(playerBZone.locator('.player-zone__card-count')).toContainText(/Cards: [1-9][0-9]*/);
});
