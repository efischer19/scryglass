# feat: MTGO/Arena deck list → scryglass format converter

## What do you want to build?

A conversion utility in `@scryglass/core` that transforms MTGO/Arena-style deck
lists into scryglass semicolon-delimited format. This is the most common
plain-text format users will paste from the clipboard, so it should be the
first converter implemented.

MTGO/Arena format typically looks like:

```text
Commander
1 Galadriel, Light of Valinor (LTC) 498

Deck
4 Island (LTR) 715
1 Andúril, Flame of the West (LTR) 687
```

or the minimal variant:

```text
1 Lightning Bolt
4 Island
```

## Acceptance Criteria

- [ ] A `convertMtgoArena(input: string): ConvertResult` function exists in `@scryglass/core`
- [ ] Parses standard MTGO text format: `quantity card_name (SET) collector_number`
- [ ] Parses Arena export format (identical structure with minor whitespace differences)
- [ ] Handles section headers (`Commander`, `Companion`, `Deck`, `Sideboard`) to infer `card_type`
- [ ] Expands quantity to produce one scryglass row per card copy
- [ ] For lines missing set code or collector number, returns them in a `needsResolution` array (Scryfall lookup is the caller's responsibility)
- [ ] Resolves `card_type` as `land`/`nonland`/`commander` based on section header; lines in `Deck` section without a header default to `nonland` and are flagged for review
- [ ] Output text passes `parseDeck()` with zero errors (for fully-resolved cards)
- [ ] Unit tests cover: basic parsing, section headers, quantity expansion, card names with commas, missing set/collector data, empty input, malformed lines
- [ ] Handles edge cases: split cards (`Fire // Ice`), double-faced cards, extra whitespace

## Implementation Notes (Optional)

- This incorporates and supersedes `meta/plans/convert-mtgo-arena-format.md`.
- Use a two-phase approach:
  1. Parse input into intermediate card objects (name, quantity, set, number, section)
  2. Map to scryglass format, flagging incomplete cards for resolution
- The function returns a `ConvertResult` type (define with Zod per ADR-008):
  - `output: string` — scryglass-format text for fully resolved cards
  - `needsResolution: UnresolvedCard[]` — cards missing set/collector/type data
  - `warnings: string[]` — non-fatal issues (e.g., sideboard cards skipped)
  - `errors: string[]` — fatal parse failures
- The `UnresolvedCard` type captures what was parsed and what is missing:
  - `name: string` — card name as parsed from the input
  - `setCode?: string` — set code, if present in the input
  - `collectorNumber?: string` — collector number, if present
  - `cardType?: CardType` — card type, if inferrable from section headers
  - `quantity: number` — original quantity from the input line
  - `sourceLine: number` — row number for error reporting
- Scryfall lookups are **not** performed inside this function. The PWA layer
  (or deck editor UI in ticket 08) handles resolution, respecting ADR-003 rate
  limits.
- Consider sharing a `parseQuantityLine()` helper with the Archidekt converter
  (ticket 07) since both formats use `quantity card_name (SET) number`.
