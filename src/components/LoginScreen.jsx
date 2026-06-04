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
  const mountedRef  = useRef(true);
  const attemptRef  = useRef(0);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Sur iOS, quand l'utilisateur fait "précédent" depuis la page Google,
  // Safari restaure la page depuis le bfcache (état React préservé, loading = true).
  // pageshow avec persisted=true détecte ce cas et débloque le bouton.
  useEffect(() => {
    const onPageShow = (e) => { if (e.persisted) setLoading(false); };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

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
    const attempt = ++attemptRef.current;
    const isCurrent = () => mountedRef.current && attempt === attemptRef.current;
    setError('');
    setLoading(true);

    // Sur mobile navigateur : signInWithRedirect redirige la page entière vers Google.
    // Le résultat est traité au retour via getRedirectResult() dans useAuth.
    if (isMobileWeb) {
      await fn().catch(() => {});
      return;
    }

    // Sur desktop / standalone PWA : signInWithPopup ouvre une fenêtre.
    // Sur iOS standalone, si l'utilisateur fait "précédent", la fenêtre se ferme
    // mais la promesse ne rejette pas → loading bloqué à l'infini.
    // On écoute le retour dans l'app (visibilitychange / focus) pour débloquer.
    let returnCleanup = null;
    const onReturnToApp = () => {
      returnCleanup?.();
      // Laisse 3s à Firebase pour confirmer l'auth avant de reset le loading.
      waitForAuthState(3000).then((succeeded) => {
        if (isCurrent() && !succeeded) setLoading(false);
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') onReturnToApp();
    };
    const onFocus = () => onReturnToApp();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus, { once: true });
    returnCleanup = () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };

    try {
      await withTimeout(fn(), 60_000);
      returnCleanup?.();
    } catch (e) {
      returnCleanup?.();
      if (IGNORED_CODES.includes(e?.code)) {
        if (isCurrent()) setLoading(false);
        return;
      }
      // Sur iOS PWA, signInWithPopup peut rejeter même quand l'auth réussit :
      // Firebase écrit l'état dans le storage mais la communication popup→app échoue.
      // On attend 8s pour laisser onAuthStateChanged confirmer.
      // Si rien → on reset le bouton silencieusement. L'utilisateur peut retenter :
      // si Firebase a bien persisté la session, un nouveau tap le connectera.
      const authSucceeded = await waitForAuthState(8000);
      if (isCurrent() && !authSucceeded) {
        setLoading(false);
      }
      return;
    }
    if (isCurrent()) setLoading(false);
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
