# Swipe-back Gesture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un swipe depuis le bord gauche de l'écran pour revenir en arrière sur les sous-pages, avec la page qui suit le doigt et une animation slide-out au relâchement.

**Architecture:** Un hook `useEdgeSwipeBack` écoute les touch events sur `document`, détecte un swipe depuis les 22px de bord gauche, applique un `translateX` CSS directement sur un `ref` de wrapper (zéro re-render pendant le drag), puis appelle `onBack()` après une animation slide-out ou fait un spring-back si le seuil n'est pas atteint. Intégré dans `App.jsx` sur le div racine, actif uniquement sur les sous-pages.

**Tech Stack:** React 19, hooks natifs (useRef, useEffect), Touch Events API (pas de dépendance ajoutée)

---

## Fichiers

| Fichier | Action | Rôle |
|---|---|---|
| `src/hooks/useEdgeSwipeBack.js` | **Créer** | Hook : détection du geste + animation |
| `src/hooks/useEdgeSwipeBack.test.js` | **Créer** | Tests comportementaux du hook |
| `src/App.jsx` | **Modifier** | Import + intégration du hook sur le div racine |

---

## Task 1 : Hook `useEdgeSwipeBack`

**Files:**
- Create: `src/hooks/useEdgeSwipeBack.js`
- Test: `src/hooks/useEdgeSwipeBack.test.js`

---

- [ ] **Step 1.1 : Écrire les tests du hook**

Créer `src/hooks/useEdgeSwipeBack.test.js` :

```js
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { useEdgeSwipeBack } from './useEdgeSwipeBack';

jest.useFakeTimers();

function TestPage({ onBack, enabled }) {
  const ref = useEdgeSwipeBack({ onBack, enabled });
  return <div ref={ref} data-testid="page" />;
}

function swipe(startX, startY, endX, endY) {
  act(() => {
    fireEvent.touchStart(document, {
      touches: [{ identifier: 1, clientX: startX, clientY: startY }],
    });
    fireEvent.touchMove(document, {
      touches: [{ identifier: 1, clientX: endX, clientY: endY }],
    });
    fireEvent.touchEnd(document, {
      changedTouches: [{ identifier: 1, clientX: endX, clientY: endY }],
    });
    jest.runAllTimers();
  });
}

test('appelle onBack quand swipe depuis le bord gauche dépasse 80px', () => {
  const onBack = jest.fn();
  render(<TestPage onBack={onBack} enabled />);
  swipe(10, 200, 100, 200); // dx=90 ≥ 80, dy=0
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('ne appelle pas onBack si le swipe est trop court', () => {
  const onBack = jest.fn();
  render(<TestPage onBack={onBack} enabled />);
  swipe(10, 200, 50, 200); // dx=40 < 80
  expect(onBack).not.toHaveBeenCalled();
});

test('ne appelle pas onBack si le geste démarre hors de la zone de bord (x ≥ 22)', () => {
  const onBack = jest.fn();
  render(<TestPage onBack={onBack} enabled />);
  swipe(30, 200, 130, 200); // startX=30 ≥ 22
  expect(onBack).not.toHaveBeenCalled();
});

test('ne appelle pas onBack si enabled=false', () => {
  const onBack = jest.fn();
  render(<TestPage onBack={onBack} enabled={false} />);
  swipe(10, 200, 100, 200);
  expect(onBack).not.toHaveBeenCalled();
});

test('ne appelle pas onBack sur un swipe majoritairement vertical', () => {
  const onBack = jest.fn();
  render(<TestPage onBack={onBack} enabled />);
  swipe(10, 200, 15, 310); // dx=5, dy=110 → vertical
  expect(onBack).not.toHaveBeenCalled();
});
```

- [ ] **Step 1.2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npm test -- --testPathPattern=useEdgeSwipeBack --watchAll=false
```

Résultat attendu : 5 tests **FAIL** avec `Cannot find module './useEdgeSwipeBack'`

- [ ] **Step 1.3 : Créer le hook**

Créer `src/hooks/useEdgeSwipeBack.js` :

```js
import { useRef, useEffect } from 'react';

const EDGE_THRESHOLD = 22;    // px depuis le bord gauche
const SWIPE_THRESHOLD = 80;   // px de déplacement horizontal pour confirmer le retour
const SLIDE_OUT_MS = 220;
const SPRING_BACK_MS = 200;

