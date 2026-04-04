# Ticket 10: Draw Next Card

## What do you want to build?

Build the PWA UI in `@scryglass/pwa` (`packages/pwa/`) that wires up the `DRAW_CARD` action from `@scryglass/core`. The core reducer already handles the state transition (Ticket 04) — this ticket adds the Preact components for triggering draws, confirming intent on a shared device, and displaying the drawn card.

Drawing is the most frequently used in-game action and the foundation for all other library manipulation UI. The `<ConfirmationGate />` component built here will be reused by Tickets 11, 12, and 13.

## Acceptance Criteria

### PWA Components (`packages/pwa/src/components/`)

- [ ] A `<DrawButton />` component (`packages/pwa/src/components/DrawButton.tsx`) renders inside each `<PlayerZone />` and dispatches `{ type: "DRAW_CARD", payload: { player } }` via the `handleDispatch` prop from `<App />`
- [ ] The Draw button is enabled only when the player's phase is `'playing'` (derived from `PlayerState.phase`)
- [ ] If the player's library is empty (`library.length === 0`), the Draw button is disabled and its label reads "Library Empty"
- [ ] Clicking "Draw" opens a `<ConfirmationGate />` before dispatching — the gate reads "Draw from Player A's library?" with "Yes" / "Cancel" buttons (essential for two players sharing one device)
- [ ] A reusable `<ConfirmationGate />` component (`packages/pwa/src/components/ConfirmationGate.tsx`) accepts `message`, `onConfirm`, and `onCancel` props and renders an inline prompt (not a browser `confirm()` dialog)
- [ ] After confirmation, the component reads `ActionResult.card` from the dispatch return value and passes it to `<CardDisplay />`
- [ ] The `<CardDisplay />` component (from Ticket 05) shows the drawn card's name as text, falling back gracefully when no image is cached
- [ ] Drawing a card triggers a JIT image fetch stub if the image is not already cached (integration point with Ticket 17 — stubbed as a no-op for now)
- [ ] The library card count in `<PlayerZone />` updates immediately after a successful draw (already reactive via `GameState`)
- [ ] The `<CardDisplay />` area can be dismissed/closed after viewing

### Accessibility

- [ ] The Draw button has an appropriate `aria-label` (e.g., `aria-label="Draw card from Player A's library"`)
- [ ] The `<ConfirmationGate />` traps focus when open and returns focus to the trigger button on dismiss
- [ ] The `<ConfirmationGate />` is keyboard-accessible (Escape to cancel, Enter to confirm)
- [ ] The disabled "Library Empty" state is conveyed via `aria-disabled` and a visible label change

### Testing (`packages/pwa/src/components/__tests__/`)

- [ ] Component tests use `@testing-library/preact` and Vitest
- [ ] Test: `<DrawButton />` dispatches `DRAW_CARD` action with the correct player after confirmation
- [ ] Test: `<DrawButton />` is disabled when phase is not `'playing'`
- [ ] Test: `<DrawButton />` is disabled and shows "Library Empty" when `library.length === 0`
- [ ] Test: `<ConfirmationGate />` renders the confirmation message and calls `onConfirm` / `onCancel` correctly
- [ ] Test: `<ConfirmationGate />` dismisses on Escape keypress
- [ ] Test: each component passes `vitest-axe` a11y assertions (`expect(container).toHaveNoViolations()`)

## Implementation Notes (Optional)

The `<ConfirmationGate />` is a shared component — design it generically so Tickets 11–13 can reuse it with different messages. A simple inline prompt within the `<PlayerZone />` is preferred over a full-screen modal for single-action confirmations.

The `<DrawButton />` wiring inside `<PlayerZone />`:

```tsx
import type { Action, ActionResult } from '@scryglass/core';

function handleDraw(player: 'A' | 'B', onDispatch: (action: Action) => ActionResult) {
  const result = onDispatch({ type: 'DRAW_CARD', payload: { player } });
  // result.card contains the drawn Card (or null)
  return result;
}
```

The `DRAW_CARD` action is already implemented in the core reducer (Ticket 04). The core throws a descriptive error if the library is empty — the PWA should prevent this by disabling the button, but should also handle the error gracefully if it occurs.

**References:** Ticket 04 (Action/Reducer Engine — `DRAW_CARD`), Ticket 05 (UI Shell — `<PlayerZone />`, `<CardDisplay />`, `handleDispatch`), Ticket 09 (Mulligan — phase transitions to `'playing'`), [ADR-005: Action/Reducer State Management](../../meta/adr/ADR-005-client_state_management.md)
