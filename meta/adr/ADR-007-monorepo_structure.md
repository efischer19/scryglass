---
title: "ADR-007: Monorepo Structure — Core/PWA Package Separation"
status: "Accepted"
date: "2026-04-04"
tags:
  - "architecture"
  - "monorepo"
  - "packaging"
  - "agent-readiness"
---

## Context

* **Problem:** Scryglass needs to be built as a stepping stone, not throwaway code. The v0 deliverable must cleanly separate domain logic (MTG rules, deck state) from the presentation layer (UI, DOM, browser APIs) so that future consumers — including AI agents via MCP, LangChain, or direct tool-calling — can hook into the core game logic without importing browser-specific code.
* **Constraints:** The project must remain deployable as a static PWA to S3. The separation must not introduce excessive build complexity. All packages must be testable independently.

## Decision

We will structure the repository as a **monorepo using npm workspaces** with the following packages:

1. **`packages/core` (`@scryglass/core`):** Contains 100% of the game logic. It knows nothing about browsers, DOM, React, IndexedDB, or AWS S3. It only knows about arrays, numbers, strings, and MTG rules. This includes:
    * Card data model and Zod schemas (ADR-008)
    * CSV deck parser
    * Cryptographic shuffle engine (using platform-agnostic `crypto` — works in both browser and Node.js)
    * Game state reducer and all action types (ADR-005)
    * Mulligan rules engine (land counting, verdict logic)
    * Library manipulation logic (draw, tutor, fetch, scry)

2. **`packages/pwa` (`@scryglass/pwa`):** The frontend application. It imports `@scryglass/core` and handles:
    * All DOM manipulation and UI rendering
    * User interaction (clicks, modals, confirmation gates)
    * Scryfall API integration (rate-limited fetch wrapper, IndexedDB image cache, background prefetch worker, JIT priority)
    * Service worker and PWA manifest
    * Accessibility (a11y) concerns
    * CSS and visual theming

3. **Scryfall integration lives in `@scryglass/pwa`** for v0. The rate-limited fetch wrapper, IndexedDB cache, Web Worker prefetch, and JIT priority queue all depend heavily on browser APIs (`fetch` with CORS, `IndexedDB`, `Worker`). Extracting them to a separate `@scryglass/scryfall` package is premature — the interfaces are not yet stable enough to warrant a third package. If a future AI agent needs card images, it can call Scryfall directly with its own HTTP client.

## Considered Options

1. **Option 1: Two-Package Monorepo — `core` + `pwa` (Chosen)**
    * *Pros:* Clean separation of pure logic from browser concerns. `@scryglass/core` can be imported by any JavaScript/TypeScript consumer (CLI tools, test harnesses, MCP agents, Node.js scripts). Minimal packaging overhead. npm workspaces handle linking automatically.
    * *Cons:* Requires a build step (TypeScript compilation). Monorepo tooling has a learning curve. CI must build/test both packages.

2. **Option 2: Three-Package Monorepo — `core` + `scryfall` + `pwa`**
    * *Pros:* Maximum separation of concerns. Scryfall integration is independently testable and reusable.
    * *Cons:* Premature abstraction — the Scryfall layer is tightly coupled to browser APIs (IndexedDB, Web Workers) and unlikely to be consumed outside the PWA in v0. Adds packaging complexity with little immediate benefit.

3. **Option 3: Single Package with Directory Conventions**
    * *Pros:* No monorepo tooling needed. Simpler build configuration.
    * *Cons:* No enforced boundary between core and browser code. Easy to accidentally import DOM APIs in core logic. Cannot be consumed as a library by external tools or agents.

## Consequences

* **Positive:** `@scryglass/core` becomes a reusable, testable, agent-friendly library. The boundary between "rules" and "presentation" is enforced at the package level, not just by convention. Future MCP/agent integrations can `import { dispatch } from '@scryglass/core'` without pulling in browser dependencies.
* **Negative:** Introduces a build step (TypeScript → JavaScript). Developers must understand npm workspaces. CI must build and test both packages.
* **Future Implications:** If the Scryfall layer stabilizes and an agent needs card images, it can be extracted to `@scryglass/scryfall` in a future ADR. The monorepo structure makes this extraction straightforward.
