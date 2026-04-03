# Ticket 14: Rate-Limited Scryfall Fetch Wrapper

## What do you want to build?

Implement a JavaScript module (`src/scripts/scryfall.js`) that provides the sole interface for making API requests to Scryfall. This wrapper enforces a strict rate limit of one request per 100ms (well within Scryfall's 10 req/s guideline) and sets the required `User-Agent` header.

## Acceptance Criteria

- [ ] A `fetchCardImage(cardName, setCode)` function is exported that returns a Promise resolving to an image blob
- [ ] The function constructs the Scryfall API URL using the `/cards/named` endpoint with `exact` and `set` parameters
- [ ] All requests include the `User-Agent` header: `Scryglass/0.1 (+https://github.com/efischer19/scryglass)`
- [ ] A queue mechanism ensures that no two requests are sent within 100ms of each other
- [ ] If multiple requests are queued, they are processed sequentially with the 100ms minimum delay
- [ ] HTTP 429 (Too Many Requests) responses trigger exponential backoff: wait 1s, then 2s, then 4s, up to a maximum of 32s
- [ ] HTTP 5xx responses trigger the same exponential backoff
- [ ] HTTP 404 (card not found) returns `null` without retrying
- [ ] The function fetches the `normal` size image from the Scryfall response's `image_uris.normal` field
- [ ] A `getQueueLength()` function is exported for monitoring/debugging
- [ ] Unit tests cover: successful fetch, 429 backoff, 404 handling, queue ordering

## Implementation Notes (Optional)

The Scryfall API endpoint for fetching a card by name and set:

```text
https://api.scryfall.com/cards/named?exact={cardName}&set={setCode}
```

The response JSON includes `image_uris.normal` which is a URL to the card image. Fetch that URL to get the image blob.

The rate limiter can be a simple timestamp check:

```javascript
let lastRequestTime = 0;
async function rateLimitedFetch(url) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 100) {
    await sleep(100 - elapsed);
  }
  lastRequestTime = Date.now();
  return fetch(url, { headers: { 'User-Agent': USER_AGENT } });
}
```

**References:** [ADR-003: Scryfall API Integration](../../meta/adr/ADR-003-scryfall_api_integration.md), [ROBOT_ETHICS.md](../../meta/ROBOT_ETHICS.md)
