# Ticket 17: JIT Priority Fetching

## What do you want to build?

Implement the "Just-In-Time" priority fetching system as a TypeScript module (`packages/pwa/src/scryfall/jit-priority.ts`) and a Preact hook (`useCardImage`) that ensures a card image is available immediately when a player draws or tutors a card, even if the background prefetch worker hasn't cached it yet. JIT requests jump to the front of the fetch queue. This ticket is the integration point where the Scryfall subsystem (Phase 4) connects to the game action UI (Phase 3). All Scryfall integration lives in `@scryglass/pwa` per ADR-007.

## Acceptance Criteria

### Types (`packages/pwa/src/scryfall/jit-priority.ts`)

- [ ] A `PriorityLevel` type is exported: `'jit' | 'background'`
- [ ] A `PriorityFetchRequest` interface is exported: `{ cardName: string; setCode: string; priority: PriorityLevel }`
- [ ] A `CardImageState` type is exported representing the hook's return value: `{ status: 'loading' | 'loaded' | 'error'; imageUrl: string | null; cardName: string }`

### Priority Queue (`packages/pwa/src/scryfall/jit-priority.ts`)

- [ ] A `priorityFetch(cardName: string, setCode: string): Promise<string | null>` function is exported that checks the IndexedDB cache first, and on a miss creates a JIT priority request that jumps ahead of background requests in the fetch wrapper's queue
- [ ] The priority queue is implemented by adding a `priority` field to the fetch wrapper's internal queue — JIT requests (`priority: 'jit'`) are processed before background requests (`priority: 'background'`)
- [ ] The 100ms rate limit still applies between all requests regardless of priority
- [ ] When a JIT request enters the queue, the background prefetch worker is paused (Ticket 16) and resumed after the JIT fetch completes
- [ ] Multiple simultaneous JIT requests (e.g., Player A and Player B both draw) are queued in FIFO order among JIT requests
- [ ] `priorityFetch` returns an object URL string on success, or `null` on failure (404, network error)

### Preact Hook (`packages/pwa/src/scryfall/useCardImage.ts`)

- [ ] A `useCardImage(cardName: string, setCode: string): CardImageState` hook is exported
- [ ] The hook returns `{ status: 'loading', imageUrl: null, cardName }` initially
- [ ] The hook calls `priorityFetch` on mount and updates to `{ status: 'loaded', imageUrl, cardName }` on success
- [ ] The hook updates to `{ status: 'error', imageUrl: null, cardName }` on failure (404 or network error)
- [ ] The hook cleans up the object URL via `URL.revokeObjectURL()` on unmount to prevent memory leaks
- [ ] If `cardName` or `setCode` changes, the hook cancels any in-flight fetch and starts a new one

### Integration with `<CardDisplay />` (`packages/pwa/src/components/CardDisplay.tsx`)

- [ ] When a card is drawn (Ticket 10) or tutored (Ticket 12), `<CardDisplay />` uses the `useCardImage` hook to fetch and display the card image
- [ ] While `status === 'loading'`, `<CardDisplay />` shows a loading indicator with the card name as accessible text
- [ ] When `status === 'loaded'`, the `<img>` element displays the card image with `alt` text set to the card name
- [ ] When `status === 'error'`, `<CardDisplay />` shows the card name as text permanently (graceful degradation)
- [ ] The loading indicator and error state are styled consistently with the existing UI

### Testing

#### Unit Tests (`packages/pwa/src/scryfall/__tests__/jit-priority.test.ts`)

- [ ] Tests use Vitest with `vi.useFakeTimers()` and mocked fetch wrapper / cache modules
- [ ] Test: `priorityFetch` for a cached card returns immediately without calling the fetch wrapper
- [ ] Test: `priorityFetch` for an uncached card calls `fetchCardImage` and caches the result
- [ ] Test: JIT requests are processed before background requests in the queue
- [ ] Test: the background prefetch worker is paused during a JIT fetch and resumed after
- [ ] Test: multiple simultaneous JIT requests are processed in FIFO order
- [ ] Test: `priorityFetch` returns `null` when the card is not found (404)

#### Hook Tests (`packages/pwa/src/scryfall/__tests__/useCardImage.test.ts`)

- [ ] Tests use `@testing-library/preact` and Vitest
- [ ] Test: hook returns `status: 'loading'` initially
- [ ] Test: hook transitions to `status: 'loaded'` with an `imageUrl` on successful fetch
- [ ] Test: hook transitions to `status: 'error'` when fetch fails
- [ ] Test: hook revokes the object URL on unmount

#### Component Tests (`packages/pwa/src/components/__tests__/CardDisplay.test.tsx`)

- [ ] Test: `<CardDisplay />` renders loading indicator while image loads
- [ ] Test: `<CardDisplay />` renders image when loaded
- [ ] Test: `<CardDisplay />` renders card name text on error (graceful degradation)

## Implementation Notes (Optional)

The priority queue can be implemented by extending the fetch wrapper's internal queue from Ticket 14. Each `QueueEntry` gains a `priority` field. When the queue processor picks the next item, it selects the first `'jit'` entry if any exist, otherwise the first `'background'` entry. The 100ms rate limit still applies between all requests regardless of priority.

This ticket completes the Scryfall image pipeline. After this ticket, drawing and tutoring display actual card images instead of text placeholders:

```
Player draws → useCardImage hook → priorityFetch → cache check → fetch wrapper → Scryfall API
                                                  ↓ (hit)
                                              object URL → <img> rendered
```

The `useCardImage` hook encapsulates all async complexity so that components simply consume a `CardImageState`:

```typescript
// packages/pwa/src/scryfall/useCardImage.ts
import { useEffect, useState } from 'preact/hooks';
import { priorityFetch } from './jit-priority';
import type { CardImageState } from './jit-priority';

export function useCardImage(cardName: string, setCode: string): CardImageState {
  const [state, setState] = useState<CardImageState>({
    status: 'loading',
    imageUrl: null,
    cardName,
  });

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setState({ status: 'loading', imageUrl: null, cardName });

    priorityFetch(cardName, setCode).then((url) => {
      if (cancelled) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      if (url) {
        objectUrl = url;
        setState({ status: 'loaded', imageUrl: url, cardName });
      } else {
        setState({ status: 'error', imageUrl: null, cardName });
      }
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cardName, setCode]);

  return state;
}
```

**References:** [ADR-003: Scryfall API Integration](../../meta/adr/ADR-003-scryfall_api_integration.md), [ADR-007: Monorepo Structure](../../meta/adr/ADR-007-monorepo_structure.md), Ticket 10 (Draw), Ticket 12 (Tutor), Ticket 14 (Fetch Wrapper), Ticket 15 (IndexedDB Cache), Ticket 16 (Background Prefetch Worker)
