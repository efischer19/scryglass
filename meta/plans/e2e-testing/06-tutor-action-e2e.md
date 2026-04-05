# feat: E2E test for tutor action

## What do you want to build?

Write a Playwright E2E test that verifies the tutor action works correctly end-to-end. A player tutors for a specific card by name, the card is found and removed from the library, and the remaining library is shuffled.

This covers Phase 2, Step 7 ("Tutor") of the [E2E testing strategy](../e2e-testing-strategy.md).

## Acceptance Criteria

- [ ] The test triggers a tutor action for Player B via the UI, searching for a known card in the `evil.txt` deck (e.g., "Nazgûl")
- [ ] The tutor UI (search modal or input) displays matching results
- [ ] The test selects the target card and confirms the tutor action
- [ ] After tutoring, the test asserts:
  - The library size decreased by 1
  - The tutored card is no longer in the library (if library contents are inspectable via the UI)
  - The library has been shuffled (order changed from pre-tutor state)
- [ ] Cross-player isolation: Player A's state is unaffected by Player B's tutor
- [ ] All assertions pass against the production build

## Implementation Notes (Optional)

- The tutor action in the core reducer is `{ type: "TUTOR_CARD", payload: { player: "B", cardName: "Nazgûl" } }`. The UI should provide a way to search the library and select a card.

- Verifying "the library has been shuffled" in an E2E test is tricky since we can't directly inspect the library array from Playwright. Options:
  1. If the app exposes a debug/test mode showing library order, assert the order changed
  2. Assert the library size decreased by 1 (proving the card was removed) and trust the unit tests for shuffle correctness
  3. Draw the next card and verify it's not the same as what was on top before the tutor (probabilistic but strong signal)

  Option 2 is recommended — E2E tests should focus on user-visible behavior, and shuffle correctness is thoroughly covered by `@scryglass/core` unit tests.

- The `evil.txt` sample deck should contain at least one copy of the target card. Verify this before writing the test.

- Capture a screenshot of the tutor search results (`06-tutor-results.png` per the strategy's visual regression plan).
