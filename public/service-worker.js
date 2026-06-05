// public/service-worker.js
const CACHE_NAME = 'pokescores-v3';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
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
    // Supprimé : clients.navigate() forçait un rechargement de tous les onglets
    // à chaque activation du SW, ce qui interférait avec le premier lancement de la PWA.
    // Le rechargement est déjà géré par l'event 'controllerchange' dans index.js.
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (!url.startsWith(self.location.origin)) return;
  if (url.includes('/api/')) return;

  // Network-first : toujours récupérer la version la plus récente,
  // cache uniquement en fallback offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
