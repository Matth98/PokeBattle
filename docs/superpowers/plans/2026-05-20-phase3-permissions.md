# Phase 3 — Droits d'édition et rôles : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Contrôler qui peut modifier ou supprimer chaque ressource — uniquement le propriétaire et les SuperAdmins, côté backend (source de vérité) et côté frontend (masquage des boutons).

**Architecture:** Trois middlewares backend (`requireOwner`, `requireBattleParticipant`, `requireBattleCreator`) s'ajoutent aux routes PUT/DELETE. Le champ `createdBy` est ajouté à `Battle`, `userId` à `Team`. Le frontend utilise `useAuth` pour masquer les boutons selon les droits de l'utilisateur connecté.

**Tech Stack:** React CRA · Express · MongoDB/Mongoose · Firebase Auth (Phase 1+2 prérequis)

> **Prérequis :** Phases 1 et 2 terminées (auth + liaison User ↔ Player opérationnelles).
>
> **Répertoires :**
> - Frontend : `/Users/matthias/Desktop/pokebattle-app/`
> - Backend  : `/Users/matthias/Desktop/pokebattle-backend/`

---

## Tableau des permissions (rappel spec)

| Resource | Lecture | Création | Modification | Suppression |
|---|---|---|---|---|
| Joueurs | Tout connecté | Tout connecté | Propriétaire + SuperAdmin | Propriétaire + SuperAdmin |
| Équipes | Tout connecté | Tout connecté | Propriétaire + SuperAdmin | Propriétaire + SuperAdmin |
| Combats | Tout connecté | Tout connecté | Les 2 joueurs du combat + SuperAdmin | Créateur + SuperAdmin |
| Utilisateurs | — | Firebase | Soi-même + SuperAdmin | SuperAdmin |

**Propriétaire** = `resource.userId === req.user._id`  
**Joueur d'un combat** = `req.user.playerId === battle.player1 OR battle.player2`  
**Créateur d'un combat** = `battle.createdBy === req.user._id`

---

## Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `backend/models/Battle.js` | Modifier — ajouter `createdBy` |
| `backend/models/Team.js` | Modifier — ajouter `userId` |
| `backend/middleware/requireOwner.js` | Créer |
| `backend/middleware/requireBattleParticipant.js` | Créer |
| `backend/middleware/requireBattleCreator.js` | Créer |
| `backend/routes/players.js` | Modifier — appliquer `requireOwner` sur PUT/DELETE |
| `backend/routes/teams.js` | Modifier — appliquer `requireOwner` sur PUT/DELETE, set `userId` sur POST |
| `backend/routes/battles.js` | Modifier — set `createdBy` sur POST, appliquer middlewares sur PUT/DELETE |
| `src/App.jsx` | Modifier — passer `dbUser` + `isSuperAdmin` aux composants via contexte ou props |
| `src/hooks/useAuth.js` | Vérifier que `isSuperAdmin` est déjà exposé (fait en Phase 2) |
| `src/components/Players.jsx` | Modifier — masquer edit/delete si non propriétaire |
| `src/components/PlayerDetail.jsx` | Modifier — masquer edit si non propriétaire |
| `src/components/Teams.jsx` | Modifier — masquer edit/delete si non propriétaire |
| `src/components/TeamDetail.jsx` | Modifier — masquer edit si non propriétaire |
| `src/components/Battles.jsx` | Modifier — masquer edit si non participant, delete si non créateur |
| `src/components/BattleDetail.jsx` | Modifier — même logique |

---

## Task 1 : Backend — Ajouter `createdBy` au modèle `Battle`

**Fichiers :**
- Modifier : `models/Battle.js`

- [ ] **Étape 1 : Ajouter le champ**

  Dans `models/Battle.js`, ajouter `createdBy` dans le schéma (après `updatedAt`) :

  Remplacer :
  ```js
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
  ```
  Par :
  ```js
  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now },
  // Utilisateur ayant créé le combat (requis pour les droits de suppression — Phase 3)
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  ```

- [ ] **Étape 2 : Vérifier**

  ```bash
  cd /Users/matthias/Desktop/pokebattle-backend
  node -e "const B = require('./models/Battle'); console.log(Object.keys(B.schema.obj))"
  ```

  Attendu : `createdBy` présent dans la liste.

---

## Task 2 : Backend — Ajouter `userId` au modèle `Team`

**Fichiers :**
- Modifier : `models/Team.js`

