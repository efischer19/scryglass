# Ticket 16: Background Image Prefetch Worker

## What do you want to build?

Implement a Web Worker (`packages/pwa/src/scryfall/prefetch-worker.ts`) and its main-thread coordinator that slowly walks through the library array from top to bottom, prefetching and caching card images at a conservative rate of 1 request per second. The worker acts as a scheduler — it posts messages to the main thread requesting specific image fetches, and the main thread handles the actual fetch + cache via Ticket 14 and Ticket 15. This ensures that most card images are ready before a player needs them. All Scryfall integration lives in `@scryglass/pwa` per ADR-007.

## Acceptance Criteria

### Types (`packages/pwa/src/scryfall/prefetch-worker.ts`)

- [ ] A `PrefetchCard` interface is exported: `{ cardName: string; setCode: string }`
- [ ] A `WorkerInboundMessage` discriminated union is exported for messages sent to the worker:
  - `{ type: 'start'; library: PrefetchCard[] }`
  - `{ type: 'pause' }`
  - `{ type: 'resume' }`
  - `{ type: 'stop' }`
- [ ] A `WorkerOutboundMessage` discriminated union is exported for messages posted by the worker:
  - `{ type: 'fetch-request'; card: PrefetchCard }` — asks main thread to fetch and cache this card
  - `{ type: 'progress'; cached: number; total: number }`
  - `{ type: 'complete' }`
- [ ] All message types are explicitly typed with TypeScript discriminated unions

### Worker Behavior

- [ ] The worker accepts a `start` message containing a library array of `PrefetchCard` items
- [ ] The worker iterates through the library from top (index 0) to bottom, posting one `fetch-request` message per second
- [ ] Before posting a `fetch-request`, the worker does not check the cache itself — the main thread coordinator checks the IndexedDB cache (Ticket 15) and skips the fetch if the image is already cached
- [ ] The worker posts `progress` messages back to the main thread after each card is processed: `{ type: 'progress', cached: N, total: M }`
- [ ] The worker posts a `complete` message when all cards have been processed
- [ ] The worker can be stopped with a `stop` message and restarted with a new `start` message (e.g., after a shuffle changes the library order)
- [ ] The worker can be paused with a `pause` message when a JIT priority fetch is needed (integration point with Ticket 17) and resumed with a `resume` message

### Main-Thread Coordinator (`packages/pwa/src/scryfall/prefetch-coordinator.ts`)

- [ ] A `startPrefetch(library: PrefetchCard[]): void` function creates the worker and sends the `start` message
- [ ] A `pausePrefetch(): void` function sends the `pause` message
- [ ] A `resumePrefetch(): void` function sends the `resume` message
- [ ] A `stopPrefetch(): void` function sends the `stop` message and terminates the worker
- [ ] The coordinator listens for `fetch-request` messages, checks the IndexedDB cache, and calls `fetchCardImage` (Ticket 14) for uncached cards
- [ ] The coordinator listens for `progress` and `complete` messages for optional UI status updates
- [ ] The main thread starts the worker after the mulligan phase completes and both players are in the `'playing'` phase
- [ ] The worker processes both players' libraries (Player A first, then Player B, or interleaved)

### Testing (`packages/pwa/src/scryfall/__tests__/prefetch-worker.test.ts`)

- [ ] Tests use Vitest with `vi.useFakeTimers()` to control the 1-second interval
- [ ] Test: worker posts `fetch-request` messages in library order
- [ ] Test: coordinator skips already-cached images (does not call `fetchCardImage`)
- [ ] Test: worker respects the 1-second delay between `fetch-request` messages
- [ ] Test: `pause` message halts iteration; `resume` continues from where it left off
- [ ] Test: `stop` followed by a new `start` resets iteration to the new library
- [ ] Test: worker posts `complete` after processing all cards

## Implementation Notes (Optional)

This implementation uses the "worker as scheduler" approach (Option 2 from the original design). The worker's only job is to manage a timer and tell the main thread which card to fetch next. The main thread handles the actual `fetch` call and IndexedDB caching. This avoids duplicating the rate limiter in the worker and keeps IndexedDB access on the main thread where it is fully supported.

```typescript
// packages/pwa/src/scryfall/prefetch-worker.ts (runs inside Web Worker)
let library: PrefetchCard[] = [];
let currentIndex = 0;
let timerId: ReturnType<typeof setTimeout> | null = null;
let paused = false;

self.onmessage = (event: MessageEvent<WorkerInboundMessage>) => {
  const msg = event.data;
  switch (msg.type) {
    case 'start':
      library = msg.library;
      currentIndex = 0;
      paused = false;
      scheduleNext();
      break;
    case 'pause':
      paused = true;
      if (timerId !== null) clearTimeout(timerId);
      break;
    case 'resume':
      paused = false;
      scheduleNext();
      break;
    case 'stop':
      if (timerId !== null) clearTimeout(timerId);
      library = [];
      currentIndex = 0;
      break;
  }
};

function scheduleNext(): void {
  if (paused || currentIndex >= library.length) {
    if (currentIndex >= library.length) {
      self.postMessage({ type: 'complete' } satisfies WorkerOutboundMessage);
    }
    return;
  }
  timerId = setTimeout(() => {
    const card = library[currentIndex];
    self.postMessage({ type: 'fetch-request', card } satisfies WorkerOutboundMessage);
    self.postMessage({
      type: 'progress',
      cached: currentIndex + 1,
      total: library.length,
    } satisfies WorkerOutboundMessage);
    currentIndex++;
    scheduleNext();
  }, 1000);
}
```

**References:** [ADR-003: Scryfall API Integration](../../meta/adr/ADR-003-scryfall_api_integration.md), [ADR-007: Monorepo Structure](../../meta/adr/ADR-007-monorepo_structure.md), Ticket 14 (Scryfall Fetch Wrapper), Ticket 15 (IndexedDB Image Cache)
