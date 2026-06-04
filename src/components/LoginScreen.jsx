// src/components/LoginScreen.jsx
import React, { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from '../hooks/useTranslation';

const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;
const isMobileWeb = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && !isStandalone;

export function LoginScreen({ onSignInWithGoogle }) {
  const tr = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Détecte si le composant est toujours monté (sur iOS, signInWithPopup peut
  // rejeter même quand l'auth réussit — onAuthStateChanged démonte ce composant).
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const IGNORED_CODES = [
    'auth/popup-closed-by-user',
    'auth/cancelled-popup-request',
    'auth/popup-blocked',
    'auth/login-timeout',
  ];

  // Garantit que la promesse se termine dans le délai imparti.
  // Si la popup reste ouverte indéfiniment (cas iOS), on sort proprement.
  const withTimeout = (promise, ms) => Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject({ code: 'auth/login-timeout' }), ms)
    ),
  ]);

  // Attend qu'onAuthStateChanged remonte un user, ou expire après `ms`.
  // Retourne true si un user est arrivé, false si timeout.
  const waitForAuthState = (ms) => new Promise((resolve) => {
    const timer = setTimeout(() => { unsubscribe(); resolve(false); }, ms);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) { clearTimeout(timer); unsubscribe(); resolve(true); }
    });
  });

  const handle = (fn) => async () => {
    setError('');
    setLoading(true);

    // Sur mobile : signInWithRedirect redirige la page entière vers Google.
    // La promesse resolve avant la redirection (pas d'erreur à gérer ici).
    // Le résultat est traité au retour via getRedirectResult() dans useAuth.
    if (isMobileWeb) {
      await fn().catch(() => {});
      return;
    }

    try {
      await withTimeout(fn(), 60_000);
    } catch (e) {
      if (IGNORED_CODES.includes(e?.code)) {
        // Annulation volontaire ou timeout → pas d'erreur affichée
        if (mountedRef.current) setLoading(false);
        return;
      }
      // Sur desktop, signInWithPopup peut rejeter même quand l'auth réussit.
      // On écoute onAuthStateChanged jusqu'à 5s pour confirmer.
      const authSucceeded = await waitForAuthState(5000);
      if (mountedRef.current && !authSucceeded) {
        setError(tr('login.error'));
        setLoading(false);
      }
      return;
    }
    if (mountedRef.current) setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      {/* Logo + titre */}
      <div className="text-center mb-12">
        <img
          src="/app-icon.png"
          alt="PokéScores"
          className="w-24 h-24 mx-auto mb-4 rounded-2xl shadow-lg"
        />
        <h1 className="text-4xl font-black text-white tracking-tight">PokéScores</h1>
        <p className="text-gray-400 mt-2 text-sm">{tr('login.subtitle')}</p>
      </div>

      {/* Boutons */}
      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={handle(onSignInWithGoogle)}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900
                     font-semibold py-3.5 rounded-xl shadow disabled:opacity-50 active:scale-95
                     transition-transform"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt=""
            className="w-5 h-5"
          />
          {tr('login.google')}
        </button>

      </div>

      {/* États */}
      {loading && (
        <div className="mt-8 flex items-center gap-2 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          {tr('login.loading')}
        </div>
      )}
      {error && (
        <p className="mt-4 text-red-400 text-sm text-center">{error}</p>
      )}
    </div>
  );
}
