import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const goodDeck = readFileSync(resolve(__dirname, 'fixtures/good.txt'), 'utf-8');
const evilDeck = readFileSync(resolve(__dirname, 'fixtures/evil.txt'), 'utf-8');

/** Helper: load both decks and navigate to #/app */
async function loadBothDecks(page: import('@playwright/test').Page) {
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
}

/** Helper: keep hand for both players to advance past mulligan phase */
async function keepBothHands(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: "Deal initial hand for Player A" }).click();
  await page.getByRole('button', { name: "Deal initial hand for Player B" }).click();
  await page.getByRole('button', { name: "Keep Player A's opening hand" }).click();
  await page.getByRole('button', { name: "Keep Player B's opening hand" }).click();
}

test.describe('axe-core accessibility scans', () => {
  test('deck input page (#/input) has no a11y violations', async ({ page }) => {
    await page.goto('/#/input');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('editor page (#/editor) has no a11y violations', async ({ page }) => {
    await page.goto('/#/editor');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('game page (#/app) has no a11y violations', async ({ page }) => {
    await loadBothDecks(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

test.describe('keyboard navigation — DeckInput page', () => {
  test('Tab moves through interactive elements in logical order', async ({ page }) => {
    await page.goto('/#/input');

    // Collect the tab order by pressing Tab repeatedly from the beginning
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeTruthy();

    // Tab through several more elements and verify focus moves within the page
    const labels: string[] = [];
    for (let i = 0; i < 8; i++) {
      const label = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return (
          el?.getAttribute('aria-label') ??
          el?.getAttribute('placeholder') ??
          (el as HTMLButtonElement | null)?.textContent?.trim() ??
          el?.id ??
          el?.tagName ??
          ''
        );
      });
      labels.push(label);
      await page.keyboard.press('Tab');
    }

    // The textarea for deck input should appear in the tab sequence
    expect(labels.some((l) => l.toLowerCase().includes('deck') || l === 'TEXTAREA')).toBe(true);
  });
});

/** Helper: wait for focus to settle inside a dialog element */
async function waitForFocusInDialog(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => {
    const active = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector('[role="dialog"], [role="alertdialog"]');
    return dialog?.contains(active) ?? false;
  });
}

test.describe('modal accessibility — focus trap & Escape', () => {
  test.beforeEach(async ({ page }) => {
    await loadBothDecks(page);
    await keepBothHands(page);
  });

  test('Scry modal traps focus and Escape closes it', async ({ page }) => {
    const playerAZone = page.locator('section[aria-label="Player A\'s zone"]');

    // Open Scry modal for Player A — first shows a ConfirmationGate
    await playerAZone.getByRole('button', { name: "Scry Player A's library" }).click();

    const gate = page.locator('[role="alertdialog"]');
    await expect(gate).toBeVisible();

    // Confirm to proceed to the scry count dialog
    await page.getByRole('button', { name: 'Yes' }).click();

    const modal = page.locator('[role="dialog"][aria-label*="Scry"]').first();
    await expect(modal).toBeVisible();
    await waitForFocusInDialog(page);

    // Tab through focusable elements — focus must stay within the modal
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      const focusedInModal = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        const dialog = document.querySelector('[role="dialog"]');
        return dialog?.contains(active) ?? false;
      });
      expect(focusedInModal).toBe(true);
    }

    // Escape should close the modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('Tutor modal traps focus and Escape closes it', async ({ page }) => {
    const playerAZone = page.locator('section[aria-label="Player A\'s zone"]');

    // Open Tutor modal for Player A
    await playerAZone.getByRole('button', { name: "Tutor card from Player A's library" }).click();

    const modal = page.locator('[role="dialog"][aria-label*="Tutor"]');
    await expect(modal).toBeVisible();
    // Wait for auto-focus to settle on the search input
    await waitForFocusInDialog(page);

    const focusedInModal = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      const dialog = document.querySelector('[role="dialog"]');
      return dialog?.contains(active) ?? false;
    });
    expect(focusedInModal).toBe(true);

    // Tab through several elements — focus must stay within the modal
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      const stillInModal = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        const dialog = document.querySelector('[role="dialog"]');
        return dialog?.contains(active) ?? false;
      });
      expect(stillInModal).toBe(true);
    }

    // Escape should close the modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('FetchLand modal traps focus and Escape closes it', async ({ page }) => {
    const playerAZone = page.locator('section[aria-label="Player A\'s zone"]');

    // Open FetchLand modal for Player A
    await playerAZone.getByRole('button', { name: "Fetch basic land from Player A's library" }).click();

    const modal = page.locator('[role="dialog"][aria-label*="Fetch"]');
    await expect(modal).toBeVisible();
    // Wait for auto-focus to settle on the modal container
    await waitForFocusInDialog(page);

    // Tab through several elements — focus must stay within the modal
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      const focusedInModal = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        const dialog = document.querySelector('[role="dialog"]');
        return dialog?.contains(active) ?? false;
      });
      expect(focusedInModal).toBe(true);
    }

    // Escape should close the modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });
});
