---
title: "ADR-009: Client-Side Routing Strategy"
status: "Proposed"
date: "2026-04-05"
tags:
  - "frontend"
  - "architecture"
  - "navigation"
  - "accessibility"
---

## Context

* **Problem:** Scryglass requires at least two distinct views: a **deck input page** (where users paste or upload their deck list) and a **main shuffler page** (where gameplay actions like draw, tutor, scry, and mulligan occur). The application needs a strategy for navigating between these views that supports deep-linking, browser history (back button), and screen-reader accessibility.
* **Constraints:**
  * The PWA is deployed as static files to S3 ([ADR-007](./ADR-007-monorepo_structure.md)), which has **no server-side rewrite rules**. Any routing strategy that requires `index.html` to be served for arbitrary paths (e.g., `/app`, `/input`) would need S3-specific redirect rules or a CloudFront function — complexity we want to avoid.
  * The UI is built with Preact + Vite ([ADR-002](./ADR-002-ui_framework_choice.md)). The routing solution must integrate cleanly with Preact's component model and Vite's build pipeline.
  * All game state mutations flow through `dispatch(state, action)` in `@scryglass/core` ([ADR-005](./ADR-005-client_state_management.md)). The `LOAD_DECK` action is the trigger that transitions the application from the input view to the shuffler view.
  * The development philosophy ([DEVELOPMENT_PHILOSOPHY.md](../DEVELOPMENT_PHILOSOPHY.md)) mandates simplicity, YAGNI, and a static-first approach.

## Decision

We will use **hash-based routing** (Option 1) with `window.location.hash` and the native `hashchange` event to navigate between views. The two routes are:

* `#/input` — the deck input page (default when no hash is present)
* `#/app` — the main shuffler page (active after a successful `LOAD_DECK` action)

A lightweight `<Router>` Preact component will read `window.location.hash`, render the matching view, and manage focus and `aria-live` announcements on navigation.

### View transition on `LOAD_DECK`

When the user submits a valid deck list:

1. The input view dispatches the `LOAD_DECK` action to `@scryglass/core`.
2. If the action succeeds (returns a new `GameState` with the loaded deck), the PWA sets `window.location.hash = '#/app'`.
3. The `hashchange` listener triggers a re-render, swapping the input view for the shuffler view.
4. Focus is programmatically moved to the shuffler view's main heading or primary interactive element.
5. An `aria-live="polite"` region announces the navigation (e.g., "Deck loaded — shuffler view").

If the `LOAD_DECK` action fails (invalid deck data), the hash does not change and the input view displays the validation errors inline.

## Considered Options

1. **Option 1: Hash-Based Routing with `window.location.hash` (Chosen)**

    The application uses URL fragments (`#/input`, `#/app`) to represent views. A small custom Preact component listens for `hashchange` events and conditionally renders the correct view. No external dependencies are required.

    * *Pros:*
      * **Zero dependencies** — uses only native browser APIs (`window.location.hash`, `hashchange` event), fully aligned with YAGNI and the simplicity principle.
      * **S3-compatible out of the box** — hash fragments are never sent to the server, so S3 serves the same `index.html` for all routes with no redirect configuration.
      * **Deep-linking and shareable URLs** — users can bookmark or share `#/input` and `#/app` links. The browser back button works natively because `hashchange` creates history entries.
      * **Minimal implementation** — the entire router can be implemented in under 50 lines of Preact code, making it easy to understand, maintain, and test.
      * **Accessible with intent** — focus management and `aria-live` announcements can be implemented directly in the router component without fighting a library's abstraction.
    * *Cons:*
      * Hash URLs (`example.com/#/app`) look less clean than path-based URLs (`example.com/app`), though this is cosmetic for a PWA that users primarily interact with full-screen.
      * If the application grows to many routes in the future, managing them manually becomes more tedious (mitigated by the fact that scryglass has only two views for the foreseeable future).

2. **Option 2: Lightweight Client-Side Router Library (`preact-router`)**

    Use the `preact-router` package (~1.5 KB gzipped) which provides declarative route matching, path-based URLs, and integration with Preact's component lifecycle.

    * *Pros:*
      * Clean path-based URLs (`/input`, `/app`) without hash fragments.
      * Declarative route definitions in JSX — familiar pattern for React/Preact developers.
      * Handles route matching, parameter extraction, and programmatic navigation out of the box.
    * *Cons:*
      * **Requires S3 redirect rules or a CloudFront function** to serve `index.html` for all paths. Without this, navigating directly to `example.com/app` returns a 404 from S3. This directly conflicts with our static-first hosting constraint.
      * **Adds a dependency** where native browser APIs suffice. The application has exactly two routes — a library designed for complex routing trees is overkill.
      * Accessibility (focus management, `aria-live`) still must be implemented manually on top of the library; `preact-router` does not provide this automatically.
      * Violates YAGNI — the routing features we would use (two static routes, no parameters, no nested routes) do not justify the dependency.

3. **Option 3: Tab/Panel UI Within a Single Page (No Routing)**

    Both the input view and shuffler view are rendered as panels or tabs within a single page. A state variable controls which panel is visible. No URL changes occur.

    * *Pros:*
      * Simplest implementation — a single boolean state toggle (`showShuffler`) controls visibility.
      * No routing code, no URL management, no `hashchange` listeners.
      * The `aria-tablist`/`aria-tabpanel` pattern is well-understood for accessibility.
    * *Cons:*
      * **No deep-linking** — users cannot bookmark or share a link directly to the shuffler view. Refreshing the page always returns to the input view, which is disruptive during gameplay.
      * **No browser history** — the back button does not navigate between views, violating standard web application expectations.
      * Both views exist in the DOM simultaneously (even if hidden), increasing memory usage and complicating lifecycle management.
      * Does not satisfy the issue's stated preference for separate paths (`scryglass/app` and `scryglass/input`).

## Consequences

* **Positive:** The routing implementation is fully self-contained with zero external dependencies. It works on S3 without any hosting configuration. URLs are deep-linkable and bookmarkable. The browser back button behaves as users expect. The implementation is small enough to be fully covered by unit tests. Focus management and screen-reader announcements are first-class concerns built directly into the router.
* **Negative:** Hash-based URLs are slightly less aesthetically clean than path-based URLs. If the application ever needs more than a handful of routes, we may reconsider adopting a router library — but for two routes, the custom solution is far simpler.
* **Future Implications:** If a future requirement adds more views (e.g., a settings page, a deck history page), we can either extend the hash-based router or replace it with `preact-router` via a new ADR that supersedes this one. The `<Router>` component provides a clean abstraction boundary that makes swapping the routing mechanism straightforward.
