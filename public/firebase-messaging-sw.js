importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyCgWbbVcZqMj-oX869WFdFA7fWz7ff3Elg",
  authDomain:        "pokescores-1c33a.firebaseapp.com",
  projectId:         "pokescores-1c33a",
  storageBucket:     "pokescores-1c33a.firebasestorage.app",
  messagingSenderId: "640927390983",
  appId:             "1:640927390983:web:e33155d0a361316e1339a2",
});

const messaging = firebase.messaging();

// Notifications reçues en background (app fermée ou en arrière-plan).
// Si le payload contient `notification`, Firebase l'affiche déjà automatiquement —
// on n'affiche manuellement que pour les messages data-only pour éviter le doublon.
messaging.onBackgroundMessage((payload) => {
  if (payload.notification) return;

  const title = payload.data?.title;
  const body  = payload.data?.body;
  if (!title) return;

  self.registration.showNotification(title, {
    body:  body ?? '',
    icon:  '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data:  payload.data ?? {},
  });
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
