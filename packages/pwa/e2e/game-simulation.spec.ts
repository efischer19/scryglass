import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureScreenshot } from './screenshot-helper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const goodDeck = readFileSync(resolve(__dirname, 'fixtures/good.txt'), 'utf-8');
const evilDeck = readFileSync(resolve(__dirname, 'fixtures/evil.txt'), 'utf-8');

test('game simulation — captures visual regression screenshots', async ({ page }) => {
  await page.goto('/');

  // ── 01: After deck load, showing DeckInput ────────────────────────────────
  await expect(page.locator('section[aria-label="Deck input for Player A"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(goodDeck);
  await expect(page.locator('.deck-input__counts')).toContainText(/Total cards: [1-9][0-9]*/);
  await captureScreenshot(page, '01-deck-loaded.png');

  // Load Player A's deck
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  // Load Player B's deck
  await expect(page.locator('section[aria-label="Deck input for Player B"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(evilDeck);
  await expect(page.locator('.deck-input__counts')).toContainText(/Total cards: [1-9][0-9]*/);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  await page.waitForURL('**/#/app');

  // ── 02: Opening hand display (both players) ───────────────────────────────
  await expect(page.locator('section[aria-label="Player A\'s opening hand"]')).toBeVisible();
  await expect(page.locator('section[aria-label="Player B\'s opening hand"]')).toBeVisible();
  await captureScreenshot(page, '02-opening-hands.png');

  // Keep hands for both players
  await page.getByRole('button', { name: "Keep Player A's opening hand" }).click();
  await page.getByRole('button', { name: "Keep Player B's opening hand" }).click();

  // ── 03: After mulligan decision ───────────────────────────────────────────
  await expect(page.locator('section[aria-label="Player A\'s opening hand"]')).not.toBeVisible();
  await expect(page.locator('section[aria-label="Player B\'s opening hand"]')).not.toBeVisible();
  await captureScreenshot(page, '03-post-mulligan.png');

  // Draw 5 cards for each player to simulate mid-game (~turn 5)
  for (let _i = 0; _i < 5; _i++) {
    await page.getByRole('button', { name: "Draw card from Player A's library" }).click();
    await page.getByRole('button', { name: 'Yes' }).first().click();
    await page.getByRole('button', { name: "Draw card from Player B's library" }).click();
    await page.getByRole('button', { name: 'Yes' }).first().click();
  }

  // ── 04: Mid-game board state (~turn 5) ────────────────────────────────────
  await captureScreenshot(page, '04-mid-game.png');

  // ── 05: Scry modal with card decisions ───────────────────────────────────
  await page.getByRole('button', { name: "Scry Player A's library" }).click();
  // Confirm the scry action via ConfirmationGate
  await expect(page.locator('.confirmation-gate')).toBeVisible();
  await page.getByRole('button', { name: 'Yes' }).first().click();
  // In count phase — set count to 1 and look
  await expect(page.locator('.scry-modal__count')).toBeVisible();
  await page.locator('input[aria-label="Number of cards to look at"]').fill('1');
  await page.getByRole('button', { name: 'Look' }).click();
  // Now in decide phase with card radio buttons visible
  await expect(page.locator('.scry-modal__decide')).toBeVisible();
  await captureScreenshot(page, '05-scry-modal.png');
  // Assign the card to top and confirm
  await page.locator('input[value="top"]').first().click();
  await page.getByRole('button', { name: 'Confirm Scry' }).click();
  await page.getByRole('button', { name: 'Close' }).first().click();

  // ── 06: Tutor search results ──────────────────────────────────────────────
  await page.getByRole('button', { name: "Tutor card from Player A's library" }).click();
  await expect(page.locator('.tutor-modal')).toBeVisible();
  // The search input is shown with all cards listed by default
  await expect(page.locator('.tutor-modal__list')).toBeVisible();
  await captureScreenshot(page, '06-tutor-results.png');
  // Close the tutor modal
  await page.getByRole('button', { name: 'Cancel' }).first().click();

  // ── 07: Fetch land confirmation ───────────────────────────────────────────
  await page.getByRole('button', { name: "Fetch basic land from Player A's library" }).click();
  await expect(page.locator('.fetch-land-modal')).toBeVisible();
  // Click the first available land type to reach the ConfirmationGate
  await page.locator('.fetch-land-modal__land-buttons button:not([disabled])').first().click();
  await expect(page.locator('.confirmation-gate')).toBeVisible();
  await captureScreenshot(page, '07-fetch-land.png');
  // Cancel to leave the modal open for other tests
  await page.getByRole('button', { name: 'Cancel' }).first().click();
});
