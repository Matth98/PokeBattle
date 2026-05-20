# Design — PokéBattle : PWA + Auth + Multi-utilisateurs

**Date :** 2026-05-20  
**Statut :** Approuvé  
**Stack cible :** React CRA (existant) · Express/MongoDB sur Vercel (existant) · Firebase Auth · PWA

---

## Contexte

L'application PokéBattle est actuellement une app web mono-utilisateur sans authentification : les joueurs sont de simples fiches en base, tout le monde partage la même base de données sans notion de compte ou de droits. L'objectif est de la transformer en PWA installable sur mobile, avec des comptes utilisateurs (Google/Apple OAuth) et un système de droits basé sur la propriété des données.

---

## Périmètre

Ce projet est découpé en **3 phases indépendantes et séquentielles** :

1. **Phase 1** — PWA + Authentification
2. **Phase 2** — Liaison compte utilisateur ↔ profil joueur
3. **Phase 3** — Droits d'édition et rôles

---

## Phase 1 — PWA + Authentification

### Objectif
Rendre l'app installable sur iOS/Android et bloquer tout accès sans compte.

### Choix technique : Firebase Auth
Firebase Auth gère Google OAuth et Apple Sign In sans implémenter le protocole OAuth manuellement. Le backend existant reste quasi intact ; il ajoute un middleware de validation des tokens JWT Firebase.

### Frontend

**Nouveaux fichiers :**

- `src/firebase.js` — initialisation du SDK Firebase (`initializeApp`, `getAuth`)
- `src/hooks/useAuth.js` — contexte React exposant `{ user, loading, signInWithGoogle, signInWithApple, signOut }`
- `src/components/LoginScreen.jsx` — écran affiché à tout utilisateur non authentifié :
  - Bouton "Continuer avec Google"
  - Bouton "Continuer avec Apple"
  - Pas d'accès à l'app sans connexion

**Modification de `App.jsx` :**
```
if (loading)  → spinner plein écran
if (!user)    → <LoginScreen>
else          → app normale (existante)
```

**PWA :**
- `public/manifest.json` : `name`, `short_name`, `icons` (192px + 512px), `theme_color`, `background_color`, `display: "standalone"`, `start_url: "/"`
- Service worker minimal via `workbox` (ou CRA built-in) : mise en cache des assets statiques pour permettre l'installation
- Balises meta iOS dans `public/index.html` : `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`

### Backend

**Nouveau modèle `User` (MongoDB) :**
```js
{
  firebaseUid:  String,   // identifiant Firebase unique, indexed
  email:        String,
  displayName:  String,
  role:         String,   // 'user' | 'superadmin' — défaut: 'user'
  playerId:     ObjectId, // null jusqu'à la Phase 2
  createdAt:    Date,
  updatedAt:    Date
}
```

**Middleware `requireAuth` :**
- Lit le header `Authorization: Bearer <token>`
- Vérifie le token via `firebase-admin` SDK
- Récupère ou crée le `User` en base (upsert sur `firebaseUid`)
- Attache `req.user` pour les middlewares suivants
- Appliqué à **toutes les routes existantes** (`/api/players`, `/api/battles`, `/api/teams`)

**Dépendances backend à ajouter :** `firebase-admin`  
**Variables d'environnement à ajouter :** `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`

---

## Phase 2 — Liaison User ↔ Player

### Objectif
À la première connexion, associer le compte utilisateur à une fiche joueur existante ou nouvelle.

### Flux "première connexion"

1. Après authentification réussie, `useAuth` vérifie `user.playerId === null`
2. Si null → afficher `<ClaimPlayerScreen>` (écran non contournable, remplace l'app)
3. L'écran liste **uniquement les joueurs dont `userId` est null** (les fiches déjà réclamées n'apparaissent pas)
4. Deux actions possibles :
   - **Sélectionner une fiche existante** → lier les deux entités
   - **Créer mon profil** → crée un nouveau `Player` et le lie immédiatement
5. Appel `PATCH /api/users/me/claim-player` avec `{ playerId }` ou `POST /api/users/me/create-player` avec `{ name, avatar }`
6. Backend : `user.playerId = player._id` + `player.userId = user._id` (transaction)
7. Redirection vers l'app normale

### Modifications du modèle `Player`
```js
// Champ ajouté :
userId: { type: ObjectId, ref: 'User', default: null }
```

### Migration des données existantes
Les joueurs déjà en base conservent `userId: null`. Ils sont présentés comme "disponibles" dans la liste de réclamation jusqu'à ce qu'un utilisateur les revendique. Aucune perte de données.

### Nouveau composant frontend
- `src/components/ClaimPlayerScreen.jsx` — liste des joueurs disponibles + option création. Même style que les autres modales bottom-sheet.

---

## Phase 3 — Droits d'édition et rôles

### Objectif
Contrôler qui peut modifier quoi, côté backend (source de vérité) et côté frontend (masquage des actions non autorisées).

### Tableau des permissions

| Resource | Lecture | Création | Modification | Suppression |
|---|---|---|---|---|
| Joueurs | Tout utilisateur connecté | Tout utilisateur connecté | Propriétaire + SuperAdmin | Propriétaire + SuperAdmin |
| Équipes | Tout utilisateur connecté | Tout utilisateur connecté | Propriétaire + SuperAdmin | Propriétaire + SuperAdmin |
| Combats | Tout utilisateur connecté | Tout utilisateur connecté | Les 2 joueurs du combat + SuperAdmin | Créateur du combat + SuperAdmin |
| Utilisateurs | — | Firebase | Soi-même + SuperAdmin | SuperAdmin |

**Propriétaire** d'un joueur ou d'une équipe = l'utilisateur dont `userId` correspond au `userId` de la ressource.  
**Joueurs d'un combat** = l'utilisateur lié à `battle.player1` ou `battle.player2`.  
**Créateur d'un combat** = `battle.createdBy`.

### Modifications du modèle `Battle`
```js
// Champ ajouté :
createdBy: { type: ObjectId, ref: 'User', required: true }
```

### Middlewares backend
- `requireOwner(model, idParam)` — vérifie que `req.user._id === resource.userId` ou `req.user.role === 'superadmin'`
- `requireBattleParticipant` — vérifie que `req.user.playerId` est `player1` ou `player2` du combat, ou `superadmin`
- `requireBattleCreator` — pour la suppression uniquement

### Frontend
- Les boutons "Modifier" / "Supprimer" sont masqués si l'utilisateur n'a pas les droits (vérifié côté client pour l'UX)
- La vérification réelle se fait côté backend (source de vérité)
- `useAuth` expose `isSuperAdmin` pour conditionner l'affichage

### Rôle SuperAdmin
- Défini manuellement en base : `user.role = 'superadmin'`
- Pas d'interface d'administration dans cette phase
- Peut tout modifier, tout supprimer

---

## Ce qui ne change pas
- L'architecture frontend React (composants, thème, routing)
- L'architecture backend Express + MongoDB
- La base de données existante (aucune donnée supprimée)
- Le déploiement Vercel (frontend et backend)

---

## Ordre d'implémentation recommandé
1. Phase 1 (PWA + Auth) — prérequis absolu des deux suivantes
2. Phase 2 (liaison User ↔ Player) — dépend de Phase 1
3. Phase 3 (droits) — dépend de Phase 2
