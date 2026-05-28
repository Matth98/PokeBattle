# Swipe-back Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Désactiver le swipe-back sur `pokemonDetail` et ajouter un overlay progressif sur la page courante pendant le swipe (assombrissement symétrique au fond).

**Architecture:** Deux changements indépendants. (1) Retirer `'pokemonDetail'` de `SUB_PAGES` dans `App.jsx`. (2) Ajouter un paramètre `fgOverlayRef` au hook `useEdgeSwipeBack` — symétrique à `bgRef` — qui anime l'opacité d'un div overlay à l'intérieur de `pageRef` proportionnellement à `dx / window.innerWidth × 0.25`.

**Tech Stack:** React 19, hooks natifs (useRef, useEffect), Touch Events API

---

## Fichiers

| Fichier | Action | Rôle |
|---|---|---|
| `src/hooks/useEdgeSwipeBack.js` | Modifier | Ajouter `fgOverlayRef` param + animation opacity |
| `src/hooks/useEdgeSwipeBack.test.js` | Modifier | 3 nouveaux tests pour `fgOverlayRef` |
| `src/App.jsx` | Modifier | Retirer `pokemonDetail` de SUB_PAGES, câbler `fgOverlayRef` |

---

## Task 1 : `fgOverlayRef` dans le hook (TDD)

**Files:**
- Modify: `src/hooks/useEdgeSwipeBack.js`
- Test: `src/hooks/useEdgeSwipeBack.test.js`

---

- [ ] **Step 1.1 : Ajouter le composant de test et 3 tests failing**

Dans `src/hooks/useEdgeSwipeBack.test.js`, après le composant `TestPageWithBg` existant, ajouter :

```js
function TestPageWithFgOverlay({ onBack, enabled }) {
  const fgOverlayRef = useRef(null);
  const ref = useEdgeSwipeBack({ onBack, enabled, fgOverlayRef });
  return (
    <div ref={ref} data-testid="page">
      <div ref={fgOverlayRef} data-testid="fg-overlay" />
    </div>
  );
}
```

Puis ajouter les 3 tests suivants à la suite des tests existants :

```js
test('fgOverlayRef reçoit une opacité > 0 pendant le drag', () => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 400 });
  const onBack = jest.fn();
  const { getByTestId } = render(<TestPageWithFgOverlay onBack={onBack} enabled />);
  act(() => {
    fireEvent.touchStart(document, { touches: [{ identifier: 1, clientX: 10, clientY: 200 }] });
    fireEvent.touchMove(document, { touches: [{ identifier: 1, clientX: 90, clientY: 200 }] }); // dx=80
  });
  expect(parseFloat(getByTestId('fg-overlay').style.opacity)).toBeGreaterThan(0);
});

test('fgOverlayRef revient à opacity 0 après spring-back', () => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 400 });
  const onBack = jest.fn();
  const { getByTestId } = render(<TestPageWithFgOverlay onBack={onBack} enabled />);
  act(() => {
    fireEvent.touchStart(document, { touches: [{ identifier: 1, clientX: 10, clientY: 200 }] });
    fireEvent.touchMove(document, { touches: [{ identifier: 1, clientX: 50, clientY: 200 }] }); // dx=40 < 80
    fireEvent.touchEnd(document, { changedTouches: [{ identifier: 1, clientX: 50, clientY: 200 }] });
    jest.runAllTimers();
  });
  expect(getByTestId('fg-overlay').style.opacity).toBe('0');
});

test('null fgOverlayRef (non fourni) ne provoque pas de crash pendant le swipe', () => {
  const onBack = jest.fn();
  const { getByTestId } = render(<TestPage onBack={onBack} enabled />);
  expect(() => {
    act(() => {
      fireEvent.touchStart(document, { touches: [{ identifier: 1, clientX: 10, clientY: 200 }] });
      fireEvent.touchMove(document, { touches: [{ identifier: 1, clientX: 90, clientY: 200 }] });
      fireEvent.touchEnd(document, { changedTouches: [{ identifier: 1, clientX: 90, clientY: 200 }] });
      jest.runAllTimers();
    });
  }).not.toThrow();
});
```

> `TestPage` est le composant existant sans `fgOverlayRef` — le troisième test vérifie que l'absence du param ne crash pas.

- [ ] **Step 1.2 : Vérifier que les 3 nouveaux tests échouent**

```bash
npm test -- --testPathPattern=useEdgeSwipeBack --watchAll=false
```

Résultat attendu : les 3 nouveaux tests **FAIL**, les 8 tests existants **PASS**.

- [ ] **Step 1.3 : Mettre à jour le hook**

Dans `src/hooks/useEdgeSwipeBack.js`, appliquer les changements suivants :

**Ajouter la constante** après `PARALLAX_RATIO` (ligne 7) :
```js
const FG_DIM_MAX = 0.25;
```

**Mettre à jour la signature** (ligne 13) :
```js
export function useEdgeSwipeBack({ onBack, enabled, bgRef = null, fgOverlayRef = null }) {
```

**Dans `resetStyles()`**, après le bloc `bgRef` (après la ligne 33) :
```js
      if (fgOverlayRef?.current) {
        fgOverlayRef.current.style.transition = '';
        fgOverlayRef.current.style.opacity = '0';
      }
```

