# Ticket 13: Scry / Look at Top N

## What do you want to build?

Add the `SCRY_RESOLVE` action to the `@scryglass/core` reducer (`packages/core/`) and build the corresponding `<ScryModal />` UI in `@scryglass/pwa` (`packages/pwa/`). This simulates scry effects, Sensei's Divining Top, Sylvan Library, and similar MTG effects — the player looks at the top N cards and decides each card's fate: keep on top, send to bottom, or remove from the library.

Peeking is a read-only operation (pure helper, not an action). The actual state mutation happens when the player confirms their decisions via `SCRY_RESOLVE`.

## Acceptance Criteria

### Core Logic (`packages/core/src/`)

- [ ] A `peekTop(state: GameState, player: "A" | "B", n: number): Card[]` pure helper is exported from `packages/core/src/helpers/peek.ts` — returns the top N cards from the player's library without mutating state
- [ ] `peekTop` clamps `n` to `[0, library.length]` and returns an empty array if the library is empty
- [ ] A `ScryDecisionSchema` Zod schema is exported from `packages/core/src/schemas/action.ts` defining each card's fate: `{ cardIndex: number, destination: "top" | "bottom" | "remove" }`
- [ ] A `SCRY_RESOLVE` action is added to the `ActionSchema` discriminated union: `{ type: "SCRY_RESOLVE", payload: { player: "A" | "B", decisions: Array<ScryDecision> } }`
- [ ] The reducer validates that `decisions` covers exactly the indices peeked (no duplicates, no out-of-range indices)
- [ ] Resolution order: (1) remove all `"remove"` cards from the library, (2) remove all `"bottom"` cards and append them to the bottom in their original relative order, (3) place `"top"` cards at the top of the library in the order specified by the `decisions` array
- [ ] Removed cards are returned via `ActionResult.card` as an array (extend `ActionResult` to support `cards: Card[]` for scry, or return the first removed card — document the choice)
- [ ] If `decisions` is empty or contains invalid indices, the reducer throws a descriptive error

### PWA Components (`packages/pwa/src/components/`)

- [ ] A `<ScryModal />` component (`packages/pwa/src/components/ScryModal.tsx`) is rendered inside `<PlayerZone />` and opened by clicking the "Scry" button
- [ ] The Scry button is enabled only when the player's phase is `'playing'`
- [ ] Clicking "Scry" opens a `<ConfirmationGate />` (from Ticket 10): "Scry Player A's library?" before revealing any cards
- [ ] After confirmation, a numeric input prompt asks "How many cards to look at?" (min 1, max = `library.length`)
- [ ] The modal calls `peekTop()` from `@scryglass/core` to get the top N cards and displays them in order (top of library = first shown)
- [ ] Each card in the scry view has three destination controls: "Keep on Top", "Send to Bottom", "Remove from Library"
- [ ] Cards assigned to "Keep on Top" can be reordered using "Move Up" / "Move Down" buttons (drag-and-drop is a nice-to-have, not required)
- [ ] A "Confirm Scry" button is enabled only after all N cards have been assigned a destination
- [ ] Clicking "Confirm Scry" dispatches `{ type: "SCRY_RESOLVE", payload: { player, decisions } }` and updates the UI
- [ ] Cards routed to "Remove from Library" are displayed briefly in `<CardDisplay />` before being discarded
- [ ] The library card count updates after confirmation

### Accessibility

- [ ] The Scry button has an appropriate `aria-label` (e.g., `aria-label="Scry Player A's library"`)
- [ ] The numeric input has an `aria-label` (e.g., `aria-label="Number of cards to look at"`)
- [ ] Each card's destination controls use `role="radiogroup"` with `role="radio"` for each option
- [ ] The "Move Up" / "Move Down" reorder buttons have descriptive `aria-label` attributes (e.g., `aria-label="Move Sol Ring up in scry order"`)
- [ ] The modal traps focus when open and returns focus to the trigger button on close
- [ ] Live region (`aria-live="polite"`) announces when a card's destination changes

### Testing

- [ ] Core unit tests (Vitest, `packages/core/src/__tests__/`): `peekTop` returns the correct top N cards without mutating state
- [ ] Core unit test: `peekTop` with N > library size returns the full library
- [ ] Core unit test: `SCRY_RESOLVE` with "Keep on Top" preserves cards at the top of the library in specified order
- [ ] Core unit test: `SCRY_RESOLVE` with "Send to Bottom" moves cards to the end of the library in original relative order
- [ ] Core unit test: `SCRY_RESOLVE` with "Remove" reduces library size by the number of removed cards
- [ ] Core unit test: `SCRY_RESOLVE` with mixed decisions applies all three destination types correctly in one operation
- [ ] Core unit test: `SCRY_RESOLVE` with invalid indices throws a descriptive error
- [ ] Core unit test: `ScryDecisionSchema` validates and rejects malformed decision objects
- [ ] Component tests (`packages/pwa/src/components/__tests__/`) use `@testing-library/preact` and Vitest
- [ ] Test: `<ScryModal />` renders the numeric input prompt after confirmation gate
- [ ] Test: `<ScryModal />` displays the correct cards from `peekTop` and allows destination assignment
- [ ] Test: "Confirm Scry" button is disabled until all cards have destinations assigned
- [ ] Test: confirming dispatches `SCRY_RESOLVE` with the correct decisions payload
- [ ] Test: each component passes `vitest-axe` a11y assertions (`expect(container).toHaveNoViolations()`)

## Implementation Notes (Optional)

The scry UI is the most complex modal in the app. Keep the implementation simple:

1. Show the N cards as a vertical list
2. Each card has radio buttons or segmented controls for the three destinations
3. "Keep on Top" cards can be reordered with simple "Move Up" / "Move Down" buttons

The `peekTop` helper is a pure function, not a dispatched action — peeking doesn't change state. The PWA reads the cards, lets the user make decisions, then dispatches `SCRY_RESOLVE` as a single atomic state transition:

```typescript
// packages/core/src/helpers/peek.ts
export function peekTop(state: GameState, player: 'A' | 'B', n: number): Card[] {
  const library = state.players[player].library;
  return library.slice(0, Math.min(n, library.length));
}
```

Example dispatch call:

```typescript
const result = dispatch(state, {
  type: 'SCRY_RESOLVE',
  payload: {
    player: 'A',
    decisions: [
      { cardIndex: 0, destination: 'top' },
      { cardIndex: 1, destination: 'bottom' },
      { cardIndex: 2, destination: 'remove' }
    ]
  }
});
// result.state → new GameState with scry decisions applied
```

**References:** Ticket 04 (Action/Reducer Engine — `dispatch`, `ActionSchema`), Ticket 05 (UI Shell — `<PlayerZone />`, `<CardDisplay />`), Ticket 10 (`<ConfirmationGate />`), [ADR-005: Action/Reducer State Management](../../meta/adr/ADR-005-client_state_management.md)
