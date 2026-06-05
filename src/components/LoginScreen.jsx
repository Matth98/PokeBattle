// src/components/LoginScreen.jsx
import React, { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from '../hooks/useTranslation';

// Mobile navigateur → signInWithRedirect (page navigue vers Google)
// PWA standalone    → signInWithPopup (redirect ne revient pas dans la PWA sur iOS)
// Desktop           → signInWithPopup
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;
const isMobileWeb = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && !isStandalone;

const CANCELLED_CODES = [
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/popup-blocked',
];

export function LoginScreen({ onSignInWithGoogle }) {
  const tr = useTranslation();
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const attemptRef = useRef(0);

  useEffect(() => () => { mountedRef.current = false; }, []);

  // Quand iOS restaure la page depuis le bfcache, loading peut être resté true.
  // pageshow (persisted) + visibilitychange le réinitialisent.
  useEffect(() => {
    const reset = () => setLoading(false);
    const onPageShow = (e) => { if (e.persisted) reset(); };
    const onVisible  = () => { if (document.visibilityState === 'visible') reset(); };
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const handleSignIn = async () => {
    const attempt = ++attemptRef.current;
    const isCurrent = () => mountedRef.current && attempt === attemptRef.current;

    // ── Mobile navigateur ──────────────────────────────────────────────────
    // signInWithRedirect navigue la page entière vers Google.
    // Pas de setLoading(true) : si iOS suspend l'app avant la navigation,
    // loading resterait bloqué à true sans moyen de le reset.
    if (isMobileWeb) {
      onSignInWithGoogle().catch(() => {});
      return;
    }

    // ── Desktop + PWA standalone ───────────────────────────────────────────
    // signInWithPopup ouvre une fenêtre. Sur iOS PWA, la communication
    // popup→app peut échouer mais l'auth est écrite en IndexedDB.
    setLoading(true);

    let settled = false;
    const cleanup = [];

    // Si l'utilisateur revient dans l'app et que la promesse n'a pas settlé
    // dans les 5s → l'abandon n'a pas été détecté → reset loading.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const t = setTimeout(() => { if (!settled && isCurrent()) setLoading(false); }, 5000);
      cleanup.push(() => clearTimeout(t));
    };
    document.addEventListener('visibilitychange', onVisible);
    cleanup.push(() => document.removeEventListener('visibilitychange', onVisible));

    // Filet : 3 min max
    const abs = setTimeout(() => { if (!settled && isCurrent()) setLoading(false); }, 180_000);
    cleanup.push(() => clearTimeout(abs));

    const runCleanup = () => cleanup.forEach(fn => fn());

    try {
      await onSignInWithGoogle();
      settled = true;
      runCleanup();
      // Résolu normalement → onAuthStateChanged démonte ce composant
    } catch (e) {
      settled = true;
      runCleanup();
      if (!isCurrent()) return;

      if (CANCELLED_CODES.includes(e?.code)) {
        setLoading(false);
        return;
      }

      // iOS PWA : popup a fermé, auth peut être en IndexedDB.
      // Attendre 2s qu'onAuthStateChanged confirme, sinon recharger.
      const confirmed = await new Promise((resolve) => {
        const t = setTimeout(() => { unsub(); resolve(false); }, 2000);
        const unsub = onAuthStateChanged(auth, (user) => {
          if (user) { clearTimeout(t); unsub(); resolve(true); }
        });
      });
      if (!isCurrent()) return;
      if (confirmed) return;
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <img src="/app-icon.png" alt="PokéScores"
          className="w-24 h-24 mx-auto mb-4 rounded-2xl shadow-lg" />
        <h1 className="text-4xl font-black text-white tracking-tight">PokéScores</h1>
        <p className="text-gray-400 mt-2 text-sm">{tr('login.subtitle')}</p>
      </div>

      <div className="w-full max-w-xs">
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900
                     font-semibold py-3.5 rounded-xl shadow disabled:opacity-50 active:scale-95
                     transition-transform"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="" className="w-5 h-5" />
          {tr('login.google')}
        </button>
      </div>

      {loading && (
        <div className="mt-8 flex items-center gap-2 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          {tr('login.loading')}
        </div>
      )}
    </div>
  );
}
