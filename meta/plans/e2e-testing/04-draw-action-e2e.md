# feat: E2E test for draw card action

## What do you want to build?

Write a Playwright E2E test that verifies the draw card action works correctly for both players during gameplay. After the mulligan phase completes, each player draws a card and the test asserts the library size decreases and the UI updates accordingly.

This covers Phase 2, Step 5 ("Draw") of the [E2E testing strategy](../e2e-testing-strategy.md).

## Acceptance Criteria

- [ ] After both players keep their hands (setup from ticket 03), the test dispatches a draw action for Player A
- [ ] The test asserts Player A's library size decreases by 1 after the draw
- [ ] The drawn card is displayed in the UI (e.g., revealed card area or hand display)
- [ ] The test dispatches a draw action for Player B and verifies the same behavior
- [ ] Drawing a card for one player does not modify the other player's library size or state
- [ ] All assertions pass against the production build

## Implementation Notes (Optional)

- The draw action corresponds to `{ type: "DRAW_CARD", payload: { player: "A" } }` in the core reducer (ADR-005). In the UI, this should be triggered by clicking a "Draw" button in the player's zone.

- Use Playwright locators to find the draw button for each player and click it. After clicking, wait for the UI to update (library count changes, drawn card appears).

- If the app exposes library size in the UI (e.g., "Library: 93 cards"), assert the numeric value decreases by 1. If not exposed directly, this ticket may need to add a `data-testid` or accessible label showing library count.

- This test establishes the pattern for all subsequent gameplay action tests (scry, tutor, fetch). Consider extracting a `drawCard(page, player)` helper function for reuse.
