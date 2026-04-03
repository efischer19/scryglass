# Scryglass: Epic Plan — Executive Summary

## Project Overview

**Project Name:** Scryglass
**Platform:** Static Progressive Web App (PWA) hosted on AWS S3
**Target Audience:** Casual Magic: The Gathering (MTG) players

**Core Objective:** A lightweight, client-side web application acting as a "Virtual Shuffler and Library Manager" for physical MTG decks. Scryglass allows two players to use highly collectible, physical decks in paper gameplay without the physical wear of shuffling.

**Scope Boundary:** Scryglass is strictly a **Library Manager**. It handles the initial draw/mulligan logic, but after a card leaves the library (drawn to hand, tutored, milled), the app no longer tracks it. Players track their hands and the board state physically.

**Architecture Strategy:** The v0 deliverable is designed as a stepping stone, not throwaway code. Domain logic is decoupled from the presentation layer via a monorepo with a pure `@scryglass/core` library that future AI agents (via MCP, LangChain, or direct tool-calling) can seamlessly hook into.

## Architecture Decisions

The following ADRs have been proposed as part of this epic and must be accepted before implementation begins:

| ADR | Decision | Status |
| :--- | :--- | :--- |
| [ADR-002](../adr/ADR-002-ui_framework_choice.md) | UI Framework Choice for PWA (Preact + Vite recommended) | Proposed — **requires maintainer decision** |
| [ADR-003](../adr/ADR-003-scryfall_api_integration.md) | Scryfall API Integration & Compliance Strategy | Proposed |
| [ADR-004](../adr/ADR-004-cryptographic_shuffle.md) | Fisher-Yates Shuffle with Crypto API | Proposed |
| [ADR-005](../adr/ADR-005-client_state_management.md) | Action/Reducer State Management — Agent-Ready Game Engine | Proposed |
| [ADR-006](../adr/ADR-006-deck_import_format.md) | CSV Deck Import Format | Proposed |
| [ADR-007](../adr/ADR-007-monorepo_structure.md) | Monorepo Structure — Core/PWA Package Separation | Proposed |
| [ADR-008](../adr/ADR-008-typescript_and_zod.md) | TypeScript & Zod for Strict Typing and Agent-Ready Schemas | Proposed |

> **Action Required:** ADR-002 presents multiple viable options for the PWA UI framework. The maintainer must choose before UI-dependent tickets can begin. All other ADRs have a clear recommended path.

## Monorepo Package Map

```text
scryglass/
├── packages/
│   ├── core/                        @scryglass/core
│   │   ├── src/
│   │   │   ├── schemas/             Zod schemas (Card, GameState, Action, etc.)
│   │   │   ├── csv-parser.ts        CSV deck parser
│   │   │   ├── shuffle.ts           Fisher-Yates + crypto
│   │   │   ├── reducer.ts           dispatch(state, action) → state
│   │   │   ├── mulligan.ts          Land counting, mulligan verdict logic
│   │   │   └── index.ts             Public API barrel export
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── pwa/                         @scryglass/pwa
│       ├── src/
│       │   ├── components/           UI components (player zones, modals, etc.)
│       │   ├── scryfall/             Rate limiter, IndexedDB cache, prefetch worker
│       │   ├── sw.ts                 Service worker
│       │   └── main.ts              App entry point
│       ├── public/
│       │   ├── manifest.json
│       │   └── assets/
│       ├── tests/
│       ├── package.json
│       └── tsconfig.json
├── package.json                     Workspace root
└── meta/                            ADRs, plans, docs
```

## Epic Breakdown

### Phase 0: Foundation

Monorepo scaffolding, core utilities, and data model — no UI yet.

| # | Ticket | Package | Depends On |
| :--- | :--- | :--- | :--- |
| 01 | [Project Scaffolding & Monorepo Setup](./01-project-scaffolding.md) | root | ADR-007, ADR-008 |
| 02 | [CSV Deck Parser](./02-csv-deck-parser.md) | `core` | ADR-006, Ticket 01 |
| 03 | [Cryptographic Shuffle Engine](./03-cryptographic-shuffle-engine.md) | `core` | ADR-004, Ticket 01 |

### Phase 1: Core State & Two-Player UI

The action/reducer game engine and the two-player interface shell.

