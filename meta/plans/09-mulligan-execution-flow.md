# Ticket 09: Mulligan UI & Execution Flow

## What do you want to build?

Build the Preact UI components in `@scryglass/pwa` (`packages/pwa/`) that render the mulligan phase and wire together the core logic from Tickets 07 and 08 into a complete user flow. This is PWA only — all game logic lives in `@scryglass/core` and is consumed via `dispatch()` and helper functions.

The UI renders the opening hand, enables/disables the Keep and Mulligan buttons based on the mulligan verdict from `@scryglass/core`, and handles the shared-device reveal/hide gate for two players on one screen.

## Acceptance Criteria

### Components (`packages/pwa/src/components/`)

- [ ] A `<MulliganHand />` component (`packages/pwa/src/components/MulliganHand.tsx`) renders the mulligan hand as a list of card names (no images yet — Scryfall integration comes later)
- [ ] The `<MulliganHand />` display is clearly labeled "Opening Hand" and shows the land count (via `countLands()` from `@scryglass/core`)
- [ ] A "Keep Hand" button dispatches the `KEEP_HAND` action from `@scryglass/core`
- [ ] A "Mulligan" button dispatches the `MULLIGAN` action from `@scryglass/core`
- [ ] The Mulligan button is enabled or disabled based on the verdict from `getMulliganVerdict()` (imported from `@scryglass/core`): enabled for `'must_mulligan'` and `'user_choice'`, disabled for `'must_keep'`
- [ ] The UI displays the land count and the verdict reason (e.g., "3 lands — must keep", "1 land — mulligan recommended")
- [ ] A mulligan counter displays how many mulligans have been taken (reads `mulliganCount` from `PlayerState`)

### Shared-Device Reveal Gate

- [ ] The mulligan hand is hidden from the other player by default — the UI shows "Tap to reveal Player A's hand" with a solid backdrop
- [ ] Card names are only visible after a deliberate tap/click on the reveal gate
- [ ] A second tap or a "Hide" button conceals the hand again

### Game Flow Integration

- [ ] When both decks are loaded (Ticket 06), the `<App />` component dispatches `DEAL_OPENING_HAND` for each player to enter the mulligan phase
- [ ] The `<PlayerZone />` conditionally renders `<MulliganHand />` when the player's phase is `'mulligan'`
- [ ] The game only transitions to full `'playing'` mode when **both** players have kept their hands
- [ ] If Player A keeps but Player B is still mulliganing, Player A's action buttons remain disabled until Player B also keeps

### Accessibility & Testing

- [ ] All interactive elements have appropriate `aria-label` attributes (e.g., `aria-label="Keep Player A's opening hand"`, `aria-label="Mulligan Player B's hand"`)
- [ ] The reveal gate is keyboard-accessible (activates on Enter/Space)
- [ ] Component tests (`packages/pwa/src/components/__tests__/`) use `@testing-library/preact` and Vitest
- [ ] Test: `<MulliganHand />` renders card names and land count from state
- [ ] Test: Keep button dispatches `KEEP_HAND` and Mulligan button dispatches `MULLIGAN`
- [ ] Test: Mulligan button is disabled when verdict is `'must_keep'`
- [ ] Test: reveal gate hides card names by default and shows them after interaction
- [ ] Test: each component passes `vitest-axe` a11y assertions (`expect(container).toHaveNoViolations()`)
- [ ] Integration test: load a deck → verify mulligan draws 7 → trigger mulligan → verify re-draw → keep → verify phase transition to `'playing'`

## Implementation Notes (Optional)

The reveal gate is critical for two players sharing one device. A simple approach: the `<MulliganHand />` area shows "Tap to reveal Player A's hand" with a solid backdrop covering the card list. Only after a deliberate tap does the component toggle a `revealed` state to show card names. A second tap or a "Hide" button sets `revealed` back to `false`.

No game logic should exist in `packages/pwa/` — the components read from `GameState` and dispatch actions. The `getMulliganVerdict()` and `countLands()` functions are pure imports from `@scryglass/core`.

**References:** Ticket 04 (Action/Reducer Engine — `dispatch`), Ticket 05 (UI Shell — `<PlayerZone />`, `handleDispatch`), Ticket 07 (Mulligan Core Logic — `DEAL_OPENING_HAND`, `MULLIGAN`, `KEEP_HAND`), Ticket 08 (Land Counting — `countLands`, `getMulliganVerdict`)
