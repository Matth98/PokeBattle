// Service worker Firebase Cloud Messaging
// Ce fichier DOIT être à la racine du domaine (public/) pour que FCM fonctionne.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Les variables Firebase sont injectées depuis le client via postMessage au moment
// de l'enregistrement du SW. Jusqu'à réception, on initialise avec un objet vide.
let messaging = null;

self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG') {
    if (firebase.apps.length === 0) {
      firebase.initializeApp(event.data.config);
      messaging = firebase.messaging();
    }
  }
});

// Gestion des notifications en arrière-plan (app fermée / en background)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: 'PokéBattle', body: event.data.text() } };
  }

  const { title, body, icon, data } = {
    title: payload.notification?.title ?? 'PokéBattle',
    body:  payload.notification?.body  ?? '',
    icon:  payload.notification?.icon  ?? '/icons/icon-192.png',
    data:  payload.data ?? {},
  };

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icons/icon-192.png',
      data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
