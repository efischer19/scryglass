---
title: "ADR-011: End-to-End Testing Strategy"
status: "Accepted"
date: "2026-04-05"
tags:
  - "testing"
  - "ci-cd"
  - "quality"
---

## Context

* **Problem:** Scryglass currently has strong unit test coverage for `@scryglass/core` (shuffle, mulligan, reducer, import/export) and component-level tests for `@scryglass/pwa`, but lacks end-to-end (E2E) tests that simulate a complete multi-turn game between two players. Since the app is the "source of truth" for physical, high-value Magic: The Gathering games, a bug that only manifests during a full game flow (e.g., a state corruption after a shuffle → tutor → scry sequence) could silently undermine gameplay integrity.
* **Constraints:** The app is a static PWA with no backend. E2E tests must run against the built PWA in a headless browser. Tests must complete in a reasonable time (<60s) to run on every push to `main`. The test framework must integrate with the existing GitHub Actions CI pipeline.

## Decision

We will implement **automated end-to-end game simulation tests** using Playwright, running a headless Chromium browser against the production build of the PWA.

Key design:

1. **Game Simulation Script:** A Playwright test that loads two decks (the `good.txt` and `evil.txt` sample decks), completes the mulligan phase for both players, and plays ~10 turns of draw/scry/tutor/fetch actions. The test validates card counts, zone integrity, and state consistency after each action.

2. **Visual Regression Screenshots:** At key game moments (opening hand, first draw, scry decision, tutor search, fetch land), capture Playwright screenshots for visual regression comparison and human review.

3. **CI Integration:** The E2E test suite runs as a separate GitHub Actions job after the build step, on every push to `main` and on PRs targeting `main`.

4. **Game Log Output:** Each simulated game produces a structured JSON log of all dispatched actions and resulting state snapshots, saved as a CI artifact for debugging.

## Considered Options

1. **Option 1: Playwright E2E Tests (Chosen)**
    * *Pros:* Cross-browser support. Native screenshot capabilities. Runs headless in CI. Active community. Can test PWA features (service worker, offline mode).
    * *Cons:* Heavier than unit tests. Requires a build step before tests run. Slower execution (~30-60s per test).

2. **Option 2: Cypress**
    * *Pros:* Developer-friendly. Good debugging UX. Time-travel debugging.
    * *Cons:* Historically weak on cross-browser support. Larger dependency. Less suitable for PWA-specific testing (service workers).

3. **Option 3: Expand Unit Tests Only**
    * *Pros:* Fast. No new tooling. Already familiar.
    * *Cons:* Cannot catch integration bugs between core logic and UI. Cannot verify visual rendering. Cannot test PWA lifecycle (install, offline).

## Consequences

* **Positive:** High confidence that the full game flow works correctly from the user's perspective. Visual screenshots provide a human-reviewable audit trail. CI catches regressions before they reach `main`.
* **Negative:** Adds a new dependency (Playwright). CI time increases by ~60s. Screenshots need storage (GitHub Actions artifacts).
* **Future Implications:** The E2E test framework can be extended to test PWA install flow, offline gameplay, and service worker updates. Game logs can be used by future AI agents to validate their understanding of the game engine.
