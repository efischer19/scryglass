# Ticket 12: Tutor Card

## What do you want to build?

Implement the "Tutor" action button that allows a player to search their entire library for a specific card by name, extract it, and then automatically shuffle the library. This simulates tutor effects (Demonic Tutor, Enlightened Tutor, etc.) in MTG.

## Acceptance Criteria

- [ ] Each player zone has a "Tutor" button, enabled only during the `'playing'` phase
- [ ] Clicking "Tutor" opens a modal with a text search input
- [ ] The search input provides real-time filtering of cards remaining in the library as the user types
- [ ] The filtered list shows card names, types, and mana costs
- [ ] Selecting a card from the filtered list extracts it from the library
- [ ] The extracted card is displayed in the card display area
- [ ] After extraction, the library is automatically shuffled using the shuffle engine (Ticket 03)
- [ ] The library card count updates to reflect the removal
- [ ] A confirmation gate asks: "Tutor [Card Name] from Player A's library?" before executing
- [ ] The search is case-insensitive and matches partial card names (e.g., typing "bolt" matches "Lightning Bolt")
- [ ] If no cards match the search, the list shows "No matching cards"
- [ ] The modal can be closed without selecting a card (cancel action)
- [ ] Tutoring a card triggers a JIT image fetch if not cached (integration point with Ticket 17, stubbed for now)
- [ ] Unit test: tutor removes the correct card by name and reduces library size by 1
- [ ] Unit test: tutor with non-existent card name returns null

## Implementation Notes (Optional)

The real-time search filter should use simple `String.includes()` matching — no need for fuzzy search in the initial implementation. For large libraries (99 cards), filtering on every keystroke is fast enough without debouncing.

**IMPORTANT:** The Tutor modal shows the full library contents to the active player. The confirmation gate for the other player should NOT reveal the library contents. Only the final selected card is displayed after confirmation.

**References:** Ticket 03 (Shuffle), Ticket 04 (State Manager — `removeCardByName`), Ticket 05 (UI Shell)
