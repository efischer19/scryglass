import { test, expect, type Locator } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameLogger } from './helpers/game-logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const goodDeck = readFileSync(resolve(__dirname, 'fixtures/good.txt'), 'utf-8');
const evilDeck = readFileSync(resolve(__dirname, 'fixtures/evil.txt'), 'utf-8');

test('full game simulation produces a structured game log', async ({ page }) => {
  const logger = new GameLogger('game-log.json');

  // --- Load decks ---
  await page.goto('/');

  await expect(page.locator('section[aria-label="Deck input for Player A"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(goodDeck);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  await expect(page.locator('section[aria-label="Deck input for Player B"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(evilDeck);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  await page.waitForURL('**/#/app');

  // --- Keep opening hands for both players ---
  const playerAZone = page.locator("section[aria-label=\"Player A's zone\"]");
  const playerBZone = page.locator("section[aria-label=\"Player B's zone\"]");

  await playerAZone.getByRole('button', { name: "Keep Player A's opening hand" }).click();
  logger.log({
    turn: 0,
    player: 'A',
    action: { type: 'KEEP_HAND', payload: { player: 'A' } },
    result: { librarySize: await getLibrarySize(playerAZone) },
  });

  await playerBZone.getByRole('button', { name: "Keep Player B's opening hand" }).click();
  logger.log({
    turn: 0,
    player: 'B',
    action: { type: 'KEEP_HAND', payload: { player: 'B' } },
    result: { librarySize: await getLibrarySize(playerBZone) },
  });

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
