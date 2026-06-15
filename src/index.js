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

    // Recharger uniquement quand un SW EXISTANT est remplacé par une mise à jour.
    // Sans cette garde, controllerchange se déclenche aussi lors de la première activation
    // (quand il n'y avait pas encore de SW), ce qui provoque un reload inutile au lancement
    // alors que le cache n'est pas encore peuplé → écran blanc.
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) window.location.reload();
    });
  });
}
