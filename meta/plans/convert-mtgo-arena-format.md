# feat: MTGO/Arena deck list → scryglass format converter

## What do you want to build?

A conversion utility that transforms MTGO/Arena-style deck lists into the scryglass semicolon-delimited format (`card_name;set_code;collector_number;card_type`).

MTGO/Arena format typically looks like:

```text
1 Lightning Bolt (M21) 219
4 Island (LTR) 715
```

or

```text
1 Lightning Bolt
4 Island
```

The converter would need to:

- Parse the quantity, card name, optional set code, and optional collector number from each line
- Handle the `Sideboard` / `Commander` / `Companion` section headers common in Arena exports
- For lines missing set code or collector number, perform a Scryfall API lookup (respecting rate limits per ADR-003) to resolve them
- Determine `card_type` (`land`/`nonland`/`commander`) either from section headers or via Scryfall type-line data
- Output one row per card copy in scryglass format

## Acceptance Criteria

- [ ] Parses standard MTGO text format (`quantity card_name (SET) collector_number`)
- [ ] Parses Arena export format (`quantity card_name (SET) collector_number`)
- [ ] Handles section headers (`Commander`, `Companion`, `Deck`, `Sideboard`) to infer `card_type`
- [ ] Falls back to Scryfall API for missing set/collector data, respecting 100ms rate limit (ADR-003)
- [ ] Resolves `card_type` as `land`/`nonland`/`commander` based on section header or Scryfall type line
- [ ] Outputs valid scryglass-format text that `parseDeck()` accepts without errors
- [ ] Includes unit tests for parsing and conversion logic
- [ ] Handles edge cases: split cards, double-faced cards, cards with commas in names

## Implementation Notes (Optional)

- This utility lives in `@scryglass/core` since the parsing is pure logic, but Scryfall lookups may need to be injected as a dependency (or the utility returns a list of cards needing resolution)
- Consider a two-phase approach: (1) parse the input format into an intermediate representation, (2) resolve missing data via Scryfall, (3) output scryglass format
- The Scryfall `/cards/named` endpoint can fuzzy-match card names; `/cards/search` can find by name + set
- Rate limiting must comply with ADR-003 and ROBOT_ETHICS.md
