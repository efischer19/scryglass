# Ticket 08: Land Counting & Mulligan Validation

## What do you want to build?

Implement the logic that counts lands in a mulligan hand and determines whether the player is allowed to mulligan, forced to keep, or given the choice. This is the rules engine behind the casual mulligan system.

## Acceptance Criteria

- [ ] A `countLands(hand)` function counts cards in the hand whose `cardType` contains the substring `Land` (case-insensitive)
- [ ] A `getMulliganVerdict(landCount, settings)` function returns one of three verdicts:
  - `'must_mulligan'` — 0, 1, 6, or 7 lands (auto-recommend mulligan)
  - `'must_keep'` — 3 or 4 lands (hard lock — mulligan button disabled)
  - `'user_choice'` — 2 or 5 lands (allowed only if the pre-game toggle is enabled)
- [ ] A pre-game settings toggle exists: "Allow mulligan with 2 or 5 lands" (default: off / must-keep)
- [ ] When the toggle is **off**, 2 or 5 lands returns `'must_keep'`
- [ ] When the toggle is **on**, 2 or 5 lands returns `'user_choice'`
- [ ] The mulligan button in the UI reflects the verdict: enabled for `'must_mulligan'` and `'user_choice'`, disabled for `'must_keep'`
- [ ] The UI displays the land count and the verdict reason (e.g., "3 lands — must keep", "1 land — mulligan recommended")
- [ ] Unit tests cover all land count values (0–7) with the toggle both on and off

## Implementation Notes (Optional)

The land detection uses a simple substring check: `cardType.toLowerCase().includes('land')`. This correctly identifies `Basic Land — Mountain`, `Land — Urza's`, `Legendary Land`, etc.

The pre-game toggle should be stored in the state object (or a simple settings object) and presented during the deck loading phase (Ticket 06) or the mulligan phase.

**References:** Ticket 07 (Mulligan Phase), Ticket 04 (State Manager)
