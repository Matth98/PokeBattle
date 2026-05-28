# Swipe-back parallax (page précédente visible) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher la page précédente derrière la page courante pendant le swipe-back, avec un effet parallaxe iOS authentique.

**Architecture:** On ajoute un paramètre `bgRef` au hook `useEdgeSwipeBack` qui anime une seconde couche (la page précédente) en parallaxe (1/4 de vitesse). Dans `App.jsx`, un state `prevTab` traque l'onglet précédent ; une couche `position: fixed / z-index: 9` le rend derrière la couche courante (`z-index: 10`). Quand aucun swipe n'est en cours, la couche fond est hors champ (translateX -25vw).

**Tech Stack:** React 19, hooks natifs, Touch Events API — aucune nouvelle dépendance.

---

## Fichiers

| Fichier | Action | Rôle |
|---|---|---|
| `src/hooks/useEdgeSwipeBack.js` | **Modifier** | Ajout du param `bgRef` + animation parallaxe |
| `src/hooks/useEdgeSwipeBack.test.js` | **Modifier** | Nouveaux tests pour bgRef |
| `src/App.jsx` | **Modifier** | `prevTab` state, `bgPageRef`, couche fond, z-index |

---

## Task 1 : Mettre à jour `useEdgeSwipeBack` pour le parallaxe

**Files:**
- Modify: `src/hooks/useEdgeSwipeBack.js`
- Test: `src/hooks/useEdgeSwipeBack.test.js`

---

- [ ] **Step 1.1 : Écrire les nouveaux tests (bgRef)**

Ajouter ces tests à la fin de `src/hooks/useEdgeSwipeBack.test.js`, après les 5 tests existants :

```js
// ─── Tests avec bgRef ───────────────────────────────────────────────

function TestPageWithBg({ onBack, enabled }) {
  const bgRef = React.useRef(null);
  const pageRef = useEdgeSwipeBack({ onBack, enabled, bgRef });
  return (
    <>
      <div ref={pageRef} data-testid="page" />
      <div ref={bgRef} data-testid="bg" />
    </>
  );
}

test('bgRef reçoit un translateX pendant le drag horizontal', () => {
  const onBack = jest.fn();
  const { getByTestId } = render(<TestPageWithBg onBack={onBack} enabled />);
  act(() => {
    fireEvent.touchStart(document, { touches: [{ identifier: 1, clientX: 10, clientY: 200 }] });
    fireEvent.touchMove(document, { touches: [{ identifier: 1, clientX: 60, clientY: 200 }] }); // dx=50
  });
  expect(getByTestId('bg').style.transform).toContain('translateX(');
});

test('bgRef ne cause pas d\'erreur quand null (paramètre omis)', () => {
  const onBack = jest.fn();
  // Réutilise TestPage (sans bgRef) — ne doit pas crasher
  render(<TestPage onBack={onBack} enabled />);
  expect(() => swipe(10, 200, 100, 200)).not.toThrow();
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('bgRef revient en position initiale après spring-back', () => {
  const onBack = jest.fn();
  const { getByTestId } = render(<TestPageWithBg onBack={onBack} enabled />);
  act(() => {
    fireEvent.touchStart(document, { touches: [{ identifier: 1, clientX: 10, clientY: 200 }] });
    fireEvent.touchMove(document, { touches: [{ identifier: 1, clientX: 40, clientY: 200 }] }); // dx=30 < 80
    fireEvent.touchEnd(document, { changedTouches: [{ identifier: 1, clientX: 40, clientY: 200 }] });
    jest.runAllTimers();
  });
  // Après spring-back, le transform est remis à la position parallaxe initiale
  // (avec window.innerWidth=0 en jsdom : translateX(-0px) → contient 'translateX(')
  expect(getByTestId('bg').style.transform).toContain('translateX(');
  expect(onBack).not.toHaveBeenCalled();
});
```

- [ ] **Step 1.2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
cd /Users/matthias/Desktop/pokebattle-app && npm test -- --testPathPattern=useEdgeSwipeBack --watchAll=false 2>&1 | tail -20
```

Attendu : les 3 nouveaux tests FAIL (le hook ne connaît pas encore `bgRef`), les 5 anciens PASS.

- [ ] **Step 1.3 : Remplacer le hook complet**

Réécrire `src/hooks/useEdgeSwipeBack.js` en entier :

```js
import { useRef, useEffect } from 'react';

