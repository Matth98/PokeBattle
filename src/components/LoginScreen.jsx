// src/components/LoginScreen.jsx
import React, { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from '../hooks/useTranslation';

// Desktop              → signInWithPopup (fiable)
// Mobile navigateur   → signInWithRedirect (géré dans useAuth)
// iOS PWA standalone  → signInWithPopup + stratégie de récupération
const isMobileWeb = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Codes où l'utilisateur a fermé la popup volontairement
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

  // Sur iOS, "précédent" depuis la page Google peut restaurer la page depuis le
  // bfcache (état React préservé avec loading=true). pageshow débloque le bouton.
  // Deux cas où loading peut rester true alors que l'auth n'est plus en cours :
  // 1. bfcache : iOS restaure la page depuis le cache (pageshow avec persisted=true)
  // 2. Suspension : iOS suspend la PWA avant que la navigation soit terminée,
  //    l'état React est préservé avec loading=true (visibilitychange au retour)
  useEffect(() => {
    const onPageShow = (e) => { if (e.persisted) setLoading(false); };
    const onVisible  = () => { if (document.visibilityState === 'visible') setLoading(false); };
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

    setLoading(true);

    // ── Mobile navigateur ──────────────────────────────────────────────────
    // signInWithRedirect navigue la page vers Google.
    // getRedirectResult() dans useAuth traite le résultat au retour.
    if (isMobileWeb) {
      await onSignInWithGoogle().catch(() => {});
      if (isCurrent()) setLoading(false);
      return;
    }

    // ── Desktop + iOS PWA standalone ───────────────────────────────────────
    //
    // Sur iOS PWA, signInWithPopup ouvre une fenêtre Safari. Deux problèmes :
    //
    // A) "Quitter" : l'utilisateur ferme la popup avant de choisir un compte.
    //    Firebase parfois ne détecte pas la fermeture → promesse qui ne settle
    //    jamais → loading infini.
    //    Fix : quand l'app redevient visible (popup fermée), on lance un timer
    //    de 5s. Si la promesse n'a pas encore settled → reset loading.
    //
    // B) Double authentification : l'utilisateur prend >N secondes dans la popup.
    //    Ne surtout pas recharger pendant ce temps.
    //    Fix : attendre que signInWithPopup settle (quelle que soit la durée),
    //    PUIS recharger si c'est une erreur non-annulation (auth en IndexedDB).
    //
    // C) Filet : timeout absolu de 3 min si la promesse ne settle jamais du tout.

    let settled = false;
    const cleanup = [];

    // Surveillance du retour dans l'app (cas A)
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      // Popup vient de fermer — si la promesse ne settle pas dans les 5s,
      // c'est un abandon sans erreur → reset loading.
      const timer = setTimeout(() => {
        if (!settled && isCurrent()) setLoading(false);
      }, 5000);
      cleanup.push(() => clearTimeout(timer));
    };
    document.addEventListener('visibilitychange', onVisible);
    cleanup.push(() => document.removeEventListener('visibilitychange', onVisible));

    // Timeout absolu (cas C)
    const absoluteTimeout = setTimeout(() => {
      if (!settled && isCurrent()) setLoading(false);
    }, 180_000);
    cleanup.push(() => clearTimeout(absoluteTimeout));

    const runCleanup = () => { cleanup.forEach(fn => fn()); };

    try {
      await onSignInWithGoogle();
      // Résolu normalement (desktop) → onAuthStateChanged va démonter ce composant
      settled = true;
      runCleanup();
    } catch (e) {
      settled = true;
      runCleanup();

      if (!isCurrent()) return;

      if (CANCELLED_CODES.includes(e?.code)) {
        // Fermeture volontaire détectée par Firebase → reset loading
        setLoading(false);
        return;
      }

      // Erreur non-annulation après fermeture de la popup (cas iOS typique) :
      // Firebase a écrit l'auth en IndexedDB mais la communication popup→app a échoué.
      // Attendre 2s qu'onAuthStateChanged confirme (cas rare où ça fonctionne).
      // Sinon recharger pour que Firebase lise l'IndexedDB.
      const confirmed = await new Promise((resolve) => {
        const t = setTimeout(() => { unsub(); resolve(false); }, 2000);
        const unsub = onAuthStateChanged(auth, (user) => {
          if (user) { clearTimeout(t); unsub(); resolve(true); }
        });
      });

      if (!isCurrent()) return;
      if (confirmed) return; // composant va se démonter via App.jsx

      window.location.reload();
    }
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

      {/* Bouton */}
      <div className="w-full max-w-xs">
        <button
          onClick={handleSignIn}
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

      {/* Spinner */}
      {loading && (
        <div className="mt-8 flex items-center gap-2 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          {tr('login.loading')}
        </div>
      )}
    </div>
  );
}
