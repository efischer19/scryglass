/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;
declare const __APP_VERSION__: string;
declare const __PRECACHE_ENTRIES__: string[];

const CACHE_NAME = `scryglass-shell-${__APP_VERSION__}`;

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(__PRECACHE_ENTRIES__))
  );
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('scryglass-shell-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (event: FetchEvent) => {
  // Don't intercept Scryfall requests — card images are handled by IndexedDB (Ticket 15)
  const url = new URL(event.request.url);
  if (url.hostname === 'api.scryfall.com') return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request))
  );
});

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
