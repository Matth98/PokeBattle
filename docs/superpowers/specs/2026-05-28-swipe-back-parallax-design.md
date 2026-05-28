# Swipe-back avec page précédente visible (effet iOS)

**Date :** 2026-05-28
**Statut :** Approuvé

## Contexte

Le swipe-back depuis le bord gauche est implémenté (hook `useEdgeSwipeBack`). La page courante glisse vers la droite mais révèle un fond blanc, ce qui est visuellement brutal. On ajoute un effet iOS authentique : la page précédente est visible derrière la page courante et anime en parallaxe pendant le geste.

## Architecture

Deux couches superposées dans le rendu de `AppContent` :

| Couche | Ref | z-index | position | Rôle |
|---|---|---|---|---|
| Fond | `bgPageRef` | 9 | `fixed, inset: 0` | Page précédente, part de `-25vw`, glisse vers 0 |
| Avant | `pageRef` | 10 | `relative` | Page courante, glisse vers la droite |

La couche fond est `pointer-events: none` — non interactive. Un overlay `rgba(0,0,0,0.15)` la rend légèrement plus sombre que la couche avant (comportement iOS identique).

## Changements détaillés

### `src/hooks/useEdgeSwipeBack.js`

**Nouveau paramètre :** `bgRef` (optionnel, `null` par défaut)

**Constante :** `PARALLAX_RATIO = 0.25`

**Comportements :**

| Moment | `pageRef` | `bgRef` |
|---|---|---|
| Drag (dx ≥ 0) | `translateX(dx)` | `translateX(-W * 0.25 + dx * 0.25)` |
| Slide-out (dx ≥ 80) | `translateX(W)` en 220ms ease-in | `translateX(0)` en 220ms ease-in |
| Spring-back (dx < 80) | `translateX(0)` en 200ms ease-out | `translateX(-W * 0.25)` en 200ms ease-out |
| `!enabled` reset | `translateX(0)` | `translateX(-W * 0.25)` |
| `touchcancel` reset | `translateX(0)` | `translateX(-W * 0.25)` |

Où `W = window.innerWidth`.

La signature du hook devient :
```js
useEdgeSwipeBack({ onBack, enabled, bgRef = null })
```

Les appels à `bgRef` sont toujours gardés derrière `if (bgRef?.current)` pour rester optionnels.

### `src/App.jsx`

**Nouveau state :**
```js
const [prevTab, setPrevTab] = useState(null);
```

**Mises à jour de `prevTab` :**

