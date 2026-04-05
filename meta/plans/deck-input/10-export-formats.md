# feat: export decklists to common formats

## What do you want to build?

Export functions in `@scryglass/core` that convert a scryglass-format decklist
into the three supported external formats (MTGO/Arena, Moxfield CSV,
Archidekt text). These are the reverse of the converters built in tickets
05–07, and they complete the round-trip story needed for the regression test
suite in ticket 11.

Users will access export through an "Export" dropdown on the deck input page
or deck editor, which offers format choices and copies the result to the
clipboard or triggers a file download.

## Acceptance Criteria

- [ ] An `exportMtgoArena(cards: Card[]): string` function produces valid MTGO/Arena-format output
- [ ] An `exportMoxfield(cards: Card[]): string` function produces valid Moxfield CSV output (with standard headers)
- [ ] An `exportArchidekt(cards: Card[]): string` function produces valid Archidekt text-format output
- [ ] All three exporters collapse duplicate cards back into quantity lines (e.g., 4 Islands become `4 Island (LTR) 715`)
- [ ] Commander cards (from the original parsed warnings) are included in the output under the appropriate section/designation
- [ ] Output from each exporter can be re-imported by the corresponding converter (ticket 05–07) and produces an identical card list
- [ ] Unit tests verify round-trip fidelity: `input → parseDeck() → export → convert → parseDeck()` yields the same cards
- [ ] An "Export" dropdown is available on the deck input page and deck editor with options for each format plus native scryglass format
- [ ] Export actions copy the result to the clipboard with a confirmation toast, or download as a file (user's choice)

## Implementation Notes (Optional)

- Export functions accept a `Card[]` array (the output of `parseDeck().cards`)
  plus an optional `commanders: Card[]` for commander-aware formats.
- Collapsing duplicates: group by `(name, setCode, collectorNumber, cardType)`
  and count occurrences. Output in the format's expected order (commanders
  first, then nonlands, then lands — or as specified by the format).
- Moxfield CSV export must properly quote card names containing commas per
  RFC 4180.
- MTGO/Arena export should include section headers (`Commander`, `Deck`) when
  commanders are present.
- Archidekt export should include category tags (`[Commander]`, `[Land]`,
  `[Nonland]`).
- Clipboard access uses the async `navigator.clipboard.writeText()` API.
  Provide a fallback for older browsers (`document.execCommand('copy')`).
- File download uses a `Blob` + `URL.createObjectURL()` + temporary `<a>`
  link pattern.
