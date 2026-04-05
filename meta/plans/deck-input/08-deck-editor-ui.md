# feat: deck editor UI for incomplete imports

## What do you want to build?

An interactive deck editor component in `@scryglass/pwa` that opens when a
format conversion produces cards needing resolution (i.e., the `needsResolution`
array from converters in tickets 05–07 is non-empty). This is the "hybrid"
workflow described in the epic: users import a decklist, and the editor helps
them finish filling in the gaps.

The editor displays the partially-converted deck in a table-like view, with
inline controls for resolving incomplete cards. Once all cards are resolved, the
user can load the deck into the shuffler.

## Acceptance Criteria

- [ ] When a converter returns cards in `needsResolution`, the deck editor opens automatically in "update mode"
- [ ] The editor displays all cards (resolved and unresolved) in a scrollable list/table
- [ ] Unresolved cards are visually distinct (highlighted, icon, or badge) and grouped at the top
- [ ] Each unresolved card shows what is missing (set code, collector number, card type) and provides inline controls to fill it in
- [ ] A `card_type` selector (land / nonland / commander) is available for each card
- [ ] Optional: a "Resolve via Scryfall" button per card that auto-fills missing set/collector data by searching the Scryfall API (respecting ADR-003 rate limits)
- [ ] A "Resolve All" button attempts Scryfall lookups for all unresolved cards in batch (with rate limiting and progress indicator)
- [ ] The editor validates the full deck through `parseDeck()` after each change and shows live error/warning counts
- [ ] The "Load Deck" button is enabled only when all cards are resolved and `parseDeck()` returns zero errors
- [ ] The editor is keyboard-navigable and screen-reader accessible
- [ ] The editor works on mobile viewports (responsive layout, touch-friendly controls)

## Implementation Notes (Optional)

- This component is the bridge between raw import and the shuffler. It should
  accept a `ConvertResult` as its initial state.
- For Scryfall lookups, use the `/cards/named` endpoint for exact matches and
  `/cards/search` for fuzzy matches. Inject the fetch function as a dependency
  so the component is testable without network access.
- Rate-limit Scryfall requests to 100 ms minimum between calls (ADR-003).
  Show a progress bar or spinner during batch resolution.
- Consider using `@scryglass/core` schemas for the editor's internal state so
  validation is consistent with `parseDeck()`.
- The editor should also be reachable from the deck input page (ticket 04) as
  a manual "Edit Deck" action, even when there are no unresolved cards. This
  gives users a structured editing experience as an alternative to raw text.
- Accessibility: each row should be focusable, with clear labels for the
  editable fields. Use `aria-invalid` and `aria-describedby` for validation
  errors.
