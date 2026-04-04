# Ticket 15: IndexedDB Image Cache

## What do you want to build?

Implement a TypeScript module (`packages/pwa/src/scryfall/image-cache.ts`) that stores and retrieves card image blobs from IndexedDB. This cache sits between the UI and the Scryfall fetch wrapper (Ticket 14), eliminating redundant network requests across sessions. All Scryfall integration lives in `@scryglass/pwa` per ADR-007, since IndexedDB is a browser API.

## Acceptance Criteria

### Types (`packages/pwa/src/scryfall/image-cache.ts`)

- [ ] A `CacheKey` type is exported: a template literal type `${string}:${string}` representing `{setCode}:{cardName}`
- [ ] A `CacheEntry` interface is exported: `{ key: CacheKey; blob: Blob; cachedAt: number }` (timestamp in ms)
- [ ] A `CacheLookupResult` type is exported: `Blob | null` (null indicates cache miss)
- [ ] All exported functions have explicit TypeScript parameter and return types

### Core Functionality

- [ ] A `getCachedImage(cardName: string, setCode: string): Promise<CacheLookupResult>` function returns a cached image `Blob`, or `null` if not cached
- [ ] A `cacheImage(cardName: string, setCode: string, blob: Blob): Promise<void>` function stores an image blob in IndexedDB
- [ ] The cache key is `{setCode}:{cardName}` (lowercase, trimmed)
- [ ] The IndexedDB database is named `scryglass-image-cache` with an object store named `images`
- [ ] A `getImageUrl(cardName: string, setCode: string): Promise<string | null>` convenience function checks the cache first, then falls back to fetching via the Scryfall fetch wrapper (Ticket 14), caches the result, and returns an object URL (`URL.createObjectURL`). Returns `null` if fetch returns `null` (card not found)
- [ ] Cached images persist across page refreshes and browser sessions
- [ ] A `clearCache(): Promise<void>` function is exported for debugging/troubleshooting
- [ ] A `getCacheSize(): Promise<number>` function returns the number of cached images
- [ ] Error handling: if IndexedDB is unavailable (e.g., private browsing in some browsers), the module gracefully degrades to no caching (fetch every time)

### Testing (`packages/pwa/src/scryfall/__tests__/image-cache.test.ts`)

- [ ] Tests use Vitest with `fake-indexeddb` to provide an in-memory IndexedDB implementation
- [ ] Test: cache miss returns `null`
- [ ] Test: cache hit returns the stored `Blob`
- [ ] Test: round-trip — `cacheImage` then `getCachedImage` returns the same blob
- [ ] Test: `clearCache` removes all entries and `getCacheSize` returns `0`
- [ ] Test: `getCacheSize` returns the correct count after multiple inserts
- [ ] Test: `getImageUrl` returns an object URL for a cached image without calling the fetch wrapper
- [ ] Test: `getImageUrl` calls the fetch wrapper on a cache miss and caches the result
- [ ] Test: graceful degradation — module falls back to no caching when IndexedDB throws

## Implementation Notes (Optional)

Use the raw IndexedDB API (no library) to keep the project dependency-free. The API is verbose but well-documented. A typical pattern:

```typescript
const DB_NAME = 'scryglass-image-cache';
const STORE_NAME = 'images';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event) =>
      resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) =>
      reject((event.target as IDBOpenDBRequest).error);
  });
}
```

Object URLs created with `URL.createObjectURL()` should be revoked with `URL.revokeObjectURL()` when the image element is removed from the DOM to prevent memory leaks. This is the consuming component's responsibility, not the cache module's.

The `fake-indexeddb` package provides a spec-compliant in-memory IndexedDB for Vitest tests running in Node.js. Import it as a setup file or in each test:

```typescript
import 'fake-indexeddb/auto';
```

**References:** [ADR-003: Scryfall API Integration](../../meta/adr/ADR-003-scryfall_api_integration.md), [ADR-007: Monorepo Structure](../../meta/adr/ADR-007-monorepo_structure.md), Ticket 14 (Scryfall Fetch Wrapper)
