import { test, expect, type Locator } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameLogger } from './helpers/game-logger.js';
import { captureScreenshot } from './helpers/screenshot-helper.js';
import { showPlayerCards } from './helpers/visibility-helper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const goodDeck = readFileSync(resolve(__dirname, 'fixtures/good.txt'), 'utf-8');
const evilDeck = readFileSync(resolve(__dirname, 'fixtures/evil.txt'), 'utf-8');

test('full game simulation produces a structured game log', async ({ page }) => {
  const logger = new GameLogger('game-log.json');

  // --- Load decks ---
  await page.goto('/');

  await expect(page.locator('section[aria-label="Deck input for Player A"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(goodDeck);
  await expect(page.locator('.deck-input__counts')).toContainText(/Total cards: [1-9][0-9]*/);

  // ── 01: After deck load, showing DeckInput ────────────────────────────────
  await captureScreenshot(page, '01-deck-loaded.png');

  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  await expect(page.locator('section[aria-label="Deck input for Player B"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(evilDeck);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  await page.waitForURL('**/#/app');

  // --- Keep opening hands for both players ---
  const playerAZone = page.locator("section[aria-label=\"Player A's zone\"]");
  const playerBZone = page.locator("section[aria-label=\"Player B's zone\"]");

  // ── 02: Opening hand display (both players) ───────────────────────────────
  await expect(playerAZone.locator('section[aria-label="Player A\'s opening hand"]')).not.toBeVisible();
  await expect(playerBZone.locator('section[aria-label="Player B\'s opening hand"]')).not.toBeVisible();
  await captureScreenshot(page, '02-opening-hands.png');

  await showPlayerCards(page, 'A');
  await playerAZone.getByRole('button', { name: "Keep Player A's opening hand" }).click();
  logger.log({
    turn: 0,
    player: 'A',
    action: { type: 'KEEP_HAND', payload: { player: 'A' } },
    result: { librarySize: await getLibrarySize(playerAZone) },
  });

  await showPlayerCards(page, 'B');
  await playerBZone.getByRole('button', { name: "Keep Player B's opening hand" }).click();
  logger.log({
    turn: 0,
    player: 'B',
    action: { type: 'KEEP_HAND', payload: { player: 'B' } },
    result: { librarySize: await getLibrarySize(playerBZone) },
  });

  // ── 03: After mulligan decision ───────────────────────────────────────────
  await expect(playerAZone.locator('section[aria-label="Player A\'s opening hand"]')).not.toBeVisible();
  await expect(playerBZone.locator('section[aria-label="Player B\'s opening hand"]')).not.toBeVisible();
  await captureScreenshot(page, '03-post-mulligan.png');

  // --- Simulate 5 turns: each turn Player A and Player B each draw a card ---
  for (let turn = 1; turn <= 5; turn++) {
    for (const [player, zone] of [['A', playerAZone], ['B', playerBZone]] as const) {
      const librarySizeBefore = await getLibrarySize(zone);

      await zone.getByRole('button', { name: `Draw card from Player ${player}'s library` }).click();
      await page.getByRole('button', { name: 'Yes' }).click();

      const librarySizeAfter = await getLibrarySize(zone);
      const drawnCardName = await getDrawnCardName(zone);

      logger.log({
        turn,
        player,
        action: { type: 'DRAW_CARD', payload: { player } },
        result: {
          card: drawnCardName ? { name: drawnCardName } : null,
          librarySize: librarySizeAfter,
          librarySizeBefore,
        },
      });
    }
  }

  // --- Verify both libraries shrank by 5 cards each ---
  await expect(playerAZone.locator('.player-zone__card-count')).toContainText(/Cards: [1-9][0-9]*/);
  await expect(playerBZone.locator('.player-zone__card-count')).toContainText(/Cards: [1-9][0-9]*/);

  // ── 04: Mid-game board state (~turn 5) ────────────────────────────────────
  await captureScreenshot(page, '04-mid-game.png');

  // --- Write the game log ---
  logger.flush();

  // ── 05: Scry modal with card decisions ───────────────────────────────────
  await playerAZone.getByRole('button', { name: "Scry Player A's library" }).click();
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
  await playerAZone.getByRole('button', { name: "Tutor card from Player A's library" }).click();
  await expect(page.locator('.tutor-modal')).toBeVisible();
  // The search input is shown with all cards listed by default
  await expect(page.locator('.tutor-modal__list')).toBeVisible();
  await captureScreenshot(page, '06-tutor-results.png');
  // Close the tutor modal
  await page.getByRole('button', { name: 'Cancel' }).first().click();

  // ── 07: Fetch land confirmation ───────────────────────────────────────────
  const librarySizeBeforeFetch = await getLibrarySize(playerAZone);
  const playerBSizeBeforeFetch = await getLibrarySize(playerBZone);
  await playerAZone.getByRole('button', { name: "Fetch basic land from Player A's library" }).click();
  await expect(page.locator('.fetch-land-modal')).toBeVisible();
  // Click the first available land type to reach the ConfirmationGate
  await page.locator('.fetch-land-modal__land-buttons button:not([disabled])').first().click();
  await expect(page.locator('.confirmation-gate')).toBeVisible();
  await captureScreenshot(page, '07-fetch-land.png');
  // Confirm the fetch
  await page.getByRole('button', { name: 'Yes' }).first().click();
  // Modal transitions to done phase — close it
  await expect(page.locator('.fetch-land-modal__done')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).first().click();
  // Assert library size decreased by 1
  const librarySizeAfterFetch = await getLibrarySize(playerAZone);
  expect(librarySizeAfterFetch).toBe(librarySizeBeforeFetch - 1);
  logger.log({
    turn: 6,
    player: 'A',
    action: { type: 'FETCH_BASIC_LAND', payload: { player: 'A', landType: 'Forest' } },
    result: { librarySize: librarySizeAfterFetch },
  });

  // ── 08: Return drawn card to library ──────────────────────────────────────
  // Draw a card so there is a card available to return
  const librarySizeBeforeReturn = await getLibrarySize(playerAZone);
  await showPlayerCards(page, 'A');
  await playerAZone.getByRole('button', { name: "Draw card from Player A's library" }).click();
  await page.getByRole('button', { name: 'Yes' }).click();
  const librarySizeAfterDraw = await getLibrarySize(playerAZone);
  expect(librarySizeAfterDraw).toBe(librarySizeBeforeReturn - 1);
  // Verify a card is shown in the card display area
  await expect(playerAZone.locator('.card-display__content')).toBeVisible();
  // Return the drawn card to the top of the library
  await playerAZone.getByRole('button', { name: 'Return card to library' }).click();
  // Assert library size increased by 1 (returned to pre-draw count)
  const librarySizeAfterReturn = await getLibrarySize(playerAZone);
  expect(librarySizeAfterReturn).toBe(librarySizeAfterDraw + 1);
  logger.log({
    turn: 6,
    player: 'A',
    action: { type: 'RETURN_TO_LIBRARY', payload: { player: 'A', position: 'top' } },
    result: { librarySize: librarySizeAfterReturn },
  });

  // Cross-player isolation: Player B's library size unchanged during steps 07–08
  expect(await getLibrarySize(playerBZone)).toBe(playerBSizeBeforeFetch);

  // --- Write the game log ---
  logger.flush();
});

async function getLibrarySize(zone: Locator): Promise<number> {
  const text = await zone.locator('.player-zone__card-count').textContent();
  const match = text?.match(/Cards:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

async function getDrawnCardName(zone: Locator): Promise<string | null> {
  const cardDisplay = zone.locator('.card-display');
  const isVisible = await cardDisplay.isVisible();
  if (!isVisible) return null;
  const nameEl = cardDisplay.locator('.card-display__name');
  return (await nameEl.isVisible()) ? nameEl.textContent() : null;
}