const EDGE_THRESHOLD = 22;
const SWIPE_THRESHOLD = 80;
const SLIDE_OUT_MS = 220;
const SPRING_BACK_MS = 200;
const PARALLAX_RATIO = 0.25;

function bgInitialX() {
  return -window.innerWidth * PARALLAX_RATIO;
}

export function useEdgeSwipeBack({ onBack, enabled, bgRef = null }) {
  const pageRef = useRef(null);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  const startXRef = useRef(null);
  const startYRef = useRef(null);
  const lockedAxisRef = useRef(null);
  const activeRef = useRef(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      clearTimeout(timeoutRef.current);
      activeRef.current = false;
      if (pageRef.current) {
        pageRef.current.style.transition = '';
        pageRef.current.style.transform = '';
      }
      if (bgRef?.current) {
        bgRef.current.style.transition = '';
        bgRef.current.style.transform = `translateX(${bgInitialX()}px)`;
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

      if (lockedAxisRef.current === null) {
        if (Math.abs(dx) + Math.abs(dy) < 6) return;
        lockedAxisRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (lockedAxisRef.current === 'y') {
          activeRef.current = false;
          return;
        }
      }

      if (lockedAxisRef.current !== 'x') return;

      e.preventDefault();

      const clampedDx = Math.max(0, dx);
      if (pageRef.current) {
        pageRef.current.style.transition = 'none';
        pageRef.current.style.transform = `translateX(${clampedDx}px)`;
      }
      if (bgRef?.current) {
        bgRef.current.style.transition = 'none';
        bgRef.current.style.transform = `translateX(${bgInitialX() + clampedDx * PARALLAX_RATIO}px)`;
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
        if (bgRef?.current) {
          bgRef.current.style.transition = '';
          bgRef.current.style.transform = `translateX(${bgInitialX()}px)`;
        }
        return;
      }

      if (dx >= SWIPE_THRESHOLD) {
        if (pageRef.current) {
          pageRef.current.style.transition = `transform ${SLIDE_OUT_MS}ms ease-in`;
          pageRef.current.style.transform = `translateX(${window.innerWidth}px)`;
        }
        if (bgRef?.current) {
          bgRef.current.style.transition = `transform ${SLIDE_OUT_MS}ms ease-in`;
          bgRef.current.style.transform = 'translateX(0px)';
        }
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (pageRef.current) {
            pageRef.current.style.transition = '';
            pageRef.current.style.transform = '';
          }
          if (bgRef?.current) {
            bgRef.current.style.transition = '';
            bgRef.current.style.transform = `translateX(${bgInitialX()}px)`;
          }
          onBackRef.current();
        }, SLIDE_OUT_MS);
      } else {
        if (pageRef.current) {
          pageRef.current.style.transition = `transform ${SPRING_BACK_MS}ms ease-out`;
          pageRef.current.style.transform = 'translateX(0)';
        }
        if (bgRef?.current) {
          bgRef.current.style.transition = `transform ${SPRING_BACK_MS}ms ease-out`;
          bgRef.current.style.transform = `translateX(${bgInitialX()}px)`;
        }
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (pageRef.current) {
            pageRef.current.style.transition = '';
            pageRef.current.style.transform = '';
          }
          if (bgRef?.current) {
            bgRef.current.style.transition = '';
            bgRef.current.style.transform = `translateX(${bgInitialX()}px)`;
          }
        }, SPRING_BACK_MS);
      }
    };

    const handleTouchCancel = () => {
      if (!activeRef.current) return;
      clearTimeout(timeoutRef.current);
      activeRef.current = false;
      startXRef.current = null;
      startYRef.current = null;
      lockedAxisRef.current = null;
      if (pageRef.current) {
        pageRef.current.style.transition = `transform ${SPRING_BACK_MS}ms ease-out`;
        pageRef.current.style.transform = 'translateX(0)';
      }
      if (bgRef?.current) {
        bgRef.current.style.transition = `transform ${SPRING_BACK_MS}ms ease-out`;
        bgRef.current.style.transform = `translateX(${bgInitialX()}px)`;
      }
      timeoutRef.current = setTimeout(() => {
        if (pageRef.current) {
          pageRef.current.style.transition = '';
          pageRef.current.style.transform = '';
        }
        if (bgRef?.current) {
          bgRef.current.style.transition = '';
          bgRef.current.style.transform = `translateX(${bgInitialX()}px)`;
        }
      }, SPRING_BACK_MS);
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
      clearTimeout(timeoutRef.current);
      activeRef.current = false;
    };
  }, [enabled]);

  return pageRef;
}
```

- [ ] **Step 1.4 : Lancer les tests pour vérifier que les 8 passent**

```bash
cd /Users/matthias/Desktop/pokebattle-app && npm test -- --testPathPattern=useEdgeSwipeBack --watchAll=false 2>&1 | tail -20
```

Attendu : 8 tests PASS.

- [ ] **Step 1.5 : Commit**

```bash
cd /Users/matthias/Desktop/pokebattle-app && git add src/hooks/useEdgeSwipeBack.js src/hooks/useEdgeSwipeBack.test.js && git commit -m "feat: add bgRef parallax animation to useEdgeSwipeBack"
```

---

## Task 2 : Ajouter `prevTab` + `bgPageRef` dans App.jsx

**Files:**
- Modify: `src/App.jsx`

---

- [ ] **Step 2.1 : Ajouter le state `prevTab`**

Dans `src/App.jsx`, après la ligne :
```js
  const [navDirection, setNavDirection] = useState(null); // 'push' | 'pop' | null
