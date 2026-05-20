# Phase 2 — Liaison User ↔ Player : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** À la première connexion, afficher un écran non contournable qui lie le compte Firebase à une fiche joueur existante ou en crée une nouvelle.

**Architecture:** Le modèle `Player` reçoit un champ `userId`. Une route `PATCH /api/users/me/claim-player` et une route `POST /api/users/me/create-player` gèrent la liaison côté backend. Le hook `useAuth` expose désormais `dbUser` (le User MongoDB) en plus du Firebase user. L'app affiche `ClaimPlayerScreen` quand `dbUser.playerId === null`.

**Tech Stack:** React CRA · Express · MongoDB/Mongoose · Firebase Auth (déjà configuré en Phase 1)

> **Prérequis :** Phase 1 terminée (auth opérationnelle, `requireAuth` en place).
>
> **Répertoires :**
> - Frontend : `/Users/matthias/Desktop/pokebattle-app/`
> - Backend  : `/Users/matthias/Desktop/pokebattle-backend/`

---

## Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `backend/models/Player.js` | Modifier — ajouter champ `userId` |
| `backend/routes/users.js` | Créer — GET /me, PATCH /me/claim-player, POST /me/create-player |
| `backend/server.js` | Modifier — enregistrer `/api/users` |
| `src/hooks/useAuth.js` | Modifier — fetcher `dbUser`, exposer `playerId`, `refetchDbUser` |
| `src/components/ClaimPlayerScreen.jsx` | Créer — écran de réclamation/création |
| `src/App.jsx` | Modifier — afficher `ClaimPlayerScreen` si `dbUser.playerId === null` |

---

## Task 1 : Backend — Ajouter `userId` au modèle `Player`

**Fichiers :**
- Modifier : `models/Player.js`

- [ ] **Étape 1 : Modifier le schéma**

  Dans `models/Player.js`, ajouter le champ `userId` après `updatedAt` :

  Remplacer :
  ```js
  const playerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    avatar: { type: String, default: null },
    stats: {
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 }
    },
    pokemon: [{
      id: String,
      pokeId: Number,
      name: String,
      level: { type: Number, default: 50 }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });
  ```
  Par :
  ```js
  const playerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    avatar: { type: String, default: null },
    stats: {
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 }
    },
    pokemon: [{
      id: String,
      pokeId: Number,
      name: String,
      level: { type: Number, default: 50 }
    }],
    // Lié à un User MongoDB après réclamation (Phase 2). null = fiche disponible.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });
  ```

- [ ] **Étape 2 : Vérifier**

  ```bash
  cd /Users/matthias/Desktop/pokebattle-backend
  node -e "const P = require('./models/Player'); console.log(Object.keys(P.schema.obj))"
  ```

  Attendu : `[ 'name', 'avatar', 'stats', 'pokemon', 'userId', 'createdAt', 'updatedAt' ]`

  > **Migration :** Les joueurs existants en base gardent `userId: null` par défaut (MongoDB ne touche pas aux documents existants). Ils apparaissent comme « disponibles » dans l'écran de réclamation.

---

## Task 2 : Backend — Créer `routes/users.js`

**Fichiers :**
- Créer : `routes/users.js`

- [ ] **Étape 1 : Créer le fichier**

  ```js
  // routes/users.js
  const express = require('express');
  const router  = express.Router();
  const User    = require('../models/User');
  const Player  = require('../models/Player');

  // Toutes ces routes reçoivent req.user depuis le middleware requireAuth
  // appliqué dans server.js (voir Task 3).

  // GET /api/users/me — renvoie le User MongoDB courant
  router.get('/me', async (req, res) => {
    res.json(req.user);
  });

  // PATCH /api/users/me/claim-player — lie le User à une fiche joueur existante
  router.patch('/me/claim-player', async (req, res) => {
    const { playerId } = req.body;
    if (!playerId) {
      return res.status(400).json({ error: 'playerId requis' });
    }

    // Vérifier que le joueur existe et n'est pas déjà réclamé
    let player;
    try {
      player = await Player.findById(playerId);
    } catch {
      return res.status(400).json({ error: 'playerId invalide' });
    }
    if (!player) return res.status(404).json({ error: 'Joueur introuvable' });
    if (player.userId) return res.status(409).json({ error: 'Ce joueur est déjà réclamé' });

    // Liaison atomique (deux opérations séparées — MongoDB sans transaction)
    await Player.findByIdAndUpdate(playerId, { userId: req.user._id, updatedAt: new Date() });
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { playerId, updatedAt: new Date() },
      { new: true }
    );
    res.json(updatedUser);
  });

  // POST /api/users/me/create-player — crée une nouvelle fiche et la lie immédiatement
  router.post('/me/create-player', async (req, res) => {
    const { name, avatar } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'name requis' });
    }

    const player = await Player.create({
      name:   name.trim(),
      avatar: avatar ?? null,
      stats:  { wins: 0, losses: 0 },
      pokemon: [],
      userId: req.user._id,
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { playerId: player._id, updatedAt: new Date() },
      { new: true }
    );
    res.status(201).json({ user: updatedUser, player });
  });

  module.exports = router;
  ```

