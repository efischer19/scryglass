# Epic: Deck Input Functionality

## Overview

Scryglass's shuffling system assumes a parsed deck is already loaded. Without a
frictionless path for users to enter their decklists, the app will never see
real use. This epic delivers every component needed for deck input — from raw
text entry in scryglass format, to one-click imports from popular external
tools, to local persistence and round-trip export.

## Goals

1. **Deck input page** — a dedicated page (or view) where users can enter,
   import, and edit decklists before loading them into the shuffler.
2. **Multi-format import** — support the three most popular community formats
   (MTGO/Arena, Moxfield CSV, Archidekt text) in addition to native scryglass
   format.
3. **Hybrid editing** — when an import is incomplete (e.g., missing `card_type`
   mappings), open the deck editor in "update" mode so the user can finish
   filling it out.
4. **Local persistence** — save and load decklists in the browser so users
   don't have to re-enter them every session.
5. **Example decklists** — ship reference decks (`deck_A`, `deck_B`) and use
   them for automated regression testing of all import/export paths.

## Ticket Sequence

The tickets below are ordered so that each builds on the previous work. Items
marked with ↕ can be parallelized with their neighbors.

| # | Ticket | Depends On | Notes |
| --- | --- | --- | --- |
| 01 | [ADR: Client-Side Routing](./01-adr-client-side-routing.md) | — | Architectural prerequisite |
| 02 | [ADR: Local Storage Strategy](./02-adr-local-storage-strategy.md) | — | Architectural prerequisite |
| 03 | [Example Decklists](./03-example-decklists.md) | — | Test fixtures for regression suite |
| 04 | [Deck Input Page](./04-deck-input-page.md) | 01 | Core UI for entering decks |
| 05 | [MTGO/Arena Converter](./05-convert-mtgo-arena.md) | — ↕ | Can parallel with 06, 07 |
| 06 | [Moxfield Converter](./06-convert-moxfield.md) | — ↕ | Can parallel with 05, 07 |
| 07 | [Archidekt Converter](./07-convert-archidekt.md) | — ↕ | Can parallel with 05, 06 |
| 08 | [Deck Editor UI](./08-deck-editor-ui.md) | 04 | "Update mode" for incomplete imports |
| 09 | [Local Storage Save/Load](./09-local-storage-save-load.md) | 02, 04 | Persistence layer |
| 10 | [Export to Common Formats](./10-export-formats.md) | 05, 06, 07 | Reverse of converters |
| 11 | [Import/Export Regression Tests](./11-regression-tests.md) | 03, 05–07, 10 | Automated round-trip validation |

## Relevant ADRs

| ADR | Relevance |
| --- | --- |
| [ADR-002](../../adr/ADR-002-ui_framework_choice.md) | Preact + Vite governs how the input page is built |
| [ADR-003](../../adr/ADR-003-scryfall_api_integration.md) | Rate-limit compliance for converters that fall back to Scryfall |
| [ADR-005](../../adr/ADR-005-client_state_management.md) | `LOAD_DECK` action is the hand-off from input to game engine |
| [ADR-006](../../adr/ADR-006-deck_import_format.md) | Canonical scryglass format that all converters target |
| [ADR-007](../../adr/ADR-007-monorepo_structure.md) | Converters live in `@scryglass/core`; UI lives in `@scryglass/pwa` |
| [ADR-008](../../adr/ADR-008-typescript_and_zod.md) | TypeScript + Zod validation for all schemas and parsers |

## Relationship to Existing Plans

Three converter plans already exist under `meta/plans/`:

- `convert-mtgo-arena-format.md`
- `convert-moxfield-format.md`
- `convert-archidekt-format.md`

Tickets 05–07 in this epic incorporate and extend those plans. The originals
should be considered superseded by the corresponding epic tickets once work
begins.

## Out of Scope

- Server-side deck storage or user accounts (scryglass is a static PWA)
- Sideboard or wishlist management (future epic)
- Scryfall image prefetching during import (handled by existing ADR-003 caching
  strategy)
- Deck validation against format legality (e.g., Standard, Commander deck size)
