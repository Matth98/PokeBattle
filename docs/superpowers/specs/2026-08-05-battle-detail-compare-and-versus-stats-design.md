# Bouton "Comparer les joueurs" + nouvelles stats Versus — Design Spec
**Date :** 2026-08-05

---

## Objectif

1. Depuis la page Détail Combat, permettre d'accéder directement au mode Versus pour comparer les deux joueurs du combat.
2. Renommer le bouton "Supprimer" de cette page en "Supprimer le combat" pour plus de clarté.
3. Enrichir la page Versus avec 4 nouvelles stats par joueur : KO infligés/combat, KO reçus/combat, nombre de Pokémon différents joués, et Pokémon favori (le plus joué dans les combats remportés).

---

## 1. Bouton "Comparer les joueurs" (Détail Combat)

### `BattleDetail.jsx`
- Nouveau bouton inséré juste avant le bouton de suppression (avant le commentaire `{/* ── Supprimer ── */}`, [BattleDetail.jsx:787](../../../src/components/BattleDetail.jsx#L787)).
- Style cohérent avec le bouton "Supprimer" existant (mêmes classes `w-full ... rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2 shadow-sm`), mais avec la couleur d'accent standard (pas `t.danger`) et une icône `GitCompare` (lucide-react, déjà utilisée dans `PlayerDetail.jsx` pour le bouton "Comparer" existant).
- Label : "Comparer les joueurs"
- `onClick` : appelle une nouvelle prop `onCompare(battle.player1, battle.player2)`
- Bouton masqué si `p1` ou `p2` est introuvable (joueur supprimé) — même garde que les autres sections qui dépendent de `p1`/`p2`.

### `App.jsx`
- Nouvelle prop `onCompare` passée à `BattleDetail` (instance ligne ~1039) : `onCompare={(p1Id, p2Id) => navigateTo('versusDetail', { p1Id, p2Id })}`, réutilisant le mécanisme existant `selectedVersusPlayers` / `initialP1Id` / `initialP2Id` déjà en place pour le bouton "Comparer" de `PlayerDetail`.
- Fallback de navigation retour : `versusDetail` → `battleDetail` (revient au combat d'origine), cohérent avec le fallback existant vers `playerDetail`.

### Renommage "Supprimer" → "Supprimer le combat"
- Le bouton de suppression dans `BattleDetail.jsx` (ligne 794) n'utilise plus `tr('common.delete')` mais le texte en dur `"Supprimer le combat"`.
- La clé i18n partagée `common.delete` n'est **pas modifiée** (elle reste `"Supprimer"` pour les autres écrans : `Battles.jsx`, `Teams.jsx`, `TeamDetail.jsx`, `PlayerDetail.jsx`, `Players.jsx`).
- Le bouton de confirmation dans la modale (ligne 954, `tr('common.delete')`) n'est pas modifié.

---

## 2. Nouvelles stats sur la page Versus

### `VersusPage.jsx` — `calcPlayerStats(player, allBattles, pTypes)`

Ajout de 4 nouveaux champs calculés dans la même fonction (lignes 277–353), à partir des données déjà disponibles (`total`, et les mêmes boucles sur les battles/teams) :

| Champ | Calcul |
|-------|--------|
| `koInflByBattle` | `koInfliges / total` (arrondi à 1 décimale), `null`/`—` si `total === 0` |
| `koRecuByBattle` | `koRecus / total` (arrondi à 1 décimale), `null`/`—` si `total === 0` |
| `distinctPokemonCount` | Taille du `Set` des `pokeId` utilisés par le joueur sur l'ensemble des battles considérées (même liste de battles que le reste des stats — `allBattles` filtré par joueur) |
| `favoritePokemonInWins` | Parmi les battles **remportées** par le joueur, comptage des `pokeId` de son équipe → le plus fréquent, sous la forme `{ pokeId, name, count }` (même forme que `mostUsedPokemon`), ou `null` si aucune victoire |

Ces 4 champs sont calculés à la fois pour la vue globale (`stats1`/`stats2`, sur tous les combats) et pour la vue face-à-face filtrée par date (`dateStats1`/`dateStats2`, sur `h2hFiltered`) — même traitement que les stats existantes.

### Rendu — nouvelles lignes dans les deux blocs (`rows` arrays, lignes ~652–688 et ~782–822)

Ordre final des lignes (nouvelles lignes en **gras**) :

1. Combats joués
2. Victoires
3. Défaites
4. Winrate
5. KO infligés
6. **KO infligés / combat**
7. KO reçus
8. **KO reçus / combat**
9. Perfect
10. **Pokémon joués**
11. Meilleure série
12. Type favori
13. Format favori
14. MVP
15. **Pokémon favori**

- "KO infligés / combat" et "KO reçus / combat" : `fmt: (v) => v == null ? '—' : v.toFixed(1)`, `cmp: 'max'` / `'min'` respectivement (même logique de mise en évidence que les totaux existants).
- "Pokémon joués" : `fmt: (v) => v`, `cmp: 'max'`, pas de barre de progression (comme "Perfect").
- "Pokémon favori" : rendu avec `render` (sprite + nom), même style que la ligne "MVP" existante ; affiche `"—"` si le joueur n'a aucune victoire.

---

## Fichiers impactés

| Fichier | Changement |
|---------|-----------|
| `src/components/BattleDetail.jsx` | +bouton "Comparer les joueurs", +prop `onCompare`, renommage du bouton "Supprimer" → "Supprimer le combat" (texte en dur) |
| `src/App.jsx` | +prop `onCompare` sur l'instance de `BattleDetail`, +fallback de navigation `versusDetail` → `battleDetail` |
| `src/components/VersusPage.jsx` | +4 champs dans `calcPlayerStats`, +4 lignes dans les deux blocs de rendu (Stats globales + Face à face) |

---

## Edge cases

| Situation | Comportement |
|-----------|--------------|
| Un des deux joueurs du combat a été supprimé | Bouton "Comparer les joueurs" caché |
| Joueur sans combat (`total === 0`) | KO/combat affichés à `—` |
| Joueur sans victoire | "Pokémon favori" affiché à `—` |
