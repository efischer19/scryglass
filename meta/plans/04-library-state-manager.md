# Ticket 04: Library State Manager

## What do you want to build?

Implement the core state management module (`src/scripts/state.js`) that holds and manipulates the game state for both players. This is the central data model — all UI interactions read from and write to this state.

The state manager owns the `library` array for each player and provides functions for all mutations: shuffle, draw (pop from top), remove by index, remove by name, insert at top/bottom, and return-to-library.

## Acceptance Criteria

- [ ] A `createGameState()` function returns the initial state object with two player entries
- [ ] Each player entry contains: `library` (array), `phase` (string: `'loading'`, `'mulligan'`, `'playing'`), `mulliganHand` (array, initially empty)
- [ ] `loadDeck(state, playerKey, cards)` populates a player's library from a parsed card array and sets phase to `'mulligan'`
- [ ] `shuffleLibrary(state, playerKey)` shuffles the player's library in place using the shuffle module from Ticket 03
- [ ] `drawCard(state, playerKey)` removes and returns the top card (index 0) from the library, or returns `null` if the library is empty
- [ ] `removeCardByIndex(state, playerKey, index)` removes and returns the card at the specified index
- [ ] `removeCardByName(state, playerKey, name)` finds the first card matching the name (case-insensitive), removes it, and returns it; returns `null` if not found
- [ ] `insertCard(state, playerKey, card, position)` adds a card to the library at `'top'` (index 0), `'bottom'` (end), or `'random'` (random index after shuffling)
- [ ] `getLibrarySize(state, playerKey)` returns the number of cards remaining
- [ ] `peekTop(state, playerKey, n)` returns the top N cards without removing them
- [ ] All functions are pure (operate on the passed state object) and unit-testable
- [ ] Unit tests cover all functions including edge cases (empty library, card not found, peek more than available)

## Implementation Notes (Optional)

The state object is a plain JavaScript object — no classes, no proxies. Functions operate on it directly. This follows the pattern described in [ADR-005](../../meta/adr/ADR-005-client_state_management.md).

Example state shape:

```javascript
{
  playerA: {
    library: [{ name, setCode, cardType, manaCost }, ...],
    phase: 'loading',
    mulliganHand: []
  },
  playerB: {
    library: [...],
    phase: 'loading',
    mulliganHand: []
  }
}
```

**References:** [ADR-005: Client-Side State Management](../../meta/adr/ADR-005-client_state_management.md), Ticket 02 (card objects), Ticket 03 (shuffle)
