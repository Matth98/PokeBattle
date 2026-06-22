# Design — PokemonDetailPage : topbar scroll effects + Pokémon asset

**Date :** 2026-06-23

## Contexte

La page `PokemonDetailPage` possède une topbar sticky minimale (`height: 0, overflow: visible`) qui fait simplement flotter un bouton retour au-dessus du hero. Les autres pages (Home, Teams, Battles, Players) ont une topbar avec des effets blur + dégradé au scroll. L'objectif est d'aligner PokemonDetailPage sur ce pattern, et d'y ajouter l'asset du Pokémon centré en permanence.

## Objectifs

1. Ajouter blur + dégradé sur la topbar au scroll (identique aux autres pages).
2. Afficher l'image du Pokémon centrée horizontalement et verticalement dans la topbar, dès le début (toujours visible).

## Design retenu

### Topbar

La topbar passe d'une hauteur nulle à une vraie hauteur en donnant un padding vertical :

- `paddingTop: calc(env(safe-area-inset-top) + 0.75rem)`
- `paddingBottom: 0.75rem`
- `position: sticky, top: 0, z-index: 20`

Contenu de la topbar :
- **Bouton retour** — à gauche, inchangé (w-11 h-11, rounded-full, backdrop-blur)
- **Image Pokémon** — `position: absolute`, `left: 50%`, `top: 50%`, `transform: translate(-50%, -50%)`, `width: 44px`, `height: 44px`, `object-contain`. Utilise `data.officialArtwork || data.sprite`.

**Layers blur + dégradé** (deux `div` `pointer-events-none` en `position: absolute`) :
- Layer 1 — blur : `backdropFilter: blur(16px)`, masqué par `linear-gradient(to bottom, black 0%, transparent 100%)`, `opacity: scrolled ? 1 : 0`, `transition-opacity duration-300`
- Layer 2 — dégradé : `background: linear-gradient(to bottom, rgba(9,9,11,0.85) → transparent)` (dark) / `rgba(255,255,255,0.9)` (light), même opacité conditionnelle

### État scroll

```js
const [scrolled, setScrolled] = useState(() => window.scrollY > 20);
useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

Threshold : `window.scrollY > 20` (identique aux autres pages).

### Hero

Retirer `paddingTop: calc(env(safe-area-inset-top) + 1.5rem)` du hero — la topbar occupant désormais cet espace. Garder `minHeight` et le reste du layout du hero inchangé.

## Fichiers impactés

- `src/components/PokemonDetailPage.jsx` — topbar (lignes ~520-531) et hero (ligne ~555)

## Non concerné

- Le bouton retour ne change pas de comportement.
- La grande image du Pokémon dans le hero (22rem × 22rem) reste inchangée.
- Les tabs et le reste du contenu sont inchangés.
