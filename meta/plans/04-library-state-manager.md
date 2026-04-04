# Ticket 04: Action/Reducer Game Engine

## What do you want to build?

Implement the action/reducer game engine in `@scryglass/core` (`packages/core/src/reducer.ts`) that manages all state transitions for both players' card libraries. This is the central state machine — the PWA, tests, and future AI agents all interact with the game exclusively through `dispatch(state, action)`.

The engine accepts Zod-validated action objects and returns an `ActionResult` containing the new immutable state plus any output (e.g., a drawn card). Every mutation follows the pattern defined in [ADR-005](../../meta/adr/ADR-005-client_state_management.md): structured JSON in, structured JSON out, no side effects.

## Acceptance Criteria

- [ ] A `createInitialState()` function is exported from `packages/core/src/reducer.ts` and returns a `GameState` with two player entries (`A` and `B`), each in the `loading` phase
- [ ] A `PlayerPhaseSchema` Zod enum defines the valid phases: `loading`, `mulligan`, `playing`
- [ ] A `GameStateSchema` Zod schema defines the full state shape: `{ players: { A: PlayerState, B: PlayerState } }` where each `PlayerState` contains `library` (array of `Card`), `phase` (`PlayerPhase`), and `mulliganHand` (array of `Card`, initially empty)
- [ ] An `ActionSchema` Zod discriminated union (keyed on `type`) defines all valid actions: `LOAD_DECK`, `SHUFFLE_LIBRARY`, `DRAW_CARD`, `RETURN_TO_LIBRARY`
- [ ] An `ActionResultSchema` Zod schema defines the return type: `{ state: GameState, card: Card | null }` where `card` carries the drawn card for `DRAW_CARD` and is `null` for other actions
- [ ] All TypeScript types (`GameState`, `PlayerState`, `PlayerPhase`, `Action`, `ActionResult`) are derived from their Zod schemas via `z.infer<typeof Schema>`
- [ ] All schemas are exported from `packages/core/src/schemas/` (e.g., `packages/core/src/schemas/state.ts` and `packages/core/src/schemas/action.ts`); the `CardSchema` from Ticket 02 is reused
- [ ] A `dispatch(state: GameState, action: Action): ActionResult` function is exported and serves as the single entry point for all state mutations
- [ ] `dispatch` validates the incoming action against `ActionSchema` before processing; invalid actions produce descriptive Zod error messages that agents can parse and self-correct
- [ ] `LOAD_DECK` action (`{ type: "LOAD_DECK", payload: { player: "A" | "B", cards: Card[] } }`) replaces a player's library with the provided cards and sets their phase to `mulligan`
- [ ] `SHUFFLE_LIBRARY` action (`{ type: "SHUFFLE_LIBRARY", payload: { player: "A" | "B" } }`) returns a new state with the player's library shuffled using the `shuffle` function from Ticket 03
- [ ] `DRAW_CARD` action (`{ type: "DRAW_CARD", payload: { player: "A" | "B" } }`) removes and returns the top card (index 0) from the library via `ActionResult.card`; throws a descriptive error if the library is empty (e.g., `"Cannot draw: Player A's library is empty (0 cards remaining)"`)
- [ ] `RETURN_TO_LIBRARY` action (`{ type: "RETURN_TO_LIBRARY", payload: { player: "A" | "B", card: Card, position: "top" | "bottom" | "random" } }`) inserts a card at index 0 (`top`), at the end (`bottom`), or at a random index (`random`)
- [ ] All state transitions are immutable — `dispatch` returns a new `GameState` and never mutates the input state
- [ ] Logically invalid actions (e.g., drawing from an empty library) throw descriptive `Error` objects with agent-readable messages that include context (player, library size, action type)
- [ ] Unit tests (Vitest) validate all four action types including edge cases: empty library draw, `LOAD_DECK` phase transition, `RETURN_TO_LIBRARY` at all three positions, `SHUFFLE_LIBRARY` preserves card set, invalid action rejection, input state immutability

## Implementation Notes (Optional)

The reducer is a pure function — no classes, no proxies, no side effects. The `dispatch` function is a `switch` on `action.type` that delegates to handler functions for each action. This follows the action/reducer pattern described in [ADR-005](../../meta/adr/ADR-005-client_state_management.md).

Example state shape:

```typescript
{
  players: {
    A: {
      library: [{ name: "Sol Ring", setCode: "CMD", cardType: "Artifact", manaCost: "{1}" }, ...],
      phase: "loading",
      mulliganHand: []
    },
    B: {
      library: [...],
      phase: "loading",
      mulliganHand: []
    }
  }
}
```

Example dispatch call:

```typescript
const result = dispatch(state, {
  type: "DRAW_CARD",
  payload: { player: "A" }
});
// result.state  → new GameState with one fewer card in A's library
// result.card   → the Card that was drawn
```

The `Card` type and `CardSchema` are defined in Ticket 02 (`packages/core/src/schemas/card.ts`) and reused here — do not redefine them.

**References:** [ADR-005: Action/Reducer State Management](../../meta/adr/ADR-005-client_state_management.md), [ADR-008: TypeScript & Zod](../../meta/adr/ADR-008-typescript_and_zod.md), Ticket 02 (card schema), Ticket 03 (shuffle)
