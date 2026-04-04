# Ticket 07: Mulligan Core Logic

## What do you want to build?

Implement the pure mulligan state logic in `@scryglass/core` (`packages/core/`). This ticket adds three new actions to the action/reducer engine: `DEAL_OPENING_HAND`, `MULLIGAN`, and `KEEP_HAND`. These actions manage the transition from the `mulligan` phase through to the `playing` phase.

This is core logic only — no DOM, no browser APIs, no UI. The Preact components that render the mulligan UI are built in Ticket 09.

## Acceptance Criteria

### Actions & Reducer (`packages/core/src/reducer.ts`)

- [ ] A `DEAL_OPENING_HAND` action (`{ type: "DEAL_OPENING_HAND", payload: { player: "A" | "B" } }`) moves the top 7 cards from the player's `library` to their `mulliganHand`
- [ ] If the library has fewer than 7 cards, `DEAL_OPENING_HAND` moves as many cards as are available
- [ ] A `MULLIGAN` action (`{ type: "MULLIGAN", payload: { player: "A" | "B" } }`) returns all cards from `mulliganHand` to the `library`, shuffles the library (using Ticket 03's shuffle function), and re-deals the top 7 cards into `mulliganHand`
- [ ] `MULLIGAN` increments a `mulliganCount` counter on the player's state (informational only — no gameplay effect)
- [ ] A `KEEP_HAND` action (`{ type: "KEEP_HAND", payload: { player: "A" | "B" } }`) clears the player's `mulliganHand` (cards leave the app's tracking) and transitions the player's phase to `'playing'`
- [ ] There is no limit on the number of mulligans (casual rules — no "London Mulligan" hand-size reduction)
- [ ] All three actions are only valid when the player's phase is `'mulligan'`; dispatching them in another phase throws a descriptive error

### Schemas & Types (`packages/core/src/schemas/`)

- [ ] `DEAL_OPENING_HAND`, `MULLIGAN`, and `KEEP_HAND` action types are added to the `ActionSchema` Zod discriminated union in `packages/core/src/schemas/action.ts`
- [ ] `PlayerStateSchema` is extended with `mulliganCount: z.number()` (initialized to `0` by `createInitialState()`)
- [ ] All new TypeScript types are derived from their Zod schemas via `z.infer<typeof Schema>`

### Testing

- [ ] Unit tests (Vitest) in `packages/core/src/__tests__/` validate all three actions
- [ ] Test: `DEAL_OPENING_HAND` moves exactly 7 cards from library to mulliganHand
- [ ] Test: `DEAL_OPENING_HAND` with a library of fewer than 7 cards moves all available cards
- [ ] Test: `MULLIGAN` returns cards to library, shuffles, and re-deals 7
- [ ] Test: `MULLIGAN` increments the `mulliganCount`
- [ ] Test: `KEEP_HAND` clears `mulliganHand` and transitions phase to `'playing'`
- [ ] Test: dispatching any of the three actions outside the `'mulligan'` phase throws a descriptive error
- [ ] Test: all state transitions are immutable — input state is never mutated

## Implementation Notes (Optional)

These three actions extend the `dispatch` function's `switch` statement in `packages/core/src/reducer.ts`. The `MULLIGAN` action internally reuses the `shuffle` function from Ticket 03 — import it directly rather than dispatching a separate `SHUFFLE_LIBRARY` action.

The "London Mulligan" (draw 7, put N on bottom where N = number of mulligans taken) is explicitly **not** implemented. Casual rules: always draw a full 7 cards on each mulligan.

Example dispatch flow:

```typescript
let result = dispatch(state, { type: 'DEAL_OPENING_HAND', payload: { player: 'A' } });
// result.state.players.A.mulliganHand has 7 cards

result = dispatch(result.state, { type: 'MULLIGAN', payload: { player: 'A' } });
// cards returned, reshuffled, 7 new cards dealt

result = dispatch(result.state, { type: 'KEEP_HAND', payload: { player: 'A' } });
// mulliganHand cleared, phase → 'playing'
```

**References:** [ADR-005: Action/Reducer State Management](../../meta/adr/ADR-005-client_state_management.md), Ticket 04 (Action/Reducer Engine — `dispatch`, `GameState`)
