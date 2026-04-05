# feat: example decklists (deck_A and deck_B)

## What do you want to build?

Two complete, realistic example decklists in scryglass format that live in
`examples/decklists/`. These serve as:

1. **User reference** — show new users what a valid decklist looks like.
2. **Test fixtures** — the regression test suite (ticket 11) will import and
   export these through every supported format and verify round-trip fidelity.

Each deck should be a legal 100-card Commander deck with a commander, a mix of
lands and nonlands, and real Scryfall-resolvable set codes and collector
numbers.

## Acceptance Criteria

- [ ] `examples/decklists/deck_A.txt` exists and contains a valid 100-card Commander decklist in scryglass format
- [ ] `examples/decklists/deck_B.txt` exists and contains a valid 100-card Commander decklist in scryglass format
- [ ] Both files include a commander row (card\_type `commander`) and a realistic mix of lands and nonlands
- [ ] Every `set_code` and `collector_number` in both files resolves to a real card on the Scryfall API
- [ ] Both files pass `parseDeck()` with zero errors
- [ ] A unit test in `@scryglass/core` loads both files and asserts `parseDeck()` returns zero errors and the expected card counts
- [ ] `examples/decklists/README.md` is updated to reference the new files

## Implementation Notes (Optional)

- Pick two thematically distinct decks (e.g., one mono-color, one multi-color)
  to exercise different set codes and collector number ranges.
- Use the Scryfall bulk data or search API to verify card data accuracy before
  committing — wrong collector numbers will cause broken images later.
- Commander cards are excluded from the shuffleable deck by `parseDeck()`, so
  expect 99 cards in the returned `cards` array and 1 commander warning.
- The `.txt` extension keeps things simple and avoids confusion with `.csv`
  (which implies comma-separated).
- These files will be referenced by the regression test suite in ticket 11, so
  they must be committed before that ticket begins.
