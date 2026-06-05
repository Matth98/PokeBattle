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

// Sur iOS, la restauration depuis le bfcache (back/forward cache) préserve le DOM
// mais pas le système d'événements de React → les boutons semblent bloqués.
// Un rechargement garantit un état propre à chaque retour dans l'app.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) window.location.reload();
});

if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${process.env.PUBLIC_URL}/service-worker.js`, { updateViaCache: 'none' })
      .then((reg) => {
        // Vérifier immédiatement s'il y a une mise à jour disponible
        reg.update();
      })
      .catch((err) => console.warn('SW registration failed:', err));

    // Recharger automatiquement quand un nouveau SW prend le contrôle
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}
