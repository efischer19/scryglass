# Epic: End-to-End Testing for Scryglass

## Overview

This epic implements automated end-to-end (E2E) testing for the Scryglass PWA, as described in [ADR-011](../../adr/ADR-011-e2e_testing_strategy.md) and the [E2E testing strategy](../e2e-testing-strategy.md).

Scryglass is the "source of truth" for physical Magic: The Gathering games. A bug that only manifests during a full game flow — such as state corruption after a shuffle → tutor → scry sequence — could silently undermine gameplay integrity. While unit tests cover `@scryglass/core` and component tests cover `@scryglass/pwa`, no tests currently simulate a complete multi-turn game from the user's perspective.

## Goal

Simulate a complete 2-player initial draw/mulligan and ~10 turns of gameplay using the `good.txt` (Fellowship) and `evil.txt` (Sauron) sample decks, automated to run on every push to `main`.

## Ticket Sequence

The following tickets should be implemented in order. Each builds on the prior ticket's output.

| # | Ticket | Summary |
| :--- | :----- | :------ |
| 01 | [Playwright Setup](./01-playwright-setup.md) | Install Playwright, create config and directory structure, write a smoke test |
| 02 | [Deck Load E2E](./02-deck-load-e2e.md) | Set up test fixtures, load both decks via DeckInput |
| 03 | [Mulligan Phase E2E](./03-mulligan-phase-e2e.md) | Verify opening hands, mulligan flow, and keep-hand transitions |
| 04 | [Draw Action E2E](./04-draw-action-e2e.md) | Verify draw card mechanics for both players |
| 05 | [Scry Action E2E](./05-scry-action-e2e.md) | Verify scry peek, top/bottom card placement |
| 06 | [Tutor Action E2E](./06-tutor-action-e2e.md) | Verify tutor search, card removal, and library shuffle |
| 07 | [Fetch Land & Return E2E](./07-fetch-and-return-e2e.md) | Verify fetch basic land and return-to-library actions |
| 08 | [State Integrity Assertions](./08-state-integrity-assertions.md) | Card conservation, no duplicates, immutability, cross-player isolation |
| 09 | [Game Log Output](./09-game-log-output.md) | Structured JSON game log generation |
| 10 | [Visual Regression Screenshots](./10-visual-regression-screenshots.md) | Capture Playwright screenshots at key game moments |
| 11 | [CI Integration](./11-ci-integration.md) | Add E2E job to GitHub Actions, upload artifacts |
| 12 | [Full Game Simulation](./12-full-game-simulation.md) | Orchestrate complete 10-turn 2-player game simulation |

## Relevant ADRs

- [ADR-011: End-to-End Testing Strategy](../../adr/ADR-011-e2e_testing_strategy.md) — Decision to use Playwright (Accepted)
- [ADR-002: UI Framework Choice](../../adr/ADR-002-ui_framework_choice.md) — Preact + Vite stack that E2E tests run against
- [ADR-005: Action/Reducer State Management](../../adr/ADR-005-client_state_management.md) — Pure reducer enables deterministic assertions
- [ADR-007: Monorepo Structure](../../adr/ADR-007-monorepo_structure.md) — E2E tests live in `packages/pwa`

## Success Criteria

After all tickets are complete:

- [ ] Full 2-player game simulation passes on every push to `main`
- [ ] Screenshots are captured and uploaded as CI artifacts
- [ ] Game log JSON is produced and reviewable
- [ ] Total CI time increase is <60 seconds
- [ ] No flaky tests — the shuffle is seeded for E2E tests to ensure determinism