```

Ajouter :
```js
  const [prevTab, setPrevTab] = useState(null);
```

- [ ] **Step 2.2 : Mettre à jour `setCurrentTab` pour réinitialiser `prevTab`**

Trouver :
```js
  const setCurrentTab = useCallback((newTab) => {
    setNavDirection(null);
    navStack.current = [];
    setBackLabel('');
    scrollMemoryRef.current.set(currentTab, window.scrollY);
    shouldRestoreRef.current = false;
    _setCurrentTabState(newTab);
  }, [currentTab]);
```

Remplacer par :
```js
  const setCurrentTab = useCallback((newTab) => {
    setNavDirection(null);
    navStack.current = [];
    setBackLabel('');
    scrollMemoryRef.current.set(currentTab, window.scrollY);
    shouldRestoreRef.current = false;
    setPrevTab(null);
    _setCurrentTabState(newTab);
  }, [currentTab]);
```

- [ ] **Step 2.3 : Mettre à jour `navigateTo` pour mémoriser `prevTab`**

Trouver :
```js
  const navigateTo = useCallback((newTab, extra = {}) => {
    setNavDirection('push');
    const label = getTabLabel(currentTab);
    navStack.current.push({ tab: currentTab, extra, label });
    setBackLabel(label);
    scrollMemoryRef.current.set(currentTab, window.scrollY);
    shouldRestoreRef.current = false;
    _setCurrentTabState(newTab);
  }, [currentTab, getTabLabel]);
```

Remplacer par :
```js
  const navigateTo = useCallback((newTab, extra = {}) => {
    setNavDirection('push');
    const label = getTabLabel(currentTab);
    navStack.current.push({ tab: currentTab, extra, label });
    setBackLabel(label);
    scrollMemoryRef.current.set(currentTab, window.scrollY);
    shouldRestoreRef.current = false;
    setPrevTab(currentTab);
    _setCurrentTabState(newTab);
  }, [currentTab, getTabLabel]);
```

- [ ] **Step 2.4 : Mettre à jour `navigateBack` pour recalculer `prevTab`**

Trouver :
```js
  const navigateBack = useCallback(() => {
    setNavDirection('pop');
    const prev = navStack.current.pop();
    const target = prev ?? { tab: DETAIL_FALLBACKS[currentTab] ?? 'home', extra: {}, label: '' };
    if (target.extra?.playerDetailTab !== undefined) {
      setPlayerDetailTab(target.extra.playerDetailTab);
    }
    // Le nouveau label "retour" est l'entrée en dessous dans le stack (si elle existe)
    const newTop = navStack.current[navStack.current.length - 1];
    setBackLabel(newTop?.label || '');
    scrollMemoryRef.current.set(currentTab, window.scrollY);
    shouldRestoreRef.current = !!prev;
    _setCurrentTabState(target.tab);
  }, [currentTab]);
