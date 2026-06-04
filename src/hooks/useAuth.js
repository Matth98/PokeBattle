// src/hooks/useAuth.js
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
} from 'firebase/auth';

// Sur iOS/Android, signInWithPopup est peu fiable quand aucun compte n'est
// pré-sélectionné. On utilise signInWithRedirect à la place.
// signInWithRedirect fonctionne dans le navigateur mobile, mais PAS en mode
// standalone (PWA installée sur l'écran d'accueil) où la redirection ne revient
// pas dans l'app. Dans ce cas on retombe sur signInWithPopup.
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;
const isMobileWeb = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && !isStandalone;

const API_BASE_URL = 'https://pokebattle-backend.vercel.app/api';
const AuthContext  = createContext(null);

export function AuthProvider({ children }) {
  const [user,          setUser]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [dbUser,        setDbUser]        = useState(null);
  const [dbUserLoading, setDbUserLoading] = useState(false);

  // Fetches the MongoDB User after Firebase auth resolves
  const fetchDbUser = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setDbUser(null);
      return;
    }
    setDbUserLoading(true);
    try {
      const token = await firebaseUser.getIdToken();
      const res   = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDbUser(await res.json());
    } finally {
      setDbUserLoading(false);
    }
  }, []);

  useEffect(() => {
    // Sur mobile, on récupère le résultat d'un éventuel signInWithRedirect
    // avant d'écouter onAuthStateChanged (évite un flash "non connecté").
    if (isMobileWeb) {
      getRedirectResult(auth).catch(() => {});
    }
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      fetchDbUser(firebaseUser);
    });
  }, [fetchDbUser]);

  // Call after claiming/creating a player to refresh dbUser
  const refetchDbUser = useCallback(async () => {
    if (user) await fetchDbUser(user);
  }, [user, fetchDbUser]);

  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    if (isMobileWeb) return signInWithRedirect(auth, provider);
    return signInWithPopup(auth, provider);
  };

  const signOut = () => {
    setDbUser(null);
    return firebaseSignOut(auth);
  };

  const isSuperAdmin = dbUser?.role === 'superadmin';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      dbUser,
      dbUserLoading,
      isSuperAdmin,
      refetchDbUser,
      signInWithGoogle,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
};
