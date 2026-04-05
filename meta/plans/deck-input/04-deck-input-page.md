# feat: deck input page — raw text entry

## What do you want to build?

The primary deck input page for scryglass. This is the first screen a new user
interacts with. It provides a large text area for entering or pasting a decklist
in scryglass format, real-time validation feedback, and a "Load Deck" action
that dispatches `LOAD_DECK` (ADR-005) to start the shuffler.

This ticket establishes the page shell and scryglass-format entry path. Import
from external formats (MTGO/Arena, Moxfield, Archidekt) is wired up in tickets
05–07 and surfaced via the deck editor UI in ticket 08.

## Acceptance Criteria

- [ ] A new "Deck Input" view is accessible via the routing mechanism chosen in ticket 01's ADR
- [ ] The page contains a multi-line text area (≥ 20 rows visible) for entering scryglass-format decklists
- [ ] As the user types or pastes, `parseDeck()` runs and displays:
  - Total card count (lands, nonlands, commander)
  - A list of any warnings or errors returned by the parser, with row numbers
- [ ] A "Load Deck" button is enabled only when `parseDeck()` returns zero errors and at least one card
- [ ] Clicking "Load Deck" dispatches the `LOAD_DECK` action and navigates to the shuffler view
- [ ] The text area is pre-populated with a helpful placeholder showing the expected format
- [ ] The page is keyboard-navigable and screen-reader accessible (labels, `aria-live` for validation, focus management)
- [ ] The page renders correctly on mobile viewports (responsive layout)

## Implementation Notes (Optional)

- This lives in `@scryglass/pwa` as a Preact component. Import `parseDeck`
  from `@scryglass/core`.
- Debounce the `parseDeck()` call on input (200–300 ms) to avoid jank on large
  decklists.
- Use `aria-live="polite"` on the validation summary region so screen readers
  announce changes without interrupting the user.
- The placeholder text should show a 3–4 line example in scryglass format
  matching the examples in `examples/decklists/README.md`.
- The "Load Deck" button should be visually distinct (primary action) and
  include a tooltip or `aria-describedby` explaining why it's disabled when
  errors are present.
- This ticket does **not** include import-from-format or save/load
  functionality — those arrive in later tickets.
