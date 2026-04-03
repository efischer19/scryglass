---
title: "ADR-003: Scryfall API Integration & Compliance Strategy"
status: "Proposed"
date: "2026-04-03"
tags:
  - "api"
  - "scryfall"
  - "ethics"
  - "caching"
---

## Context

* **Problem:** Scryglass needs to display card images sourced from the Scryfall API. Scryfall is a free community resource with published [API guidelines](https://scryfall.com/docs/api) that require respectful usage: a maximum of 10 requests per second, a descriptive `User-Agent`, and aggressive caching. Our ROBOT_ETHICS.md policy also mandates rate limiting, caching, and ToS compliance. We need a formal strategy for how the app interacts with Scryfall.
* **Constraints:** The app is purely client-side (no backend proxy). All API calls originate from the user's browser. We must never overload Scryfall's servers, even if many users run the app simultaneously. Per [ADR-007](./ADR-007-monorepo_structure.md), Scryfall integration lives in `@scryglass/pwa` (not `@scryglass/core`) because it depends on browser APIs (IndexedDB, Web Workers, `fetch` with CORS).

## Decision

We will implement a **three-tier Scryfall integration strategy**:

1. **Rate-Limited Fetch Wrapper:** A single, shared fetch function that enforces a minimum 100ms delay between consecutive API requests (well within Scryfall's 10 req/s guideline). This wrapper is the *only* code path allowed to make Scryfall API calls.

2. **IndexedDB Image Cache:** All fetched card image blobs are stored in an IndexedDB database keyed by `{set_code}:{card_name}`. Before any API call, the cache is checked first. Cached images persist across browser sessions, eliminating redundant network requests.

3. **Background Prefetch with JIT Priority:** A Web Worker slowly prefetches images for cards in the library at a conservative rate of 1 request per second. If a player action (Draw, Tutor) needs an image that hasn't been cached yet, that request jumps to the front of the queue with priority.

All requests will include the `User-Agent` header: `Scryglass/0.1 (+https://github.com/efischer19/scryglass)` as required by both Scryfall's guidelines and our own ROBOT_ETHICS.md.

## Considered Options

1. **Option 1: Client-Side Rate-Limited Fetcher + IndexedDB Cache (Chosen)**
    * *Pros:* No backend needed. IndexedDB can store large blobs efficiently. Persists across sessions. Web Worker keeps UI responsive. Conservative rate limiting respects Scryfall.
    * *Cons:* IndexedDB API is verbose (can be wrapped). Each user's browser independently fetches and caches. No shared cache across users.

2. **Option 2: Pre-Download All Images at Deck Load Time**
    * *Pros:* All images available immediately after a short loading phase. Simpler runtime logic.
    * *Cons:* A 100-card deck at 100ms/request = 10 seconds minimum blocking load time. Poor UX. Wasteful — many cards may never be drawn. Violates the spirit of Scryfall's guidelines for bulk use.

3. **Option 3: Use Scryfall's Bulk Data Download**
    * *Pros:* One download gets all card data. No per-card API calls.
    * *Cons:* Bulk data files are 100MB+ (images not included in bulk data, only metadata). Images would still need individual fetches. Overkill for a deck of 100 cards.

## Consequences

* **Positive:** Scryglass will be a model citizen of the Scryfall API ecosystem. Users get fast image loads after the first session with a deck. Background prefetching means most cards are cached before they're needed.
* **Negative:** First-time use with a new deck will have some image loading latency. IndexedDB storage is browser-specific and can be cleared by the user.
* **Future Implications:** If Scryfall changes their API or image URLs, we only need to update the fetch wrapper. The cache layer is decoupled from the API layer.