export function useEdgeSwipeBack({ onBack, enabled }) {
  const pageRef = useRef(null);
  // Toujours à jour sans re-créer les listeners
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  const startXRef = useRef(null);
  const startYRef = useRef(null);
  const lockedAxisRef = useRef(null); // 'x' | 'y' | null
  const activeRef = useRef(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      // Nettoie un éventuel transform en cours si enabled passe à false mid-gesture
      activeRef.current = false;
      if (pageRef.current) {
        pageRef.current.style.transition = '';
        pageRef.current.style.transform = '';
      }
      return;
    }

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      if (touch.clientX >= EDGE_THRESHOLD) return;
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      lockedAxisRef.current = null;
      activeRef.current = true;
    };

    const handleTouchMove = (e) => {
      if (!activeRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startXRef.current;
      const dy = touch.clientY - startYRef.current;

      // Verrouillage d'axe au premier mouvement significatif
      if (lockedAxisRef.current === null) {
        if (Math.abs(dx) + Math.abs(dy) < 6) return;
        lockedAxisRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (lockedAxisRef.current === 'y') {
          activeRef.current = false;
          return;
        }
      }

      if (lockedAxisRef.current !== 'x') return;

      // Empêche le scroll pendant le swipe horizontal
      e.preventDefault();

      if (pageRef.current) {
        pageRef.current.style.transition = 'none';
        pageRef.current.style.transform = `translateX(${Math.max(0, dx)}px)`;
      }
    };

    const handleTouchEnd = (e) => {
      if (!activeRef.current) return;

      const touch = e.changedTouches[0];
      const dx = startXRef.current !== null ? touch.clientX - startXRef.current : 0;
      const wasHorizontal = lockedAxisRef.current === 'x';

      activeRef.current = false;
      startXRef.current = null;
      startYRef.current = null;
      lockedAxisRef.current = null;

      if (!wasHorizontal) {
        if (pageRef.current) {
          pageRef.current.style.transition = '';
          pageRef.current.style.transform = '';
        }
        return;
      }

      if (dx >= SWIPE_THRESHOLD) {
        // Slide-out vers la droite, puis navigateBack
        if (pageRef.current) {
          pageRef.current.style.transition = `transform ${SLIDE_OUT_MS}ms ease-in`;
          pageRef.current.style.transform = 'translateX(100vw)';
        }
        timeoutRef.current = setTimeout(() => {
          if (pageRef.current) {
            pageRef.current.style.transition = '';
            pageRef.current.style.transform = '';
          }
          onBackRef.current();
        }, SLIDE_OUT_MS);
      } else {
        // Spring-back à la position initiale
        if (pageRef.current) {
          pageRef.current.style.transition = `transform ${SPRING_BACK_MS}ms ease-out`;
          pageRef.current.style.transform = 'translateX(0)';
          timeoutRef.current = setTimeout(() => {
            if (pageRef.current) {
              pageRef.current.style.transition = '';
              pageRef.current.style.transform = '';
            }
          }, SPRING_BACK_MS);
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      clearTimeout(timeoutRef.current);
      activeRef.current = false;
    };
  }, [enabled]);

  return pageRef;
}
```

- [ ] **Step 1.4 : Lancer les tests pour vérifier qu'ils passent**

```bash
npm test -- --testPathPattern=useEdgeSwipeBack --watchAll=false
```

Résultat attendu : 5 tests **PASS**

- [ ] **Step 1.5 : Commit**

```bash
git add src/hooks/useEdgeSwipeBack.js src/hooks/useEdgeSwipeBack.test.js
git commit -m "feat: add useEdgeSwipeBack hook for left-edge swipe-back gesture"
```

---

## Task 2 : Intégration dans `App.jsx`

**Files:**
- Modify: `src/App.jsx`

---

- [ ] **Step 2.1 : Ajouter l'import du hook dans `App.jsx`**

Dans `src/App.jsx`, ajouter l'import après la ligne `import { useThemeMode } from './hooks/useThemeMode';` :

```js
import { useEdgeSwipeBack } from './hooks/useEdgeSwipeBack';
```

- [ ] **Step 2.2 : Instancier le hook dans `AppContent`**

Dans `AppContent`, après la ligne `const [settingsOpen, setSettingsOpen] = useState(false);`, ajouter :

```js
const SUB_PAGES = ['playerDetail', 'teamDetail', 'battleDetail', 'pokemonSearch', 'pokemonDetail'];
const pageRef = useEdgeSwipeBack({
  onBack: navigateBack,
  enabled: SUB_PAGES.includes(currentTab),
});
```

- [ ] **Step 2.3 : Attacher le ref au div racine du rendu principal**

Dans le `return` de `AppContent`, remplacer :

```jsx
return (
  <div className={isDark ? 'dark' : ''}>
```

par :

```jsx
return (
  <div ref={pageRef} className={isDark ? 'dark' : ''}>
```

> Les divs des écrans de chargement (`authLoading`, `initialLoading`) et `LoginScreen` / `ClaimPlayerScreen` n'ont pas besoin du ref — ils n'ont pas de bouton retour.

- [ ] **Step 2.4 : Lancer la suite de tests complète**

```bash
npm test -- --watchAll=false
```

Résultat attendu : tous les tests passent (y compris les 5 nouveaux).

- [ ] **Step 2.5 : Commit**

```bash
git add src/App.jsx
git commit -m "feat: integrate swipe-back gesture on sub-pages"
```

---

## Task 3 : Vérification manuelle sur mobile

- [ ] **Step 3.1 : Lancer le serveur de dev**

```bash
npm start
```

- [ ] **Step 3.2 : Ouvrir l'app sur mobile (ou DevTools > device toolbar)**

Sur un iPhone ou avec Chrome DevTools en mode mobile (touch activé).

- [ ] **Step 3.3 : Vérifier les cas nominaux**

1. Naviguer vers un joueur (PlayerDetail) → swiper depuis le bord gauche → la page suit le doigt → au relâchement (`dx ≥ 80px`), slide-out et retour
2. Même chose sur TeamDetail, BattleDetail, PokemonSearchPage, PokemonDetailPage
3. Swipe court (`dx < 80px`) → spring-back, pas de navigation

- [ ] **Step 3.4 : Vérifier les cas limites**

1. Sur un onglet racine (Accueil, Joueurs, Combats, Équipes) → le swipe ne fait rien
2. Swipe vers la gauche sur une `SwipeableRow` → révèle la corbeille normalement, pas de conflit
3. Scroll vertical sur une sous-page → scroll normal, pas de déclenchement du swipe

---