**Dans `handleTouchMove`**, après le bloc `bgRef` (après la ligne 79) :
```js
      if (fgOverlayRef?.current) {
        fgOverlayRef.current.style.transition = 'none';
        fgOverlayRef.current.style.opacity = String(Math.min(1, (clampedDx / window.innerWidth) * FG_DIM_MAX));
      }
```

**Dans `handleTouchEnd`, branche slide-out (`dx >= SWIPE_THRESHOLD`)**, après le bloc `bgRef` (après la ligne 107) :
```js
        if (fgOverlayRef?.current) {
          fgOverlayRef.current.style.transition = `opacity ${SLIDE_OUT_MS}ms ease-in`;
          fgOverlayRef.current.style.opacity = '0';
        }
```

**Dans `handleTouchEnd`, branche spring-back (`dx < SWIPE_THRESHOLD`)**, après le bloc `bgRef` (après la ligne 121) :
```js
        if (fgOverlayRef?.current) {
          fgOverlayRef.current.style.transition = `opacity ${SPRING_BACK_MS}ms ease-out`;
          fgOverlayRef.current.style.opacity = '0';
        }
```

**Dans `handleTouchCancel`**, après le bloc `bgRef` (après la ligne 143) :
```js
      if (fgOverlayRef?.current) {
        fgOverlayRef.current.style.transition = `opacity ${SPRING_BACK_MS}ms ease-out`;
        fgOverlayRef.current.style.opacity = '0';
      }
```

> `Math.min(1, ...)` dans `handleTouchMove` évite `Infinity` quand `window.innerWidth === 0` (jsdom).

- [ ] **Step 1.4 : Vérifier que les 11 tests passent**

```bash
npm test -- --testPathPattern=useEdgeSwipeBack --watchAll=false
```

Résultat attendu : **11 tests PASS** (8 existants + 3 nouveaux).

- [ ] **Step 1.5 : Commit**

```bash
git add src/hooks/useEdgeSwipeBack.js src/hooks/useEdgeSwipeBack.test.js
git commit -m "feat: add fgOverlayRef progressive dim to useEdgeSwipeBack"
```

---

## Task 2 : Câblage dans `App.jsx`

**Files:**
- Modify: `src/App.jsx`

---

- [ ] **Step 2.1 : Retirer `pokemonDetail` de `SUB_PAGES`**

Dans `src/App.jsx`, à la ligne du module (avant `AppContent`) :

```js
// Avant
const SUB_PAGES = ['playerDetail', 'teamDetail', 'battleDetail', 'pokemonSearch', 'pokemonDetail'];

// Après
const SUB_PAGES = ['playerDetail', 'teamDetail', 'battleDetail', 'pokemonSearch'];
```

- [ ] **Step 2.2 : Retirer la branche `pokemonDetail` de la couche fond**

Dans le bloc de la couche fond (dans le `return` de `AppContent`), supprimer la ligne :

```jsx
{prevTab === 'pokemonDetail' && selectedPokemon && <PokemonDetailPage pokeId={selectedPokemon?.pokeId} pokeName={selectedPokemon?.name} t={t} isDark={isDark} backLabel={backLabel} onBack={() => {}} />}
```

> Elle est devenue inaccessible : `prevTab === 'pokemonDetail'` ne peut survenir que si on a navigué depuis `pokemonDetail` vers une autre SUB_PAGE — mais `pokemonDetail` vient d'être retiré de SUB_PAGES, donc la couche fond n'est jamais rendue quand on est sur `pokemonDetail`.

- [ ] **Step 2.3 : Ajouter `fgOverlayRef` et câbler le hook**

Dans `AppContent`, après la ligne `const bgPageRef = useRef(null);`, ajouter :

```js
const fgOverlayRef = useRef(null);
```

Puis mettre à jour l'appel du hook pour inclure `fgOverlayRef` :

```js
const pageRef = useEdgeSwipeBack({
  onBack: handleBack,
  enabled: SUB_PAGES.includes(currentTab) && !settingsOpen && !showNewBattleForm && !showNewTeamForm,
  bgRef: bgPageRef,
  fgOverlayRef: fgOverlayRef,
});
```

- [ ] **Step 2.4 : Ajouter l'overlay div à l'intérieur de `pageRef`**

Dans le `return`, le div `<div ref={pageRef} style={{ position: 'relative', zIndex: 10 }}>` existe déjà. Ajouter le div overlay comme **premier enfant** de ce div :

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
  {/* reste du contenu — ne pas toucher */}
```

> `position: fixed` à l'intérieur d'un ancêtre `position: relative` sans transform est viewport-relative au repos. Dès que `pageRef` acquiert `transform: translateX(dx)` pendant le swipe, l'overlay devient relatif au parent transformé et suit naturellement la page qui glisse.

- [ ] **Step 2.5 : Lancer la suite complète de tests**

```bash
npm test -- --watchAll=false
```

Résultat attendu : **11 tests PASS** (useEdgeSwipeBack) + les 7 failures pré-existantes sur `LoginScreen`/`ClaimPlayerScreen` (manque de `LanguageProvider` dans leur setup — non liées à nos changements).

- [ ] **Step 2.6 : Commit**

```bash
git add src/App.jsx
git commit -m "feat: disable swipe on pokemonDetail, wire fgOverlayRef progressive dim"
```

---
