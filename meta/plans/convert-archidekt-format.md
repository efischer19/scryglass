# feat: Archidekt export → scryglass format converter

## What do you want to build?

A conversion utility that transforms Archidekt CSV/text exports into the scryglass semicolon-delimited format (`card_name;set_code;collector_number;card_type`).

Archidekt exports typically look like:

```text
1 Galadriel, Light of Valinor (LTC) 498 *F* [Commander]
4 Island (LTR) 715 [Land]
1 Andúril, Flame of the West (LTR) 687 [Nonland]
```

The converter would:

- Parse the quantity, card name, set code, collector number, and optional category tags from each line
- Expand each row by quantity to produce one scryglass row per card copy
- Map Archidekt category tags (`[Commander]`, `[Land]`, etc.) to scryglass `card_type` values
- Handle foil markers and other metadata gracefully (ignore them)
- Fall back to Scryfall API for `card_type` resolution if category tags are missing

## Acceptance Criteria

- [ ] Parses Archidekt text export format
- [ ] Handles card names containing commas
- [ ] Expands quantity to produce one row per card copy
- [ ] Maps Archidekt category tags to scryglass `card_type` (`land`/`nonland`/`commander`)
- [ ] Ignores foil markers (`*F*`) and other metadata
- [ ] Falls back to Scryfall API for missing `card_type` data (respecting ADR-003 rate limits)
- [ ] Outputs valid scryglass-format text that `parseDeck()` accepts without errors
- [ ] Includes unit tests with sample Archidekt export data

## Implementation Notes (Optional)

- Archidekt has multiple export format options — prioritize the most common text export format
- Category tags in square brackets map cleanly to scryglass `card_type` values
- Consider sharing parsing infrastructure with the MTGO/Arena converter since the formats are similar (quantity + name + set + number pattern)
- If Archidekt changes their export format, the converter should fail gracefully with clear error messages
