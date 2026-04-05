# feat: local storage save/load for decklists

## What do you want to build?

Persistence controls on the deck input page (and deck editor) that let users
save, name, list, load, and delete decklists using the browser storage mechanism
chosen in ticket 02's ADR. Users should never lose a decklist they've entered
just because they closed the tab.

## Acceptance Criteria

- [ ] A "Save Deck" button on the deck input page saves the current text area content to local storage with a user-provided name
- [ ] A "Load Deck" dropdown or list shows all saved decklists with their names and last-modified dates
- [ ] Selecting a saved deck populates the text area and re-runs validation
- [ ] A "Delete Deck" action removes a saved deck from storage (with confirmation dialog)
- [ ] A "Rename Deck" action updates the name of a saved deck
- [ ] Saving a deck with an existing name prompts for overwrite confirmation
- [ ] The storage schema is validated with Zod on read (ADR-008) to handle data from older app versions
- [ ] Graceful error handling when storage quota is exceeded (clear error message, no data loss)
- [ ] All save/load/delete actions are keyboard-accessible and announced to screen readers
- [ ] Unit tests cover: save, load, list, delete, rename, overwrite confirmation, quota error handling, schema migration

## Implementation Notes (Optional)

- The storage key prefix should be namespaced (e.g., `scryglass:decks:`) to
  avoid collisions with other data.
- The stored data schema (defined in ticket 02's ADR) should include at minimum:
  - `name: string`
  - `content: string` (raw scryglass-format text)
  - `cardCount: number` (for display in the list)
  - `lastModified: string` (ISO 8601 timestamp)
- The deck list UI can be a simple `<select>` or a more polished dropdown panel
  — keep it simple for the first iteration and iterate later.
- Consider auto-saving the current text area content under a special
  `__autosave__` key so users don't lose work if they navigate away
  accidentally. This should be debounced (e.g., 1 second after last keystroke).
- The storage layer implementation belongs in `@scryglass/pwa` (browser API
  access), but the Zod schemas for stored data should live in
  `@scryglass/core` for reuse and validation consistency.
