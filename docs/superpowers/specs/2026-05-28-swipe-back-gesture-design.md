# Swipe-back depuis le bord gauche

**Date :** 2026-05-28
**Statut :** Approuvé

## Contexte

L'application pokebattle est une PWA React sans router. La navigation est gérée par un système de pile maison (`navStack` + `navigateBack`) dans `App.jsx`. Les sous-pages (PlayerDetail, TeamDetail, BattleDetail, PokemonSearchPage, PokemonDetailPage) affichent un bouton "Précédent" mais ne supportent pas le swipe-back natif.

L'objectif est d'ajouter un geste de swipe depuis le bord gauche de l'écran pour revenir en arrière, avec un retour visuel (la page suit le doigt).

## Architecture

### Nouveau fichier : `src/hooks/useEdgeSwipeBack.js`

Hook réutilisable qui encapsule toute la logique de détection et d'animation.

**Signature :**
```js
const pageRef = useEdgeSwipeBack({ onBack, enabled })
```

**Paramètres :**
- `onBack` — callback appelé pour revenir en arrière (= `navigateBack` de App.jsx)
- `enabled` — booléen ; le hook est inactif quand `false` (onglets racine)

**Retour :**
- `pageRef` — ref à attacher au wrapper `<div>` dans App.jsx

### Modification : `src/App.jsx`

Le `<div className={isDark ? 'dark' : ''}>` racine devient :
```jsx
<div ref={pageRef} className={isDark ? 'dark' : ''}>
```

Le hook est instancié avec :
```js
const SUB_PAGES = ['playerDetail', 'teamDetail', 'battleDetail', 'pokemonSearch', 'pokemonDetail'];
const pageRef = useEdgeSwipeBack({
  onBack: navigateBack,
  enabled: SUB_PAGES.includes(currentTab),
});
```

## Logique du geste (dans le hook)

### Détection

1. `touchstart` — actif seulement si `touch.clientX < 22` (zone de bord gauche de 22px)
2. `touchmove` — verrouillage d'axe au premier déplacement `> 6px` :
   - `|dx| > |dy|` → axe horizontal verrouillé, `preventDefault()` appelé pour bloquer le scroll
   - sinon → abandon, l'utilisateur scrolle verticalement
3. Pendant le drag horizontal : applique `translateX(${Math.max(0, dx)}px)` sur le `pageRef` (pas de déplacement vers la gauche)

### Fin du geste

- `dx >= 80px` → animation slide-out (`translateX(100vw)`, durée 220ms, ease-in) puis appel à `onBack()`  
- `dx < 80px` → spring-back (`translateX(0)`, durée 200ms, ease-out)

Dans les deux cas, reset complet des refs de suivi.

### Gestion des conflits

| Interaction | Résolution |
|---|---|
| `SwipeableRow` (swipe gauche, `dx < 0`) | Aucun conflit : ce hook n'agit que si `dx > 0` |
| Scroll vertical | Préservé : le verrouillage d'axe abandonne si `|dy| >= |dx|` |
| Onglets racine | `enabled: false` → aucun listener attaché |
| Pas de page précédente | `enabled` basé sur `SUB_PAGES.includes(currentTab)`, jamais actif sur les onglets racine |

## Implémentation

### `src/hooks/useEdgeSwipeBack.js`

- Écoute `touchstart` / `touchmove` / `touchend` sur `document` via `useEffect`
- Utilise des `useRef` pour éviter les closures périmées
- Applique les transitions CSS directement sur `pageRef.current.style` (pas de state React, zéro re-render pendant le drag)
- Cleanup complet au démontage et quand `enabled` passe à `false`

### `src/App.jsx`

- Import du hook
- Ajout du `pageRef` sur le `<div>` racine du rendu conditionnel
- Définition de `SUB_PAGES` et passage de `enabled`

## Ce qui ne change pas

- Aucun composant enfant (PlayerDetail, TeamDetail, etc.) n'est modifié
- Le bouton "Précédent" existant continue de fonctionner
- Les animations `navDirection` existantes (`push`/`pop`) ne sont pas modifiées
