# Ticket 19: Service Worker

## What do you want to build?

Implement a service worker in the `@scryglass/pwa` package (`packages/pwa/src/sw.ts`) that caches the Vite-built app shell for offline-capable use. This ensures the app loads instantly even on spotty game-store WiFi — the core UI and logic are served from the service worker cache, while card images are handled separately by the IndexedDB cache (Ticket 15). Vite compiles and bundles the TypeScript service worker alongside the rest of the app.

## Acceptance Criteria

- [ ] A `packages/pwa/src/sw.ts` service worker file is created in TypeScript
- [ ] The service worker is registered in `packages/pwa/src/main.ts`
- [ ] On install, the service worker pre-caches the app shell (`index.html`, hashed JS/CSS bundles from `dist/assets/`, `manifest.json`, and icons)
- [ ] On fetch, the service worker serves cached assets first (cache-first strategy for the app shell)
- [ ] Network requests to `api.scryfall.com` are NOT intercepted by the service worker (card image fetching is handled by the IndexedDB cache layer)
- [ ] The service worker uses a versioned cache name (e.g., derived from `import.meta.env` or a build-time constant) to allow cache busting on updates
- [ ] When a new service worker version is detected, the old cache is deleted during the `activate` event
- [ ] The app displays an "Update available — refresh to update" notification when a new service worker is waiting (optional nice-to-have)
- [ ] The app loads and functions (minus card images) when the device is offline after the first visit
- [ ] Manual verification: enable airplane mode, reload the app, confirm the UI loads

## Implementation Notes (Optional)

There are two viable approaches:

Option A — Manual service worker with Vite:

Write `packages/pwa/src/sw.ts` as a TypeScript module. Vite can build it as a separate entry point (using a `build.rollupOptions.input` config or a plugin like `vite-plugin-static-copy`). Use `import.meta.env.VITE_APP_VERSION` or the build hash for cache versioning.

```typescript
/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = `scryglass-shell-${__APP_VERSION__}`;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/', '/index.html', '/manifest.json'])
    )
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('api.scryfall.com')) return;

  e.respondWith(
    caches.match(e.request).then((cached) => cached ?? fetch(e.request))
  );
});
```

Option B — `vite-plugin-pwa` (Workbox):

Use `vite-plugin-pwa` which integrates Workbox to auto-generate a precache manifest from Vite's build output. This eliminates the need to manually list hashed asset filenames. The plugin handles cache versioning, cleanup, and registration automatically.

Either approach works. Option B is recommended if the asset list grows, since Workbox auto-discovers Vite's hashed output files.

Registration in `packages/pwa/src/main.ts`:

```typescript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

Note: Vite produces content-hashed filenames (e.g., `index-abc123.js`) in `dist/assets/`. The service worker must cache these hashed names — Workbox handles this automatically, while a manual approach requires a build-time manifest.

**References:** Ticket 18 (Manifest), Ticket 15 (IndexedDB Cache — handles images separately), [ADR-007](../adr/ADR-007-monorepo_structure.md) (Monorepo Structure)
