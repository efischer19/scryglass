import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { showPlayerCards, hideAllCards } from './helpers/visibility-helper.js';
import { confirmDefaultSettings } from './helpers/settings-helper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const goodDeck = readFileSync(resolve(__dirname, 'fixtures/good.txt'), 'utf-8');
const evilDeck = readFileSync(resolve(__dirname, 'fixtures/evil.txt'), 'utf-8');

/** Navigate to the app view with both decks loaded but in pre-deal state. */
async function loadBothDecks(page: Page): Promise<void> {
  await page.goto('/');
  await confirmDefaultSettings(page);

  await expect(page.locator('section[aria-label="Deck input for Player A"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(goodDeck);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  await expect(page.locator('section[aria-label="Deck input for Player B"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(evilDeck);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  await page.waitForURL('**/#/app');
}

test.describe('pass-and-play visibility gate', () => {
  test.beforeEach(async ({ page }) => {
    await loadBothDecks(page);
  });

  test('no cards visible on initial load: both players show Show button, no cards sections', async ({ page }) => {
    const playerAZone = page.locator("section[aria-label=\"Player A's zone\"]");
    const playerBZone = page.locator("section[aria-label=\"Player B's zone\"]");

    // Both zones should have "Show" buttons
    await expect(playerAZone.getByRole('button', { name: "Show Player A's cards" })).toBeVisible();
    await expect(playerBZone.getByRole('button', { name: "Show Player B's cards" })).toBeVisible();

    // No "Hide all cards" button when nothing is visible
    await expect(page.getByRole('button', { name: 'Hide all cards' })).not.toBeVisible();

    // Card sections are not rendered when gate is closed
    await expect(page.locator('section[aria-label="Player A\'s opening hand"]')).not.toBeVisible();
    await expect(page.locator('section[aria-label="Player B\'s opening hand"]')).not.toBeVisible();
  });

  test('showing one player hides the other: only one Show button disappears', async ({ page }) => {
    const playerAZone = page.locator("section[aria-label=\"Player A's zone\"]");
    const playerBZone = page.locator("section[aria-label=\"Player B's zone\"]");

    // Show Player A's cards
    await showPlayerCards(page, 'A');

    // Player A's Show button is gone; Player B's Show button is also gone
    await expect(playerAZone.getByRole('button', { name: "Show Player A's cards" })).not.toBeVisible();
    await expect(playerBZone.getByRole('button', { name: "Show Player B's cards" })).not.toBeVisible();

    // Only "Hide all cards" is available as a visibility action
    await expect(page.getByRole('button', { name: 'Hide all cards' })).toBeVisible();
  });

  test('when Player A is visible, Player B card sections are not rendered', async ({ page }) => {
    const playerBZone = page.locator("section[aria-label=\"Player B's zone\"]");

    await showPlayerCards(page, 'A');

    // Player B's opening hand section should NOT be rendered
    await expect(playerBZone.locator('section[aria-label="Player B\'s opening hand"]')).not.toBeVisible();
  });

  test('hiding all cards restores both Show buttons and hides card sections', async ({ page }) => {
    const playerAZone = page.locator("section[aria-label=\"Player A's zone\"]");
    const playerBZone = page.locator("section[aria-label=\"Player B's zone\"]");

    // Show Player A, then hide all
    await showPlayerCards(page, 'A');
    await hideAllCards(page);

    // Both Show buttons should be back
    await expect(playerAZone.getByRole('button', { name: "Show Player A's cards" })).toBeVisible();
    await expect(playerBZone.getByRole('button', { name: "Show Player B's cards" })).toBeVisible();

    // Hide all cards button should be gone
    await expect(page.getByRole('button', { name: 'Hide all cards' })).not.toBeVisible();
  });

  test('switching between players works: Show A → Hide → Show B', async ({ page }) => {
    const playerAZone = page.locator("section[aria-label=\"Player A's zone\"]");
    const playerBZone = page.locator("section[aria-label=\"Player B's zone\"]");

    // Show Player A's cards and deal
    await showPlayerCards(page, 'A');
    await playerAZone.getByRole('button', { name: "Deal initial hand for Player A" }).click();
    await expect(playerAZone.locator('section[aria-label="Player A\'s opening hand"]')).toBeVisible();

    // Player B's opening hand is not visible
    await expect(playerBZone.locator('section[aria-label="Player B\'s opening hand"]')).not.toBeVisible();

    // Hide all and switch to Player B
    await hideAllCards(page);
    await showPlayerCards(page, 'B');
    await playerBZone.getByRole('button', { name: "Deal initial hand for Player B" }).click();
    await expect(playerBZone.locator('section[aria-label="Player B\'s opening hand"]')).toBeVisible();

    // Player A's opening hand is not visible
    await expect(playerAZone.locator('section[aria-label="Player A\'s opening hand"]')).not.toBeVisible();
  });
});