| # | Ticket | Package | Depends On |
| :--- | :--- | :--- | :--- |
| 04 | [Action/Reducer Game Engine](./04-library-state-manager.md) | `core` | ADR-005, Ticket 02, 03 |
| 05 | [Two-Player Pod UI Shell](./05-two-player-pod-ui.md) | `pwa` | ADR-002, Ticket 04 |
| 06 | [CSV Uploader & Default Decks](./06-csv-uploader-and-default-decks.md) | `pwa` + `core` | Ticket 02, 05 |

### Phase 2: Mulligan Engine

Handling the start of the game with land-count-based casual mulligan rules.

| # | Ticket | Package | Depends On |
| :--- | :--- | :--- | :--- |
| 07 | [Mulligan Core Logic](./07-mulligan-ephemeral-hand.md) | `core` | Ticket 04 |
| 08 | [Land Counting & Mulligan Validation](./08-land-counting-and-mulligan-validation.md) | `core` | Ticket 07 |
| 09 | [Mulligan UI & Execution Flow](./09-mulligan-execution-flow.md) | `pwa` | Ticket 05, 08 |

### Phase 3: In-Game Library Actions

The core gameplay actions and their corresponding UI.

| # | Ticket | Package | Depends On |
| :--- | :--- | :--- | :--- |
| 10 | [Draw Next Card](./10-draw-next-card.md) | `core` + `pwa` | Ticket 09 |
| 11 | [Fetch Basic Land](./11-fetch-basic-land.md) | `core` + `pwa` | Ticket 10 |
| 12 | [Tutor Card](./12-tutor-card.md) | `core` + `pwa` | Ticket 10 |
| 13 | [Scry / Look at Top N](./13-scry-look-at-top-n.md) | `core` + `pwa` | Ticket 10 |

### Phase 4: Scryfall Integration

Image fetching, caching, and background prefetch for visual card display.

| # | Ticket | Package | Depends On |
| :--- | :--- | :--- | :--- |
| 14 | [Rate-Limited Scryfall Fetch Wrapper](./14-rate-limited-scryfall-fetch.md) | `pwa` | ADR-003 |
| 15 | [IndexedDB Image Cache](./15-indexeddb-image-cache.md) | `pwa` | Ticket 14 |
| 16 | [Background Image Prefetch Worker](./16-background-image-prefetch-worker.md) | `pwa` | Ticket 15 |
| 17 | [JIT Priority Fetching](./17-jit-priority-fetching.md) | `pwa` | Ticket 16 |

### Phase 5: PWA & Deployment

Making the app installable, offline-capable, and deployed to S3.

| # | Ticket | Package | Depends On |
| :--- | :--- | :--- | :--- |
| 18 | [Web App Manifest](./18-web-app-manifest.md) | `pwa` | Ticket 05 |
| 19 | [Service Worker](./19-service-worker.md) | `pwa` | Ticket 18 |
| 20 | [AWS S3 Deployment Configuration](./20-s3-deployment-config.md) | `pwa` (build output) | Ticket 19 |

## Parallelization Notes

Several work streams can proceed in parallel once their dependencies are met:

* **Phase 0** tickets (01–03) — Ticket 01 first (scaffolding), then 02 and 03 in parallel.
* **Phase 4** tickets (14–17) can begin in parallel with Phase 2 and Phase 3, since Scryfall integration is decoupled from game logic.
* **Phase 5** tickets can begin once the UI shell exists (Ticket 05).
* **Core and PWA tracks** within Phases 2–3 can be partially parallelized: core logic can be completed and tested before the PWA UI is wired up.

## Sequencing Diagram

```text
Phase 0:  [01]                       (monorepo scaffolding — FIRST)
           |  \
          [02] [03]                  (parallel: CSV parser, shuffle engine)
              \   /
Phase 1:     [04]                    (action/reducer game engine)
            / |  \
Phase 1: [05] |   |                  (PWA UI shell)
           |  |   |
Phase 1: [06] |   |                  (uploader: pwa + core)
           |  |   |
Phase 2: [07]-[08]                   (core mulligan logic)
           |       \
Phase 2: [09]                        (PWA mulligan UI)
           |
Phase 3: [10]                        (draw — gateway to all actions)
         / | \
      [11][12][13]                   (parallel actions: core + pwa)

Phase 4: [14]-[15]-[16]-[17]        (sequential, parallel with Phases 2–3)

Phase 5: [18]-[19]-[20]             (sequential, parallel with Phase 4)
```
