import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Sur iOS, la restauration depuis le bfcache préserve le DOM mais détache les
// event listeners React → les boutons semblent bloqués.
// On force un re-render React (sans reload complet) pour rétablir les handlers.
// window.location.reload() était trop agressif : il provoquait un écran blanc
// car iOS kill+relaunch fire aussi pageshow(persisted=true) sur le WebView conservé.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
});

if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${process.env.PUBLIC_URL}/service-worker.js`, { updateViaCache: 'none' })
      .catch((err) => console.warn('SW registration failed:', err));

    // Quand le nouvel SW prend le contrôle (skipWaiting() déclenché après que
    // tous les nouveaux bundles sont mis en cache), on recharge la page pour
    // éviter l'état incohérent : certains assets servis par l'ancien SW,
    // d'autres par le nouveau → page blanche.
    // Le rechargement est safe car les nouveaux bundles sont garantis en cache
    // avant que skipWaiting() soit appelé dans le service worker.
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  });
}
