# feat: import/export regression test suite

## What do you want to build?

An automated test suite that validates round-trip fidelity for all supported
import and export formats using the example decklists from ticket 03. This is
the final ticket in the epic and serves as a safety net against regressions in
any converter or exporter.

## Acceptance Criteria

- [ ] A test file exists in `@scryglass/core` (e.g., `src/regression.test.ts`) dedicated to round-trip format tests
- [ ] Tests load `deck_A.txt` and `deck_B.txt` from `examples/decklists/`
- [ ] For each example deck and each format (MTGO/Arena, Moxfield, Archidekt):
  - Export the parsed deck to the format
  - Re-import the exported text using the corresponding converter
  - Assert the re-imported card list matches the original (same names, set codes, collector numbers, card types, counts)
- [ ] For each example deck: export to scryglass format and re-parse, asserting identity
- [ ] Tests cover commander cards: exported and re-imported correctly with the `commander` card type
- [ ] Tests verify that quantity collapsing/expanding is lossless (4 Islands → `4 Island...` → 4 Islands)
- [ ] All tests run as part of `npm test` in CI
- [ ] Test failures produce clear, diff-friendly output showing which cards differ

## Implementation Notes (Optional)

- The test matrix is `2 decks × 4 formats = 8 round-trip scenarios` plus
  individual unit tests for edge cases.
- Load example files using Node.js `fs.readFileSync` (Vitest runs in Node).
  Use `import.meta.url` or a `__dirname` equivalent to resolve paths relative
  to the test file.
- For assertion, compare sorted card arrays (sorted by name, then set code,
  then collector number) to avoid false failures from ordering differences.
- Commander cards require special handling: `parseDeck()` excludes them from
  `cards` and reports them as warnings. The test should extract commander info
  from warnings and include it in the comparison.
- Consider a helper function `assertDeckEquality(a: ParseResult, b: ParseResult)`
  that compares cards, warnings, and error counts for reuse across tests.
- This suite should be fast (no network calls) — all converters and exporters
  operate on pure text.
- If a format cannot perfectly round-trip (e.g., Moxfield CSV includes extra
  columns that scryglass doesn't track), document the expected lossy fields and
  assert on the fields that should be preserved.
