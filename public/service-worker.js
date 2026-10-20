const CACHE_NAME = 'rft-pwa-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

// Install: Cache critical shell files and force immediate application activate
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Ignore failures on root fetch configurations by adding them individually
      return Promise.all(
        ASSETS_TO_CACHE.map((url) => {
          return cache.add(url).catch((err) => {
            console.warn(`[Service Worker] Pre-cache failed for URL: ${url}`, err);
          });
        })
      );
    })
  );
});

// Activate: Prune stale old caches and take immediate control over client tabs
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('[Service Worker] Deleting obsolete cache store:', key);
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

// Fetch Interceptor: Dynamic learn cache for offline operation
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Intercept GET requests only
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Match navigation requests (HTML/routes)
  // These should immediately fall back to index.html from cache if offline
  if (request.mode === 'navigate' || (url.origin === self.location.origin && !url.pathname.includes('.'))) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Assets (JS, CSS, images, layouts, unspash images, etc.)
  // Stale-While-Revalidate: deliver cached immediate, update cache with fresh network in background
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, cacheCopy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Silent catch when physically offline
        });

      return cachedResponse || fetchPromise;
    })
  );
});
