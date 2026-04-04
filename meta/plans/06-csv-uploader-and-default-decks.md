# Ticket 06: CSV Uploader & Default Decks

## What do you want to build?

Add the ability for users to load decks into the app — either by uploading a `.csv` file or by selecting from hardcoded default deck lists. This connects the CSV parser from `@scryglass/core` (Ticket 02) to the UI shell (Ticket 05) and the action/reducer engine (Ticket 04).

Default deck data lives in `@scryglass/core` as pure data with zero browser dependencies. The Preact components in `@scryglass/pwa` handle file reading, user interaction, and dispatching `LOAD_DECK` and `SHUFFLE_LIBRARY` actions to the reducer.

## Acceptance Criteria

### Core Package (`packages/core/`)

- [ ] A `packages/core/src/default-decks.ts` module exports at least 2 default decks as `Card[]` arrays (e.g., "Red Aggro Starter" and "Green Ramp Starter")
- [ ] Each default deck contains 60 cards with a variety of card types (lands, creatures, instants/sorceries) to exercise mulligan logic in testing
- [ ] Default deck data is pure — no browser dependencies, no DOM, no `window`
- [ ] Default decks are re-exported from the `@scryglass/core` barrel export

### PWA Package (`packages/pwa/`)

- [ ] A `<DeckLoader />` component (`packages/pwa/src/components/DeckLoader.tsx`) renders a "Load Decks" button in the header that opens a `<DeckLoaderModal />`
- [ ] A `<DeckLoaderModal />` component (`packages/pwa/src/components/DeckLoaderModal.tsx`) presents two options per player: "Upload CSV" and "Use Default Deck"
- [ ] The "Upload CSV" option opens a file picker that accepts only `.csv` files
- [ ] File reading uses the browser `FileReader` API to read the uploaded file as text, then passes the string to `parseCSV()` from `@scryglass/core`
- [ ] Parsing errors are displayed inline with the row number and reason (not a generic "invalid file" message)
- [ ] The "Use Default Deck" option presents a dropdown populated from the default decks exported by `@scryglass/core`
- [ ] After a deck is selected or uploaded, the component dispatches a `LOAD_DECK` action followed by a `SHUFFLE_LIBRARY` action via the `handleDispatch` wrapper from `<App />`
- [ ] The UI prevents starting the game until both players have a loaded deck
- [ ] The library card count in each player zone updates to reflect the loaded deck size
- [ ] A confirmation gate asks "Are you sure?" before replacing a previously loaded deck

### Accessibility & Testing

- [ ] All interactive elements have appropriate `aria-label` attributes (e.g., `aria-label="Upload deck CSV for Player A"`)
- [ ] The modal is keyboard-navigable and traps focus while open
- [ ] Component tests (`packages/pwa/src/components/__tests__/`) use `@testing-library/preact` and Vitest
- [ ] Test: selecting a default deck dispatches `LOAD_DECK` then `SHUFFLE_LIBRARY`
- [ ] Test: uploading a valid CSV file dispatches `LOAD_DECK` then `SHUFFLE_LIBRARY`
- [ ] Test: uploading an invalid CSV file displays inline parsing errors
- [ ] Test: each component passes `vitest-axe` a11y assertions (`expect(container).toHaveNoViolations()`)

## Implementation Notes (Optional)

Use the `FileReader` API to read the uploaded CSV file as text. The default decks should include a variety of card types to exercise the mulligan logic in testing.

Example default deck structure (60 cards, typical casual):

- 24 Basic Lands
- 20 Creatures
- 10 Instants/Sorceries
- 6 Other spells

Example dispatch flow after deck selection:

```typescript
handleDispatch({ type: 'LOAD_DECK', payload: { player: 'A', cards } });
handleDispatch({ type: 'SHUFFLE_LIBRARY', payload: { player: 'A' } });
```

**References:** Ticket 02 (CSV Parser — `parseCSV()`), Ticket 04 (Action/Reducer Engine — `LOAD_DECK`, `SHUFFLE_LIBRARY`), Ticket 05 (UI Shell — `<App />`, `handleDispatch`)
