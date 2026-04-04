---
title: "ADR-002: UI Framework Choice for Scryglass PWA"
status: "Proposed"
date: "2026-04-03"
tags:
  - "frontend"
  - "architecture"
  - "tooling"
---

## Context

* **Problem:** The `@scryglass/pwa` package (see [ADR-007](./ADR-007-monorepo_structure.md)) needs a UI layer to render the two-player pod, modals (Tutor, Scry, Fetch), the mulligan phase, and card images. Since the project now uses TypeScript with a build step (see [ADR-008](./ADR-008-typescript_and_zod.md)), the original "no build step" constraint is removed, opening up bundled framework options.
* **Constraints:** The PWA must deploy as static files to S3. It must load fast on spotty game-store WiFi. All game logic lives in `@scryglass/core` — the UI layer only dispatches actions and renders state. Accessibility (a11y) must be a first-class concern from the start.

## Decision

We will use **Preact + Vite** (Option 1) for the `@scryglass/pwa` frontend application. The maintainer confirmed this choice — a build step is already required for TypeScript, and Preact's 3KB footprint with React-compatible API provides the best balance of developer experience and production performance.

## Considered Options

1. **Option 1: Preact + Vite — Recommended**
    * *Pros:* 3KB framework with a React-compatible API. Vite already handles TypeScript and provides fast HMR for development. JSX support is native with the build step. Component model simplifies the two-player UI (each player zone is a component). Large ecosystem of a11y tooling (`preact-testing-library`, `vitest`, `@axe-core/cli`). Tiny production bundle.
    * *Cons:* Adds a framework dependency. Contributors must understand JSX/component patterns.

2. **Option 2: Vanilla TypeScript (No Framework)**
    * *Pros:* Zero framework dependencies. Maximum control over DOM. No framework learning curve.
    * *Cons:* Manual DOM manipulation for complex UI interactions (modals, two-player state switching, confirmation gates). Requires hand-rolling a component-like abstraction to avoid spaghetti code. Accessibility testing requires more manual setup.

3. **Option 3: Lit (Web Components)**
    * *Pros:* Web Components standard — no framework lock-in. Built-in reactivity via reactive properties. Good encapsulation.
    * *Cons:* Shadow DOM complicates global CSS theming and a11y testing. Less familiar to most developers than React/Preact patterns. Smaller ecosystem for testing utilities.

4. **Option 4: React (via Vite)**
    * *Pros:* Largest ecosystem. Most contributors are familiar with it. Excellent a11y tooling.
    * *Cons:* ~40KB framework size (vs 3KB for Preact). Overkill for this application's complexity. Heavier bundle hurts game-store WiFi loading.

## Consequences

* **If Option 1 (Preact + Vite):** The PWA gets a component model, JSX, and a mature testing story. Vite handles TypeScript, bundling, and dev server. The build output is static files deployable to S3. `@scryglass/core` is imported as a workspace dependency.
* **If Option 2 (Vanilla TS):** No framework overhead, but significantly more boilerplate for UI interactions. DOM testing requires `jsdom` or `happy-dom` with manual setup.
* **Future Implications:** This decision only affects `@scryglass/pwa`. The `@scryglass/core` package is framework-agnostic regardless of this choice.
