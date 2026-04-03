# Ticket 02: CSV Deck Parser

## What do you want to build?

Implement a JavaScript module (`src/scripts/csv-parser.js`) that parses a CSV string into an array of card objects. This is the data ingestion layer — it takes raw text and produces the structured card data that the rest of the app consumes.

The parser must handle the format defined in [ADR-006](../../meta/adr/ADR-006-deck_import_format.md): `card_name,set_code,card_type,mana_cost`.

## Acceptance Criteria

- [ ] A `parseCSV(csvString)` function is exported from `src/scripts/csv-parser.js`
- [ ] The function accepts a CSV string and returns an array of card objects: `{ name, setCode, cardType, manaCost }`
- [ ] Each row in the CSV produces one card object (one row per physical card copy)
- [ ] A header row starting with `card_name` is detected and skipped
- [ ] Rows with fewer than 3 columns are rejected with an error referencing the row number
- [ ] Empty `card_name` or `set_code` fields cause a validation error referencing the row number
- [ ] `mana_cost` (4th column) is optional — missing values default to an empty string
- [ ] The function returns `{ cards: [...], errors: [...] }` where `errors` is an array of human-readable validation messages
- [ ] Leading/trailing whitespace is trimmed from all field values
- [ ] Unit tests validate: valid input, missing header, missing fields, empty file, whitespace handling

## Implementation Notes (Optional)

Use a simple `String.split('\n')` and `String.split(',')` approach — no CSV parsing library is needed since MTG card names almost never contain commas. If ADR-006 is accepted with the recommended option, this implementation is straightforward.

Keep this module pure (no DOM, no side effects) so it can be easily unit tested.

**References:** [ADR-006: CSV Deck Import Format](../../meta/adr/ADR-006-deck_import_format.md)
