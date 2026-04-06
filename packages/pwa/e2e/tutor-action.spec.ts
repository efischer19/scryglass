import { test, expect, type Locator } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureScreenshot } from './helpers/screenshot-helper.js';
import { showPlayerCards } from './helpers/visibility-helper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const goodDeck = readFileSync(resolve(__dirname, 'fixtures/good.txt'), 'utf-8');
const evilDeck = readFileSync(resolve(__dirname, 'fixtures/evil.txt'), 'utf-8');

/** Helper: load both decks and navigate to #/app */
async function loadBothDecks(page: import('@playwright/test').Page) {
  await page.goto('/');

  await expect(page.locator('section[aria-label="Deck input for Player A"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(goodDeck);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  await expect(page.locator('section[aria-label="Deck input for Player B"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(evilDeck);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  await page.waitForURL('**/#/app');
}

async function getLibrarySize(zone: Locator): Promise<number> {
  const text = await zone.locator('.player-zone__card-count').textContent();
  const match = text?.match(/Cards:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

test('Player B tutors Nazgûl from evil.txt: library shrinks by 1 and Player A is unaffected', async ({ page }) => {
  await loadBothDecks(page);

  const playerAZone = page.locator("section[aria-label=\"Player A's zone\"]");
  const playerBZone = page.locator("section[aria-label=\"Player B's zone\"]");

  // --- Keep opening hands for both players to advance past mulligan ---
  await showPlayerCards(page, 'A');
  await playerAZone.getByRole('button', { name: "Keep Player A's opening hand" }).click();
  await showPlayerCards(page, 'B');
  await playerBZone.getByRole('button', { name: "Keep Player B's opening hand" }).click();

  // Wait for mulligan UI to disappear before reading library sizes
  await expect(playerBZone.locator('section[aria-label="Player B\'s opening hand"]')).not.toBeVisible();

  // --- Record library sizes before tutoring ---
  const playerALibrarySizeBefore = await getLibrarySize(playerAZone);
  const playerBLibrarySizeBefore = await getLibrarySize(playerBZone);

  // --- Open the tutor modal for Player B ---
  await playerBZone.getByRole('button', { name: "Tutor card from Player B's library" }).click();

  const tutorModal = page.locator('.tutor-modal');
  await expect(tutorModal).toBeVisible();

  // The full card list should be shown by default (no search query yet)
  await expect(page.locator('.tutor-modal__list')).toBeVisible();

  // --- Search for Nazgûl ---
  const searchInput = page.locator('input[aria-label="Search Player B\'s library"]');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('Nazgûl');

  // Verify matching results appear in the listbox
  const matchingOptions = page.locator('.tutor-modal__option');
  await expect(matchingOptions.first()).toBeVisible();
  await expect(page.locator('.tutor-modal__card-name').first()).toContainText('Nazgûl');

  // ── 06: Tutor search results ──────────────────────────────────────────────
  await captureScreenshot(page, '06-tutor-results.png');

  // --- Select the first Nazgûl result ---
  await matchingOptions.first().click();

  // ConfirmationGate should appear with the card name in the message
  const confirmationGate = page.locator('[role="alertdialog"]');
  await expect(confirmationGate).toBeVisible();
  await expect(confirmationGate).toContainText('Nazgûl');

  // --- Confirm the tutor action ---
  await page.getByRole('button', { name: 'Yes' }).click();

  // Done phase: the modal should show the tutored card and a Close button
  await expect(page.locator('.tutor-modal__done')).toBeVisible();

  // Close the tutor modal
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(tutorModal).not.toBeVisible();

  // --- Assert Player B's library shrank by exactly 1 ---
  const playerBLibrarySizeAfter = await getLibrarySize(playerBZone);
  expect(playerBLibrarySizeAfter).toBe(playerBLibrarySizeBefore - 1);

  // --- Cross-player isolation: Player A's library must be unchanged ---
  const playerALibrarySizeAfter = await getLibrarySize(playerAZone);
  expect(playerALibrarySizeAfter).toBe(playerALibrarySizeBefore);
});