- [ ] **Étape 1 : Ajouter le champ**

  Dans `models/Team.js`, ajouter `userId` dans le schéma :

  Remplacer :
  ```js
  const teamSchema = new mongoose.Schema({
    name:    { type: String, required: true },
    owner:   String,
    ownerId: mongoose.Schema.Types.ObjectId,
    format:  { type: String, enum: ['1v1', '2v2'], default: '2v2' },
    pokemon: [{ id: String, pokeId: Number, name: String }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });
  ```
  Par :
  ```js
  const teamSchema = new mongoose.Schema({
    name:    { type: String, required: true },
    owner:   String,
    ownerId: mongoose.Schema.Types.ObjectId,
    format:  { type: String, enum: ['1v1', '2v2'], default: '2v2' },
    pokemon: [{ id: String, pokeId: Number, name: String }],
    // Lié au User MongoDB propriétaire de l'équipe (Phase 3)
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });
  ```

  > **Migration :** Les équipes existantes gardent `userId: null`. Le middleware `requireOwner` traite `null` comme « pas encore réclamé » et laisse passer n'importe quel utilisateur authentifié (rétrocompatibilité — voir Task 3).

---

## Task 3 : Backend — Créer les middlewares de permissions

**Fichiers :**
- Créer : `middleware/requireOwner.js`
- Créer : `middleware/requireBattleParticipant.js`
- Créer : `middleware/requireBattleCreator.js`

- [ ] **Étape 1 : Créer `middleware/requireOwner.js`**

  ```js
  // middleware/requireOwner.js
  /**
   * Factory : retourne un middleware qui vérifie que req.user est propriétaire
   * de la ressource (resource.userId === req.user._id) ou SuperAdmin.
   *
   * @param {mongoose.Model} Model        — Le modèle Mongoose à interroger
   * @param {string}         idParam      — Nom du paramètre de route (défaut : 'id')
   */
  const requireOwner = (Model, idParam = 'id') => async (req, res, next) => {
    if (req.user.role === 'superadmin') return next();

    try {
      const resource = await Model.findById(req.params[idParam]);
      if (!resource) return res.status(404).json({ error: 'Ressource introuvable' });

      // userId null = donnée existante avant Phase 3, tout utilisateur connecté peut éditer
      if (!resource.userId) return next();

      if (String(resource.userId) !== String(req.user._id)) {
        return res.status(403).json({ error: 'Non autorisé : tu n\'es pas propriétaire de cette ressource' });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  module.exports = requireOwner;
  ```

- [ ] **Étape 2 : Créer `middleware/requireBattleParticipant.js`**

  ```js
  // middleware/requireBattleParticipant.js
  const Battle = require('../models/Battle');

  /**
   * Vérifie que req.user est l'un des deux joueurs du combat (player1 ou player2)
   * ou SuperAdmin. Utilisé pour les PUT (modification de combat).
   */
  const requireBattleParticipant = async (req, res, next) => {
    if (req.user.role === 'superadmin') return next();

    try {
      const battle = await Battle.findById(req.params.id);
      if (!battle) return res.status(404).json({ error: 'Combat introuvable' });

      // createdBy null = combat créé avant Phase 3, autoriser tout utilisateur connecté
      if (!battle.createdBy) return next();

      const userPlayerId = String(req.user.playerId ?? '');
      const isParticipant =
        String(battle.player1) === userPlayerId ||
        String(battle.player2) === userPlayerId;

      if (!isParticipant) {
        return res.status(403).json({ error: 'Non autorisé : tu n\'es pas participant de ce combat' });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  module.exports = requireBattleParticipant;
  ```

- [ ] **Étape 3 : Créer `middleware/requireBattleCreator.js`**

  ```js
  // middleware/requireBattleCreator.js
  const Battle = require('../models/Battle');

  /**
   * Vérifie que req.user a créé le combat (battle.createdBy === req.user._id)
   * ou est SuperAdmin. Utilisé pour les DELETE (suppression de combat).
   */
  const requireBattleCreator = async (req, res, next) => {
    if (req.user.role === 'superadmin') return next();

    try {
      const battle = await Battle.findById(req.params.id);
      if (!battle) return res.status(404).json({ error: 'Combat introuvable' });

      // createdBy null = combat créé avant Phase 3, autoriser tout utilisateur connecté
      if (!battle.createdBy) return next();

      if (String(battle.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ error: 'Non autorisé : seul le créateur peut supprimer ce combat' });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  module.exports = requireBattleCreator;
  ```

