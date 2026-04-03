# Ticket 17: JIT Priority Fetching

## What do you want to build?

Implement the "Just-In-Time" priority fetching system that ensures a card image is available immediately when a player draws or tutors a card, even if the background prefetch worker hasn't cached it yet. JIT requests jump to the front of the fetch queue.

## Acceptance Criteria

- [ ] When a card is drawn (Ticket 10) or tutored (Ticket 12), the system checks the IndexedDB cache first
- [ ] If the image is cached, it is displayed immediately from the cache
- [ ] If the image is NOT cached, a priority fetch request is created that skips ahead of the background worker's queue
- [ ] The background worker pauses its current iteration while the JIT fetch completes
- [ ] The JIT fetch uses the same rate-limited Scryfall wrapper (Ticket 14) — it does not bypass rate limiting
- [ ] While the JIT fetch is in progress, the card display area shows a loading indicator with the card name as text
- [ ] After the JIT fetch completes, the image replaces the loading indicator
- [ ] If the JIT fetch fails (404, network error), the card display area shows the card name as text permanently (graceful degradation)
- [ ] Multiple simultaneous JIT requests (e.g., Player A and Player B both draw) are queued in order
- [ ] Unit test: JIT fetch for a cached card returns immediately without a network request
- [ ] Unit test: JIT fetch for an uncached card triggers a Scryfall request
- [ ] Integration test: draw a card, verify the image loads (or text fallback appears)

## Implementation Notes (Optional)

The priority queue can be implemented by adding a `priority` flag to the fetch wrapper's internal queue. JIT requests get `priority: true` and are processed before `priority: false` (background) requests. The 100ms rate limit still applies between all requests regardless of priority.

This ticket is the integration point where the Scryfall subsystem (Phase 4) connects to the game action UI (Phase 3). After this ticket, drawing and tutoring display actual card images.

**References:** [ADR-003: Scryfall API Integration](../../meta/adr/ADR-003-scryfall_api_integration.md), Ticket 10 (Draw), Ticket 12 (Tutor), Ticket 14 (Fetch Wrapper), Ticket 15 (Cache), Ticket 16 (Worker)
