// public/service-worker.js
const CACHE_NAME = 'pokescores-v3';

// Cache séparé pour les ressources externes (APIs + images CDN).
// Incrémenter EXT_CACHE_NAME invalide le cache externe sans toucher au cache app.
const EXT_CACHE_NAME = 'pokescores-ext-v1';

// Domaines avec données changeantes → Network-first (fallback cache si offline)
const EXT_NETWORK_FIRST = [
  'pokeapi.co',
  'www.pokepedia.fr',
];

// Domaines stables (sprites, icônes, JSON de formats) → Cache-first (réseau si absent du cache)
const EXT_CACHE_FIRST = [
  'raw.githubusercontent.com',
  'cdn.jsdelivr.net',
  'play.pokemonshowdown.com',
];

// Assets critiques pré-cachés dès l'installation du SW
const PRECACHE_ASSETS = [
  '/pokeball-button.png',
  '/logo192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME && name !== EXT_CACHE_NAME)
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
  const { hostname } = new URL(url);

  // ── Ressources externes : APIs et assets CDN ─────────────────────────────

  if (EXT_NETWORK_FIRST.includes(hostname)) {
    // Network-first : données fraîches si réseau dispo, cache sinon
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(EXT_CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (EXT_CACHE_FIRST.includes(hostname)) {
    // Cache-first : sprites et JSON de formats changent rarement
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(EXT_CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── Ressources same-origin : app shell ───────────────────────────────────

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
