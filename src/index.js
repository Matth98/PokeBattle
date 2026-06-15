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
      // Pas de reg.update() : le browser vérifie les MAJ SW naturellement.
      // Pas de controllerchange → reload : inutile car skipWaiting() dans le SW
      // garantit que le nouvel SW prend le contrôle au prochain kill+relaunch.
      // Le reload forcé provoquait un écran blanc si l'utilisateur killait l'app
      // pendant la transition (état intermédiaire : ancien cache supprimé, nouveau
      // pas encore entièrement servi).
      .catch((err) => console.warn('SW registration failed:', err));
  });
}
