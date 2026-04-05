/**
 * Registers the service worker and sets up update handling.
 * The service worker caches the app shell for offline use.
 * Card images are cached separately by the IndexedDB layer (Ticket 15).
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            // A new version is waiting — prompt the user to update
            if (confirm('Update available — refresh to update')) {
              newWorker.postMessage('skipWaiting');
            }
          }
        });
      });
    })
    .catch((error: unknown) => {
      console.error('Service worker registration failed:', error);
    });
}
