# Ticket 19: Service Worker

## What do you want to build?

Implement a service worker (`src/sw.js`) that caches the app shell (HTML, CSS, JS) for offline-capable use. This ensures the app loads instantly even on spotty game-store WiFi — the core UI and logic are served from the service worker cache, while card images are handled separately by the IndexedDB cache (Ticket 15).

## Acceptance Criteria

- [ ] A `src/sw.js` service worker file is created
- [ ] The service worker is registered in `src/scripts/app.js` (or a dedicated `sw-register.js`)
- [ ] On install, the service worker pre-caches the app shell: `index.html`, `assets/styles.css`, `scripts/app.js`, `manifest.json`, icons, and all other JS modules
- [ ] On fetch, the service worker serves cached assets first (cache-first strategy for the app shell)
- [ ] Network requests to `api.scryfall.com` are NOT intercepted by the service worker (card image fetching is handled by the IndexedDB cache layer)
- [ ] The service worker has a versioned cache name (e.g., `scryglass-shell-v1`) to allow cache busting on updates
- [ ] When a new service worker version is detected, the old cache is deleted during the `activate` event
- [ ] The app displays a "Update available — refresh to update" notification when a new service worker is waiting (optional nice-to-have)
- [ ] The app loads and functions (minus card images) when the device is offline after the first visit
- [ ] Manual verification: enable airplane mode, reload the app, confirm the UI loads

## Implementation Notes (Optional)

A minimal service worker:

```javascript
const CACHE_NAME = 'scryglass-shell-v1';
const SHELL_ASSETS = [
  './',
  './index.html',
  './assets/styles.css',
  './scripts/app.js',
  './manifest.json',
  // ... all JS modules
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  // Don't cache Scryfall API requests
  if (e.request.url.includes('api.scryfall.com')) return;

  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
```

The list of `SHELL_ASSETS` must be maintained as new files are added. Consider generating it from a file listing if the project grows.

**References:** Ticket 18 (Manifest), Ticket 15 (IndexedDB Cache — handles images separately)
