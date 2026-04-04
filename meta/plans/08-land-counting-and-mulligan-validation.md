# Ticket 08: Land Counting & Mulligan Validation

## What do you want to build?

Implement the pure land-counting and mulligan verdict logic in `@scryglass/core` (`packages/core/src/mulligan.ts`). This module provides the rules engine behind the casual mulligan system — it determines whether a player is allowed to mulligan, forced to keep, or given the choice based on the land count in their opening hand.

This is core logic only — no DOM, no browser APIs, no UI components. The PWA consumes these functions to enable/disable buttons (Ticket 09).

## Acceptance Criteria

### Functions (`packages/core/src/mulligan.ts`)

- [ ] A `countLands(hand: Card[]): number` function is exported and counts cards in the hand whose `cardType` contains the substring `Land` (case-insensitive)
- [ ] A `getMulliganVerdict(landCount: number, settings: { allowMulliganWith2or5Lands: boolean }): MulliganVerdict` function is exported and returns one of three verdicts:
  - `'must_mulligan'` — 0, 1, 6, or 7 lands (auto-recommend mulligan)
  - `'must_keep'` — 3 or 4 lands (hard lock — mulligan button disabled)
  - `'user_choice'` — 2 or 5 lands (allowed only if `allowMulliganWith2or5Lands` is `true`)
- [ ] When `allowMulliganWith2or5Lands` is `false` (default), 2 or 5 lands returns `'must_keep'`
- [ ] When `allowMulliganWith2or5Lands` is `true`, 2 or 5 lands returns `'user_choice'`
- [ ] Both functions are re-exported from the `@scryglass/core` barrel export

### Schemas & Types (`packages/core/src/schemas/`)

- [ ] A `MulliganVerdictSchema` Zod enum is defined with values: `must_mulligan`, `must_keep`, `user_choice`
- [ ] The `MulliganVerdict` TypeScript type is derived from `MulliganVerdictSchema` via `z.infer<typeof MulliganVerdictSchema>`
- [ ] `GameStateSchema` is extended with a `settings` object containing `allowMulliganWith2or5Lands: z.boolean()` (default: `false` in `createInitialState()`)

### Testing

- [ ] Unit tests (Vitest) in `packages/core/src/__tests__/` validate both functions
- [ ] Test: `countLands` correctly identifies `Basic Land — Mountain`, `Land — Urza's`, `Legendary Land`, and non-land card types
- [ ] Test: `getMulliganVerdict` returns the correct verdict for all land count values (0–7) with `allowMulliganWith2or5Lands` set to `false`
- [ ] Test: `getMulliganVerdict` returns the correct verdict for all land count values (0–7) with `allowMulliganWith2or5Lands` set to `true`
- [ ] Test: the module has zero browser dependencies (no DOM, no `window`, no `fetch`)

## Implementation Notes (Optional)

The land detection uses a simple substring check: `cardType.toLowerCase().includes('land')`. This correctly identifies `Basic Land — Mountain`, `Land — Urza's`, `Legendary Land`, etc.

The `settings.allowMulliganWith2or5Lands` boolean is stored in `GameState.settings` and initialized to `false` by `createInitialState()`. The PWA will present a toggle for this setting during the deck loading phase (Ticket 06) or the mulligan phase (Ticket 09).

**References:** Ticket 07 (Mulligan Core Logic — `MULLIGAN` action), [ADR-005: Action/Reducer State Management](../../meta/adr/ADR-005-client_state_management.md)
