# feat: E2E test for mulligan phase — opening hands, mulligan, and keep

## What do you want to build?

Write Playwright E2E tests that verify the mulligan phase works correctly end-to-end: both players receive 7-card opening hands after deck load, a player can mulligan (return hand, reshuffle, redraw), and both players can keep their hands to transition to the `playing` phase.

This covers Phase 1, Steps 2–4 of the [E2E testing strategy](../e2e-testing-strategy.md).

## Acceptance Criteria

- [ ] After both decks are loaded, the test asserts both players are in the `mulligan` phase
- [ ] Both players' opening hands display exactly 7 cards in the UI
- [ ] The test triggers a mulligan for one player and verifies:
  - The hand is returned to the library and a new 7-card hand is dealt
  - The mulligan count increments in the UI
  - The other player's state is completely unaffected (same hand, same library size, same phase)
- [ ] The test has both players keep their hands and verifies:
  - Both players transition from `mulligan` → `playing` phase
  - The UI reflects the playing phase (e.g., gameplay action buttons become available)
- [ ] All assertions pass against the production build

## Implementation Notes (Optional)

- Reuse the deck-loading helper established in ticket 02 to set up both decks before testing mulligan.

- The mulligan UI should display the current mulligan count. After one mulligan, Player A's count shows 1; Player B's remains 0 (or not shown).

- Cross-player isolation is critical here: when Player A mulligans, assert that Player B's hand cards, library count, and phase are unchanged. This is one of the first opportunities to catch cross-player state corruption bugs.

- The transition from `mulligan` to `playing` phase may be indicated by UI changes (e.g., draw/scry/tutor buttons appearing, or a phase label changing). Use Playwright's `waitFor` to assert these elements become visible.

- Consider seeding the shuffle (if the app supports a test mode or seed parameter) to make opening hands deterministic. If not, the test should assert structural properties (card count, phase transition) rather than specific card names.
