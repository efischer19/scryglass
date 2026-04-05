# feat: full 2-player, 10-turn game simulation E2E test

## What do you want to build?

Write the capstone Playwright E2E test that orchestrates a complete 2-player game simulation: load both decks, complete the mulligan phase, and play approximately 10 turns of mixed gameplay actions (draw, scry, tutor, fetch, return to library). This test ties together all prior E2E tickets into a single, comprehensive game flow that runs on every push to `main`.

This is the final ticket in the E2E testing epic, fulfilling the overall goal described in the [E2E testing strategy](../e2e-testing-strategy.md) and [ADR-011](../../adr/ADR-011-e2e_testing_strategy.md).

## Acceptance Criteria

- [ ] A single Playwright test file (`packages/pwa/e2e/full-game.spec.ts`) orchestrates the complete game flow
- [ ] The test loads `good.txt` for Player A and `evil.txt` for Player B
- [ ] Both players complete the mulligan phase (one player mulligans once, both keep)
- [ ] The test plays ~10 turns with a mix of actions across both players:
  - Multiple draw actions (at least one per turn per player)
  - At least one scry action with top/bottom decisions
  - At least one tutor action searching for a specific card
  - At least one fetch basic land action
  - At least one return-to-library action
- [ ] State integrity assertions (ticket 08) run after every action
- [ ] Visual regression screenshots (ticket 10) are captured at all 7 defined moments
- [ ] A structured game log (ticket 09) is produced with an entry for every action
- [ ] The entire test completes in under 60 seconds
- [ ] The test is deterministic — no flaky failures due to randomness (shuffle is seeded or assertions are structural)
- [ ] The test passes against the production build via `npm run build && npm run test:e2e`

## Implementation Notes (Optional)

- This test is the "integration point" for all E2E building blocks. Import and reuse helpers from prior tickets:
  - Deck loading helper (ticket 02)
  - State integrity assertions (ticket 08)
  - Game logger (ticket 09)
  - Screenshot capture helper (ticket 10)

- **Determinism strategy:** The shuffle must be seeded for this test to avoid flaky failures. Options:
  1. The app accepts a `?seed=<value>` query parameter in test mode that seeds the crypto-based shuffle with a deterministic PRNG
  2. The test uses `page.evaluate()` to mock `crypto.getRandomValues` with a seeded PRNG before any game actions
  3. Assertions focus on structural properties (card counts, zone integrity) rather than specific card names, making randomness irrelevant

  Option 3 is simplest and sufficient for most assertions. Option 1 or 2 may be needed if any assertion requires specific card names (e.g., verifying the tutored card's name).

- **Turn structure:** Each turn should follow a realistic pattern:
  1. Player A draws
  2. Player A takes an optional action (scry, tutor, fetch, or pass)
  3. Player B draws
  4. Player B takes an optional action
  5. Run state integrity assertions

- Example turn sequence for ~10 turns:

  | Turn | Player A Action | Player B Action |
  | :--- | :-------------- | :-------------- |
  | 1 | Draw | Draw |
  | 2 | Draw, Scry 2 | Draw |
  | 3 | Draw | Draw, Tutor "Nazgûl" |
  | 4 | Draw, Fetch Forest | Draw |
  | 5 | Draw | Draw |
  | 6 | Draw, Return card to library | Draw |
  | 7 | Draw | Draw |
  | 8 | Draw | Draw |
  | 9 | Draw | Draw |
  | 10 | Draw | Draw |

- If the test exceeds the 60-second budget, reduce the number of turns or simplify non-essential actions. The critical path is: deck load → mulligan → draw → scry → tutor → fetch → return → integrity checks.
