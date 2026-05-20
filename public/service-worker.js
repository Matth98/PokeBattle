// public/service-worker.js
const CACHE_NAME = 'pokescores-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  // Nettoyer les anciens caches lors des mises à jour
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      ),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  // Ne pas intercepter les appels API ni les ressources cross-origin
  if (!url.startsWith(self.location.origin)) return;
  if (url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // Fallback sur le cache si le réseau échoue (offline)
      return cached || networkFetch;
    })
  );
});
