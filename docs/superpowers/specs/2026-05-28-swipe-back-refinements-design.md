# Swipe-back — Raffinements (navigation fixe, pokemonDetail, assombrissement)

**Date :** 2026-05-28  
**Statut :** Approuvé

## Contexte

Trois raffinements post-implémentation du swipe-back avec parallaxe iOS :

1. La `Navigation` (barre du bas) ne doit pas glisser avec la page (déjà livré).
2. Le swipe-back doit être désactivé sur la Bottom Sheet `pokemonDetail`.
3. La couche avant (page courante) doit s'assombrir progressivement pendant le swipe, pas seulement la couche fond.

---

## Changement 1 — Désactiver le swipe sur `pokemonDetail` (déjà livré)

`<Navigation />` a été sorti du `<div ref={pageRef}>` — commit existant. Rien à spécifier ici.

---

## Changement 2 — Désactiver le swipe sur `pokemonDetail`

### Problème

`pokemonDetail` est dans `SUB_PAGES`, donc le swipe-back est actif sur la Bottom Sheet Pokémon détails. Cette page est fermée par un geste vertical (bottom sheet) — le swipe horizontal depuis le bord gauche est indésirable.

### Solution

Retirer `'pokemonDetail'` de `SUB_PAGES`.

```js
// Avant
const SUB_PAGES = ['playerDetail', 'teamDetail', 'battleDetail', 'pokemonSearch', 'pokemonDetail'];

// Après
const SUB_PAGES = ['playerDetail', 'teamDetail', 'battleDetail', 'pokemonSearch'];
```

**Effets en cascade :**

| Condition | Comportement avec `pokemonDetail` hors SUB_PAGES |
|---|---|
| `enabled` dans le hook | Swipe désactivé sur `pokemonDetail` ✓ |
| Couche fond (`prevTab && SUB_PAGES.includes(currentTab)`) | Fond non rendu quand on est sur `pokemonDetail` ✓ |
| `prevTab === 'pokemonDetail'` affiché sur une autre page | Toujours fonctionnel — le check porte sur `currentTab`, pas `prevTab` ✓ |
| Branche `pokemonDetail` dans la couche fond | Peut être retirée (inaccessible si `pokemonDetail` ∉ SUB_PAGES) |

---

## Changement 3 — Overlay progressif sur la couche avant (`fgOverlayRef`)

### Problème

Actuellement, seule la couche fond a un overlay sombre statique (`rgba(0,0,0,0.15)`). La page courante qui glisse reste à luminosité pleine, ce qui crée un contraste visuel trop marqué.

### Solution

Ajouter un `fgOverlayRef` au hook `useEdgeSwipeBack`, symétrique à `bgRef`. Un overlay `rgba(0,0,0,...)` à l'intérieur de `pageRef` s'anime proportionnellement au déplacement du swipe.

### `src/hooks/useEdgeSwipeBack.js`

**Nouvelle constante :**
```js
const FG_DIM_MAX = 0.25; // opacité max de l'overlay avant au seuil (80px)
```

**Nouvelle signature :**
```js
export function useEdgeSwipeBack({ onBack, enabled, bgRef = null, fgOverlayRef = null })
```

**Dans `resetStyles()` :**
```js
if (fgOverlayRef?.current) {
  fgOverlayRef.current.style.transition = '';
  fgOverlayRef.current.style.opacity = '0';
}
```

**Dans `handleTouchMove` (après calcul de `clampedDx`) :**
```js
if (fgOverlayRef?.current) {
  fgOverlayRef.current.style.transition = 'none';
  fgOverlayRef.current.style.opacity = String((clampedDx / window.innerWidth) * FG_DIM_MAX);
}
```

**Dans `handleTouchEnd`, branche slide-out (`dx >= SWIPE_THRESHOLD`) :**
```js
if (fgOverlayRef?.current) {
  fgOverlayRef.current.style.transition = `opacity ${SLIDE_OUT_MS}ms ease-in`;
  fgOverlayRef.current.style.opacity = '0';
}
```

**Dans `handleTouchEnd`, branche spring-back (`dx < SWIPE_THRESHOLD`) :**
```js
if (fgOverlayRef?.current) {
  fgOverlayRef.current.style.transition = `opacity ${SPRING_BACK_MS}ms ease-out`;
  fgOverlayRef.current.style.opacity = '0';
}
```

**Dans `handleTouchCancel` :**
```js
if (fgOverlayRef?.current) {
  fgOverlayRef.current.style.transition = `opacity ${SPRING_BACK_MS}ms ease-out`;
  fgOverlayRef.current.style.opacity = '0';
}
```

**Dépendances du `useEffect` :** inchangées — `[enabled]`.

### `src/App.jsx`

**Nouveau ref :**
```js
const fgOverlayRef = useRef(null);
```

**Hook mis à jour :**
```js
const pageRef = useEdgeSwipeBack({
  onBack: handleBack,
  enabled: SUB_PAGES.includes(currentTab) && !settingsOpen && !showNewBattleForm && !showNewTeamForm,
  bgRef: bgPageRef,
  fgOverlayRef: fgOverlayRef,
});
```

**Overlay dans la couche avant** (premier enfant du div `ref={pageRef}`) :
```jsx
<div ref={pageRef} style={{ position: 'relative', zIndex: 10 }}>
  <div
    ref={fgOverlayRef}
    style={{
      position: 'fixed',
      inset: 0,
      background: 'black',
      opacity: 0,
      zIndex: 11,
      pointerEvents: 'none',
    }}
  />
  {/* reste du contenu */}
</div>
```

> `position: fixed` à l'intérieur du `pageRef` : quand le parent acquiert un `transform`, l'overlay fixed devient relatif au parent transformé et suit naturellement la page qui glisse — c'est le comportement voulu.

---

## Résumé des comportements pendant le swipe

| Moment | `pageRef` | `bgRef` | `fgOverlayRef` |
|---|---|---|---|
| Drag (dx ≥ 0) | `translateX(dx)` | `translateX(-W×0.25 + dx×0.25)` | `opacity = dx/W × 0.25` |
| Slide-out (dx ≥ 80) | `translateX(W)` 220ms ease-in | `translateX(0)` 220ms ease-in | `opacity = 0` 220ms ease-in |
| Spring-back (dx < 80) | `translateX(0)` 200ms ease-out | `translateX(-W×0.25)` 200ms ease-out | `opacity = 0` 200ms ease-out |
| `touchcancel` | `translateX(0)` 200ms ease-out | `translateX(-W×0.25)` 200ms ease-out | `opacity = 0` 200ms ease-out |
| `!enabled` reset | `translateX(0)` | `translateX(-W×0.25)` | `opacity = 0` |

---

## Tests à ajouter (`useEdgeSwipeBack.test.js`)

- `fgOverlayRef` reçoit une opacité > 0 pendant le drag
- `fgOverlayRef` revient à opacity 0 après spring-back
- `null fgOverlayRef` ne crash pas

---

## Ce qui ne change pas

- La logique `handleBack`, `navigateTo`, `navigateBack`
- Le `bgRef` / parallax existant
- `SwipeableRow` et les overlays modaux
