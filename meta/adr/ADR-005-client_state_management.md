---
title: "ADR-005: Action/Reducer State Management — Agent-Ready Game Engine"
status: "Accepted"
date: "2026-04-04"
tags:
  - "state-management"
  - "architecture"
  - "data-model"
  - "agent-readiness"
---

## Context

* **Problem:** Scryglass must track the state of two players' card libraries simultaneously. The app needs to support shuffling, drawing, tutoring, scrying, and the mulligan phase. The state engine must be consumable by both the PWA frontend *and* future AI agents (via MCP, LangChain, or direct tool-calling). This means state mutations must accept structured JSON inputs and return structured JSON outputs — exactly how LLMs produce tool calls.
* **Constraints:** All game logic lives in `@scryglass/core` (see [ADR-007](./ADR-007-monorepo_structure.md)) and must be platform-agnostic (no DOM, no browser APIs). State must be easy to reason about for contributors. The issue specification states: "The state manager only tracks the ordered array of the Library. It does not track hand, graveyard, or exile."

## Decision

We will use an **Action/Reducer pattern** with Zod-validated actions, implemented in `@scryglass/core`:

1. **Immutable State, Pure Reducer:** A `dispatch(state, action)` function accepts the current `GameState` and a validated `Action`, and returns a new `GameState` (or an `ActionResult` containing the new state plus any output like a drawn card). The reducer is a pure function — no side effects, no mutations.

2. **Typed Actions as JSON Intents:** Every state mutation is triggered by a structured action object. Actions are a discriminated union keyed by `type`:
    * `{ type: "LOAD_DECK", payload: { player: "A", cards: [...] } }`
    * `{ type: "SHUFFLE_LIBRARY", payload: { player: "A" } }`
    * `{ type: "DRAW_CARD", payload: { player: "A" } }`
    * `{ type: "TUTOR_CARD", payload: { player: "A", cardName: "Sol Ring" } }`
    * `{ type: "FETCH_BASIC_LAND", payload: { player: "A", landType: "Mountain" } }`
    * `{ type: "SCRY_RESOLVE", payload: { player: "A", decisions: [...] } }`
    * `{ type: "MULLIGAN", payload: { player: "A" } }`
    * `{ type: "KEEP_HAND", payload: { player: "A" } }`
    * `{ type: "RETURN_TO_LIBRARY", payload: { player: "A", cardName: "...", position: "top" } }`

3. **Zod Validation at Entry:** The `dispatch()` function validates the incoming action against the `ActionSchema` (Zod discriminated union) before processing. Invalid actions produce descriptive Zod error messages that agents can read and self-correct.

4. **Deterministic Errors:** If an action is structurally valid but logically invalid (e.g., drawing from an empty library, tutoring a card not in the library), the reducer throws a descriptive `Error` with a human/agent-readable message: `"Cannot draw: Player A's library is empty (0 cards remaining)"`.

5. **State Shape:** The core state is an immutable object:
    * `players`: A record of two player entries, each with `library` (ordered array), `phase` (enum: `loading`, `mulligan`, `playing`), and `mulliganHand` (temporary array).
    * `settings`: Game settings (e.g., `allowMulliganWith2or5Lands`).

6. **Cards Leave, Not Move:** When a card is drawn, tutored, or milled, it is removed from the `library` array. The app does not track where it goes physically. The one exception — "return to library" — is an explicit action.

7. **No DOM Coupling:** The reducer returns plain data. The PWA subscribes to state changes and renders accordingly. The core package has zero knowledge of how (or whether) state is rendered.

## Considered Options

1. **Option 1: Action/Reducer with Zod Validation (Chosen)**
    * *Pros:* Perfectly maps to how LLMs output tool calls (structured JSON → structured response). Pure functions are trivially testable. Full action history enables debugging and replay. Zod validation provides machine-readable error messages. State transitions are explicit and auditable.
    * *Cons:* More boilerplate than direct mutation. Requires defining an action type for every operation. Slight learning curve for contributors unfamiliar with reducer patterns.

2. **Option 2: Plain Objects + Direct Mutation Functions**
    * *Pros:* Simpler to write initially. Less ceremony for each operation.
    * *Cons:* Mutations are scattered across functions. No single entry point for validation. Harder for agents to interact with — they need to know which function to call and how. No action history. Harder to test state transitions in isolation.

3. **Option 3: Proxy-Based Reactivity (Vue `reactive()` or similar)**
    * *Pros:* Automatic change detection. Less boilerplate for the UI layer.
    * *Cons:* Requires browser APIs (Proxy). Cannot run in Node.js without polyfills. Not suitable for `@scryglass/core` which must be platform-agnostic. Agents cannot interact with Proxy-based state.

## Consequences

* **Positive:** The core game engine is a pure `(State, Action) → State` function. It can be consumed by the PWA, by unit tests, by a CLI tool, or by an AI agent — all through the same `dispatch()` interface. Action history enables debugging, replay, and future undo/redo support.
* **Negative:** Every new game operation requires defining a new action type, Zod schema, and reducer case. This is intentional ceremony that prevents ad-hoc mutations but adds initial development time.
* **Future Implications:** Building an MCP server is nearly plug-and-play: each action type maps to an MCP tool, Zod schemas convert to JSON Schema via `zod-to-json-schema`, and the `dispatch()` function is the tool handler. This architecture is explicitly designed for that future.