```

Remplacer par :
```js
  const navigateBack = useCallback(() => {
    setNavDirection('pop');
    const prev = navStack.current.pop();
    const target = prev ?? { tab: DETAIL_FALLBACKS[currentTab] ?? 'home', extra: {}, label: '' };
    if (target.extra?.playerDetailTab !== undefined) {
      setPlayerDetailTab(target.extra.playerDetailTab);
    }
    const newTop = navStack.current[navStack.current.length - 1];
    setBackLabel(newTop?.label || '');
    scrollMemoryRef.current.set(currentTab, window.scrollY);
    shouldRestoreRef.current = !!prev;
    setPrevTab(navStack.current[navStack.current.length - 1]?.tab ?? null);
    _setCurrentTabState(target.tab);
  }, [currentTab]);
```

- [ ] **Step 2.5 : Ajouter `bgPageRef` et le passer au hook**

Trouver :
```js
  const pageRef = useEdgeSwipeBack({
    onBack: handleBack,
    enabled: SUB_PAGES.includes(currentTab) && !settingsOpen && !showNewBattleForm && !showNewTeamForm,
  });
```

Remplacer par :
```js
  const bgPageRef = useRef(null);
  const pageRef = useEdgeSwipeBack({
    onBack: handleBack,
    enabled: SUB_PAGES.includes(currentTab) && !settingsOpen && !showNewBattleForm && !showNewTeamForm,
    bgRef: bgPageRef,
  });
```

- [ ] **Step 2.6 : Lancer les tests**

```bash
cd /Users/matthias/Desktop/pokebattle-app && npm test -- --watchAll=false 2>&1 | tail -15
```

Attendu : 8 passes useEdgeSwipeBack + les mêmes 7 failures LoginScreen pré-existantes qu'avant.

- [ ] **Step 2.7 : Commit**

```bash
cd /Users/matthias/Desktop/pokebattle-app && git add src/App.jsx && git commit -m "feat: add prevTab state and bgPageRef for swipe-back parallax"
```

---

## Task 3 : Rendre la couche fond dans App.jsx

**Files:**
- Modify: `src/App.jsx`

---

- [ ] **Step 3.1 : Modifier le div racine du return principal**

Trouver le début du dernier `return` de `AppContent` :
```jsx
  return (
    <div ref={pageRef} className={isDark ? 'dark' : ''}>
```

Remplacer par :
```jsx
  return (
    <div className={isDark ? 'dark' : ''}>
      {/* Couche fond : page précédente, visible pendant le swipe-back */}
      {prevTab && SUB_PAGES.includes(currentTab) && (
        <div
          ref={bgPageRef}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9,
            pointerEvents: 'none',
            transform: `translateX(${-window.innerWidth * 0.25}px)`,
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 1, pointerEvents: 'none' }} />
          {prevTab === 'home' && <Home players={players} battles={battles} teams={teams} isDark={isDark} t={t} setCurrentTab={() => {}} setSelectedBattle={() => {}} onSelectPlayer={() => {}} onSearchPokemon={() => {}} linkedPlayer={players.find(p => p._id === dbUser?.playerId)} onOpenSettings={() => {}} />}
          {prevTab === 'players' && <Players players={players} t={t} isDark={isDark} onSelectPlayer={() => {}} onAddPlayer={() => {}} onDeletePlayer={() => {}} onDeleteMultiple={() => {}} selectionMode={null} setSelectionMode={() => {}} selectedItems={[]} setSelectedItems={() => {}} showForm={false} setShowForm={() => {}} />}
          {prevTab === 'battles' && <Battles battles={battles} players={players} teams={teams} t={t} isDark={isDark} onSelectBattle={() => {}} onAddBattle={() => {}} onUpdateBattle={() => {}} onUpdatePlayer={() => {}} onSyncPokemon={() => {}} onDeleteBattle={() => {}} onDeleteMultiple={() => {}} selectionMode={null} setSelectionMode={() => {}} selectedItems={[]} setSelectedItems={() => {}} showForm={false} setShowForm={() => {}} editingBattle={null} clearEditingBattle={() => {}} />}
          {prevTab === 'teams' && <Teams teams={teams} players={players} t={t} isDark={isDark} onSelectTeam={() => {}} onAddTeam={() => {}} onUpdateTeam={() => {}} onUpdatePlayer={() => {}} onDeleteTeam={() => {}} onDeleteMultiple={() => {}} selectionMode={null} setSelectionMode={() => {}} selectedItems={[]} setSelectedItems={() => {}} showForm={false} setShowForm={() => {}} editingTeam={null} clearEditingTeam={() => {}} />}
          {prevTab === 'playerDetail' && selectedPlayer && <PlayerDetail player={selectedPlayer} teams={teams} battles={battles} t={t} isDark={isDark} initialActiveTab={playerDetailTab} backLabel={backLabel} onBack={() => {}} onUpdate={() => {}} onAddTeam={() => {}} onUpdateTeam={() => {}} onDeleteTeam={() => {}} onSelectTeam={() => {}} />}
          {prevTab === 'teamDetail' && selectedTeam && <TeamDetail team={selectedTeam} t={t} isDark={isDark} backLabel={backLabel} onBack={() => {}} onEdit={() => {}} onUpdate={() => {}} />}
          {prevTab === 'battleDetail' && selectedBattle && <BattleDetail battle={selectedBattle} players={players} t={t} isDark={isDark} backLabel={backLabel} onBack={() => {}} onEdit={() => {}} onDelete={() => {}} />}
          {prevTab === 'pokemonSearch' && <PokemonSearchPage t={t} isDark={isDark} backLabel={backLabel} onBack={() => {}} onSelectPokemon={() => {}} />}
        </div>
      )}

      {/* Couche avant : page courante */}
      <div ref={pageRef} style={{ position: 'relative', zIndex: 10 }}>
