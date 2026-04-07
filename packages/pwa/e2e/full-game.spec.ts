import { test, expect, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drawCard } from './helpers/draw-card-helper.js';
import { GameLogger } from './helpers/game-logger.js';
import { captureScreenshot } from './helpers/screenshot-helper.js';
import { showPlayerCards, hideAllCards } from './helpers/visibility-helper.js';
import { confirmDefaultSettings } from './helpers/settings-helper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const goodDeck = readFileSync(resolve(__dirname, 'fixtures/good.txt'), 'utf-8');
const evilDeck = readFileSync(resolve(__dirname, 'fixtures/evil.txt'), 'utf-8');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getLibrarySize(zone: Locator): Promise<number> {
  const text = await zone.locator('.player-zone__card-count').textContent();
  const match = text?.match(/Cards:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * State-integrity assertions run after every game action.
 *
 * Checks:
 *   1. Both library sizes are non-negative integers displayed correctly.
 *   2. Cross-player isolation — the *other* player's library size must equal
 *      the expected value passed in.
 */
async function assertStateIntegrity(
  page: Page,
  playerAZone: Locator,
  playerBZone: Locator,
  expectedA: number,
  expectedB: number,
): Promise<void> {
  // Card count elements must be present and match expected values
  await expect(playerAZone.locator('.player-zone__card-count')).toContainText(
    `Cards: ${expectedA}`,
  );
  await expect(playerBZone.locator('.player-zone__card-count')).toContainText(
    `Cards: ${expectedB}`,
  );

  // Both values must be non-negative
  expect(expectedA).toBeGreaterThanOrEqual(0);
  expect(expectedB).toBeGreaterThanOrEqual(0);

  // Both player zones must remain visible throughout the game
  await expect(playerAZone).toBeVisible();
  await expect(playerBZone).toBeVisible();
}

// ---------------------------------------------------------------------------
// Full 2-player, 10-turn game simulation
// ---------------------------------------------------------------------------

test('full 2-player, 10-turn game simulation', async ({ page }) => {
  test.setTimeout(60_000);

  const logger = new GameLogger('full-game-log.json');

  const playerAZone = page.locator("section[aria-label=\"Player A's zone\"]");
  const playerBZone = page.locator("section[aria-label=\"Player B's zone\"]");

  // Track expected library sizes so we can assert after every action
  let expectedLibA: number;
  let expectedLibB: number;

  // =========================================================================
  // Phase 1 — Load decks
  // =========================================================================

  await page.goto('/');
  await confirmDefaultSettings(page);
  await expect(page.locator('section[aria-label="Deck input for Player A"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(goodDeck);
  await expect(page.locator('.deck-input__counts')).toContainText(/Total cards: [1-9][0-9]*/);

  // ── Screenshot 01: After deck load, showing DeckInput ──────────────────
  await captureScreenshot(page, 'full-01-deck-loaded.png');

  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  // Player B — load evil.txt
  await expect(page.locator('section[aria-label="Deck input for Player B"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(evilDeck);
  await expect(page.locator('.deck-input__counts')).toContainText(/Total cards: [1-9][0-9]*/);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  await page.waitForURL('**/#/app');

  // =========================================================================
  // Phase 2 — Deal initial hands; both players keep
  // =========================================================================

  // ── Screenshot 02: Pre-deal state (Player A's opening hand) ───────────
  // Show Player A's cards to access their mulligan section
  await showPlayerCards(page, 'A');
  await expect(
    playerAZone.locator('section[aria-label="Player A\'s opening hand"]'),
  ).toBeVisible();
  await captureScreenshot(page, 'full-02-opening-hands.png');

  // Player A: deal, keep (auto-hides on KEEP_HAND)
  await playerAZone
    .getByRole('button', { name: "Deal initial hand for Player A" })
    .click();
  await playerAZone
    .getByRole('button', { name: "Keep Player A's opening hand" })
    .click();

  logger.log({
    turn: 0,
    player: 'A',
    action: { type: 'KEEP_HAND', payload: { player: 'A' } },
    result: { librarySize: await getLibrarySize(playerAZone) },
  });

  // Player B: show cards, deal, keep (auto-hides on KEEP_HAND)
  await showPlayerCards(page, 'B');
  await expect(
    playerBZone.locator('section[aria-label="Player B\'s opening hand"]'),
  ).toBeVisible();
  await playerBZone
    .getByRole('button', { name: "Deal initial hand for Player B" })
    .click();
  await playerBZone
    .getByRole('button', { name: "Keep Player B's opening hand" })
    .click();

  logger.log({
    turn: 0,
    player: 'B',
    action: { type: 'KEEP_HAND', payload: { player: 'B' } },
    result: { librarySize: await getLibrarySize(playerBZone) },
  });

  // Wait for mulligan UI to disappear (hidden behind gate after KEEP_HAND)
  await showPlayerCards(page, 'A');
  await expect(
    playerAZone.locator('section[aria-label="Player A\'s opening hand"]'),
  ).not.toBeVisible();
  await hideAllCards(page);
  await showPlayerCards(page, 'B');
  await expect(
    playerBZone.locator('section[aria-label="Player B\'s opening hand"]'),
  ).not.toBeVisible();
  await hideAllCards(page);

  // ── Screenshot 03: Post-mulligan ───────────────────────────────────────
  await captureScreenshot(page, 'full-03-post-mulligan.png');

  // Snapshot starting library sizes
  expectedLibA = await getLibrarySize(playerAZone);
  expectedLibB = await getLibrarySize(playerBZone);
  expect(expectedLibA).toBeGreaterThan(0);
  expect(expectedLibB).toBeGreaterThan(0);

  // =========================================================================
  // Phase 3 — 10 turns of gameplay
  // =========================================================================

  // Turn 1: Both players draw
  // -----------------------------------------------------------------------
  await drawCard(page, 'A');
  expectedLibA -= 1;
  logger.log({
    turn: 1, player: 'A',
    action: { type: 'DRAW_CARD', payload: { player: 'A' } },
    result: { librarySize: expectedLibA },
  });

  await drawCard(page, 'B');
  expectedLibB -= 1;
  logger.log({
    turn: 1, player: 'B',
    action: { type: 'DRAW_CARD', payload: { player: 'B' } },
    result: { librarySize: expectedLibB },
  });

  await assertStateIntegrity(page, playerAZone, playerBZone, expectedLibA, expectedLibB);

  // Turn 2: Player A draws + scry 2; Player B draws
  // -----------------------------------------------------------------------
  await drawCard(page, 'A');
  expectedLibA -= 1;
  logger.log({
    turn: 2, player: 'A',
    action: { type: 'DRAW_CARD', payload: { player: 'A' } },
    result: { librarySize: expectedLibA },
  });

  // Scry 2 for Player A
  await playerAZone
    .getByRole('button', { name: "Scry Player A's library" })
    .click();
  await expect(page.locator('.confirmation-gate')).toBeVisible();
  await page.getByRole('button', { name: 'Yes' }).first().click();

  await expect(page.locator('.scry-modal__count')).toBeVisible();
  await page.locator('input[aria-label="Number of cards to look at"]').fill('2');
  await page.getByRole('button', { name: 'Look' }).click();

  await expect(page.locator('.scry-modal__decide')).toBeVisible();
  await expect(page.locator('.scry-modal__card-item')).toHaveCount(2);

  // ── Screenshot 04: Scry modal with card decisions ──────────────────────
  await captureScreenshot(page, 'full-04-scry-modal.png');

  // Place first card on top, second on bottom
  await page.locator('input[name="scry-dest-0"][value="top"]').click();
  await page.locator('input[name="scry-dest-1"][value="bottom"]').click();
  await page.getByRole('button', { name: 'Confirm Scry' }).click();
  await page.getByRole('button', { name: 'Close' }).first().click();
  await expect(page.locator('.scry-modal')).not.toBeVisible();

  // Scry doesn't change library size
  logger.log({
    turn: 2, player: 'A',
    action: { type: 'SCRY_RESOLVE', payload: { player: 'A', count: 2 } },
    result: { librarySize: expectedLibA },
  });

  await drawCard(page, 'B');
  expectedLibB -= 1;
  logger.log({
    turn: 2, player: 'B',
    action: { type: 'DRAW_CARD', payload: { player: 'B' } },
    result: { librarySize: expectedLibB },
  });

  await assertStateIntegrity(page, playerAZone, playerBZone, expectedLibA, expectedLibB);

  // Turn 3: Player A draws; Player B draws + tutors Nazgûl
  // -----------------------------------------------------------------------
  await drawCard(page, 'A');
  expectedLibA -= 1;
  logger.log({
    turn: 3, player: 'A',
    action: { type: 'DRAW_CARD', payload: { player: 'A' } },
    result: { librarySize: expectedLibA },
  });

  await drawCard(page, 'B');
  expectedLibB -= 1;
  logger.log({
    turn: 3, player: 'B',
    action: { type: 'DRAW_CARD', payload: { player: 'B' } },
    result: { librarySize: expectedLibB },
  });

  // Tutor Nazgûl for Player B
  await playerBZone
    .getByRole('button', { name: "Tutor card from Player B's library" })
    .click();
  await expect(page.locator('.tutor-modal')).toBeVisible();
  await expect(page.locator('.tutor-modal__list')).toBeVisible();

  const searchInput = page.locator('input[aria-label="Search Player B\'s library"]');
  await searchInput.fill('Nazgûl');
  await expect(page.locator('.tutor-modal__card-name').first()).toContainText('Nazgûl');

  // ── Screenshot 05: Tutor search results ────────────────────────────────
  await captureScreenshot(page, 'full-05-tutor-results.png');

  await page.locator('.tutor-modal__option').first().click();
  await expect(page.locator('[role="alertdialog"]')).toBeVisible();
  await page.getByRole('button', { name: 'Yes' }).click();
  await expect(page.locator('.tutor-modal__done')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('.tutor-modal')).not.toBeVisible();

  expectedLibB -= 1; // Tutor removes one card from library
  logger.log({
    turn: 3, player: 'B',
    action: { type: 'TUTOR_CARD', payload: { player: 'B', cardName: 'Nazgûl' } },
    result: { librarySize: expectedLibB },
  });

  await assertStateIntegrity(page, playerAZone, playerBZone, expectedLibA, expectedLibB);

  // Turn 4: Player A draws + fetches a basic land; Player B draws
  // -----------------------------------------------------------------------
  await drawCard(page, 'A');
  expectedLibA -= 1;
  logger.log({
    turn: 4, player: 'A',
    action: { type: 'DRAW_CARD', payload: { player: 'A' } },
    result: { librarySize: expectedLibA },
  });

  // Fetch basic land for Player A
  await playerAZone
    .getByRole('button', { name: "Fetch basic land from Player A's library" })
    .click();
  await expect(page.locator('.fetch-land-modal')).toBeVisible();
  await page
    .locator('.fetch-land-modal__land-buttons button:not([disabled])')
    .first()
    .click();
  await expect(page.locator('.confirmation-gate')).toBeVisible();

  // ── Screenshot 06: Fetch land confirmation ─────────────────────────────
  await captureScreenshot(page, 'full-06-fetch-land.png');

  await page.getByRole('button', { name: 'Yes' }).first().click();
  await expect(page.locator('.fetch-land-modal__done')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).first().click();

  expectedLibA -= 1; // Fetch removes one land from library
  logger.log({
    turn: 4, player: 'A',
    action: { type: 'FETCH_BASIC_LAND', payload: { player: 'A' } },
    result: { librarySize: expectedLibA },
  });

  await drawCard(page, 'B');
  expectedLibB -= 1;
  logger.log({
    turn: 4, player: 'B',
    action: { type: 'DRAW_CARD', payload: { player: 'B' } },
    result: { librarySize: expectedLibB },
  });

  await assertStateIntegrity(page, playerAZone, playerBZone, expectedLibA, expectedLibB);

  // Turn 5: Both players draw
  // -----------------------------------------------------------------------
  await drawCard(page, 'A');
  expectedLibA -= 1;
  logger.log({
    turn: 5, player: 'A',
    action: { type: 'DRAW_CARD', payload: { player: 'A' } },
    result: { librarySize: expectedLibA },
  });

  await drawCard(page, 'B');
  expectedLibB -= 1;
  logger.log({
    turn: 5, player: 'B',
    action: { type: 'DRAW_CARD', payload: { player: 'B' } },
    result: { librarySize: expectedLibB },
  });

  await assertStateIntegrity(page, playerAZone, playerBZone, expectedLibA, expectedLibB);

  // Turn 6: Player A draws + returns card to library; Player B draws
  // -----------------------------------------------------------------------
  // Show Player A's cards so the drawn card display is visible for return
  await showPlayerCards(page, 'A');
  await drawCard(page, 'A');
  expectedLibA -= 1;
  logger.log({
    turn: 6, player: 'A',
    action: { type: 'DRAW_CARD', payload: { player: 'A' } },
    result: { librarySize: expectedLibA },
  });

  // Return drawn card to top of library
  await expect(playerAZone.locator('.card-display__content')).toBeVisible();
  await playerAZone
    .getByRole('button', { name: 'Return card to library' })
    .click();
  expectedLibA += 1;
  logger.log({
    turn: 6, player: 'A',
    action: { type: 'RETURN_TO_LIBRARY', payload: { player: 'A', position: 'top' } },
    result: { librarySize: expectedLibA },
  });
  await hideAllCards(page);

  await drawCard(page, 'B');
  expectedLibB -= 1;
  logger.log({
    turn: 6, player: 'B',
    action: { type: 'DRAW_CARD', payload: { player: 'B' } },
    result: { librarySize: expectedLibB },
  });

  await assertStateIntegrity(page, playerAZone, playerBZone, expectedLibA, expectedLibB);

  // Turns 7–10: Both players draw each turn
  // -----------------------------------------------------------------------
  for (let turn = 7; turn <= 10; turn++) {
    await drawCard(page, 'A');
    expectedLibA -= 1;
    logger.log({
      turn, player: 'A',
      action: { type: 'DRAW_CARD', payload: { player: 'A' } },
      result: { librarySize: expectedLibA },
    });

    await drawCard(page, 'B');
    expectedLibB -= 1;
    logger.log({
      turn, player: 'B',
      action: { type: 'DRAW_CARD', payload: { player: 'B' } },
      result: { librarySize: expectedLibB },
    });

    await assertStateIntegrity(page, playerAZone, playerBZone, expectedLibA, expectedLibB);
  }

  // ── Screenshot 07: Final board state after ~10 turns ───────────────────
  await captureScreenshot(page, 'full-07-final-board.png');

  // =========================================================================
  // Final assertions
  // =========================================================================

  // Both libraries should still have cards remaining
  expect(expectedLibA).toBeGreaterThan(0);
  expect(expectedLibB).toBeGreaterThan(0);

  // Flush the structured game log
  logger.flush();
});