- [ ] **Étape 4 : Vérifier les syntaxes**

  ```bash
  cd /Users/matthias/Desktop/pokebattle-backend
  node -e "require('./middleware/requireOwner'); require('./middleware/requireBattleParticipant'); require('./middleware/requireBattleCreator'); console.log('OK')"
  ```

  Attendu : `OK`

---

## Task 4 : Backend — Protéger `routes/players.js`

**Fichiers :**
- Modifier : `routes/players.js`

- [ ] **Étape 1 : Ajouter les imports**

  Après `const Player = require('../models/Player');`, ajouter :
  ```js
  const requireOwner = require('../middleware/requireOwner');
  ```

- [ ] **Étape 2 : Protéger PUT**

  Remplacer :
  ```js
  router.put('/:id', async (req, res) => {
  ```
  Par :
  ```js
  router.put('/:id', requireOwner(Player), async (req, res) => {
  ```

- [ ] **Étape 3 : Protéger DELETE**

  Remplacer :
  ```js
  router.delete('/:id', async (req, res) => {
  ```
  Par :
  ```js
  router.delete('/:id', requireOwner(Player), async (req, res) => {
  ```

- [ ] **Étape 4 : Vérifier la syntaxe**

  ```bash
  node -e "require('./routes/players'); console.log('OK')"
  ```

  Attendu : `OK`

---

## Task 5 : Backend — Protéger `routes/teams.js` et setter `userId` à la création

**Fichiers :**
- Modifier : `routes/teams.js`

- [ ] **Étape 1 : Ajouter les imports**

  Après `const Team = require('../models/Team');`, ajouter :
  ```js
  const requireOwner = require('../middleware/requireOwner');
  ```

- [ ] **Étape 2 : Setter `userId` à la création**

  Dans `router.post('/', ...)`, remplacer :
  ```js
  const team = new Team(req.body);
  ```
  Par :
  ```js
  const team = new Team({ ...req.body, userId: req.user._id });
  ```

- [ ] **Étape 3 : Protéger PUT**

  Remplacer :
  ```js
  router.put('/:id', async (req, res) => {
  ```
  Par :
  ```js
  router.put('/:id', requireOwner(Team), async (req, res) => {
  ```

- [ ] **Étape 4 : Protéger DELETE**

  Remplacer :
  ```js
  router.delete('/:id', async (req, res) => {
  ```
  Par :
  ```js
  router.delete('/:id', requireOwner(Team), async (req, res) => {
  ```

- [ ] **Étape 5 : Vérifier**

  ```bash
  node -e "require('./routes/teams'); console.log('OK')"
  ```

  Attendu : `OK`

---

## Task 6 : Backend — Protéger `routes/battles.js` et setter `createdBy`

**Fichiers :**
- Modifier : `routes/battles.js`

- [ ] **Étape 1 : Ajouter les imports**

  Après `const Player = require('../models/Player');`, ajouter :
  ```js
  const requireBattleParticipant = require('../middleware/requireBattleParticipant');
  const requireBattleCreator     = require('../middleware/requireBattleCreator');
  ```

- [ ] **Étape 2 : Setter `createdBy` lors de la création**

  Dans `router.post('/', ...)`, remplacer :
  ```js
  const battle = new Battle(req.body);
  ```
  Par :
  ```js
  const battle = new Battle({ ...req.body, createdBy: req.user._id });
  ```

- [ ] **Étape 3 : Protéger PUT (modification — participants uniquement)**

  Remplacer :
  ```js
  router.put('/:id', async (req, res) => {
  ```
  Par :
  ```js
  router.put('/:id', requireBattleParticipant, async (req, res) => {
  ```

- [ ] **Étape 4 : Protéger DELETE (suppression — créateur uniquement)**

  Remplacer :
  ```js
  router.delete('/:id', async (req, res) => {
  ```
  Par :
  ```js
  router.delete('/:id', requireBattleCreator, async (req, res) => {
  ```

- [ ] **Étape 5 : Vérifier**

  ```bash
  node -e "require('./routes/battles'); console.log('OK')"
  ```

  Attendu : `OK`

- [ ] **Étape 6 : Test d'intégration backend**

  Démarrer `node server.js`. Avec un client HTTP (ex. Insomnia/Postman ou un vrai token Firebase) :
  - POST `/api/battles` avec un token valide → le combat créé contient `createdBy`
  - PUT `/api/battles/:id` avec un token d'un non-participant → 403
  - DELETE `/api/battles/:id` avec un token du créateur → 200

