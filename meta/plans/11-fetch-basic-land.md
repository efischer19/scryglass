# Ticket 11: Fetch Basic Land

## What do you want to build?

Add the `FETCH_BASIC_LAND` action to the `@scryglass/core` reducer (`packages/core/`) and build the corresponding `<FetchLandModal />` UI in `@scryglass/pwa` (`packages/pwa/`). This simulates fetch lands and other "search for a basic land" effects in MTG — the player picks a basic land type, the core finds and removes the first matching card, auto-shuffles the library, and returns the card via `ActionResult`.

## Acceptance Criteria

### Core Logic (`packages/core/src/`)

- [ ] A `FETCH_BASIC_LAND` action is added to the `ActionSchema` discriminated union: `{ type: "FETCH_BASIC_LAND", payload: { player: "A" | "B", landType: "Plains" | "Island" | "Swamp" | "Mountain" | "Forest" } }`
- [ ] A `LandTypeSchema` Zod enum defines the five valid basic land types: `Plains`, `Island`, `Swamp`, `Mountain`, `Forest`
- [ ] The reducer finds the first card in the library whose `cardType` (case-insensitive) contains both `basic` and `land`, and whose name or type line contains the specified land subtype
- [ ] Variant matching: snow-covered basics (e.g., "Snow-Covered Mountain") and Wastes are also matched — matching uses the land subtype in the type line or name, not exact card name equality
- [ ] After extraction, the library is automatically shuffled using the `shuffle` function from Ticket 03
- [ ] The removed card is returned via `ActionResult.card`
- [ ] If no matching basic land exists, the reducer throws a descriptive error: `"Cannot fetch: no ${landType} found in Player ${player}'s library"`
- [ ] A `getBasicLandCounts(library: Card[]): Record<string, number>` pure helper is exported from `packages/core/src/helpers/lands.ts` and returns counts for each of the five basic land types present in the library
- [ ] `getBasicLandCounts` uses the same matching logic as the reducer action to ensure consistency

### PWA Components (`packages/pwa/src/components/`)

- [ ] A `<FetchLandModal />` component (`packages/pwa/src/components/FetchLandModal.tsx`) is rendered inside `<PlayerZone />` and opened by clicking the "Fetch Land" button
- [ ] The Fetch Land button is enabled only when the player's phase is `'playing'`
- [ ] The modal presents five land type buttons, each showing the count of remaining copies from `getBasicLandCounts()` (e.g., "Mountain (3)")
- [ ] Land type buttons with 0 copies remaining are disabled
- [ ] Selecting a land type opens the `<ConfirmationGate />` (from Ticket 10): "Fetch Mountain from Player A's library?"
- [ ] After confirmation, the component dispatches `{ type: "FETCH_BASIC_LAND", payload: { player, landType } }` and displays `ActionResult.card` in `<CardDisplay />`
- [ ] If no basic lands of any type remain, the modal shows "No basic lands remaining" with a close button
- [ ] The modal can be closed without selecting a land type (cancel action)

### Accessibility

- [ ] The Fetch Land button has an appropriate `aria-label` (e.g., `aria-label="Fetch basic land from Player A's library"`)
- [ ] Each land type button has an `aria-label` including the count (e.g., `aria-label="Fetch Mountain, 3 remaining"`)
- [ ] Disabled land type buttons convey their state via `aria-disabled`
- [ ] The modal traps focus when open and returns focus to the trigger button on close

### Testing

- [ ] Core unit tests (Vitest, `packages/core/src/__tests__/`): `FETCH_BASIC_LAND` removes the correct land and reduces library size by 1
- [ ] Core unit test: library is shuffled after fetch (verify the `shuffle` function is invoked or that card order changes)
- [ ] Core unit test: fetching a land type not present in the library throws a descriptive error
- [ ] Core unit test: `getBasicLandCounts` returns correct counts for a library with mixed card types, including snow-covered variants
- [ ] Component tests (`packages/pwa/src/components/__tests__/`) use `@testing-library/preact` and Vitest
- [ ] Test: `<FetchLandModal />` renders five land type buttons with correct counts
- [ ] Test: land type buttons with 0 copies are disabled
- [ ] Test: selecting a land type and confirming dispatches `FETCH_BASIC_LAND` with the correct payload
- [ ] Test: each component passes `vitest-axe` a11y assertions (`expect(container).toHaveNoViolations()`)

## Implementation Notes (Optional)

The `getBasicLandCounts` helper is a read-only function that the PWA calls to populate the modal UI. It lives in `@scryglass/core` because the matching logic is game rules (which basic land subtypes exist in a library), not presentation.

Basic land matching logic:

```typescript
// packages/core/src/helpers/lands.ts
const BASIC_LAND_TYPES = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'] as const;

function isBasicLandOfType(card: Card, landType: string): boolean {
  const typeLine = card.cardType.toLowerCase();
  const isBasic = typeLine.includes('basic') && typeLine.includes('land');
  return isBasic && (card.name.includes(landType) || typeLine.includes(landType.toLowerCase()));
}
```

Example dispatch call:

```typescript
const result = dispatch(state, {
  type: 'FETCH_BASIC_LAND',
  payload: { player: 'A', landType: 'Mountain' }
});
// result.state  → new GameState with one fewer card, library shuffled
// result.card   → the Mountain card that was fetched
```

**References:** Ticket 04 (Action/Reducer Engine — `dispatch`, `ActionSchema`), Ticket 05 (UI Shell — `<PlayerZone />`, `<CardDisplay />`), Ticket 10 (`<ConfirmationGate />`), [ADR-005: Action/Reducer State Management](../../meta/adr/ADR-005-client_state_management.md)
