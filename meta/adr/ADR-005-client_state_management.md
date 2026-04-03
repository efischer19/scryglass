---
title: "ADR-005: Client-Side State Management — Pure Library Model"
status: "Proposed"
date: "2026-04-03"
tags:
  - "state-management"
  - "architecture"
  - "data-model"
---

## Context

* **Problem:** Scryglass must track the state of two players' card libraries simultaneously. The app needs to support shuffling, drawing, tutoring, scrying, and the mulligan phase. We need to decide how game state is structured and managed in the browser.
* **Constraints:** No server-side state. The app is a static PWA. State must be easy to reason about for contributors. The issue specification explicitly states: "The state manager only tracks the ordered array of the Library. It does not track hand, graveyard, or exile."

## Decision

We will use a **Pure Library State Model** with the following design:

1. **In-Memory State Only:** Game state lives in JavaScript memory as plain objects/arrays. There is no persistence of game state to `localStorage` or `IndexedDB` (the image cache is separate from game state). Refreshing the page resets the game.

2. **State Structure:** The core state is an object containing two player entries, each with:
    * `library`: An ordered array of card objects (the deck). Index 0 = top of library.
    * `phase`: An enum indicating the current game phase (`loading`, `mulligan`, `playing`).
    * `mulliganHand`: A temporary array used only during the mulligan phase, cleared when the game begins.

3. **Cards Leave, Not Move:** When a card is drawn, tutored, or milled, it is removed from the `library` array. The app does not track where it goes. The physical player manages their hand, graveyard, and exile zone.

4. **One Exception — Return to Library:** If a game effect returns a card to the library (e.g., "put on top" or "shuffle into library"), the UI provides a way to add a card back by name and position (top, bottom, or shuffled in).

5. **Render Function Pattern:** A central `render()` function reads the current state and updates the DOM. State changes are followed by a call to `render()`. This is a simple, predictable pattern that avoids framework-level reactivity.

## Considered Options

1. **Option 1: Plain Objects + Render Function (Chosen)**
    * *Pros:* Zero dependencies. Easy to understand, debug, and test. Aligns with vanilla JS approach. State is a plain data structure that can be logged, serialized, or inspected.
    * *Cons:* No automatic DOM updates — every state mutation must be followed by an explicit render call. Risk of forgetting to re-render (mitigated by centralizing state mutations).

2. **Option 2: Proxy-Based Reactivity (e.g., hand-rolled or Vue's `reactive()`)**
    * *Pros:* Automatic re-rendering when state changes. Less boilerplate.
    * *Cons:* Adds complexity. Proxy-based reactivity can be surprising to debug. Overkill for a simple state shape.

3. **Option 3: Redux-Like Store (e.g., Zustand, hand-rolled reducer)**
    * *Pros:* Centralized, predictable state transitions. Actions/reducers pattern is well-known.
    * *Cons:* Adds a dependency or significant boilerplate. The state shape is simple enough that a reducer pattern adds ceremony without proportional benefit.

## Consequences

* **Positive:** The state model is trivially simple. Contributors can understand the entire state by reading one object literal. Testing is straightforward — mutate state, call render, assert DOM.
* **Negative:** Manual render calls after every state change require discipline. No undo/redo or state history out of the box.
* **Future Implications:** If the app grows to need persistence (e.g., resuming a game), the plain state object can be trivially serialized to `localStorage` or `IndexedDB` later.