- [ ] **Étape 2 : Vérifier la syntaxe**

  ```bash
  cd /Users/matthias/Desktop/pokebattle-backend
  node -e "require('./routes/users'); console.log('OK')"
  ```

  Attendu : `OK`

---

## Task 3 : Backend — Enregistrer `/api/users` dans `server.js`

**Fichiers :**
- Modifier : `server.js`

- [ ] **Étape 1 : Ajouter la route**

  Dans `server.js`, après la ligne :
  ```js
  app.use('/api/battles', requireAuth, require('./routes/battles'));
  ```
  Ajouter :
  ```js
  app.use('/api/users',   requireAuth, require('./routes/users'));
  ```

- [ ] **Étape 2 : Tester les nouvelles routes**

  Démarrer le serveur :
  ```bash
  node server.js
  ```

  Appel sans token → 401 :
  ```bash
  curl -s http://localhost:3001/api/users/me
  ```
  Attendu : `{"error": "Non authentifié : header Authorization manquant"}`

  > Le test avec un vrai token Firebase se fera lors de l'intégration complète (Task 6).

---

## Task 4 : Frontend — Étendre `src/hooks/useAuth.js` pour exposer `dbUser`

**Fichiers :**
- Modifier : `src/hooks/useAuth.js`
- Modifier : `src/hooks/useAuth.test.js`

- [ ] **Étape 1 : Mettre à jour le test**

  Remplacer le contenu de `src/hooks/useAuth.test.js` par :
  ```js
  // src/hooks/useAuth.test.js
  import { renderHook, act, waitFor } from '@testing-library/react';
  import React from 'react';
  import { AuthProvider, useAuth } from './useAuth';

  jest.mock('../firebase', () => ({ auth: {} }));

  const mockDbUser = { _id: 'u1', playerId: null, role: 'user' };

  jest.mock('firebase/auth', () => ({
    onAuthStateChanged: (auth, cb) => {
      cb({ uid: 'abc', getIdToken: async () => 'tok' });
      return () => {};
    },
    GoogleAuthProvider: jest.fn(),
    OAuthProvider:      jest.fn().mockImplementation(() => ({ addScope: jest.fn() })),
    signInWithPopup:    jest.fn(),
    signOut:            jest.fn(),
  }));

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => mockDbUser,
  });

  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  test('useAuth expose dbUser après chargement', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.dbUser).not.toBeNull());
    expect(result.current.dbUser.role).toBe('user');
  });

  test('isSuperAdmin est false pour un user standard', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.dbUser).not.toBeNull());
    expect(result.current.isSuperAdmin).toBe(false);
  });
  ```

- [ ] **Étape 2 : Lancer le test — il doit échouer**

  ```bash
  cd /Users/matthias/Desktop/pokebattle-app
  npm test -- --testPathPattern=useAuth --watchAll=false
  ```

  Attendu : FAIL — `dbUser` et `isSuperAdmin` n'existent pas encore.

- [ ] **Étape 3 : Mettre à jour `src/hooks/useAuth.js`**

  Remplacer le contenu complet du fichier :
  ```jsx
  // src/hooks/useAuth.js
  import { createContext, useContext, useState, useEffect, useCallback } from 'react';
  import { auth } from '../firebase';
  import {
    onAuthStateChanged,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
    signOut as firebaseSignOut,
  } from 'firebase/auth';

  const API_BASE_URL = 'https://pokebattle-backend.vercel.app/api';
  const AuthContext  = createContext(null);

  export function AuthProvider({ children }) {
    const [user,          setUser]          = useState(null);
    const [loading,       setLoading]       = useState(true);
    const [dbUser,        setDbUser]        = useState(null);
    const [dbUserLoading, setDbUserLoading] = useState(false);

    // Charge le User MongoDB dès que le Firebase user est connu
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
      return onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);
        fetchDbUser(firebaseUser);
      });
    }, [fetchDbUser]);

    // Appelée après une réclamation/création de joueur pour rafraîchir dbUser
    const refetchDbUser = useCallback(async () => {
      if (user) await fetchDbUser(user);
    }, [user, fetchDbUser]);

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
        signInWithApple,
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
  ```

- [ ] **Étape 4 : Lancer le test — il doit passer**

  ```bash
  npm test -- --testPathPattern=useAuth --watchAll=false
  ```

  Attendu : PASS (2 tests).

