# Phase 1 — PWA + Authentification : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre l'app installable sur iOS/Android en PWA et bloquer tout accès sans compte Google ou Apple via Firebase Auth.

**Architecture:** Firebase Auth gère l'OAuth côté frontend (SDK client) ; le backend vérifie chaque requête avec `firebase-admin` via un middleware `requireAuth` qui crée ou met à jour le `User` en base. L'app affiche un écran de login si l'utilisateur n'est pas connecté, un spinner pendant la résolution de l'état auth, puis l'app normale.

**Tech Stack:** React CRA · Firebase JS SDK v9 (modular) · firebase-admin (Node) · MongoDB/Mongoose · Express · Vercel

> **Répertoires :**
> - Frontend : `/Users/matthias/Desktop/pokebattle-app/`
> - Backend  : `/Users/matthias/Desktop/pokebattle-backend/`

---

## Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `src/firebase.js` | Créer — init Firebase SDK |
| `src/hooks/useAuth.js` | Créer — AuthContext + hook |
| `src/components/LoginScreen.jsx` | Créer — écran de connexion |
| `src/App.jsx` | Modifier — gate auth + AuthProvider |
| `src/hooks/useAPI.js` | Modifier — ajouter header Authorization |
| `src/index.js` | Modifier — enregistrer le service worker |
| `public/service-worker.js` | Créer — SW cache-first minimal |
| `public/manifest.json` | Modifier — fix `start_url` |
| `backend/models/User.js` | Créer — modèle User MongoDB |
| `backend/middleware/requireAuth.js` | Créer — middleware JWT Firebase |
| `backend/server.js` | Modifier — appliquer requireAuth aux routes |
| `backend/package.json` | Modifier — ajouter firebase-admin |

---

## Task 1 : Prérequis manuel — Créer le projet Firebase

> Aucun code à écrire. Étapes manuelles obligatoires avant de continuer.