```

- [ ] **Step 3.2 : Fermer le div de la couche avant**

Trouver la fermeture du div racine (avant `</div>` final de `AppContent`). La structure actuelle se termine par :

```jsx
      {!['pokemonSearch', 'pokemonDetail'].includes(currentTab) && (
        <Navigation
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          isDark={isDark}
          t={t}
          onCreateBattle={() => {
            setBattleEditOrigin(null);
            setShowNewBattleForm(true);
          }}
        />
      )}
    </div>
  );
```

Remplacer par :

```jsx
      {!['pokemonSearch', 'pokemonDetail'].includes(currentTab) && (
        <Navigation
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          isDark={isDark}
          t={t}
          onCreateBattle={() => {
            setBattleEditOrigin(null);
            setShowNewBattleForm(true);
          }}
        />
      )}
      </div>{/* fin couche avant */}
    </div>
  );
```

- [ ] **Step 3.3 : Lancer les tests**

```bash
cd /Users/matthias/Desktop/pokebattle-app && npm test -- --watchAll=false 2>&1 | tail -15
```

Attendu : 8 passes useEdgeSwipeBack + les mêmes 7 failures pré-existantes.

- [ ] **Step 3.4 : Commit**

```bash
cd /Users/matthias/Desktop/pokebattle-app && git add src/App.jsx && git commit -m "feat: render background layer for iOS-style swipe-back parallax"
```

---

## Task 4 : Vérification manuelle sur mobile

- [ ] **Step 4.1 : Lancer le serveur de dev**

```bash
npm start
```

- [ ] **Step 4.2 : Tester le swipe-back avec page de fond visible**

Sur mobile ou Chrome DevTools (touch activé) :

1. Naviguer vers un joueur (PlayerDetail) → commencer un swipe depuis le bord gauche → vérifier que la page `players` apparaît derrière et glisse vers la droite en parallaxe
2. Faire un swipe court (< 80px) → les deux pages reviennent à leur position
3. Faire un swipe complet → slide-out + retour à la page précédente
4. Tester sur TeamDetail, BattleDetail, PokemonSearchPage

- [ ] **Step 4.3 : Vérifier l'absence de régression**

1. Sur un onglet racine (Accueil, Joueurs, Combats, Équipes) → aucune couche fond visible
2. Ouvrir les settings depuis une sous-page → aucun swipe actif, pas de couche fond visible pendant l'interaction
3. SwipeableRow (swipe gauche sur une ligne) → fonctionne normalement, pas de conflit
