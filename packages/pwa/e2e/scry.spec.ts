import { test, expect, type Locator } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureScreenshot } from './helpers/screenshot-helper.js';
import { showPlayerCards } from './helpers/visibility-helper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const goodDeck = readFileSync(resolve(__dirname, 'fixtures/good.txt'), 'utf-8');
const evilDeck = readFileSync(resolve(__dirname, 'fixtures/evil.txt'), 'utf-8');

async function loadDecksAndKeepHands(
  page: Parameters<typeof captureScreenshot>[0],
  playerAZone: Locator,
  playerBZone: Locator,
): Promise<void> {
  await page.goto('/');

  // Load Player A's deck
  await expect(page.locator('section[aria-label="Deck input for Player A"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(goodDeck);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  // Load Player B's deck
  await expect(page.locator('section[aria-label="Deck input for Player B"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(evilDeck);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  await page.waitForURL('**/#/app');

  // Deal initial hands and keep (show cards first due to visibility gate)
  await expect(playerAZone.locator('section[aria-label="Player A\'s opening hand"]')).not.toBeVisible();
  await showPlayerCards(page, 'A');
  await playerAZone.getByRole('button', { name: "Deal initial hand for Player A" }).click();
  await playerAZone.getByRole('button', { name: "Keep Player A's opening hand" }).click();

  await expect(playerBZone.locator('section[aria-label="Player B\'s opening hand"]')).not.toBeVisible();
  await showPlayerCards(page, 'B');
  await playerBZone.getByRole('button', { name: "Deal initial hand for Player B" }).click();
  await playerBZone.getByRole('button', { name: "Keep Player B's opening hand" }).click();

  // Wait for mulligan sections to disappear
  await expect(playerAZone.locator('section[aria-label="Player A\'s opening hand"]')).not.toBeVisible();
  await expect(playerBZone.locator('section[aria-label="Player B\'s opening hand"]')).not.toBeVisible();
}

async function getLibrarySize(zone: Locator): Promise<number> {
  const text = await zone.locator('.player-zone__card-count').textContent();
  const match = text?.match(/Cards:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

test('scry 2 cards: one to top, one to bottom - library size unchanged and top card drawn next', async ({ page }) => {
  const playerAZone = page.locator("section[aria-label=\"Player A's zone\"]");
  const playerBZone = page.locator("section[aria-label=\"Player B's zone\"]");

  await loadDecksAndKeepHands(page, playerAZone, playerBZone);

  // Record library sizes before scry
  const playerALibrarySizeBefore = await getLibrarySize(playerAZone);
  const playerBLibrarySizeBefore = await getLibrarySize(playerBZone);

  // --- Trigger scry for Player A ---
  await playerAZone.getByRole('button', { name: "Scry Player A's library" }).click();

  // Step 1: Confirm the scry via the ConfirmationGate
  await expect(page.locator('.confirmation-gate')).toBeVisible();
  await page.getByRole('button', { name: 'Yes' }).click();

  // Step 2: Set count to 2 and look
  await expect(page.locator('.scry-modal__count')).toBeVisible();
  await page.locator('input[aria-label="Number of cards to look at"]').fill('2');
  await page.getByRole('button', { name: 'Look' }).click();

  // Step 3: Verify the decide phase shows exactly 2 cards
  await expect(page.locator('.scry-modal__decide')).toBeVisible();

  const cardItems = page.locator('.scry-modal__card-item');
  await expect(cardItems).toHaveCount(2);

  // Capture screenshot of the scry modal with 2 cards displayed
  await captureScreenshot(page, '05-scry-modal.png');

  // Record the name of the first card (will be placed on top)
  const cardNames = await page.locator('.scry-modal__card-name').allTextContents();
  expect(cardNames).toHaveLength(2);
  const topCardName = cardNames[0];

  // Step 4: Send card 0 to top and card 1 to bottom
  await page.locator('input[name="scry-dest-0"][value="top"]').click();
  await page.locator('input[name="scry-dest-1"][value="bottom"]').click();

  // Step 5: Confirm scry decisions
  const confirmButton = page.getByRole('button', { name: 'Confirm Scry' });
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();

  // Step 6: Scry done state — close the modal
  await expect(page.locator('.scry-modal')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  // Wait for the modal to close
  await expect(page.locator('.scry-modal')).not.toBeVisible();

  // --- Assert library size is unchanged (scry does not remove cards) ---
  const playerALibrarySizeAfter = await getLibrarySize(playerAZone);
  expect(playerALibrarySizeAfter).toBe(playerALibrarySizeBefore);

  // --- Cross-player isolation: Player B's library is unaffected ---
  const playerBLibrarySizeAfter = await getLibrarySize(playerBZone);
  expect(playerBLibrarySizeAfter).toBe(playerBLibrarySizeBefore);

  // --- Draw a card for Player A and verify it matches the card placed on top ---
  await playerAZone.getByRole('button', { name: `Draw card from Player A's library` }).click();
  await page.getByRole('button', { name: 'Yes' }).click();

  // The drawn card should be the one placed on top during scry
  const drawnCardName = await playerAZone.locator('.card-display__name').textContent();
  expect(drawnCardName).toBe(topCardName);
});
