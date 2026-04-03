---
title: "ADR-002: UI Framework Choice for Scryglass"
status: "Proposed"
date: "2026-04-03"
tags:
  - "frontend"
  - "architecture"
  - "tooling"
---

## Context

* **Problem:** Scryglass is a two-player MTG library management PWA with non-trivial UI state: dual-player zones, modal overlays (Tutor, Scry, Fetch), a mulligan phase, and dynamically rendered card images. We need to decide whether vanilla JavaScript is sufficient or whether a lightweight framework would reduce complexity and bugs.
* **Constraints:** The project must remain a static site deployable to S3 with no server-side rendering. The inherited development philosophy favors "Static Over Dynamic" and "YAGNI." The app must load fast on spotty game-store WiFi.

## Decision

**To be decided by the project maintainer.** The recommended option is **Option 1 (Vanilla JavaScript)**, but the maintainer should evaluate whether the UI complexity warrants a lightweight framework.

## Considered Options

1. **Option 1: Vanilla JavaScript (No Framework, No Build Step) — Recommended**
    * *Pros:* Zero dependencies, zero build step, instant loading, aligns perfectly with the blueprint template's philosophy and existing CI. Simplest deployment story (copy `src/` to S3). Easiest to understand for any contributor.
    * *Cons:* Manual DOM manipulation for complex UI interactions (modals, two-player state switching). Requires disciplined module organization to avoid spaghetti code. No built-in reactivity — state-to-DOM synchronization must be hand-rolled.

2. **Option 2: Preact (3KB) via CDN or ESM Import**
    * *Pros:* Component model reduces DOM manipulation boilerplate. JSX-like syntax via `htm` tagged templates (no build step needed). Tiny footprint. Familiar React-like API.
    * *Cons:* Adds an external dependency. Requires understanding of virtual DOM concepts. `htm` tagged template syntax is less common and may confuse contributors. Still needs a pattern for state management.

3. **Option 3: Lit (5KB) via CDN**
    * *Pros:* Web Components standard — no framework lock-in. Built-in reactivity via reactive properties. Small footprint. Good encapsulation per component.
    * *Cons:* Web Components have quirks (Shadow DOM styling, slotting). Less familiar to most developers than React patterns. Adds an external dependency.

4. **Option 4: Alpine.js (15KB) via CDN**
    * *Pros:* Declarative behavior directly in HTML attributes — minimal JS files. Very easy to learn. No build step.
    * *Cons:* Larger than other options. Not well-suited for complex component hierarchies. "Magic" attributes in HTML can be harder to debug.

## Consequences

* **If Option 1 (Vanilla JS):** The codebase stays dependency-free and build-step-free. Code organization must be deliberate — use ES modules (`type="module"`) to split logic into `state.js`, `ui.js`, `shuffle.js`, etc. State-to-DOM rendering will be explicit function calls rather than reactive bindings.
* **If Option 2–4 (Framework):** A new dependency is introduced. The project gains a component model and reactivity but must document the choice and ensure CDN availability for offline scenarios (or bundle the dependency into `src/`).
* **Future Implications:** This decision affects every subsequent ticket. All UI tickets (two-player zones, modals, mulligan phase) will be built using whatever is chosen here.