- `setCurrentTab` (onglet racine) : `setPrevTab(null)`
- `navigateTo` : `setPrevTab(currentTab)` — avant `_setCurrentTabState`
- `navigateBack` : `setPrevTab(navStack.current[navStack.current.length - 1]?.tab ?? null)` — appelé après le `pop`, lit le nouveau sommet du stack (l'entrée qui sera désormais la page précédente du nouvel onglet actif)

> Note : dans `navigateBack`, après `const prev = navStack.current.pop()`, le stack a déjà perdu une entrée. Le nouveau sommet à `length - 1` est bien le prevTab du nouvel onglet courant. Si le stack est vide après le pop, prevTab est `null`.

**Nouveau ref :**
```js
const bgPageRef = useRef(null);
```

**Appel du hook mis à jour :**
```js
const pageRef = useEdgeSwipeBack({
  onBack: handleBack,
  enabled: SUB_PAGES.includes(currentTab) && !settingsOpen && !showNewBattleForm && !showNewTeamForm,
  bgRef: bgPageRef,
});
```

**Rendu de la couche fond :**

Ajoutée juste avant le div `pageRef` dans le dernier `return` :

```jsx
{prevTab && SUB_PAGES.includes(currentTab) && (
  <div
    ref={bgPageRef}
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9,
      pointerEvents: 'none',
      transform: `translateX(-${window.innerWidth * 0.25}px)`,
      overflow: 'hidden',
    }}
  >
    {/* Overlay d'assombrissement iOS */}
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 1, pointerEvents: 'none' }} />

    {prevTab === 'home' && <Home players={players} battles={battles} teams={teams} isDark={isDark} t={t}
      setCurrentTab={() => {}} setSelectedBattle={() => {}} onSelectPlayer={() => {}}
      onSearchPokemon={() => {}} linkedPlayer={players.find(p => p._id === dbUser?.playerId)}
      onOpenSettings={() => {}} />}

    {prevTab === 'players' && <Players players={players} t={t} isDark={isDark}
      onSelectPlayer={() => {}} onAddPlayer={() => {}} onDeletePlayer={() => {}} onDeleteMultiple={() => {}}
      selectionMode={null} setSelectionMode={() => {}} selectedItems={[]} setSelectedItems={() => {}}
      showForm={false} setShowForm={() => {}} />}

    {prevTab === 'battles' && <Battles battles={battles} players={players} teams={teams} t={t} isDark={isDark}
      onSelectBattle={() => {}} onAddBattle={() => {}} onUpdateBattle={() => {}} onUpdatePlayer={() => {}}
      onSyncPokemon={() => {}} onDeleteBattle={() => {}} onDeleteMultiple={() => {}}
      selectionMode={null} setSelectionMode={() => {}} selectedItems={[]} setSelectedItems={() => {}}
      showForm={false} setShowForm={() => {}} editingBattle={null} clearEditingBattle={() => {}} />}

    {prevTab === 'teams' && <Teams teams={teams} players={players} t={t} isDark={isDark}
      onSelectTeam={() => {}} onAddTeam={() => {}} onUpdateTeam={() => {}} onUpdatePlayer={() => {}}
      onDeleteTeam={() => {}} onDeleteMultiple={() => {}}
      selectionMode={null} setSelectionMode={() => {}} selectedItems={[]} setSelectedItems={() => {}}
      showForm={false} setShowForm={() => {}} editingTeam={null} clearEditingTeam={() => {}} />}

    {prevTab === 'playerDetail' && selectedPlayer && <PlayerDetail
      player={selectedPlayer} teams={teams} battles={battles} t={t} isDark={isDark}
      initialActiveTab={playerDetailTab} backLabel={backLabel}
      onBack={() => {}} onUpdate={() => {}} onAddTeam={() => {}} onUpdateTeam={() => {}}
      onDeleteTeam={() => {}} onSelectTeam={() => {}} />}

    {prevTab === 'teamDetail' && selectedTeam && <TeamDetail
      team={selectedTeam} t={t} isDark={isDark} backLabel={backLabel}
      onBack={() => {}} onEdit={() => {}} onUpdate={() => {}} />}

    {prevTab === 'battleDetail' && selectedBattle && <BattleDetail
      battle={selectedBattle} players={players} t={t} isDark={isDark} backLabel={backLabel}
      onBack={() => {}} onEdit={() => {}} onDelete={() => {}} />}

    {prevTab === 'pokemonSearch' && <PokemonSearchPage
      t={t} isDark={isDark} backLabel={backLabel}
      onBack={() => {}} onSelectPokemon={() => {}} />}
  </div>
)}
```

**Couche avant :**

Le div `pageRef` existant reçoit `style={{ position: 'relative', zIndex: 10 }}` pour créer un contexte d'empilement au-dessus du fond.

## Ce qui ne change pas

- La logique `handleBack`, `navigateBack`, `navigateTo` reste intacte
- `SwipeableRow` n'est pas affecté
- Le bouton "Précédent" existant continue de fonctionner (il appelle `handleBack` directement sans animation de couche)
- Les overlays (`settingsOpen`, `showNewBattleForm`, `showNewTeamForm`) désactivent toujours le swipe

## Cas limites

| Cas | Comportement |
|---|---|
| `prevTab` non nul mais composant sans `selectedX` requis | Guard `selectedPlayer &&` etc. empêche le rendu d'un composant avec null |
| Spring-back | Les deux couches reviennent à leur position initiale |
| `enabled` passe à false pendant animation | `clearTimeout` + reset des deux refs |
| `touchcancel` | `handleTouchCancel` reset les deux refs (spring-back) |
