# feat: ADR — local storage strategy for decklists

## What do you want to build?

Propose and accept an ADR that defines how scryglass persists user decklists in
the browser. Users should be able to save, name, list, load, and delete
decklists without a server.

The decision must cover:

- Storage backend (`localStorage`, `IndexedDB`, or a wrapper library)
- Data schema (what gets stored alongside the raw deck text)
- Storage limits and quota handling
- Interaction with the existing Scryfall image cache (ADR-003 already uses
  IndexedDB for images — should decks share the same database?)

## Acceptance Criteria

- [ ] A new ADR document exists at `meta/adr/ADR-010-local_storage_strategy.md` (or next available number) with status `Proposed`
- [ ] The ADR evaluates at least three options: (a) `localStorage` with JSON serialization, (b) `IndexedDB` via a thin wrapper, (c) a library like `idb-keyval` or `localForage`
- [ ] The ADR specifies the stored data schema (e.g., deck name, raw text, parsed card count, last-modified timestamp)
- [ ] The ADR addresses storage quota limits and graceful error handling when quota is exceeded
- [ ] The ADR addresses the relationship to the existing Scryfall IndexedDB cache (ADR-003)
- [ ] The chosen option is justified against the project's development philosophy (simplicity, minimal dependencies)

## Implementation Notes (Optional)

- `localStorage` is the simplest option (~5 MB limit, synchronous API) and
  sufficient for text-only decklists. A typical deck is under 5 KB, so hundreds
  could be stored.
- `IndexedDB` offers structured storage and larger quotas, but the API is
  complex. ADR-003 already commits to IndexedDB for Scryfall image caching, so
  the infrastructure may already exist.
- `idb-keyval` (~600 bytes) wraps IndexedDB in a simple key-value API — a
  pragmatic middle ground.
- The schema should be defined as a Zod schema (per ADR-008) and validated on
  read to handle data written by older app versions.
- Consider whether the storage layer belongs in `@scryglass/core` (pure
  logic, schema definitions) or `@scryglass/pwa` (browser API access), per
  ADR-007.
