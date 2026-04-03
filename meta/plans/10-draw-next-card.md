# Ticket 10: Draw Next Card

## What do you want to build?

Implement the "Draw" action button that pops the top card from a player's library and displays it. This is the most frequently used in-game action and serves as the foundation for the other library manipulation actions.

## Acceptance Criteria

- [ ] Each player zone has a "Draw" button that is enabled only during the `'playing'` phase
- [ ] Clicking "Draw" removes the top card (index 0) from the active player's library
- [ ] The drawn card's name is displayed in the player's card display area
- [ ] The card display area shows the card image if cached (falls back to the card name as text if no image is available yet)
- [ ] The library card count updates immediately after drawing
- [ ] A confirmation gate prevents accidental draws: "Draw from Player A's library?" with "Yes" / "Cancel" (essential for two players sharing one device)
- [ ] If the library is empty, the Draw button is disabled and shows "Library Empty"
- [ ] The card display area can be dismissed/closed after viewing
- [ ] Drawing a card triggers a JIT image fetch if the image is not already cached (integration point with Ticket 17, stubbed for now)
- [ ] Unit test: draw reduces library size by 1 and returns the correct (top) card
- [ ] Unit test: draw from empty library returns null and does not error

## Implementation Notes (Optional)

The confirmation gate is a simple modal or inline prompt — not a browser `confirm()` dialog, which would be jarring. The gate is important because two players are sharing one screen and an accidental tap on the wrong player's Draw button would reveal a card.

The card display area will show the card name as text initially. Once Scryfall integration is complete (Phase 4), it will display the card image. Design the display area to accommodate both states.

**References:** Ticket 04 (State Manager — `drawCard`), Ticket 05 (UI Shell)
