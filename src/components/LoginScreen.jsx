// src/components/LoginScreen.jsx
import React, { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from '../hooks/useTranslation';

// Desktop              → signInWithPopup (fiable)
// Mobile navigateur   → signInWithRedirect (géré dans useAuth)
// iOS PWA standalone  → signInWithPopup + reload si la communication popup→app échoue
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;
const isMobileWeb = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && !isStandalone;

// Codes où l'utilisateur a volontairement annulé — pas de retry automatique
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

  // Sur iOS, "précédent" depuis la page Google restaure la page depuis le bfcache
  // (état React préservé avec loading=true). pageshow détecte ce cas et débloque le bouton.
  useEffect(() => {
    const handler = (e) => { if (e.persisted) setLoading(false); };
    window.addEventListener('pageshow', handler);
    return () => window.removeEventListener('pageshow', handler);
  }, []);

  const handleSignIn = async () => {
    const attempt = ++attemptRef.current;
    const isCurrent = () => mountedRef.current && attempt === attemptRef.current;

    setLoading(true);

    // ── Mobile navigateur ──────────────────────────────────────────────────
    // signInWithRedirect navigue la page entière vers Google.
    // Le résultat est traité au retour via getRedirectResult() dans useAuth.
    // Si on revient ici sans redirection (erreur inattendue), on reset le loading.
    if (isMobileWeb) {
      await onSignInWithGoogle().catch(() => {});
      if (isCurrent()) setLoading(false);
      return;
    }

    // ── Desktop + iOS PWA standalone ───────────────────────────────────────
    // signInWithPopup ouvre une fenêtre. Sur iOS PWA, la communication
    // popup→app est bloquée : la promesse throw même si l'auth a réussi.
    // Firebase a toutefois écrit la session en IndexedDB.
    // Solution : attendre 2s qu'onAuthStateChanged confirme. Si rien → reload.
    // Le reload force Firebase à lire l'IndexedDB → utilisateur connecté.
    try {
      await onSignInWithGoogle();
      // Résolu normalement (desktop) → onAuthStateChanged va démonter ce composant
    } catch (e) {
      if (!isCurrent()) return;

      if (CANCELLED_CODES.includes(e?.code)) {
        // L'utilisateur a fermé la popup volontairement
        setLoading(false);
        return;
      }

      // Attendre 2s qu'onAuthStateChanged confirme (cas desktop lent ou iOS chanceux)
      const authConfirmed = await new Promise((resolve) => {
        const timer = setTimeout(() => { unsub(); resolve(false); }, 2000);
        const unsub = onAuthStateChanged(auth, (user) => {
          if (user) { clearTimeout(timer); unsub(); resolve(true); }
        });
      });

      if (!isCurrent()) return;
      if (authConfirmed) return; // composant va se démonter via App.jsx

      // iOS PWA : auth probablement en IndexedDB mais non notifiée dans cette session.
      // Reload → Firebase relit l'IndexedDB → onAuthStateChanged fire → connecté.
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
