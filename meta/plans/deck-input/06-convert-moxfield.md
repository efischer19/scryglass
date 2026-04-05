# feat: Moxfield CSV export → scryglass format converter

## What do you want to build?

A conversion utility in `@scryglass/core` that transforms Moxfield CSV exports
into scryglass semicolon-delimited format. Moxfield is one of the most popular
MTG deck-building tools, making this the highest-value converter for the user
base.

Moxfield exports look like:

```csv
Count,Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number,Alter,Proxy,Purchase Price
1,0,"Galadriel, Light of Valinor",LTC,Near Mint,en,,,,498,false,false,
4,0,Island,LTR,Near Mint,en,,,,715,false,false,
```

## Acceptance Criteria

- [ ] A `convertMoxfield(input: string): ConvertResult` function exists in `@scryglass/core`
- [ ] Parses Moxfield CSV export format with standard headers
- [ ] Correctly handles RFC 4180 CSV quoting (card names with commas are double-quoted)
- [ ] Locates relevant columns by header name, not position (resilient to Moxfield adding columns)
- [ ] Expands `Count` field to produce one scryglass row per card copy
- [ ] Maps `Edition` → `set_code` and `Collector Number` → `collector_number`
- [ ] Determines `card_type` from Moxfield's board designation or flags for resolution if unavailable
- [ ] Output text passes `parseDeck()` with zero errors (for fully resolved cards)
- [ ] Unit tests cover: basic parsing, CSV quoting with commas, missing collector numbers, header column reordering, empty input, malformed rows
- [ ] Handles edge cases: foil variants, alternate printings, missing `Collector Number`

## Implementation Notes (Optional)

- This incorporates and supersedes `meta/plans/convert-moxfield-format.md`.
- **Do not use `split(',')` for CSV parsing.** Card names contain commas
  (e.g., `"Galadriel, Light of Valinor"`). Implement a minimal RFC 4180 CSV
  parser or use a well-tested library.
- Moxfield may export mainboard, sideboard, and commander as separate files or
  with a `Board` column. Handle both patterns:
  - Separate file: all rows are the same board type (inferred from filename or
    user selection)
  - Combined file with `Board` column: use it to determine `card_type`
- The `Edition` column provides the set code directly, and `Collector Number`
  is present, so most rows should fully resolve without Scryfall API calls.
- Return the same `ConvertResult` type defined in ticket 05 for consistency
  across all converters.
- Consider extracting a shared `ConvertResult` schema and re-using it across
  all three converters.