---

## Task 7 : Frontend — Masquer les boutons selon les droits dans les composants

> `useAuth` expose déjà `dbUser` et `isSuperAdmin` depuis la Phase 2.
> Chaque composant importe `useAuth` et calcule ses droits localement.

**Pattern commun à appliquer dans chaque composant :**

```jsx
import { useAuth } from '../hooks/useAuth';

// Dans le composant :
const { dbUser, isSuperAdmin } = useAuth();

// Helpers de droits :
const canEditPlayer  = (player)  =>
  isSuperAdmin || (dbUser?._id && player.userId && String(player.userId) === String(dbUser._id));

const canEditTeam    = (team)    =>
  isSuperAdmin || (dbUser?._id && team.userId   && String(team.userId)   === String(dbUser._id));

const canEditBattle  = (battle)  =>
  isSuperAdmin || (dbUser?.playerId && (
    String(battle.player1?._id ?? battle.player1) === String(dbUser.playerId) ||
    String(battle.player2?._id ?? battle.player2) === String(dbUser.playerId)
  ));

const canDeleteBattle = (battle) =>
  isSuperAdmin || (dbUser?._id && battle.createdBy && String(battle.createdBy) === String(dbUser._id));
```

**Règle d'affichage :** Si le helper retourne `false`, masquer le bouton "Modifier" / "Supprimer" via un ternaire `{canEdit(item) && <button>…</button>}` ou `className={canEdit(item) ? '' : 'hidden'}`.

---

### Task 7a : `src/components/Players.jsx`

- [ ] **Étape 1 : Ajouter l'import**

  ```js
  import { useAuth } from '../hooks/useAuth';
  ```

- [ ] **Étape 2 : Ajouter le hook et le helper dans le composant**

  Au début de la fonction `Players` :
  ```js
  const { dbUser, isSuperAdmin } = useAuth();
  const canEditPlayer = (player) =>
    isSuperAdmin ||
    (dbUser?._id && player.userId && String(player.userId) === String(dbUser._id));
  ```

- [ ] **Étape 3 : Conditionner les boutons Modifier / Supprimer**

  Rechercher tous les boutons d'édition/suppression de joueur dans le JSX et les entourer :
  ```jsx
  {canEditPlayer(player) && (
    <button onClick={() => handleEdit(player)}>…</button>
  )}
  {canEditPlayer(player) && (
    <button onClick={() => handleDelete(player._id)}>…</button>
  )}
  ```

  > Pour les `SwipeableRow`, conditionner les actions de la prop `rightActions` en filtrant celles qui nécessitent des droits.

---

### Task 7b : `src/components/PlayerDetail.jsx`

- [ ] **Étape 1 : Ajouter l'import**

  ```js
  import { useAuth } from '../hooks/useAuth';
  ```

- [ ] **Étape 2 : Ajouter le hook**

  ```js
  const { dbUser, isSuperAdmin } = useAuth();
  const canEdit = isSuperAdmin ||
    (dbUser?._id && player?.userId && String(player.userId) === String(dbUser._id));
  ```

- [ ] **Étape 3 : Conditionner les boutons d'édition du profil**

  ```jsx
  {canEdit && <button onClick={handleEditProfile}>…</button>}
  {canEdit && <button onClick={handleDelete}>…</button>}
  ```

---

### Task 7c : `src/components/Teams.jsx`

- [ ] **Étape 1 : Ajouter l'import**

  ```js
  import { useAuth } from '../hooks/useAuth';
  ```

- [ ] **Étape 2 : Ajouter le hook et le helper**

  ```js
  const { dbUser, isSuperAdmin } = useAuth();
  const canEditTeam = (team) =>
    isSuperAdmin ||
    (dbUser?._id && team.userId && String(team.userId) === String(dbUser._id));
  ```

- [ ] **Étape 3 : Conditionner les boutons**

  ```jsx
  {canEditTeam(team) && <button onClick={() => handleEdit(team)}>…</button>}
  {canEditTeam(team) && <button onClick={() => handleDelete(team._id)}>…</button>}
  ```

---

### Task 7d : `src/components/TeamDetail.jsx`

- [ ] **Étape 1 : Ajouter l'import**

  ```js
  import { useAuth } from '../hooks/useAuth';
  ```