---

## Task 5 : Frontend — Créer `src/components/ClaimPlayerScreen.jsx`

**Fichiers :**
- Créer : `src/components/ClaimPlayerScreen.jsx`

- [ ] **Étape 1 : Écrire le test**

  ```js
  // src/components/ClaimPlayerScreen.test.jsx
  import { render, screen, fireEvent, waitFor } from '@testing-library/react';
  import { ClaimPlayerScreen } from './ClaimPlayerScreen';

  const mockPlayers = [
    { _id: 'p1', name: 'Ash', avatar: null },
    { _id: 'p2', name: 'Misty', avatar: null },
  ];

  test('affiche la liste des joueurs disponibles', () => {
    render(
      <ClaimPlayerScreen
        availablePlayers={mockPlayers}
        onClaim={jest.fn()}
        onCreatePlayer={jest.fn()}
        loading={false}
      />
    );
    expect(screen.getByText('Ash')).toBeInTheDocument();
    expect(screen.getByText('Misty')).toBeInTheDocument();
  });

  test('affiche l\'option de création', () => {
    render(
      <ClaimPlayerScreen
        availablePlayers={mockPlayers}
        onClaim={jest.fn()}
        onCreatePlayer={jest.fn()}
        loading={false}
      />
    );
    expect(screen.getByText(/Créer mon profil/i)).toBeInTheDocument();
  });

  test('appelle onClaim avec le bon playerId', () => {
    const mockClaim = jest.fn();
    render(
      <ClaimPlayerScreen
        availablePlayers={mockPlayers}
        onClaim={mockClaim}
        onCreatePlayer={jest.fn()}
        loading={false}
      />
    );
    fireEvent.click(screen.getByText('Ash'));
    expect(mockClaim).toHaveBeenCalledWith('p1');
  });
  ```

- [ ] **Étape 2 : Lancer le test — il doit échouer**

  ```bash
  npm test -- --testPathPattern=ClaimPlayerScreen --watchAll=false
  ```

  Attendu : FAIL.