- [ ] **Étape 1 : Créer un projet Firebase**

  1. Aller sur [console.firebase.google.com](https://console.firebase.google.com)
  2. « Créer un projet » → nommer « PokéScores » → désactiver Google Analytics (optionnel)
  3. Dans **Authentication > Sign-in method**, activer **Google**
  4. Dans **Authentication > Sign-in method**, activer **Apple** (nécessite un compte Apple Developer avec un Service ID, une clé privée p8 et un Team ID — voir [doc Firebase Apple](https://firebase.google.com/docs/auth/web/apple))
  5. Dans **Paramètres du projet > Général**, section « Vos applications », cliquer **Ajouter une application web** → noter le `firebaseConfig` (apiKey, authDomain, projectId, etc.)

- [ ] **Étape 2 : Générer la clé de compte de service (pour le backend)**

  1. **Paramètres du projet > Comptes de service > Générer une nouvelle clé privée**
  2. Télécharger le JSON → noter `project_id`, `private_key`, `client_email`
  3. Ne jamais committer ce fichier

- [ ] **Étape 3 : Ajouter les domaines autorisés**

  Dans **Authentication > Paramètres > Domaines autorisés**, ajouter :
  - `localhost`
  - Le domaine de production Vercel (ex. `pokescores.vercel.app`)

---

## Task 2 : Frontend — Fixer `public/manifest.json` et activer le service worker

**Fichiers :**
- Modifier : `public/manifest.json`
- Créer : `public/service-worker.js`
- Modifier : `src/index.js`

- [ ] **Étape 1 : Corriger `start_url` dans le manifest**

  Dans `public/manifest.json`, changer :
  ```json
  "start_url": "."
  ```
  en :
  ```json
  "start_url": "/"
  ```

- [ ] **Étape 2 : Créer `public/service-worker.js`**

  ```js
  // public/service-worker.js
  const CACHE_NAME = 'pokescores-v1';

  self.addEventListener('install', () => self.skipWaiting());

  self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
  });

  self.addEventListener('fetch', (event) => {
    const url = event.request.url;
    // Ne pas intercepter les appels API ni les ressources cross-origin
    if (!url.startsWith(self.location.origin)) return;
    if (url.includes('/api/')) return;

    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
        return cached || networkFetch;
      })
    );
  });
  ```

- [ ] **Étape 3 : Enregistrer le service worker dans `src/index.js`**

  Fichier actuel :
  ```js
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
  ```

  Nouveau contenu :
  ```js
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

  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(`${process.env.PUBLIC_URL}/service-worker.js`)
        .then((reg) => console.log('SW registered:', reg.scope))
        .catch((err) => console.warn('SW registration failed:', err));
    });
  }
  ```

- [ ] **Étape 4 : Vérifier en production**

  ```bash
  cd /Users/matthias/Desktop/pokebattle-app
  npm run build
  ```

  Attendu : build sans erreur. Ouvrir `build/service-worker.js` → fichier présent.

---

## Task 3 : Frontend — Installer Firebase et créer `src/firebase.js`

**Fichiers :**
- Modifier : `package.json` (via npm install)
- Créer : `src/firebase.js`
- Créer : `.env` (ne pas committer)

- [ ] **Étape 1 : Installer le SDK Firebase**

  ```bash
  cd /Users/matthias/Desktop/pokebattle-app
  npm install firebase
  ```

  Attendu : `firebase` apparaît dans `node_modules/` et `package.json`.

- [ ] **Étape 2 : Créer `.env` à la racine du frontend**

  ```
  # /Users/matthias/Desktop/pokebattle-app/.env
  # Remplacer les valeurs par celles du firebaseConfig obtenu à la Task 1
  REACT_APP_FIREBASE_API_KEY=AIza...
  REACT_APP_FIREBASE_AUTH_DOMAIN=pokescores-xxxxx.firebaseapp.com
  REACT_APP_FIREBASE_PROJECT_ID=pokescores-xxxxx
  REACT_APP_FIREBASE_STORAGE_BUCKET=pokescores-xxxxx.appspot.com
  REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
  REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123
  ```

  Vérifier que `.env` est dans `.gitignore` :
  ```bash
  grep ".env" /Users/matthias/Desktop/pokebattle-app/.gitignore
  ```
  Si absent, l'ajouter.

- [ ] **Étape 3 : Créer `src/firebase.js`**

  ```js
  // src/firebase.js
  import { initializeApp } from 'firebase/app';
  import { getAuth } from 'firebase/auth';

  const firebaseConfig = {
    apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.REACT_APP_FIREBASE_APP_ID,
  };

  const app = initializeApp(firebaseConfig);
  export const auth = getAuth(app);
  ```

- [ ] **Étape 4 : Vérifier que l'app démarre**

  ```bash
  cd /Users/matthias/Desktop/pokebattle-app
  npm start
  ```

  Attendu : l'app se charge normalement (pas encore de gate auth). Console sans erreur Firebase.

---

## Task 4 : Frontend — Créer `src/hooks/useAuth.js`

**Fichiers :**
- Créer : `src/hooks/useAuth.js`
- Créer : `src/hooks/useAuth.test.js`

- [ ] **Étape 1 : Écrire le test d'abord**

  ```js
  // src/hooks/useAuth.test.js
  import { renderHook } from '@testing-library/react';
  import { AuthProvider, useAuth } from './useAuth';

  // Mock Firebase Auth
  jest.mock('../firebase', () => ({
    auth: {},
  }));
  jest.mock('firebase/auth', () => ({
    onAuthStateChanged: (auth, cb) => {
      cb(null); // simulate unauthenticated
      return () => {};
    },
    GoogleAuthProvider: jest.fn(),
    OAuthProvider:      jest.fn().mockImplementation(() => ({ addScope: jest.fn() })),
    signInWithPopup:    jest.fn(),
    signOut:            jest.fn(),
  }));

  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  test('useAuth retourne user=null et loading=false après résolution', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    // After onAuthStateChanged fires cb(null), loading becomes false
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
  });

  test('useAuth expose signInWithGoogle et signInWithApple', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(typeof result.current.signInWithGoogle).toBe('function');
    expect(typeof result.current.signInWithApple).toBe('function');
  });
  ```

- [ ] **Étape 2 : Lancer le test — il doit échouer**

  ```bash
  cd /Users/matthias/Desktop/pokebattle-app
  npm test -- --testPathPattern=useAuth --watchAll=false
  ```

  Attendu : FAIL — `useAuth` n'existe pas encore.

- [ ] **Étape 3 : Créer `src/hooks/useAuth.js`**

  ```jsx
  // src/hooks/useAuth.js
  import { createContext, useContext, useState, useEffect } from 'react';
  import { auth } from '../firebase';
  import {
    onAuthStateChanged,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
    signOut as firebaseSignOut,
  } from 'firebase/auth';

  const AuthContext = createContext(null);

  export function AuthProvider({ children }) {
    const [user, setUser]       = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      return onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);
      });
    }, []);

    const signInWithGoogle = async () => {
      const provider = new GoogleAuthProvider();
      return signInWithPopup(auth, provider);
    };

    const signInWithApple = async () => {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      return signInWithPopup(auth, provider);
    };

    const signOut = () => firebaseSignOut(auth);

    return (
      <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithApple, signOut }}>
        {children}
      </AuthContext.Provider>
    );
  }

  export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
    return ctx;
  };
  ```

- [ ] **Étape 4 : Lancer le test — il doit passer**

  ```bash
  npm test -- --testPathPattern=useAuth --watchAll=false
  ```

  Attendu : PASS (2 tests).

---

## Task 5 : Frontend — Créer `src/components/LoginScreen.jsx`

**Fichiers :**
- Créer : `src/components/LoginScreen.jsx`

- [ ] **Étape 1 : Écrire le test**

  ```js
  // src/components/LoginScreen.test.jsx
  import { render, screen, fireEvent } from '@testing-library/react';
  import { LoginScreen } from './LoginScreen';

  test('affiche les deux boutons de connexion', () => {
    render(<LoginScreen onSignInWithGoogle={() => {}} onSignInWithApple={() => {}} />);
    expect(screen.getByText(/Continuer avec Google/i)).toBeInTheDocument();
    expect(screen.getByText(/Continuer avec Apple/i)).toBeInTheDocument();
  });

  test('appelle onSignInWithGoogle au clic', () => {
    const mockGoogle = jest.fn();
    render(<LoginScreen onSignInWithGoogle={mockGoogle} onSignInWithApple={() => {}} />);
    fireEvent.click(screen.getByText(/Continuer avec Google/i));
    expect(mockGoogle).toHaveBeenCalledTimes(1);
  });
  ```

- [ ] **Étape 2 : Lancer le test — il doit échouer**

  ```bash
  npm test -- --testPathPattern=LoginScreen --watchAll=false
  ```

  Attendu : FAIL.

- [ ] **Étape 3 : Créer `src/components/LoginScreen.jsx`**

  ```jsx
  // src/components/LoginScreen.jsx
  import React, { useState } from 'react';

  export function LoginScreen({ onSignInWithGoogle, onSignInWithApple }) {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');

    const handle = (fn) => async () => {
      setError('');
      setLoading(true);
      try {
        await fn();
      } catch (e) {
        setError(e.code === 'auth/popup-closed-by-user'
          ? ''
          : 'Connexion échouée. Réessaie.');
      } finally {
        setLoading(false);
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
          <p className="text-gray-400 mt-2 text-sm">Enregistre tes combats Pokémon</p>
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
            Continuer avec Google
          </button>

          <button
            onClick={handle(onSignInWithApple)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900
                       font-semibold py-3.5 rounded-xl shadow disabled:opacity-50 active:scale-95
                       transition-transform"
          >
            <i className="fab fa-apple text-xl leading-none" />
            Continuer avec Apple
          </button>
        </div>

        {/* États */}
        {loading && (
          <div className="mt-8 flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            Connexion en cours…
          </div>
        )}
        {error && (
          <p className="mt-4 text-red-400 text-sm text-center">{error}</p>
        )}
      </div>
    );
  }
  ```

- [ ] **Étape 4 : Lancer le test — il doit passer**

  ```bash
  npm test -- --testPathPattern=LoginScreen --watchAll=false
  ```

  Attendu : PASS.

---

## Task 6 : Frontend — Modifier `src/App.jsx` pour le gate auth

**Fichiers :**
- Modifier : `src/App.jsx`

- [ ] **Étape 1 : Ajouter les imports en haut de `src/App.jsx`**

  Après la ligne `import { ToastProvider, useToast } from './components/Toast';`, ajouter :
  ```js
  import { AuthProvider, useAuth } from './hooks/useAuth';
  import { LoginScreen } from './components/LoginScreen';
  ```

- [ ] **Étape 2 : Ajouter le hook `useAuth` dans `AppContent`**

  Au tout début de la fonction `AppContent`, avant `const toast = useToast();`, ajouter :
  ```js
  const { user, loading: authLoading, signInWithGoogle, signInWithApple } = useAuth();
  ```

- [ ] **Étape 3 : Remplacer l'effet de chargement des données**

  Remplacer :
  ```js
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAllData(); }, []);
  ```
  Par :
  ```js
  // Charge les données seulement une fois l'utilisateur authentifié
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (user) loadAllData(); }, [user]);
  ```

- [ ] **Étape 4 : Ajouter les retours conditionnels AVANT `if (initialLoading)`**

  Remplacer le bloc :
  ```js
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <p className="text-xl font-black text-gray-900">Chargement...</p>
      </div>
    );
  }
  ```
  Par :
  ```js
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onSignInWithGoogle={signInWithGoogle}
        onSignInWithApple={signInWithApple}
      />
    );
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <p className="text-xl font-black text-gray-900">Chargement...</p>
      </div>
    );
  }
  ```

- [ ] **Étape 5 : Envelopper `App` avec `AuthProvider`**

  Remplacer la fonction `App` :
  ```js
  function App() {
    const [isDark, setIsDark] = useState(false);
    return (
      <ToastProvider isDark={isDark}>
        <AppContent isDark={isDark} setIsDark={setIsDark} />
      </ToastProvider>
    );
  }
  ```
  Par :
  ```js
  function App() {
    const [isDark, setIsDark] = useState(false);
    return (
      <AuthProvider>
        <ToastProvider isDark={isDark}>
          <AppContent isDark={isDark} setIsDark={setIsDark} />
        </ToastProvider>
      </AuthProvider>
    );
  }
  ```

- [ ] **Étape 6 : Vérifier visuellement**

  ```bash
  npm start
  ```

  Attendu : l'app affiche l'écran de login (fond noir, boutons Google + Apple). Cliquer Google → popup Firebase s'ouvre → connexion → app normale avec données.

---

## Task 7 : Frontend — Ajouter le header `Authorization` dans `src/hooks/useAPI.js`

**Fichiers :**
- Modifier : `src/hooks/useAPI.js`

- [ ] **Étape 1 : Écrire le test**

  ```js
  // src/hooks/useAPI.test.js
  import { renderHook, act } from '@testing-library/react';
  import { useAPI } from './useAPI';

  // Mock firebase auth
  jest.mock('../firebase', () => ({
    auth: {
      currentUser: {
        getIdToken: jest.fn().mockResolvedValue('mock-token'),
      },
    },
  }));

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [],
  });

  test('fetchPlayers envoie le header Authorization', async () => {
    const { result } = renderHook(() => useAPI());
    await act(async () => {
      await result.current.fetchPlayers();
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/players'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer mock-token' }),
      })
    );
  });
  ```

- [ ] **Étape 2 : Lancer le test — il doit échouer**

  ```bash
  npm test -- --testPathPattern=useAPI --watchAll=false
  ```

  Attendu : FAIL — pas de header Authorization.

- [ ] **Étape 3 : Modifier `src/hooks/useAPI.js`**

  Ajouter en haut du fichier, après `import { useState, useCallback } from 'react';` :
  ```js
  import { auth } from '../firebase';

  const getAuthHeaders = async () => {
    const token = await auth.currentUser?.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  ```

  Puis modifier chaque `fetch` pour inclure ces headers.

  **fetchPlayers** — remplacer :
  ```js
  const res = await fetch(`${API_BASE_URL}/players`);
  ```
  Par :
  ```js
  const res = await fetch(`${API_BASE_URL}/players`, {
    headers: await getAuthHeaders(),
  });
  ```

  **fetchBattles** — même modification pour `/battles`.

  **fetchTeams** — même modification pour `/teams`.

  **createPlayer** — remplacer dans les headers :
  ```js
  headers: { 'Content-Type': 'application/json' },
  ```
  Par :
  ```js
  headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
  ```

  **updatePlayer**, **createBattle**, **updateBattle**, **createTeam**, **updateTeam** — même modification (ajout de `...(await getAuthHeaders())` dans chaque objet `headers`).

  **deletePlayer**, **deleteBattle**, **deleteTeam** — ajouter après `method: 'DELETE'` :
  ```js
  headers: await getAuthHeaders(),
  ```

- [ ] **Étape 4 : Lancer le test — il doit passer**

  ```bash
  npm test -- --testPathPattern=useAPI --watchAll=false
  ```

  Attendu : PASS.

---

## Task 8 : Backend — Installer `firebase-admin` et préparer `.env`

**Fichiers :**
- Modifier : `package.json` (via npm install)
- Modifier : `.env`

- [ ] **Étape 1 : Installer `firebase-admin`**

  ```bash
  cd /Users/matthias/Desktop/pokebattle-backend
  npm install firebase-admin
  ```

  Attendu : `firebase-admin` dans `node_modules/` et `package.json`.

- [ ] **Étape 2 : Ajouter les variables dans `.env`**

  Ouvrir `/Users/matthias/Desktop/pokebattle-backend/.env` et ajouter :
  ```
  # Firebase Admin (valeurs tirées du JSON de compte de service — Task 1 Étape 2)
  FIREBASE_PROJECT_ID=pokescores-xxxxx
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
  FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@pokescores-xxxxx.iam.gserviceaccount.com
  ```

  > **Important :** Sur Vercel, la `FIREBASE_PRIVATE_KEY` doit être copiée **exactement** telle quelle depuis le JSON, avec les `\n` littéraux. Le code fait `.replace(/\\n/g, '\n')` pour convertir.

- [ ] **Étape 3 : Ajouter les variables sur Vercel**

  Dans le dashboard Vercel du backend, aller dans **Settings > Environment Variables** et ajouter les 3 variables.

---

## Task 9 : Backend — Créer `models/User.js`

**Fichiers :**
- Créer : `models/User.js`

- [ ] **Étape 1 : Créer le modèle**

  ```js
  // models/User.js
  const mongoose = require('mongoose');

  const userSchema = new mongoose.Schema({
    firebaseUid:  { type: String, required: true, unique: true, index: true },
    email:        { type: String, default: null },
    displayName:  { type: String, default: null },
    role:         { type: String, enum: ['user', 'superadmin'], default: 'user' },
    // Sera renseigné en Phase 2 (liaison User ↔ Player)
    playerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    createdAt:    { type: Date, default: Date.now },
    updatedAt:    { type: Date, default: Date.now },
  });

  module.exports = mongoose.model('User', userSchema);
  ```

- [ ] **Étape 2 : Vérifier le fichier**

  ```bash
  node -e "const User = require('./models/User'); console.log(User.schema.obj)"
  ```

  Attendu : objet avec les champs `firebaseUid`, `email`, `displayName`, `role`, `playerId`.

---

## Task 10 : Backend — Créer `middleware/requireAuth.js`

**Fichiers :**
- Créer : `middleware/` (dossier)
- Créer : `middleware/requireAuth.js`

- [ ] **Étape 1 : Créer le dossier**

  ```bash
  mkdir -p /Users/matthias/Desktop/pokebattle-backend/middleware
  ```

- [ ] **Étape 2 : Créer le middleware**

  ```js
  // middleware/requireAuth.js
  const admin = require('firebase-admin');
  const User  = require('../models/User');

  // Initialisation de l'Admin SDK (une seule fois, pattern serverless)
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }

  /**
   * Vérifie le token JWT Firebase, crée ou met à jour le User en base,
   * attache req.user pour les middlewares suivants.
   */
  const requireAuth = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Non authentifié : header Authorization manquant' });
    }

    try {
      const token   = header.split(' ')[1];
      const decoded = await admin.auth().verifyIdToken(token);

      const user = await User.findOneAndUpdate(
        { firebaseUid: decoded.uid },
        {
          $set: {
            email:       decoded.email ?? null,
            displayName: decoded.name ?? decoded.email?.split('@')[0] ?? 'Joueur',
            updatedAt:   new Date(),
          },
          $setOnInsert: {
            firebaseUid: decoded.uid,
            role:        'user',
            playerId:    null,
            createdAt:   new Date(),
          },
        },
        { upsert: true, new: true }
      );

      req.user = user;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
  };

  module.exports = requireAuth;
  ```

- [ ] **Étape 3 : Vérifier la syntaxe**

  ```bash
  node -e "require('./middleware/requireAuth')"
  ```

  Attendu : aucune erreur (le module se charge sans crash).

---

## Task 11 : Backend — Appliquer `requireAuth` dans `server.js`

**Fichiers :**
- Modifier : `server.js`

- [ ] **Étape 1 : Ajouter le `require` en haut de `server.js`**

  Après `const cors = require('cors');`, ajouter :
  ```js
  const requireAuth = require('./middleware/requireAuth');
  ```

- [ ] **Étape 2 : Protéger les routes**

  Remplacer :
  ```js
  // Routes
  app.use('/api/players', require('./routes/players'));
  app.use('/api/teams',   require('./routes/teams'));
  app.use('/api/battles', require('./routes/battles'));
  ```
  Par :
  ```js
  // Routes protégées — requireAuth vérifie le token et crée/met à jour req.user
  app.use('/api/players', requireAuth, require('./routes/players'));
  app.use('/api/teams',   requireAuth, require('./routes/teams'));
  app.use('/api/battles', requireAuth, require('./routes/battles'));
  ```

  Le health check reste non protégé :
  ```js
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', mongo: mongoose.connection.readyState });
  });
  ```

- [ ] **Étape 3 : Tester localement**

  Dans un terminal :
  ```bash
  cd /Users/matthias/Desktop/pokebattle-backend
  node server.js
  ```

  Dans un autre terminal — appel sans token → 401 :
  ```bash
  curl -s http://localhost:3001/api/players | python3 -m json.tool
  ```
  Attendu : `{"error": "Non authentifié : header Authorization manquant"}`

  Appel avec token fictif → 401 "Token invalide" :
  ```bash
  curl -s -H "Authorization: Bearer fake" http://localhost:3001/api/players
  ```
  Attendu : `{"error": "Token invalide ou expiré"}`

  Health check reste accessible :
  ```bash
  curl -s http://localhost:3001/api/health
  ```
  Attendu : `{"status": "ok", ...}`

- [ ] **Étape 4 : Test d'intégration complet**

  1. Lancer `npm start` dans le frontend
  2. Se connecter avec Google
  3. Naviguer dans l'app (Joueurs, Équipes, Combats)
  4. Vérifier dans la console réseau que les requêtes `/api/*` ont bien le header `Authorization: Bearer <token>`
  5. Vérifier dans MongoDB (Compass ou Atlas) que la collection `users` contient l'entrée créée

---

## Récapitulatif des variables d'environnement

### Frontend (`.env`)
```
REACT_APP_FIREBASE_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN
REACT_APP_FIREBASE_PROJECT_ID
REACT_APP_FIREBASE_STORAGE_BUCKET
REACT_APP_FIREBASE_MESSAGING_SENDER_ID
REACT_APP_FIREBASE_APP_ID
```

### Backend (`.env` + Vercel env vars)
```
FIREBASE_PROJECT_ID
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL
```
