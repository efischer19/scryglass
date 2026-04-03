# Ticket 13: Scry / Look at Top N

## What do you want to build?

Implement the "Scry" action button that allows a player to look at the top N cards of their library and decide the fate of each card: keep on top, send to bottom, or remove from the library entirely. This simulates scry effects, Sensei's Divining Top, Sylvan Library, and similar MTG effects.

## Acceptance Criteria

- [ ] Each player zone has a "Scry" button, enabled only during the `'playing'` phase
- [ ] Clicking "Scry" opens a prompt asking "How many cards to look at?" with a numeric input (min 1, max = library size)
- [ ] After entering N, a modal displays the top N cards in order (top of library = first shown)
- [ ] Each card in the scry view has three action buttons:
  - **"Keep on Top"** — the card stays at its current position (or is re-ordered to the top)
  - **"Send to Bottom"** — the card is moved to the bottom of the library
  - **"Remove from Library"** — the card is removed entirely (drawn to hand, milled, exiled — the app doesn't track where)
- [ ] The player can arrange the "Keep on Top" cards in a custom order using drag-and-drop or up/down arrows
- [ ] After all N cards are routed, a "Confirm Scry" button applies the changes to the library
- [ ] The library card count updates after confirmation
- [ ] Cards routed to "Remove from Library" are displayed briefly in the card display area before being discarded
- [ ] A confirmation gate asks: "Scry Player A's library?" before showing the cards
- [ ] Unit test: scry with "Keep on Top" preserves card at top of library
- [ ] Unit test: scry with "Send to Bottom" moves card to last index
- [ ] Unit test: scry with "Remove" reduces library size

## Implementation Notes (Optional)

The scry UI is the most complex modal in the app. Keep it simple:

1. Show the N cards as a vertical list
2. Each card has radio buttons or segmented controls for the three destinations
3. "Keep on Top" cards can be reordered with simple "Move Up" / "Move Down" buttons (drag-and-drop is a nice-to-have, not required)

The order of operations when confirming:

1. Remove all "Remove from Library" cards
2. Remove all "Send to Bottom" cards from their positions, then append them to the bottom in their original relative order
3. The remaining "Keep on Top" cards are placed at the top of the library in the player's chosen order

**References:** Ticket 04 (State Manager — `peekTop`, `removeCardByIndex`, `insertCard`), Ticket 05 (UI Shell)