- [ ] **Étape 2 : Ajouter le hook**

  ```js
  const { dbUser, isSuperAdmin } = useAuth();
  const canEdit = isSuperAdmin ||
    (dbUser?._id && team?.userId && String(team.userId) === String(dbUser._id));
  ```

- [ ] **Étape 3 : Conditionner le bouton Modifier**

  ```jsx
  {canEdit && <button onClick={() => onEdit(team)}>…</button>}
  ```

---

### Task 7e : `src/components/Battles.jsx`

- [ ] **Étape 1 : Ajouter l'import**

  ```js
  import { useAuth } from '../hooks/useAuth';
  ```

- [ ] **Étape 2 : Ajouter le hook et les helpers**

  ```js
  const { dbUser, isSuperAdmin } = useAuth();

  const canEditBattle = (battle) =>
    isSuperAdmin || (dbUser?.playerId && (
      String(battle.player1?._id ?? battle.player1) === String(dbUser.playerId) ||
      String(battle.player2?._id ?? battle.player2) === String(dbUser.playerId)
    ));

  const canDeleteBattle = (battle) =>
    isSuperAdmin ||
    (dbUser?._id && battle.createdBy && String(battle.createdBy) === String(dbUser._id));
  ```

- [ ] **Étape 3 : Conditionner les boutons**

  ```jsx
  {canEditBattle(battle)  && <button onClick={() => handleEdit(battle)}>…</button>}
  {canDeleteBattle(battle) && <button onClick={() => handleDelete(battle._id)}>…</button>}
  ```

---

### Task 7f : `src/components/BattleDetail.jsx`

- [ ] **Étape 1 : Ajouter l'import**

  ```js
  import { useAuth } from '../hooks/useAuth';
  ```

- [ ] **Étape 2 : Ajouter le hook et les helpers**

  ```js
  const { dbUser, isSuperAdmin } = useAuth();

  const canEdit = isSuperAdmin || (battle && dbUser?.playerId && (
    String(battle.player1?._id ?? battle.player1) === String(dbUser.playerId) ||
    String(battle.player2?._id ?? battle.player2) === String(dbUser.playerId)
  ));

  const canDelete = isSuperAdmin ||
    (battle && dbUser?._id && battle.createdBy && String(battle.createdBy) === String(dbUser._id));
  ```

- [ ] **Étape 3 : Conditionner les boutons**

  ```jsx
  {canEdit   && <button onClick={() => onEdit(battle)}>…</button>}
  {canDelete && <button onClick={() => onDelete(battle._id)}>…</button>}
  ```

---

## Task 8 : Backend — Attribuer le rôle SuperAdmin

> Pas d'interface d'administration — attribution manuelle en base.

- [ ] **Étape 1 : Trouver l'`_id` du User à promouvoir**

  Dans MongoDB Compass ou Atlas, dans la collection `users`, identifier le document correspondant à ton compte.

- [ ] **Étape 2 : Mettre à jour le rôle**

  Via MongoDB shell ou Compass → Edit document :
  ```json
  { "role": "superadmin" }
  ```

  Ou via le shell mongo :
  ```js
  db.users.updateOne(
    { email: "ton@email.com" },
    { $set: { role: "superadmin" } }
  )
  ```

- [ ] **Étape 3 : Vérifier côté frontend**

  Recharger l'app. Dans `useAuth`, `isSuperAdmin` doit maintenant valoir `true` (il suffit que `refetchDbUser` soit appelé, ou de se reconnecter pour forcer un nouveau fetch de `GET /api/users/me`).

  > Le token Firebase est caché côté client — il ne contient pas le rôle SuperAdmin. Le rôle est lu depuis MongoDB (`dbUser.role`) à chaque chargement de l'app.

---

## Test d'intégration final

- [ ] **Joueur A (SuperAdmin) :**
  - Peut modifier et supprimer n'importe quel joueur, équipe, combat
  - Voit tous les boutons Modifier/Supprimer

- [ ] **Joueur B (user standard) :**
  - Peut modifier et supprimer uniquement sa propre fiche joueur
  - Peut modifier et supprimer uniquement ses propres équipes
  - Peut modifier les combats auxquels il participe
  - Peut supprimer uniquement les combats qu'il a créés
  - Les boutons Modifier/Supprimer des ressources d'autrui sont masqués

- [ ] **Vérification backend :**
  - Tenter un PUT d'un joueur d'autrui via Postman avec le token de Joueur B → 403
  - Tenter un DELETE d'un combat dont Joueur B n'est pas créateur → 403