- [ ] **Étape 3 : Créer `src/components/ClaimPlayerScreen.jsx`**

  ```jsx
  // src/components/ClaimPlayerScreen.jsx
  import React, { useState } from 'react';

  /**
   * Affiché à la première connexion quand dbUser.playerId === null.
   * Permet de réclamer une fiche existante ou d'en créer une nouvelle.
   *
   * Props :
   *   availablePlayers  — liste des Player avec userId: null
   *   onClaim(playerId) — appelle PATCH /api/users/me/claim-player
   *   onCreatePlayer({ name, avatar }) — appelle POST /api/users/me/create-player
   *   loading           — spinner pendant la requête
   */
  export function ClaimPlayerScreen({ availablePlayers, onClaim, onCreatePlayer, loading }) {
    const [creating, setCreating] = useState(false);
    const [name, setName]         = useState('');
    const [error, setError]       = useState('');

    const handleCreate = async () => {
      if (!name.trim()) { setError('Donne un nom à ton profil.'); return; }
      setError('');
      await onCreatePlayer({ name: name.trim(), avatar: null });
    };

    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-start pt-16 px-6 pb-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white">Quel est ton joueur ?</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Sélectionne ta fiche existante ou crée ton profil.
          </p>
        </div>

        {/* Liste des joueurs disponibles */}
        <div className="w-full max-w-sm space-y-2 mb-4">
          {availablePlayers.map((player) => (
            <button
              key={player._id}
              onClick={() => onClaim(player._id)}
              disabled={loading}
              className="w-full flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800
                         text-white font-medium py-3.5 px-4 rounded-xl transition-colors
                         disabled:opacity-50"
            >
              {player.avatar ? (
                <img
                  src={player.avatar}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-purple-700 flex items-center justify-center
                                text-white font-bold flex-shrink-0">
                  {player.name[0]?.toUpperCase()}
                </div>
              )}
              <span>{player.name}</span>
            </button>
          ))}

          {availablePlayers.length === 0 && !creating && (
            <p className="text-center text-gray-500 text-sm py-4">
              Aucune fiche disponible — crée ton profil ci-dessous.
            </p>
          )}
        </div>

        {/* Séparateur */}
        {!creating && (
          <div className="w-full max-w-sm flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-gray-500">ou</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
        )}

        {/* Formulaire de création */}
        {creating ? (
          <div className="w-full max-w-sm space-y-3">
            <input
              type="text"
              placeholder="Ton nom de joueur"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 text-white placeholder-gray-500 rounded-xl
                         px-4 py-3.5 outline-none focus:ring-2 focus:ring-purple-500"
              maxLength={30}
              autoFocus
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold
                         py-3.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Création…' : 'Créer mon profil'}
            </button>
            <button
              onClick={() => { setCreating(false); setError(''); }}
              className="w-full text-gray-400 text-sm py-2"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full max-w-sm bg-purple-600 hover:bg-purple-500 text-white
                       font-semibold py-3.5 rounded-xl transition-colors"
          >
            Créer mon profil
          </button>
        )}

        {loading && !creating && (
          <div className="mt-6 flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            Liaison en cours…
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Étape 4 : Lancer le test — il doit passer**

  ```bash
  npm test -- --testPathPattern=ClaimPlayerScreen --watchAll=false
  ```

  Attendu : PASS (3 tests).

---

## Task 6 : Frontend — Intégrer `ClaimPlayerScreen` dans `src/App.jsx`

**Fichiers :**
- Modifier : `src/App.jsx`

- [ ] **Étape 1 : Importer `ClaimPlayerScreen` et `useAuth`**

  En haut de `src/App.jsx`, l'import de `useAuth` existe déjà depuis Phase 1.
  Ajouter l'import du composant :
  ```js
  import { ClaimPlayerScreen } from './components/ClaimPlayerScreen';
  ```

- [ ] **Étape 2 : Récupérer les nouveaux éléments du contexte dans `AppContent`**

  La ligne actuelle (Phase 1) :
  ```js
  const { user, loading: authLoading, signInWithGoogle, signInWithApple } = useAuth();
  ```
  Remplacer par :
  ```js
  const {
    user,
    loading: authLoading,
    dbUser,
    dbUserLoading,
    refetchDbUser,
    signInWithGoogle,
    signInWithApple,
  } = useAuth();
  ```

- [ ] **Étape 3 : Ajouter les handlers de réclamation/création**

  Dans `AppContent`, après les déclarations de state (avant `loadAllData`), ajouter :
  ```js
  const [claimLoading, setClaimLoading] = useState(false);

  const handleClaimPlayer = async (playerId) => {
    setClaimLoading(true);
    try {
      const token = await user.getIdToken();
      const res   = await fetch('https://pokebattle-backend.vercel.app/api/users/me/claim-player', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ playerId }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors de la liaison');
        return;
      }
      await refetchDbUser();
    } finally {
      setClaimLoading(false);
    }
  };

  const handleCreatePlayer = async ({ name, avatar }) => {
    setClaimLoading(true);
    try {
      const token = await user.getIdToken();
      const res   = await fetch('https://pokebattle-backend.vercel.app/api/users/me/create-player', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ name, avatar }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors de la création');
        return;
      }
      const { player } = await res.json();
      setPlayers((prev) => [...prev, player]);
      await refetchDbUser();
    } finally {
      setClaimLoading(false);
    }
  };
  ```

  > `useState` est déjà importé. Ajouter `claimLoading` à la liste des états.

- [ ] **Étape 4 : Ajouter le gate `ClaimPlayerScreen`**

  Dans la séquence de guards conditionnels, après `if (!user)` et avant `if (initialLoading)`, ajouter :
  ```js
  // Première connexion : l'utilisateur n'est pas encore lié à une fiche joueur
  if (!dbUserLoading && dbUser && dbUser.playerId === null) {
    return (
      <ClaimPlayerScreen
        availablePlayers={players.filter((p) => !p.userId)}
        onClaim={handleClaimPlayer}
        onCreatePlayer={handleCreatePlayer}
        loading={claimLoading}
      />
    );
  }
  ```

  > La liste `players` est déjà chargée (le `useEffect` se déclenche quand `user` est défini, avant que `dbUser` soit résolu). Si `players` est encore vide, `availablePlayers` sera `[]` mais le composant gère ce cas.

  L'ordre complet des guards :
  ```
  1. if (authLoading)           → spinner auth
  2. if (!user)                 → <LoginScreen>
  3. if (initialLoading)        → spinner données
  4. if (dbUser.playerId===null) → <ClaimPlayerScreen>
  5. return <app normale>
  ```

  **Note :** Mettre le guard `initialLoading` AVANT `ClaimPlayerScreen` pour s'assurer que la liste `players` est disponible quand `ClaimPlayerScreen` s'affiche.

- [ ] **Étape 5 : Test d'intégration**

  1. Se déconnecter de l'app (ou utiliser un compte Firebase fraîchement créé)
  2. Se connecter → écran de réclamation apparaît
  3. Sélectionner un joueur existant → l'app se charge normalement
  4. En MongoDB : vérifier que `players[selected].userId = <_id du User>` et `users[me].playerId = <_id du player>`
  5. Se déconnecter et se reconnecter → l'écran de réclamation ne s'affiche plus (playerId déjà défini)
  6. Créer un compte Firebase différent → tester la création d'un nouveau profil joueur
