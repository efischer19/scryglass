---
title: "ADR-015: URL-Based Match Routing"
status: "Accepted"
date: "2026-07-31"
supersedes: "ADR-009"
tags:
  - "frontend"
  - "routing"
  - "navigation"
  - "matchmaking"
---

## Context

* **Problem:** ADR-009 chose hash-based routing for two local views (`#/input` and `#/app`). Scrymat now needs routes that identify real match sessions so players can create, share, refresh, and re-open remote games via a URL. The router must handle both local sandbox entry and remote match URLs without adding a heavy dependency.
* **Constraints:**
  * The app remains a static PWA, so routing must work with static hosting and browser refreshes.
  * Match URLs should be readable and shareable enough to use as an invite primitive.
  * Navigation still needs browser history, focus management, and accessibility announcements.
  * The implementation should stay lightweight and rely on native browser APIs where possible.

## Decision

We will use a **lightweight History API router** with path-based match routes.

1. **Route structure**
   * `/` is the default landing route for local setup, solo goldfishing, and match creation.
   * `/match/:roomCode` identifies a remote session. Opening that URL resumes the room lobby if the peer connection is not ready yet, or the playmat if the room is already active.
   * Match identity lives in the pathname instead of ephemeral component state so refresh, copy/paste, and reconnection all preserve the intended destination.

2. **Routing implementation**
   * The PWA uses `window.location.pathname`, `history.pushState()`, and the native `popstate` event rather than a third-party router.
   * The existing accessibility expectations from ADR-009 remain: route changes move focus intentionally and announce the new view through an `aria-live` region.
   * Route parsing stays small and explicit because Scrymat still has only a handful of top-level destinations.

3. **Hosting expectation**
   * Static hosting must serve the SPA entry document for `/match/:roomCode` routes so direct visits and refreshes work correctly.
   * This is an acceptable constraint because Scrymat match URLs are a first-class product feature, not a cosmetic improvement.

## Considered Options

1. **Option 1: Native History API with `/match/:roomCode` paths (Chosen)**

    Use clean path-based URLs and a tiny custom router built on browser primitives.

    * *Pros:*
      * Match links are human-readable and easy to share.
      * Refreshing or reopening a route preserves room identity automatically.
      * Keeps dependency count at zero while still supporting browser history and accessibility hooks.
    * *Cons:*
      * Requires SPA fallback behavior from static hosting.
      * Slightly more implementation detail than a single hash fragment toggle.

2. **Option 2: Keep hash-based routing and encode room codes in the fragment**

    Continue using `window.location.hash`, for example `#/match/ABCD1234`.

    * *Pros:*
      * Reuses ADR-009's original hosting assumptions with no rewrite configuration.
      * Still technically supports deep linking.
    * *Cons:*
      * Hash routes make shared invite URLs feel like an implementation detail instead of a first-class match address.
      * Match handling becomes harder to integrate cleanly with browser navigation and future pathname-based features.
      * Continuing ADR-009 would optimize for the old two-view shuffler instead of the new multiplayer product.

3. **Option 3: Query-string routing only**

    Put room identity in a parameter such as `/?match=ABCD1234` and keep one visual route.

    * *Pros:*
      * Simple parser and minimal router surface.
      * Works for lightweight invite flows.
    * *Cons:*
      * Conflates routing, filtering, and session identity in one URL shape.
      * Harder to evolve into additional route families later.
      * Less expressive and less readable than a dedicated match path.

## Consequences

* **Positive:** Scrymat gets clean, shareable match URLs that survive refreshes and naturally pair with stateless signaling room codes. The router stays dependency-free and accessible.
* **Negative:** Deployments must guarantee SPA fallback behavior for path-based routes. Contributors need to account for route parsing and direct-entry behavior in tests.
* **Future Implications:** Additional top-level routes such as `/settings` or `/replay/:id` can be added without abandoning the native router approach. This ADR formally retires ADR-009's hash-fragment model as the primary navigation strategy.
