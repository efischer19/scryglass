# Ticket 07: Mulligan Phase — Ephemeral Hand

## What do you want to build?

Implement the mulligan phase UI and state logic. When a deck is loaded and shuffled, the game enters the mulligan phase. The top 7 cards are drawn into a temporary "mulligan hand" that is visible only to the owning player. This hand exists only during the mulligan phase and is discarded (conceptually — cards go to the player's physical hand) when the player keeps.

## Acceptance Criteria

- [ ] When both decks are loaded and shuffled, each player's phase transitions to `'mulligan'`
- [ ] The top 7 cards are moved from each player's `library` to their `mulliganHand` in the state
- [ ] Each player zone displays their mulligan hand as a list of card names (no images yet — Scryfall integration comes later)
- [ ] The mulligan hand display is clearly labeled "Opening Hand" and shows the land count
- [ ] A "Keep Hand" button is present in each player zone
- [ ] A "Mulligan" button is present in each player zone (enabled/disabled based on Ticket 08's validation)
- [ ] The mulligan hand is hidden from the other player — the UI uses a "Reveal" toggle or confirmation gate: "Show Player A's hand?" before displaying card names
- [ ] When "Keep Hand" is clicked, the `mulliganHand` is cleared (cards leave the app's tracking), the player's phase transitions to `'playing'`, and the action buttons (Draw, Tutor, etc.) become enabled
- [ ] The game does not proceed to the `'playing'` phase until both players have kept their hands

## Implementation Notes (Optional)

The "confirmation gate" for revealing a hand is critical for two players sharing one device. Consider a simple approach: the mulligan hand area shows "Tap to reveal Player A's hand" with a solid backdrop, and only shows card names after a deliberate tap. A second tap or timer hides it again.

**References:** [ADR-005: Client-Side State Management](../../meta/adr/ADR-005-client_state_management.md), Ticket 04 (State Manager), Ticket 05 (UI Shell)
