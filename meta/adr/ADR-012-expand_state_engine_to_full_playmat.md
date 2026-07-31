---
title: "ADR-012: Expand State Engine to Full Playmat"
status: "Accepted"
date: "2026-07-31"
supersedes: "ADR-005"
tags:
  - "state-management"
  - "architecture"
  - "gameplay"
  - "p2p"
---

## Context

* **Problem:** ADR-005 defined a reducer that only tracks ordered libraries plus a handful of setup-era actions (`DRAW_CARD`, `TUTOR_CARD`, `SCRY_RESOLVE`, `MULLIGAN`). The Scrymat pivot replaces that narrow shuffler with a synchronized virtual playmat where players move cards between private and public zones for the entire game. We need a state engine that can represent the full table without hard-coding Magic rules.
* **Constraints:**
  * The `@scryglass/core` package must remain platform-agnostic, pure, and JSON-serializable so the same reducer can drive the PWA, local tooling, and future AI agents.
  * The product philosophy is the "Dumb Table": no enforced turn structure, no stack resolution logic, and no state-based action engine. Players must be able to perform take-backs, house rules, and edge-case board rewinds manually.
  * Local solo play, pass-and-play, and remote matches must share the same underlying state model. Networking and hidden-information obfuscation are adapters around the reducer, not responsibilities of the reducer itself.
  * Hidden zones must be representable in a way that later ADRs can obfuscate for remote peers while still allowing the owning player to see real card data locally.

## Decision

We will keep the Action/Reducer architecture from ADR-005, but expand it into a **full playmat state engine** built around generic zones and generic card mutations instead of rules-specific gameplay actions.

1. **The state model becomes zone-oriented, not library-only.**
   * Each match stores the full table state for both players, including private zones (library, hand) and public zones (battlefield, graveyard, exile, command, stack, and other shared table surfaces as needed).
   * Cards are tracked as stable game objects with an instance ID plus metadata such as owner, controller, current zone, ordering/position, tapped state, face-up/face-down visibility, and lightweight annotations like counters or labels.

2. **Generic playmat actions replace most game-specific verbs after setup.**
   * The reducer keeps a small "smart dealer" setup layer for actions like `LOAD_DECK`, deterministic `SHUFFLE_ZONE`, opening-hand flow, and mulligan support.
   * Once the match enters sandbox play, the primary mutations are generic actions such as `MOVE_CARD`, `UPDATE_CARD_STATE`, `CREATE_OBJECT`, `DELETE_OBJECT`, and `REORDER_ZONE`.
   * These actions describe physical table movements, not rules outcomes. The engine records what changed; players remain responsible for whether the move was legal in Magic.

3. **Hidden information is part of the state contract.**
   * Card objects in hidden zones carry enough structure for the local owner to render the real card and for remote transports to substitute opaque commitments or card backs.
   * Visibility is explicit state, not an inferred UI detail, so the same reducer can support local peek/hide flows and remote commit-reveal flows consistently.

4. **The reducer stays pure and transport-agnostic.**
   * `dispatch(state, action)` remains the single mutation boundary.
   * All actions continue to be validated with Zod schemas at the reducer boundary.
   * WebRTC broadcasting, timestamping, commit-reveal hashing, and reconnection snapshots are implemented outside the reducer as middleware/adapters.

## Considered Options

1. **Option 1: Expand the reducer into a generic full-playmat engine (Chosen)**

    Keep the pure reducer pattern, but widen the state shape and action taxonomy so it models a whole tabletop instead of only libraries.

    * *Pros:*
      * Preserves the best property of ADR-005: one deterministic JSON-in/JSON-out core for UI, tests, AI agents, and future transports.
      * Aligns directly with the "Dumb Table" philosophy by modeling physical card manipulation instead of encoded rules logic.
      * Makes local and remote play share one source of truth, reducing branching behavior between modes.
    * *Cons:*
      * More state surface area than the original library-only engine.
      * Requires migrating existing action names and tests away from rules-specific verbs over time.

2. **Option 2: Keep ADR-005 mostly intact and bolt on many new Magic-specific actions**

    Continue adding verbs like `DRAW_CARD`, `CAST_SPELL`, `RESOLVE_TRIGGER`, and `RETURN_TO_HAND` as first-class reducer cases.

    * *Pros:*
      * Familiar continuation of the current API.
      * Some common interactions could be optimized as one-step actions.
    * *Cons:*
      * Recreates the rules-engine trap the Scrymat pivot explicitly rejects.
      * Endless card- and format-specific exceptions would accumulate quickly.
      * Harder for users and AI agents to reason about than a few generic movement/state primitives.

3. **Option 3: Build a full authoritative rules engine**

    Encode turn phases, targeting, legality, and stack resolution directly into the core state machine.

    * *Pros:*
      * Could theoretically prevent illegal moves automatically.
      * Might support competitive or tournament-style enforcement in the future.
    * *Cons:*
      * Directly conflicts with the project's simplicity and "Dumb Table" philosophy.
      * Massive implementation and maintenance burden for little value in casual trust-based play.
      * Makes local edge-case rewinds and custom rules substantially harder.

## Consequences

* **Positive:** Scrymat gets one coherent state model for local goldfishing, pass-and-play, remote shared-state matches, and AI agents. The reducer remains easy to test because every mutation is still a pure action application. Users gain a flexible sandbox instead of a brittle rules engine.
* **Negative:** The UI must present more generic controls and clearer state affordances because the engine intentionally stops short of validating game legality. Contributors must think in terms of zones and object state rather than convenience verbs like "draw" or "tutor."
* **Future Implications:** Existing ADR-005 consumers should migrate to the new generic action vocabulary. Later networking and cryptography ADRs can wrap this state engine cleanly because visibility, stable object IDs, and transport-agnostic actions are now first-class parts of the contract.
