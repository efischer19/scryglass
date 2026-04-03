# Ticket 15: IndexedDB Image Cache

## What do you want to build?

Implement a JavaScript module (`src/scripts/image-cache.js`) that stores and retrieves card image blobs from IndexedDB. This cache sits between the UI and the Scryfall fetch wrapper, eliminating redundant network requests across sessions.

## Acceptance Criteria

- [ ] A `getCachedImage(cardName, setCode)` function returns a Promise resolving to a cached image blob, or `null` if not cached
- [ ] A `cacheImage(cardName, setCode, blob)` function stores an image blob in IndexedDB
- [ ] The cache key is `{setCode}:{cardName}` (lowercase, trimmed)
- [ ] The IndexedDB database is named `scryglass-image-cache` with an object store named `images`
- [ ] A `getImageUrl(cardName, setCode)` convenience function checks the cache first, then falls back to fetching via the Scryfall wrapper (Ticket 14), caches the result, and returns an object URL (`URL.createObjectURL`)
- [ ] Cached images persist across page refreshes and browser sessions
- [ ] A `clearCache()` function is exported for debugging/troubleshooting
- [ ] A `getCacheSize()` function returns the number of cached images
- [ ] Error handling: if IndexedDB is unavailable (e.g., private browsing in some browsers), the module gracefully degrades to no caching (fetch every time)
- [ ] Unit tests cover: cache miss returns null, cache hit returns blob, round-trip (cache then retrieve), clear cache

## Implementation Notes (Optional)

Use the raw IndexedDB API (no library) to keep the project dependency-free. The API is verbose but well-documented. A typical pattern:

```javascript
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('scryglass-image-cache', 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('images');
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}
```

Object URLs created with `URL.createObjectURL()` should be revoked with `URL.revokeObjectURL()` when the image element is removed from the DOM to prevent memory leaks.

**References:** [ADR-003: Scryfall API Integration](../../meta/adr/ADR-003-scryfall_api_integration.md), Ticket 14 (Scryfall Fetch Wrapper)
