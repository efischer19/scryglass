# Scryglass: Epic Plan — Executive Summary

## Project Overview

**Project Name:** Scryglass
**Platform:** Static Progressive Web App (PWA) hosted on AWS S3
**Target Audience:** Casual Magic: The Gathering (MTG) players

**Core Objective:** A lightweight, client-side web application acting as a "Virtual Shuffler and Library Manager" for physical MTG decks. Scryglass allows two players to use highly collectible, physical decks in paper gameplay without the physical wear of shuffling.

**Scope Boundary:** Scryglass is strictly a **Library Manager**. It handles the initial draw/mulligan logic, but after a card leaves the library (drawn to hand, tutored, milled), the app no longer tracks it. Players track their hands and the board state physically.

## Architecture Decisions

The following ADRs have been proposed as part of this epic and must be accepted before implementation begins:

| ADR | Decision | Status |
| :--- | :--- | :--- |
| [ADR-002](../adr/ADR-002-ui_framework_choice.md) | UI Framework Choice (Vanilla JS vs Lightweight Framework) | Proposed — **requires maintainer decision** |
| [ADR-003](../adr/ADR-003-scryfall_api_integration.md) | Scryfall API Integration & Compliance Strategy | Proposed |
| [ADR-004](../adr/ADR-004-cryptographic_shuffle.md) | Fisher-Yates Shuffle with Web Crypto API | Proposed |
| [ADR-005](../adr/ADR-005-client_state_management.md) | Client-Side State Management — Pure Library Model | Proposed |
| [ADR-006](../adr/ADR-006-deck_import_format.md) | CSV Deck Import Format | Proposed |

> **Action Required:** ADR-002 presents multiple viable options. The maintainer must choose before UI-dependent tickets can begin. All other ADRs have a clear recommended path.

## Epic Breakdown

### Phase 0: Foundation

Scaffolding, core utilities, and data model — no UI yet.

| # | Ticket | Depends On |
| :--- | :--- | :--- |
| 01 | [Project Scaffolding & README](./01-project-scaffolding.md) | — |
| 02 | [CSV Deck Parser](./02-csv-deck-parser.md) | ADR-006 |
| 03 | [Cryptographic Shuffle Engine](./03-cryptographic-shuffle-engine.md) | ADR-004 |

### Phase 1: Core State & Two-Player UI

The fundamental game state model and the two-player interface shell.

| # | Ticket | Depends On |
| :--- | :--- | :--- |
| 04 | [Library State Manager](./04-library-state-manager.md) | ADR-005, Ticket 02, 03 |
| 05 | [Two-Player Pod UI Shell](./05-two-player-pod-ui.md) | ADR-002, Ticket 04 |
| 06 | [CSV Uploader & Default Decks](./06-csv-uploader-and-default-decks.md) | Ticket 02, 05 |

### Phase 2: Mulligan Engine

Handling the start of the game with land-count-based casual mulligan rules.

| # | Ticket | Depends On |
| :--- | :--- | :--- |
| 07 | [Mulligan Phase — Ephemeral Hand](./07-mulligan-ephemeral-hand.md) | Ticket 04, 05 |
| 08 | [Land Counting & Mulligan Validation](./08-land-counting-and-mulligan-validation.md) | Ticket 07 |
| 09 | [Mulligan Execution Flow](./09-mulligan-execution-flow.md) | Ticket 08 |

### Phase 3: In-Game Library Actions

The core gameplay buttons players tap during a game of Magic.

| # | Ticket | Depends On |
| :--- | :--- | :--- |
| 10 | [Draw Next Card](./10-draw-next-card.md) | Ticket 09 |
| 11 | [Fetch Basic Land](./11-fetch-basic-land.md) | Ticket 10 |
| 12 | [Tutor Card](./12-tutor-card.md) | Ticket 10 |
| 13 | [Scry / Look at Top N](./13-scry-look-at-top-n.md) | Ticket 10 |

### Phase 4: Scryfall Integration

Image fetching, caching, and background prefetch for visual card display.

| # | Ticket | Depends On |
| :--- | :--- | :--- |
| 14 | [Rate-Limited Scryfall Fetch Wrapper](./14-rate-limited-scryfall-fetch.md) | ADR-003 |
| 15 | [IndexedDB Image Cache](./15-indexeddb-image-cache.md) | Ticket 14 |
| 16 | [Background Image Prefetch Worker](./16-background-image-prefetch-worker.md) | Ticket 15 |
| 17 | [JIT Priority Fetching](./17-jit-priority-fetching.md) | Ticket 16 |

### Phase 5: PWA & Deployment

Making the app installable, offline-capable, and deployed to S3.

| # | Ticket | Depends On |
| :--- | :--- | :--- |
| 18 | [Web App Manifest](./18-web-app-manifest.md) | Ticket 05 |
| 19 | [Service Worker](./19-service-worker.md) | Ticket 18 |
| 20 | [AWS S3 Deployment Configuration](./20-s3-deployment-config.md) | Ticket 19 |

## Parallelization Notes

Several work streams can proceed in parallel once their dependencies are met:

* **Phase 0** tickets (01–03) are independent of each other.
* **Phase 4** tickets (14–17) can begin in parallel with Phase 2 and Phase 3, since Scryfall integration is decoupled from game logic. Phase 4 integrates with the UI at the end (Ticket 17 wires JIT into Draw/Tutor).
* **Phase 5** tickets can begin once the UI shell exists (Ticket 05).

## Sequencing Diagram

```text
Phase 0:  [01] [02] [03]          (parallel)
              \   |   /
Phase 1:       [04]                (merge point)
              / |  \
Phase 1:  [05] |   |              (UI shell)
            |  |   |
Phase 1:  [06] |   |              (uploader)
            |  |   |
Phase 2:  [07]-[08]-[09]          (sequential)
            |
Phase 3:  [10]                    (draw — gateway to all actions)
          / | \
       [11][12][13]               (parallel actions)

Phase 4:  [14]-[15]-[16]-[17]    (sequential, parallel with Phases 2–3)

Phase 5:  [18]-[19]-[20]         (sequential, parallel with Phase 4)
```
