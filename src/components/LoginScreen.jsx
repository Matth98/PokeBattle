// src/components/LoginScreen.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';

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
  ];

  const handle = (fn) => async () => {
    setError('');
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      if (IGNORED_CODES.includes(e?.code)) {
        // Annulation volontaire → pas d'erreur
        if (mountedRef.current) setLoading(false);
        return;
      }
      // Sur iOS, signInWithPopup peut rejeter même quand l'auth réussit.
      // On attend 1 s pour laisser onAuthStateChanged démonter ce composant
      // si l'utilisateur est authentifié. Si on est toujours là → erreur réelle.
      await new Promise(r => setTimeout(r, 1000));
      if (mountedRef.current) {
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
