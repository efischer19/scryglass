# Ticket 16: Background Image Prefetch Worker

## What do you want to build?

Implement a Web Worker (`src/scripts/prefetch-worker.js`) that slowly walks through the library array from top to bottom, prefetching and caching card images at a conservative rate of 1 request per second. This ensures that most card images are ready before a player needs them.

## Acceptance Criteria

- [ ] A Web Worker is created that accepts a message containing a library array (card names and set codes)
- [ ] The worker iterates through the library from top (index 0) to bottom, requesting one image per second
- [ ] Before fetching, the worker checks the IndexedDB cache (Ticket 15) — if the image is already cached, it skips to the next card
- [ ] The worker posts progress messages back to the main thread: `{ type: 'progress', cached: N, total: M }`
- [ ] The worker posts a completion message: `{ type: 'complete' }`
- [ ] The worker can be stopped and restarted with a new library array (e.g., after a shuffle changes the order)
- [ ] The worker can be paused when a JIT priority fetch is needed (integration point with Ticket 17)
- [ ] The worker uses the rate-limited Scryfall fetch wrapper's queue (or its own 1-second delay, whichever is more conservative)
- [ ] The main thread starts the worker after the mulligan phase completes and both players are in the `'playing'` phase
- [ ] The worker processes both players' libraries (Player A first, then Player B, or interleaved)
- [ ] Unit test: worker skips already-cached images
- [ ] Unit test: worker respects the 1-second delay between fetches

## Implementation Notes (Optional)

Web Workers cannot directly access the DOM or IndexedDB from some contexts. Two approaches:

1. **Worker does the fetching:** The worker uses `fetch()` directly (Web Workers support `fetch`) and communicates with the main thread to read/write IndexedDB.
2. **Worker as a scheduler:** The worker posts messages to the main thread requesting specific image fetches, and the main thread handles the actual fetch + cache via Ticket 14 and Ticket 15.

Option 2 is simpler and avoids duplicating the rate limiter in the worker. The worker becomes a timer that says "fetch this card next" every second.

**References:** [ADR-003: Scryfall API Integration](../../meta/adr/ADR-003-scryfall_api_integration.md), Ticket 14 (Scryfall Fetch), Ticket 15 (IndexedDB Cache)
