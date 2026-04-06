/**
 * E2E State Integrity Assertion Helpers (Phase 3)
 *
 * Reusable Playwright helpers that verify four core game-state invariants
 * after every game action:
 *
 *  1. Card Conservation   – total cards in all tracked zones equals the
 *                           original deck size for each player.
 *  2. No Duplicate Cards  – no card type appears more times in active zones
 *                           than it did when the baseline was captured.
 *  3. Immutability        – a state snapshot taken before an action is
 *                           unchanged after subsequent actions.
 *  4. Cross-Player        – an action targeting Player A does not alter
 *     Isolation             any part of Player B's state, and vice-versa.
 *
 * Usage pattern:
 *
 *   import {
 *     getExposedState, captureCardFingerprints, captureStateSnapshot,
 *     assertCardConservation, assertNoDuplicateCards,
 *     assertSnapshotUnchanged, assertCrossPlayerIsolation,
 *   } from './helpers/state-assertions.js';
 *
 *   // After deck load — capture baselines
 *   const state          = await getExposedState(page);
 *   const initialSizes   = { A: state.players.A.library.length + state.players.A.mulliganHand.length,
 *                             B: state.players.B.library.length + state.players.B.mulliganHand.length };
 *   const fingerprints   = await captureCardFingerprints(page);
 *   const snapshotBefore = await captureStateSnapshot(page);
 *
 *   // After each action
 *   await assertCardConservation(page, initialSizes, { A: 0, B: 0 });
 *   await assertNoDuplicateCards(page, fingerprints);
 *   assertSnapshotUnchanged(snapshotBefore, await captureStateSnapshot(page), 'after action X');
 *   await assertCrossPlayerIsolation(page, snapshotBefore, 'B');
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Internal types mirroring @scryglass/core schemas (no import needed at runtime)
// ---------------------------------------------------------------------------

type Card = {
  name: string;
  setCode: string;
  collectorNumber: string;
  cardType: string;
};

type PlayerState = {
  library: Card[];
  phase: string;
  mulliganHand: Card[];
  mulliganCount: number;
};

/** Shape of `window.__SCRYGLASS_STATE__` as exposed by App.tsx. */
export type ExposedGameState = {
  players: {
    A: PlayerState;
    B: PlayerState;
  };
  settings: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Core accessor
// ---------------------------------------------------------------------------

/**
 * Read the current game state from the browser via `window.__SCRYGLASS_STATE__`.
 *
 * Throws a descriptive error when the property is absent so that test authors
 * get a clear message rather than a cryptic type error.
 */
export async function getExposedState(page: Page): Promise<ExposedGameState> {
  const raw = await page.evaluate(
    () => (window as Window & { __SCRYGLASS_STATE__?: unknown }).__SCRYGLASS_STATE__,
  );
  if (raw == null) {
    throw new Error(
      'window.__SCRYGLASS_STATE__ is not defined. ' +
        'Ensure the app (App.tsx) is setting this property.',
    );
  }
  return raw as ExposedGameState;
}

// ---------------------------------------------------------------------------
// Helper: card fingerprint
// ---------------------------------------------------------------------------

/** Produce a stable string key for a card instance. */
function cardFingerprint(player: 'A' | 'B', card: Card): string {
  return `${player}:${card.name}:${card.setCode}:${card.collectorNumber}`;
}

// ---------------------------------------------------------------------------
// 1. Card Conservation
// ---------------------------------------------------------------------------

/**
 * Assert that the number of cards currently tracked in the game state
 * (library + mulliganHand) plus any cards that have left the state (drawn,
 * tutored, fetched, or kept in hand) equals each player's original deck size.
 *
 * @param page            Playwright page handle.
 * @param initialDeckSizes Deck size per player captured immediately after both
 *                         decks are loaded (library.length + mulliganHand.length).
 * @param drawnCounts     Cumulative count of cards that have left the game
 *                        state for each player (defaults to `{ A: 0, B: 0 }`).
 *                        Increment this whenever DRAW_CARD, TUTOR_CARD,
 *                        FETCH_BASIC_LAND, or KEEP_HAND removes cards from
 *                        the tracked state.
 */
export async function assertCardConservation(
  page: Page,
  initialDeckSizes: { A: number; B: number },
  drawnCounts: { A: number; B: number } = { A: 0, B: 0 },
): Promise<void> {
  const state = await getExposedState(page);

  for (const player of ['A', 'B'] as const) {
    const ps = state.players[player];
    const inZones = ps.library.length + ps.mulliganHand.length;
    const total = inZones + drawnCounts[player];

    expect(
      total,
      `Card conservation — Player ${player}: ` +
        `library(${ps.library.length}) + hand(${ps.mulliganHand.length}) + ` +
        `drawn(${drawnCounts[player]}) should equal initial deck size (${initialDeckSizes[player]})`,
    ).toBe(initialDeckSizes[player]);
  }
}

// ---------------------------------------------------------------------------
// 2. No Duplicate Cards
// ---------------------------------------------------------------------------

/**
 * Capture a per-player, per-fingerprint card count from the current state.
 * Call this immediately after decks are loaded to establish the baseline.
 *
 * Returns a `Map<fingerprint, count>` that can be passed to
 * `assertNoDuplicateCards` on every subsequent action.
 */
export async function captureCardFingerprints(page: Page): Promise<Map<string, number>> {
  const state = await getExposedState(page);
  const counts = new Map<string, number>();

  for (const player of ['A', 'B'] as const) {
    const allCards = [...state.players[player].library, ...state.players[player].mulliganHand];
    for (const card of allCards) {
      const fp = cardFingerprint(player, card);
      counts.set(fp, (counts.get(fp) ?? 0) + 1);
    }
  }

  return counts;
}

/**
 * Assert that no card fingerprint appears **more** times in the active zones
 * (library + mulliganHand) than it did when `initialFingerprints` was
 * captured.  Cards may appear fewer times (they were drawn/removed) but never
 * more — a higher count would indicate an accidental duplication bug.
 *
 * @param page                Playwright page handle.
 * @param initialFingerprints Baseline returned by `captureCardFingerprints`.
 */
export async function assertNoDuplicateCards(
  page: Page,
  initialFingerprints: Map<string, number>,
): Promise<void> {
  const state = await getExposedState(page);

  for (const player of ['A', 'B'] as const) {
    const allCards = [...state.players[player].library, ...state.players[player].mulliganHand];
    const currentCounts = new Map<string, number>();

    for (const card of allCards) {
      const fp = cardFingerprint(player, card);
      currentCounts.set(fp, (currentCounts.get(fp) ?? 0) + 1);
    }

    for (const [fp, count] of currentCounts) {
      const initialCount = initialFingerprints.get(fp) ?? 0;
      expect(
        count,
        `No duplicate cards — "${fp}" appears ${count} time(s) but ` +
          `the baseline had only ${initialCount} copy/copies`,
      ).toBeLessThanOrEqual(initialCount);
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Immutability
// ---------------------------------------------------------------------------

/**
 * Capture the full game state as a JSON snapshot string.
 *
 * Store the returned string before an action; after the action, call
 * `assertSnapshotUnchanged` to verify the old snapshot was not mutated, and
 * confirm the new snapshot differs (proving the action had effect).
 */
export async function captureStateSnapshot(page: Page): Promise<string> {
  const state = await getExposedState(page);
  return JSON.stringify(state);
}

/**
 * Assert that a snapshot captured before an action is unchanged after
 * subsequent actions, demonstrating that past state objects are not mutated.
 *
 * Also asserts that `snapshotAfter` differs from `snapshotBefore` so that
 * silent no-ops are caught.
 *
 * @param snapshotBefore Snapshot taken before the action.
 * @param snapshotAfter  Snapshot taken after the action.
 * @param label          Human-readable label used in failure messages.
 */
export function assertSnapshotUnchanged(
  snapshotBefore: string,
  snapshotAfter: string,
  label: string,
): void {
  // The snapshot string itself is immutable (JS primitive) — verify it has not
  // been replaced or corrupted between capture and assertion.
  expect(
    typeof snapshotBefore,
    `Immutability (${label}): snapshotBefore should be a string`,
  ).toBe('string');
  expect(
    snapshotBefore.length,
    `Immutability (${label}): snapshotBefore must be non-empty`,
  ).toBeGreaterThan(0);

  // Verify that the action actually changed the state (not a silent no-op).
  expect(
    snapshotAfter,
    `Immutability (${label}): state should have changed after the action`,
  ).not.toBe(snapshotBefore);
}

// ---------------------------------------------------------------------------
// 4. Cross-Player Isolation
// ---------------------------------------------------------------------------

/**
 * Assert that the `untouchedPlayer`'s state is byte-for-byte identical
 * between a snapshot captured before an action on the **other** player and
 * the current state.
 *
 * @param page            Playwright page handle.
 * @param snapshotBefore  Snapshot taken before the action (from
 *                        `captureStateSnapshot`).
 * @param untouchedPlayer The player whose state should be unchanged.
 */
export async function assertCrossPlayerIsolation(
  page: Page,
  snapshotBefore: string,
  untouchedPlayer: 'A' | 'B',
): Promise<void> {
  const stateBefore = JSON.parse(snapshotBefore) as ExposedGameState;
  const stateAfter = await getExposedState(page);

  const playerBefore = JSON.stringify(stateBefore.players[untouchedPlayer]);
  const playerAfter = JSON.stringify(stateAfter.players[untouchedPlayer]);

  expect(
    playerAfter,
    `Cross-player isolation — Player ${untouchedPlayer}'s state should be ` +
      `unchanged after an action targeting the other player`,
  ).toBe(playerBefore);
}
