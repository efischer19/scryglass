# Ticket 12: Tutor Card

## What do you want to build?

Add the `TUTOR_CARD` action to the `@scryglass/core` reducer (`packages/core/`) and build the corresponding `<TutorModal />` UI in `@scryglass/pwa` (`packages/pwa/`). This simulates tutor effects (Demonic Tutor, Enlightened Tutor, etc.) in MTG — the player searches their entire library by name, the core finds and removes the first case-insensitive match, auto-shuffles the library, and returns the card via `ActionResult`.

## Acceptance Criteria

### Core Logic (`packages/core/src/`)

- [ ] A `TUTOR_CARD` action is added to the `ActionSchema` discriminated union: `{ type: "TUTOR_CARD", payload: { player: "A" | "B", cardName: string } }`
- [ ] The reducer finds the first card in the library whose `name` matches `cardName` (case-insensitive comparison)
- [ ] After extraction, the library is automatically shuffled using the `shuffle` function from Ticket 03
- [ ] The removed card is returned via `ActionResult.card`
- [ ] If no matching card exists, the reducer throws a descriptive error: `"Cannot tutor: '${cardName}' not found in Player ${player}'s library"`
- [ ] A `searchLibrary(library: Card[], query: string): Card[]` pure helper is exported from `packages/core/src/helpers/search.ts` and returns all cards whose `name` contains `query` (case-insensitive partial match via `String.includes()`)
- [ ] `searchLibrary` returns an empty array when no cards match

### PWA Components (`packages/pwa/src/components/`)

- [ ] A `<TutorModal />` component (`packages/pwa/src/components/TutorModal.tsx`) is rendered inside `<PlayerZone />` and opened by clicking the "Tutor" button
- [ ] The Tutor button is enabled only when the player's phase is `'playing'`
- [ ] The modal contains a text search input that provides real-time filtering of cards remaining in the library as the user types, using `searchLibrary()` from `@scryglass/core`
- [ ] The filtered list shows card names, types, and mana costs
- [ ] The search is case-insensitive and matches partial card names (e.g., typing "bolt" matches "Lightning Bolt")
- [ ] If no cards match the search, the list shows "No matching cards"
- [ ] Selecting a card from the filtered list opens the `<ConfirmationGate />` (from Ticket 10): "Tutor Sol Ring from Player A's library?"
- [ ] After confirmation, the component dispatches `{ type: "TUTOR_CARD", payload: { player, cardName } }` and displays `ActionResult.card` in `<CardDisplay />`
- [ ] Tutoring a card triggers a JIT image fetch stub if the image is not already cached (integration point with Ticket 17 — stubbed as a no-op for now)
- [ ] The modal can be closed without selecting a card (cancel action)

### Accessibility

- [ ] The Tutor button has an appropriate `aria-label` (e.g., `aria-label="Tutor card from Player A's library"`)
- [ ] The search input has an `aria-label` (e.g., `aria-label="Search Player A's library"`)
- [ ] The filtered card list uses `role="listbox"` with `role="option"` for each card entry
- [ ] The modal traps focus when open and returns focus to the trigger button on close
- [ ] Keyboard navigation: arrow keys to navigate the filtered list, Enter to select

### Testing

- [ ] Core unit tests (Vitest, `packages/core/src/__tests__/`): `TUTOR_CARD` removes the correct card by name and reduces library size by 1
- [ ] Core unit test: library is shuffled after tutor
- [ ] Core unit test: tutoring a non-existent card name throws a descriptive error
- [ ] Core unit test: `searchLibrary` returns matching cards for partial, case-insensitive queries
- [ ] Core unit test: `searchLibrary` returns an empty array when no cards match
- [ ] Component tests (`packages/pwa/src/components/__tests__/`) use `@testing-library/preact` and Vitest
- [ ] Test: `<TutorModal />` renders search input and filters cards in real time
- [ ] Test: selecting a card and confirming dispatches `TUTOR_CARD` with the correct payload
- [ ] Test: the modal can be closed without selecting a card
- [ ] Test: each component passes `vitest-axe` a11y assertions (`expect(container).toHaveNoViolations()`)

## Implementation Notes (Optional)

**IMPORTANT:** The `<TutorModal />` shows the full library contents to the active player. The `<ConfirmationGate />` for the other player must NOT reveal the library contents — only the final selected card name appears in the confirmation prompt and in `<CardDisplay />` after dispatch.

The `searchLibrary` helper lives in `@scryglass/core` because filtering logic is game rules (which cards exist in a library), not presentation. The PWA calls it to populate the filtered list:

```typescript
// packages/core/src/helpers/search.ts
export function searchLibrary(library: Card[], query: string): Card[] {
  if (!query) return [...library];
  const lowerQuery = query.toLowerCase();
  return library.filter(card => card.name.toLowerCase().includes(lowerQuery));
}
```

For large libraries (99 cards), filtering on every keystroke is fast enough without debouncing — `String.includes()` is O(n) on small strings and n ≤ 99.

Example dispatch call:

```typescript
const result = dispatch(state, {
  type: 'TUTOR_CARD',
  payload: { player: 'A', cardName: 'Sol Ring' }
});
// result.state  → new GameState with one fewer card, library shuffled
// result.card   → the Sol Ring card that was tutored
```

**References:** Ticket 04 (Action/Reducer Engine — `dispatch`, `ActionSchema`), Ticket 05 (UI Shell — `<PlayerZone />`, `<CardDisplay />`), Ticket 10 (`<ConfirmationGate />`), [ADR-005: Action/Reducer State Management](../../meta/adr/ADR-005-client_state_management.md)
