# Ticket 09: Mulligan Execution Flow

## What do you want to build?

Wire together the mulligan phase into a complete flow: from the initial 7-card draw, through potential mulligans, to the final "keep" that transitions the game to the playing phase. This ticket completes the mulligan engine.

## Acceptance Criteria

- [ ] When a player clicks "Mulligan", the following happens in sequence:
  1. The `mulliganHand` cards are returned to the `library`
  2. The library is shuffled using the cryptographic shuffle engine (Ticket 03)
  3. A new 7 cards are drawn from the top of the library into `mulliganHand`
  4. The land count and mulligan verdict are recalculated (Ticket 08)
  5. The UI updates to show the new hand
- [ ] There is no limit on the number of mulligans (casual rules — no "London Mulligan" hand-size reduction)
- [ ] When a player clicks "Keep Hand", the `mulliganHand` is cleared (cards leave the app's tracking) and the phase transitions to `'playing'`
- [ ] A mulligan counter displays how many mulligans have been taken (informational only — no gameplay effect)
- [ ] The game only transitions to full `'playing'` mode when **both** players have kept their hands
- [ ] If Player A keeps but Player B is still mulliganing, Player A's action buttons remain disabled until Player B also keeps
- [ ] The flow handles edge cases: library with fewer than 7 cards after multiple mulligans (draw as many as available)
- [ ] Integration test: load a deck, verify mulligan draws 7, trigger mulligan, verify re-shuffle and re-draw, keep, verify phase transition

## Implementation Notes (Optional)

This ticket is primarily integration work — it orchestrates the state manager (Ticket 04), shuffle engine (Ticket 03), and mulligan validation (Ticket 08) into a cohesive user flow.

The "London Mulligan" (draw 7, put N on bottom where N = number of mulligans taken) is explicitly **not** implemented. The issue states: "Explicitly ignores competitive London Mulligan bottom-decking rules in favor of casual play."

**References:** Ticket 03 (Shuffle), Ticket 04 (State Manager), Ticket 07 (Ephemeral Hand), Ticket 08 (Validation)
