# feat: E2E tests for fetch basic land and return to library actions

## What do you want to build?

Write Playwright E2E tests that verify two related library-manipulation actions:

1. **Fetch Basic Land** — A player fetches a specific basic land type (e.g., Forest) from their library. The land is removed, the library is shuffled, and the fetched card has the correct type.
2. **Return to Library** — A previously drawn card is returned to the library. The library size increases by 1.

These cover Phase 2, Steps 8–9 of the [E2E testing strategy](../e2e-testing-strategy.md).

## Acceptance Criteria

- [ ] **Fetch Basic Land:** The test triggers a fetch action for Player A to fetch a Forest via the UI
- [ ] After fetching, the test asserts:
  - The library size decreased by 1
  - The fetched card is a land (if the UI displays the fetched card's type)
  - The library was shuffled (size change confirms card removal; shuffle correctness is covered by unit tests)
- [ ] A screenshot is captured of the fetch land confirmation UI (`07-fetch-land.png`)
- [ ] **Return to Library:** The test triggers a return-to-library action for a previously drawn card
- [ ] After returning, the test asserts:
  - The library size increased by 1
- [ ] Cross-player isolation: Both actions on Player A do not modify Player B's state
- [ ] All assertions pass against the production build

## Implementation Notes (Optional)

- The fetch action in the core reducer is `{ type: "FETCH_BASIC_LAND", payload: { player: "A", landType: "Forest" } }`. The UI should present a dropdown or button to select the land type.

- The `good.txt` (Fellowship) deck should contain Forest basic lands. Verify this before writing the test.

- The return-to-library action is `{ type: "RETURN_TO_LIBRARY", payload: { player: "A", cardName: "...", position: "top" } }`. The UI should offer a way to return a card that was previously drawn.

- For return to library, the test needs a card that was previously drawn. Depend on the draw action from ticket 04 to have drawn a card first. The test flow should be: draw → verify draw → return drawn card → verify library size increased.

- These two actions are grouped in a single ticket because they are complementary (one removes from library, one adds to library) and together they verify bidirectional library manipulation.
