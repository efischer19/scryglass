import { test, expect, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const goodDeck = readFileSync(resolve(__dirname, 'fixtures/good.txt'), 'utf-8');
const evilDeck = readFileSync(resolve(__dirname, 'fixtures/evil.txt'), 'utf-8');

/** Helper: load both decks and navigate to #/app */
async function loadBothDecks(page: Page) {
  await page.goto('/');

  // Player A
  await expect(page.locator('section[aria-label="Deck input for Player A"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(goodDeck);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  // Player B
  await expect(page.locator('section[aria-label="Deck input for Player B"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(evilDeck);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  await page.waitForURL('**/#/app');

  const playerAZone = page.locator("section[aria-label=\"Player A's zone\"]");
  const playerBZone = page.locator("section[aria-label=\"Player B's zone\"]");
  await playerAZone.getByRole('button', { name: "Deal initial hand for Player A" }).click();
  await playerBZone.getByRole('button', { name: "Deal initial hand for Player B" }).click();
}

test.describe('mulligan phase', () => {
  test.beforeEach(async ({ page }) => {
    await loadBothDecks(page);
  });

  test('both players start in mulligan phase with 7-card opening hands', async ({ page }) => {
    // Both players' mulligan hand sections should be visible
    await expect(page.locator('section[aria-label="Player A\'s opening hand"]')).toBeVisible();
    await expect(page.locator('section[aria-label="Player B\'s opening hand"]')).toBeVisible();

    // Reveal Player A's hand and verify exactly 7 cards
    await page.getByRole('button', { name: "Tap to reveal Player A's hand" }).click();
    await expect(page.locator('ul[aria-label="Player A\'s hand cards"] li')).toHaveCount(7);

    // Reveal Player B's hand and verify exactly 7 cards
    await page.getByRole('button', { name: "Tap to reveal Player B's hand" }).click();
    await expect(page.locator('ul[aria-label="Player B\'s hand cards"] li')).toHaveCount(7);
  });

  test('mulligan reshuffles and deals 7 new cards; other player state is unaffected', async ({ page }) => {
    const playerAZone = page.locator('section[aria-label="Player A\'s zone"]');
    const playerBZone = page.locator('section[aria-label="Player B\'s zone"]');

    // Record Player B's library size before Player A mulligans
    const playerBLibraryBefore = await getLibrarySize(playerBZone);

    // Reveal Player B's hand to capture the card names for later comparison
    await page.getByRole('button', { name: "Tap to reveal Player B's hand" }).click();
    const playerBHandLocator = page.locator('ul[aria-label="Player B\'s hand cards"] li');
    await expect(playerBHandLocator).toHaveCount(7);
    const playerBHandBefore = await playerBHandLocator.allTextContents();

    // Perform mulligan for Player A
    await page.getByRole('button', { name: "Mulligan Player A's hand" }).click();

    // Player A's mulligan count should increment to 1
    await expect(playerAZone.locator('.mulligan-hand__mulligan-count')).toContainText('Mulligans taken: 1');

    // Player A should have a new 7-card hand
    await page.getByRole('button', { name: "Tap to reveal Player A's hand" }).click();
    await expect(page.locator('ul[aria-label="Player A\'s hand cards"] li')).toHaveCount(7);

    // Player B's library size should be unchanged
    const playerBLibraryAfter = await getLibrarySize(playerBZone);
    expect(playerBLibraryAfter).toBe(playerBLibraryBefore);

    // Player B's mulligan count should still be 0
    await expect(playerBZone.locator('.mulligan-hand__mulligan-count')).toContainText('Mulligans taken: 0');

    // Player B's hand cards should be identical to before Player A mulliganed
    const playerBHandAfter = await playerBHandLocator.allTextContents();
    expect(playerBHandAfter).toEqual(playerBHandBefore);
  });

  test('keeping both hands transitions both players to the playing phase', async ({ page }) => {
    const playerAZone = page.locator('section[aria-label="Player A\'s zone"]');
    const playerBZone = page.locator('section[aria-label="Player B\'s zone"]');

    // Keep both players' hands
    await page.getByRole('button', { name: "Keep Player A's opening hand" }).click();
    await page.getByRole('button', { name: "Keep Player B's opening hand" }).click();

    // Mulligan hand sections should no longer be visible (phase has transitioned)
    await expect(page.locator('section[aria-label="Player A\'s opening hand"]')).not.toBeVisible();
    await expect(page.locator('section[aria-label="Player B\'s opening hand"]')).not.toBeVisible();

    // Gameplay action buttons should now be enabled for both players
    await expect(playerAZone.getByRole('button', { name: "Draw card from Player A's library" })).toBeEnabled();
    await expect(playerBZone.getByRole('button', { name: "Draw card from Player B's library" })).toBeEnabled();
  });
});

async function getLibrarySize(zone: Locator): Promise<number> {
  const text = await zone.locator('.player-zone__card-count').textContent();
  const match = text?.match(/Cards:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}
