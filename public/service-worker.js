// public/service-worker.js
const CACHE_NAME = 'pokescores-v4';

// Cache séparé pour les ressources externes (APIs + images CDN).
// Incrémenter EXT_CACHE_NAME invalide le cache externe sans toucher au cache app.
const EXT_CACHE_NAME = 'pokescores-ext-v2';

// Domaines avec données changeantes → Network-first (fallback cache si offline)
const EXT_NETWORK_FIRST = [
  'pokeapi.co',
  'www.pokepedia.fr',
];

// Domaines stables → Cache-first (réseau uniquement si absent du cache)
const EXT_CACHE_FIRST = [
  'raw.githubusercontent.com',
  'cdn.jsdelivr.net',
  'play.pokemonshowdown.com',
  // CSS / JS critiques pour le rendu offline
  'cdn.tailwindcss.com',   // Tailwind Play CDN (génère tout le CSS à l'exécution)
  'cdnjs.cloudflare.com',  // Font Awesome CSS + webfonts (woff2, woff)
];

// Assets statiques pré-cachés (noms fixes)
const PRECACHE_STATIC = [
  '/',
  '/pokeball-button.png',
  '/logo192.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // 1. Pré-cacher les assets statiques connus
      await cache.addAll(PRECACHE_STATIC).catch(() => {});

      // 2. Découvrir et pré-cacher les bundles JS/CSS générés par CRA (noms hashés)
      //    On fetche index.html et on extrait les URLs des <script> et <link rel="stylesheet">
      try {
        const html     = await fetch('/').then(r => r.text());
        const srcRe    = /src="(\/static\/[^"]+\.js)"/g;
        const hrefRe   = /href="(\/static\/[^"]+\.css)"/g;
        const bundleUrls = [];
        let m;
        while ((m = srcRe.exec(html))  !== null) bundleUrls.push(m[1]);
        while ((m = hrefRe.exec(html)) !== null) bundleUrls.push(m[1]);
        if (bundleUrls.length) await cache.addAll(bundleUrls).catch(() => {});
      } catch { /* silencieux si offline lors de l'install */ }

      self.skipWaiting();
    })()
  );
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

  // Bundles JS/CSS générés par CRA : noms hashés → immutables → Cache-first.
  // Le hash change à chaque build → pas de risque de servir du code obsolète.
  // Avantage : lancement PWA instantané, aucune attente réseau.
  if (url.includes('/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        }).catch(() => caches.match(event.request));
      })
    );
    return;
  }

  // HTML / navigation : Stale-while-revalidate + fallback SPA garanti.
  // 1. Si en cache → sert immédiatement (lancement instantané)
  // 2. Met à jour en arrière-plan pour le prochain lancement
  // 3. Triple fallback : cache de la requête → cache de '/' → réponse vide 200
  //    (évite l'écran blanc si le cache n'est pas encore peuplé lors du premier lancement)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => null);

      if (cached) return cached;

      // Pas encore en cache : attendre le réseau, avec fallback sur '/' (SPA shell)
      return fetchPromise.then(
        (response) => response || caches.match('/').then(r => r || new Response('', { status: 200, headers: { 'Content-Type': 'text/html' } }))
      );
    })
  );
});
