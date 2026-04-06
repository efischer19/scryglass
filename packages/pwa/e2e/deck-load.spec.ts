import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getExposedState,
  captureCardFingerprints,
  captureStateSnapshot,
  assertCardConservation,
  assertNoDuplicateCards,
  assertSnapshotUnchanged,
  assertCrossPlayerIsolation,
} from './helpers/state-assertions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const goodDeck = readFileSync(resolve(__dirname, 'fixtures/good.txt'), 'utf-8');
const evilDeck = readFileSync(resolve(__dirname, 'fixtures/evil.txt'), 'utf-8');

test('loads good.txt for Player A and evil.txt for Player B, then transitions to shuffler view', async ({ page }) => {
  await page.goto('/');

  // --- Player A: load good.txt (Fellowship) ---
  await expect(page.locator('section[aria-label="Deck input for Player A"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(goodDeck);
  await expect(page.locator('.deck-input__counts')).toContainText(/Total cards: [1-9][0-9]*/);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  // --- Player B: load evil.txt (Sauron) ---
  // DeckInput re-mounts for Player B after Player A's deck is stored
  await expect(page.locator('section[aria-label="Deck input for Player B"]')).toBeVisible();
  await page.locator('#deck-textarea').fill(evilDeck);
  await expect(page.locator('.deck-input__counts')).toContainText(/Total cards: [1-9][0-9]*/);
  await page.getByRole('button', { name: 'Load Deck', exact: true }).click();

  // --- Verify navigation to shuffler view (#/app) ---
  await page.waitForURL('**/#/app');

  // --- Verify both players' libraries are populated (non-zero card count) ---
  const playerAZone = page.locator('section[aria-label="Player A\'s zone"]');
  const playerBZone = page.locator('section[aria-label="Player B\'s zone"]');

  await expect(playerAZone.locator('.player-zone__card-count')).toContainText(/Cards: [1-9][0-9]*/);
  await expect(playerBZone.locator('.player-zone__card-count')).toContainText(/Cards: [1-9][0-9]*/);

  // -------------------------------------------------------------------------
  // State integrity assertions (Phase 3)
  // -------------------------------------------------------------------------

  // Capture baselines immediately after both decks are loaded and opening
  // hands are dealt.  At this point every card is in either `library` or
  // `mulliganHand`, so the sum equals the original deck size.
  const initialState = await getExposedState(page);
  const initialDeckSizes = {
    A: initialState.players.A.library.length + initialState.players.A.mulliganHand.length,
    B: initialState.players.B.library.length + initialState.players.B.mulliganHand.length,
  };

  // Baseline fingerprint map for no-duplicate checks.
  const fingerprints = await captureCardFingerprints(page);

  // Snapshot before any player keeps their hand (used for isolation check).
  const snapshotBeforeKeepA = await captureStateSnapshot(page);

  // 1. Card conservation — no cards are missing or added after deck load.
  await assertCardConservation(page, initialDeckSizes);

  // 2. No duplicate cards — every card fingerprint count is <= its baseline.
  await assertNoDuplicateCards(page, fingerprints);

  // ---- Player A keeps their opening hand ----
  await playerAZone.getByRole('button', { name: "Keep Player A's opening hand" }).click();

  // Wait for the mulligan UI to disappear — confirms React processed KEEP_HAND
  // and committed the new state (phase → 'playing') to the DOM.  After this
  // point useLayoutEffect has run, so window.__SCRYGLASS_STATE__ is current.
  await expect(playerAZone.locator('.mulligan-hand')).toBeHidden();

  // After Player A keeps their hand the 7 mulligan cards leave the tracked
  // state, so we add them to the drawn counter for Player A.
  const keptByA = initialState.players.A.mulliganHand.length;
  const snapshotAfterKeepA = await captureStateSnapshot(page);

  // 3. Immutability — snapshotBeforeKeepA must not have been mutated and the
  //    state must actually have changed after Player A kept their hand.
  assertSnapshotUnchanged(snapshotBeforeKeepA, snapshotAfterKeepA, 'Player A keeps hand');

  // 1. Card conservation — player A's kept hand cards are now out of state.
  await assertCardConservation(page, initialDeckSizes, { A: keptByA, B: 0 });

  // 2. No duplicate cards — still valid after Player A's keep action.
  await assertNoDuplicateCards(page, fingerprints);

  // 4. Cross-player isolation — Player B's state must be byte-for-byte
  //    identical to what it was before Player A's keep action.
  await assertCrossPlayerIsolation(page, snapshotBeforeKeepA, 'B');
});
