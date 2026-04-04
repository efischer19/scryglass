# Ticket 14: Rate-Limited Scryfall Fetch Wrapper

## What do you want to build?

Implement a TypeScript module (`packages/pwa/src/scryfall/fetch-wrapper.ts`) that provides the sole interface for making API requests to Scryfall. This wrapper enforces a strict rate limit of one request per 100ms (well within Scryfall's 10 req/s guideline) and sets the required `User-Agent` header. All Scryfall integration lives in `@scryglass/pwa` per ADR-007, since it depends on browser APIs (`fetch` with CORS).

## Acceptance Criteria

### Types (`packages/pwa/src/scryfall/fetch-wrapper.ts`)

- [ ] A `FetchCardImageParams` interface is exported: `{ cardName: string; setCode: string }`
- [ ] A `FetchCardImageResult` type is exported: `Blob | null` (null indicates card not found)
- [ ] A `QueueEntry` internal interface tracks each queued request with its params and a resolve/reject pair
- [ ] All exported functions have explicit TypeScript parameter and return types

### Core Functionality

- [ ] A `fetchCardImage(params: FetchCardImageParams): Promise<FetchCardImageResult>` function is exported that returns a Promise resolving to an image `Blob`, or `null` if the card is not found
- [ ] The function constructs the Scryfall API URL using the `/cards/named` endpoint with `exact` and `set` query parameters
- [ ] All requests include the `User-Agent` header: `Scryglass/0.1 (+https://github.com/efischer19/scryglass)`
- [ ] A queue mechanism ensures that no two requests are sent within 100ms of each other
- [ ] If multiple requests are queued, they are processed sequentially with the 100ms minimum delay
- [ ] HTTP 429 (Too Many Requests) responses trigger exponential backoff: wait 1s, then 2s, then 4s, up to a maximum of 32s
- [ ] HTTP 5xx responses trigger the same exponential backoff
- [ ] HTTP 404 (card not found) resolves to `null` without retrying
- [ ] The function fetches the `normal` size image from the Scryfall response's `image_uris.normal` field
- [ ] A `getQueueLength(): number` function is exported for monitoring/debugging

### Testing (`packages/pwa/src/scryfall/__tests__/fetch-wrapper.test.ts`)

- [ ] Tests use Vitest with `vi.useFakeTimers()` to control timing
- [ ] Test: successful fetch returns a `Blob`
- [ ] Test: HTTP 429 triggers exponential backoff and retries
- [ ] Test: HTTP 5xx triggers exponential backoff and retries
- [ ] Test: HTTP 404 resolves to `null` without retrying
- [ ] Test: queue ordering — multiple concurrent calls are processed sequentially with ≥100ms gaps
- [ ] Test: `getQueueLength()` reflects the number of pending requests
- [ ] `fetch` is mocked via `vi.fn()` — no real network requests in tests

## Implementation Notes (Optional)

The Scryfall API endpoint for fetching a card by name and set:

```text
https://api.scryfall.com/cards/named?exact={cardName}&set={setCode}
```

The response JSON includes `image_uris.normal` which is a URL to the card image. Fetch that URL to get the image blob.

The rate limiter can be a simple timestamp check:

```typescript
const USER_AGENT = 'Scryglass/0.1 (+https://github.com/efischer19/scryglass)';
const MIN_INTERVAL_MS = 100;

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - elapsed);
  }
  lastRequestTime = Date.now();
  return fetch(url, { headers: { 'User-Agent': USER_AGENT } });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**References:** [ADR-003: Scryfall API Integration](../../meta/adr/ADR-003-scryfall_api_integration.md), [ADR-007: Monorepo Structure](../../meta/adr/ADR-007-monorepo_structure.md), [ROBOT_ETHICS.md](../../meta/ROBOT_ETHICS.md)
