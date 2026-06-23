# Mode Versus — Design Spec
**Date :** 2026-06-23

---

## Objectif

Permettre de comparer deux joueurs sur une page dédiée : score face à face, liste de tous leurs combats H2H filtrables par date, stats globales côte à côte, et Pokémon favoris. Accessible via un bouton "Comparer" dans `PlayerDetail`.

---

## Architecture & Navigation

### Nouveaux éléments dans `App.jsx`

- `'versusDetail'` ajouté au tableau `SUB_PAGES`
- État `selectedVersusPlayers: { p1Id: string|null, p2Id: string|null }` initialisé à `{ p1Id: null, p2Id: null }`
- Nouvelle prop `onCompare` passée à `PlayerDetail` → appelle `navigateTo('versusDetail', { p1Id: player._id })`
- Fallback de navigation : `versusDetail` → `playerDetail` (si ouvert depuis un joueur) ou `players`
- Rendu conditionnel `{currentTab === 'versusDetail' && <VersusPage ... />}` dans `AppContent`
- Background layer : `{prevTab === 'versusDetail' && <VersusPage ... isBackground />}`

### Nouveau composant

**`src/components/VersusPage.jsx`**

Props :
```
players: Player[]
battles: Battle[]
teams: Team[]
t: ThemeTokens
isDark: boolean
initialP1Id: string|null
initialP2Id: string|null
onBack: () => void
backLabel: string
isBackground?: boolean
```

---

## Bouton "Comparer" dans `PlayerDetail`

- Icône `GitCompare` (lucide-react, à importer)
- Placé dans le header sticky à droite, entre le bouton sélection et le bouton modifier
- Masqué si `players.length < 2` (pas d'adversaire possible) — nécessite de passer `allPlayers` en prop à `PlayerDetail`
- Masqué en mode sélection (comme les autres boutons du header)
- Style identique aux autres boutons du header : `w-11 h-11 rounded-full backdrop-blur-xl`

---

## Layout de la page

### Header sticky — Duel Banner

```
[ ← ]
┌─────────────────────────────────────────┐
│  [Avatar P1]    ⚔️    [Avatar P2]        │
│   Nom P1               Nom P2            │
│  [Changer ▾]          [Changer ▾]       │
└─────────────────────────────────────────┘
```

- Chaque côté est un bouton qui ouvre un **bottom sheet** de sélection de joueur
- Le bottom sheet affiche la liste de tous les joueurs sauf celui déjà sélectionné de l'autre côté
- Style du sheet : identique aux sheets existants (`motion.div` framer-motion, drag handle, overlay)
- Si un côté n'a pas de joueur sélectionné : placeholder avatar gris + texte "Choisir un joueur"
- Le banner est sticky, scroll-blurred comme dans `PlayerDetail`

### Sections scrollables (ordre fixe)

#### 1. Face à face

- **Score H2H global** : grand affichage centré `3 – 2` (P1 – P2), mis à jour selon le filtre date
- **Forme des 5 derniers H2H** : rangée d'icônes pokéball colorées (vert/rouge), même rendu que `recentForm` dans `PlayerDetail`, basée sur les 5 derniers H2H non filtrés
- **Filtre par date** : `<input type="date">` stylisé (même style que les inputs de l'app), optionnel, vide = tous les combats
- **Liste des combats H2H** : tous les combats entre P1 et P2, filtrés par date si sélectionnée, triés du plus récent au plus ancien — rendu avec le composant/style existant de la page Combats (`BattleRow` ou équivalent)
- **État vide H2H** : "Aucun combat entre ces deux joueurs pour l'instant." si aucun match H2H, ou "Aucun combat à cette date." si le filtre ne retourne rien

#### 2. Stats globales côte à côte

Grille 2 colonnes, chaque ligne = une stat. Pour chaque stat, la valeur "gagnante" est en **bold + couleur accent** (indigo), l'autre en normal. Les stats non comparables (type favori, MVP, format favori) n'ont pas de mise en évidence.

Stats affichées (dans cet ordre) :
| Stat | Comparaison |
|------|-------------|
| Victoires | max |
| Défaites | min (le moins est "mieux") |
| Winrate | max |
| KO infligés | max |
| KO reçus | min |
| Victoires parfaites | max |
| Type favori | — |
| Format favori | — |
| MVP | — |
| Pokémon le plus utilisé | — |

#### 3. Pokémon favoris

Deux colonnes (P1 gauche, P2 droite). Top 3 Pokémon les plus joués en combat pour chaque joueur :
- Sprite Pokémon (même URL helper que `PlayerDetail`)
- Nom
- Nombre de combats

---

## Data flow & Calculs

Toute la logique se fait dans `VersusPage.jsx` via `useMemo`. Aucune nouvelle requête réseau — toutes les données viennent des props `battles`, `players`, `teams` déjà chargées dans `App.jsx`.

### H2H
```js
const h2hBattles = battles.filter(b =>
  (b.player1 === p1._id && b.player2 === p2._id) ||
  (b.player1 === p2._id && b.player2 === p1._id)
)
// Triés date desc (sortBattlesDesc existant)
// Filtrés par dateFilter si non null
```

### Stats globales
Même logique que `PlayerDetail` (wins, losses, winRate, KO infligés/reçus, victoires parfaites, type favori, format favori, MVP, mostUsedPokemon) calculée en parallèle pour P1 et P2 à partir de l'ensemble des combats de chaque joueur (pas seulement H2H).

### Forme 5 derniers H2H
5 derniers combats H2H (non filtrés), `recentForm` calculée du point de vue de P1.

### Top 3 Pokémon
`countPokemon()` (même helper que `PlayerDetail`) sur les combats de chaque joueur, triés par count desc, top 3.

---

## États vides & Edge cases

| Situation | Comportement |
|-----------|--------------|
| P1 ou P2 non sélectionné | Sections cachées, placeholder dans le duel banner |
| P1 === P2 | Impossible : le sheet filtre le joueur de l'autre côté |
| Aucun combat H2H | Message vide dans la section Face à face |
| Joueur sans combats | Stats à 0/— dans la colonne |
| Filtre date sans résultat | "Aucun combat à cette date." |

---

## Fichiers impactés

| Fichier | Changement |
|---------|-----------|
| `src/App.jsx` | +`versusDetail` dans `SUB_PAGES`, +état `selectedVersusPlayers`, +prop `onCompare` à `PlayerDetail`, +rendu `VersusPage` |
| `src/components/PlayerDetail.jsx` | +prop `onCompare`, +prop `allPlayers` (pour masquer le bouton si < 2 joueurs), +bouton "Comparer" dans le header |
| `src/components/VersusPage.jsx` | Nouveau composant |
