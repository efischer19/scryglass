# Ticket 02: CSV Deck Parser

## What do you want to build?

Implement a TypeScript module in `@scryglass/core` (`packages/core/src/csv-parser.ts`) that parses a CSV string into an array of validated card objects. This is the data ingestion layer — it takes raw text and produces the structured card data that the rest of the app consumes.

The parser must handle the format defined in [ADR-006](../../meta/adr/ADR-006-deck_import_format.md): `card_name,set_code,card_type,mana_cost`. All output types are defined as Zod schemas.

## Acceptance Criteria

- [ ] A `parseCSV(csvString)` function is exported from `packages/core/src/csv-parser.ts`
- [ ] A `CardSchema` Zod schema defines the card object shape: `{ name: string, setCode: string, cardType: string, manaCost: string }`
- [ ] A `ParseResultSchema` Zod schema defines the return type: `{ cards: Card[], errors: string[] }`
- [ ] The `Card` TypeScript type is derived from `CardSchema` via `z.infer<typeof CardSchema>`
- [ ] Each row in the CSV produces one card object (one row per physical card copy)
- [ ] A header row starting with `card_name` is detected and skipped
- [ ] Rows with fewer than 3 columns are rejected with an error referencing the row number
- [ ] Empty `card_name` or `set_code` fields cause a validation error referencing the row number
- [ ] `mana_cost` (4th column) is optional — missing values default to an empty string
- [ ] Leading/trailing whitespace is trimmed from all field values
- [ ] The module has zero browser dependencies (no DOM, no `window`, no `fetch`)
- [ ] Unit tests (Vitest) validate: valid input, missing header, missing fields, empty file, whitespace handling

## Implementation Notes (Optional)

Use a simple `String.split('\n')` and `String.split(',')` approach — no CSV parsing library is needed since MTG card names almost never contain commas.

Keep this module pure (no side effects) so it can be consumed by both the PWA and any future CLI/agent consumer.

The `CardSchema` will be reused across the entire core package (state manager, mulligan logic, etc.), so define it in a shared `packages/core/src/schemas/card.ts` file.

**References:** [ADR-006: CSV Deck Import Format](../../meta/adr/ADR-006-deck_import_format.md), [ADR-008: TypeScript & Zod](../../meta/adr/ADR-008-typescript_and_zod.md)
