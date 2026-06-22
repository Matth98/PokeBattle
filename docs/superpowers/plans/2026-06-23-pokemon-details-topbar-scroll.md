# PokemonDetailPage — Topbar scroll effects + Pokémon asset

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à la topbar de PokemonDetailPage une vraie hauteur, afficher l'asset du Pokémon centré en permanence, et ajouter les effets blur + dégradé au scroll (identiques aux pages Home/Teams/Battles).

**Architecture:** Un seul fichier modifié (`PokemonDetailPage.jsx`). On ajoute un état `scrolled` (scroll listener passif), on transforme la topbar de height:0 en topbar avec padding, on y centre l'image du Pokémon, et on retire le paddingTop redondant du hero.

**Tech Stack:** React, Tailwind CSS, inline styles (pattern existant dans le projet)

## Global Constraints

- Ne modifier que `src/components/PokemonDetailPage.jsx`
- Suivre exactement le pattern blur+dégradé de `Home.jsx` (lignes 381-393)
- Threshold scroll : `window.scrollY > 20`
- Image topbar : 44×44px, `object-contain`, source `data.officialArtwork || data.sprite`
- Pas de refactoring hors périmètre

---

### Task 1 : Ajouter l'état `scrolled` et le scroll listener

**Files:**
- Modify: `src/components/PokemonDetailPage.jsx` (zone des hooks, vers ligne 480)

**Interfaces:**
- Produit: état `scrolled: boolean` disponible dans le render

- [ ] **Step 1 : Localiser la zone des hooks**

Ouvrir `src/components/PokemonDetailPage.jsx`. Les hooks existants terminent vers la ligne 495 (le `useLayoutEffect` pour la restauration du scroll). Insérer après cette ligne.

- [ ] **Step 2 : Ajouter le state et l'effect**

Insérer après le `useLayoutEffect` (ligne ~495) :

```jsx
const [scrolled, setScrolled] = useState(() => window.scrollY > 20);
useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

- [ ] **Step 3 : Vérifier que l'app compile sans erreur**

```bash
# Dans le terminal du projet
npm run build 2>&1 | tail -20
```

Résultat attendu : aucune erreur de compilation.

- [ ] **Step 4 : Commit**

```bash
git add src/components/PokemonDetailPage.jsx
git commit -m "feat: add scrolled state to PokemonDetailPage"
```

---

### Task 2 : Transformer la topbar et ajouter l'asset Pokémon + effets blur/dégradé

**Files:**
- Modify: `src/components/PokemonDetailPage.jsx` (lignes 519-531, la topbar)

**Interfaces:**
- Consomme: `scrolled` (Task 1), `data.officialArtwork`, `data.sprite`, `isDark`, `onBack`, `tr`, `accentHex`

- [ ] **Step 1 : Remplacer le bloc topbar existant**

Remplacer le bloc actuel (lignes 519-531) :

```jsx
{/* ── Bouton retour — flotte par-dessus le hero ── */}
<div className="sticky top-0 z-20" style={{ height: 0, overflow: 'visible' }}>
  <div className="px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
    <button
      onClick={onBack}
      className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'}`}
      style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
      aria-label={tr('common.back')}
    >
      <ChevronLeft size={24} className="-translate-x-px" />
    </button>
  </div>
</div>
```

Par ce nouveau bloc :

```jsx
{/* ── Topbar ── */}
<div
  className="sticky top-0 z-20 px-4 relative"
  style={{
    paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)',
    paddingBottom: '0.75rem',
  }}
>
  {/* Layer blur */}
  <div className="absolute inset-x-0 top-0 -bottom-12 pointer-events-none transition-opacity duration-300" style={{
    opacity: scrolled ? 1 : 0,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
  }} />
  {/* Layer dégradé */}
  <div className="absolute inset-x-0 top-0 -bottom-12 pointer-events-none transition-opacity duration-300" style={{
    opacity: scrolled ? 1 : 0,
    background: isDark
      ? 'linear-gradient(to bottom, rgba(9,9,11,0.85) 0%, transparent 100%)'
      : 'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, transparent 100%)',
  }} />
  {/* Contenu topbar */}
  <div className="relative flex items-center">
    <button
      onClick={onBack}
      className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'}`}
      style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
      aria-label={tr('common.back')}
    >
      <ChevronLeft size={24} className="-translate-x-px" />
    </button>
    {/* Asset Pokémon centré */}
    {data && (
      <img
        src={data.officialArtwork || data.sprite}
        alt=""
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 object-contain pointer-events-none"
        style={{ width: 44, height: 44, transform: 'translate(-50%, -50%)' }}
        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
      />
    )}
  </div>
</div>
```

- [ ] **Step 2 : Retirer le paddingTop redondant du hero**

Dans le même fichier, trouver le `div` hero (vers ligne 552) qui contient :

```jsx
paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)',
```

Remplacer par :

```jsx
paddingTop: '1.5rem',
```

La safe-area est désormais absorbée par la topbar.

- [ ] **Step 3 : Vérifier que l'app compile sans erreur**

```bash
npm run build 2>&1 | tail -20
```

Résultat attendu : aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/components/PokemonDetailPage.jsx
git commit -m "feat: topbar scroll effects + Pokémon asset in PokemonDetailPage"
```
