import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drawCard } from './helpers/draw-card-helper.js';
import { showPlayerCards } from './helpers/visibility-helper.js';
import { confirmDefaultSettings } from './helpers/settings-helper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const goodDeck = readFileSync(resolve(__dirname, 'fixtures/good.txt'), 'utf-8');
const evilDeck = readFileSync(resolve(__dirname, 'fixtures/evil.txt'), 'utf-8');

test.describe('Status bar', () => {
  test('shows "Selecting deck for Player A" after confirming settings', async ({ page }) => {
    await page.goto('/');
    await confirmDefaultSettings(page);
    await expect(page.locator('.status-bar')).toContainText('Selecting deck for Player A');
  });

  test('shows "Selecting deck for Player B" after Player A loads their deck', async ({ page }) => {
    await page.goto('/');
    await confirmDefaultSettings(page);

    await expect(page.locator('section[aria-label="Deck input for Player A"]')).toBeVisible();
    await page.locator('#deck-textarea').fill(goodDeck);
    await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

    await expect(page.locator('section[aria-label="Deck input for Player B"]')).toBeVisible();
    await expect(page.locator('.status-bar')).toContainText('Selecting deck for Player B');
  });

  test('shows draw counts starting at 0 after both decks are loaded', async ({ page }) => {
    await page.goto('/');
    await confirmDefaultSettings(page);

    await page.locator('#deck-textarea').fill(goodDeck);
    await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

    await expect(page.locator('section[aria-label="Deck input for Player B"]')).toBeVisible();
    await page.locator('#deck-textarea').fill(evilDeck);
    await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

    await page.waitForURL('**/#/app');

    await expect(page.locator('.status-bar')).toContainText('Number of draws - A:0 B:0');
  });

  test('increments draw count after each player draws a card', async ({ page }) => {
    await page.goto('/');
    await confirmDefaultSettings(page);

    await page.locator('#deck-textarea').fill(goodDeck);
    await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

    await expect(page.locator('section[aria-label="Deck input for Player B"]')).toBeVisible();
    await page.locator('#deck-textarea').fill(evilDeck);
    await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

    await page.waitForURL('**/#/app');

    // Keep both players' opening hands
    const playerAZone = page.locator("section[aria-label=\"Player A's zone\"]");
    const playerBZone = page.locator("section[aria-label=\"Player B's zone\"]");
    // Player A: show cards, deal, keep (auto-hides on KEEP_HAND)
    await showPlayerCards(page, 'A');
    await playerAZone.getByRole('button', { name: "Deal initial hand for Player A" }).click();
    await playerAZone.getByRole('button', { name: "Keep Player A's opening hand" }).click();
    // Player B: show cards, deal, keep (auto-hides on KEEP_HAND)
    await showPlayerCards(page, 'B');
    await playerBZone.getByRole('button', { name: "Deal initial hand for Player B" }).click();
    await playerBZone.getByRole('button', { name: "Keep Player B's opening hand" }).click();

    // Draw a card for Player A
    await drawCard(page, 'A');
    await expect(page.locator('.status-bar')).toContainText('Number of draws - A:1 B:0');

    // Draw a card for Player B
    await drawCard(page, 'B');
    await expect(page.locator('.status-bar')).toContainText('Number of draws - A:1 B:1');

    // Draw another card for Player A
    await drawCard(page, 'A');
    await expect(page.locator('.status-bar')).toContainText('Number of draws - A:2 B:1');
  });
});
