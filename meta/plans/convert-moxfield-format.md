# feat: Moxfield export → scryglass format converter

## What do you want to build?

A conversion utility that transforms Moxfield CSV exports into the scryglass semicolon-delimited format (`card_name;set_code;collector_number;card_type`).

Moxfield exports deck lists as CSV files with headers like:

```csv
Count,Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number,Alter,Proxy,Purchase Price
1,0,"Galadriel, Light of Valinor",LTC,Near Mint,en,,,,498,false,false,
4,0,Island,LTR,Near Mint,en,,,,715,false,false,
```

The converter would:

- Parse the Moxfield CSV header to locate relevant columns (`Count`, `Name`, `Edition`, `Collector Number`)
- Expand each row by `Count` to produce one scryglass row per card copy
- Map `Edition` → `set_code` and `Collector Number` → `collector_number`
- Determine `card_type` by checking the Moxfield export's board designation (mainboard vs commander) or falling back to a Scryfall lookup for land/nonland classification
- Handle CSV quoting correctly (card names with commas are quoted in Moxfield exports)

## Acceptance Criteria

- [ ] Parses Moxfield CSV export format with standard headers
- [ ] Correctly handles CSV quoting for card names containing commas
- [ ] Expands `Count` field to produce one row per card copy
- [ ] Maps Moxfield `Edition` and `Collector Number` to scryglass `set_code` and `collector_number`
- [ ] Determines `card_type` (`land`/`nonland`/`commander`) from board designation or Scryfall fallback
- [ ] Outputs valid scryglass-format text that `parseDeck()` accepts without errors
- [ ] Includes unit tests with sample Moxfield export data
- [ ] Handles edge cases: missing collector numbers, alternate printings, foil variants

## Implementation Notes (Optional)

- Moxfield exports are proper CSV with quoting, so use a CSV parser that handles RFC 4180 (or a simple state-machine parser) — do not use `split(',')` since card names contain commas
- The `Edition` column in Moxfield already provides the set code, and `Collector Number` is already present, so most conversions should not require Scryfall API calls
- Moxfield separates mainboard/sideboard/commander into separate exports or with a `Board` column — handle both cases
- This is likely the highest-value converter since Moxfield is one of the most popular MTG deck building tools
