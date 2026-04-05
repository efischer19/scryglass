# feat: E2E test for scry action

## What do you want to build?

Write a Playwright E2E test that verifies the scry action works correctly end-to-end. A player scries 2 cards, the scry modal displays the peeked cards, the player decides to send one card to the top and one to the bottom of their library, and the test asserts the library order is updated correctly.

This covers Phase 2, Step 6 ("Scry") of the [E2E testing strategy](../e2e-testing-strategy.md).

## Acceptance Criteria

- [ ] The test triggers a scry action for Player A (scry 2) via the UI
- [ ] The scry modal opens and displays exactly 2 cards
- [ ] The test interacts with the modal to send one card to the top and one card to the bottom of the library
- [ ] After confirming the scry decisions, the modal closes
- [ ] The test asserts the library size is unchanged (scry does not remove cards)
- [ ] If the UI exposes top-of-library information (e.g., via a subsequent draw), the test verifies the card placed on top is drawn next
- [ ] Cross-player isolation: Player B's state is unaffected by Player A's scry
- [ ] All assertions pass against the production build

## Implementation Notes (Optional)

- The scry action in the core reducer is `SCRY_RESOLVE` with decisions for each peeked card (`{ cardIndex, destination: 'top' | 'bottom' | 'remove' }`). The UI scry modal should present the peeked cards and allow the user to choose a destination for each.

- Use Playwright to interact with the scry modal:
  1. Click the "Scry" button to open the modal
  2. Wait for the modal to appear (use `waitFor` on a known modal selector)
  3. For each card in the modal, select "top" or "bottom" via the modal's UI controls
  4. Click a "Confirm" or "Done" button to apply the decisions
  5. Wait for the modal to close

- To verify library order, draw a card after the scry and assert the drawn card matches the one placed on top. This creates a dependency on the draw test (ticket 04).

- Capture a screenshot of the scry modal with cards displayed (`05-scry-modal.png` per the strategy's visual regression plan). This screenshot will be formalized in ticket 10, but capturing it here validates the modal renders correctly.
