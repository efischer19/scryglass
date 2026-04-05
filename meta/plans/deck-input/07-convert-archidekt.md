# feat: Archidekt export → scryglass format converter

## What do you want to build?

A conversion utility in `@scryglass/core` that transforms Archidekt text
exports into scryglass semicolon-delimited format.

Archidekt exports typically look like:

```text
1 Galadriel, Light of Valinor (LTC) 498 *F* [Commander]
4 Island (LTR) 715 [Land]
1 Andúril, Flame of the West (LTR) 687 [Nonland]
```

## Acceptance Criteria

- [ ] A `convertArchidekt(input: string): ConvertResult` function exists in `@scryglass/core`
- [ ] Parses Archidekt text export format: `quantity card_name (SET) collector_number [tags]`
- [ ] Handles card names containing commas
- [ ] Expands quantity to produce one scryglass row per card copy
- [ ] Maps Archidekt category tags (`[Commander]`, `[Land]`, `[Nonland]`) to scryglass `card_type`
- [ ] Ignores foil markers (`*F*`) and other inline metadata
- [ ] For lines missing category tags, flags the card for `card_type` resolution
- [ ] Output text passes `parseDeck()` with zero errors (for fully resolved cards)
- [ ] Unit tests cover: basic parsing, category tag mapping, foil markers, card names with commas, missing tags, quantity expansion, empty input, malformed lines
- [ ] Shares the `ConvertResult` type with the other converters (tickets 05, 06)

## Implementation Notes (Optional)

- This incorporates and supersedes `meta/plans/convert-archidekt-format.md`.
- The Archidekt format is structurally similar to MTGO/Arena
  (`quantity card_name (SET) number`), so consider sharing a
  `parseQuantityLine()` helper from ticket 05.
- Category tags in square brackets map directly to scryglass `card_type`:
  - `[Commander]` → `commander`
  - `[Land]` → `land`
  - All others → `nonland`
- Foil markers (`*F*`, `*Foil*`) appear between the collector number and the
  category tag. Strip them before parsing the tag.
- If Archidekt changes their export format, the converter should fail
  gracefully with clear, row-numbered error messages matching the pattern
  established by `parseDeck()`.
- Return the shared `ConvertResult` type for consistency across converters.
