# iOS Navigation Transitions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add iOS-style lateral page transitions (parallax + shadow) between level-1 and level-2 pages, with swipe-to-go-back from anywhere on screen.

**Architecture:** A `navDirection` state in `App.jsx` tracks push/pop/null. A new `PageTransition` component wraps all level-2 pages using Framer Motion `AnimatePresence`. A new `useSwipeBack` hook handles the touch gesture and calls `navigateBack()` when threshold is met.

**Tech Stack:** React 19, Framer Motion v12 (already installed), Tailwind CSS.

---

## File Map

| File | Action |
|---|---|
| `src/hooks/useSwipeBack.js` | Create — touch gesture hook |
| `src/components/PageTransition.jsx` | Create — AnimatePresence wrapper |
| `src/App.jsx` | Modify — navDirection state, nav functions, level-2 render block |

---

## Task 1: Create `useSwipeBack` hook

**Files:**
- Create: `src/hooks/useSwipeBack.js`

- [ ] **Step 1: Create the file**

```js
// src/hooks/useSwipeBack.js
import { useRef, useCallback } from 'react';

const HORIZONTAL_THRESHOLD = 80;   // px — minimum offset to trigger back
const VELOCITY_THRESHOLD   = 500;  // px/s
const AXIS_LOCK_DISTANCE   = 8;    // px — minimum move before locking axis

export function useSwipeBack({ onBack, enabled, elementRef }) {
  const startXRef      = useRef(null);
  const startYRef      = useRef(null);
  const lastXRef       = useRef(null);
  const lastTimeRef    = useRef(null);
  const lockedAxisRef  = useRef(null); // 'x' | 'y' | null
  const isDraggingRef  = useRef(false);

  const resetState = useCallback(() => {
    startXRef.current     = null;
    startYRef.current     = null;
    lastXRef.current      = null;
    lastTimeRef.current   = null;
    lockedAxisRef.current = null;
    isDraggingRef.current = false;
  }, []);

  const onTouchStart = useCallback((e) => {
    if (!enabled) return;
    // Ignore if touch starts on a swipeable row (delete gesture)
    if (e.target.closest('[data-swipe-row]')) return;
    startXRef.current    = e.touches[0].clientX;
    startYRef.current    = e.touches[0].clientY;
    lastXRef.current     = e.touches[0].clientX;
    lastTimeRef.current  = Date.now();
  }, [enabled]);

  const onTouchMove = useCallback((e) => {
    if (!enabled || startXRef.current == null) return;

    const x  = e.touches[0].clientX;
    const y  = e.touches[0].clientY;
    const dx = x - startXRef.current;
    const dy = y - startYRef.current;

    // Lock axis once we know direction
    if (lockedAxisRef.current === null && (Math.abs(dx) > AXIS_LOCK_DISTANCE || Math.abs(dy) > AXIS_LOCK_DISTANCE)) {
      lockedAxisRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }

    if (lockedAxisRef.current !== 'x') return;
    if (dx < 0) return; // only right swipe for back

    isDraggingRef.current = true;
    lastXRef.current      = x;
    lastTimeRef.current   = Date.now();

    if (elementRef?.current) {
      elementRef.current.style.transition = 'none';
      elementRef.current.style.transform  = `translateX(${dx}px)`;
    }
  }, [enabled, elementRef]);

  const onTouchEnd = useCallback(() => {
    if (!enabled || !isDraggingRef.current) {
      resetState();
      return;
    }

    const dx       = (lastXRef.current ?? 0) - (startXRef.current ?? 0);
    const dt       = Date.now() - (lastTimeRef.current ?? Date.now());
    const velocity = dt > 0 ? (dx / dt) * 1000 : 0;

    if (dx > HORIZONTAL_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      // Snap forward then navigate — AnimatePresence takes over
      if (elementRef?.current) {
        elementRef.current.style.transition = 'transform 0.15s ease-out';
        elementRef.current.style.transform  = `translateX(100%)`;
      }
      setTimeout(() => onBack(), 150);
    } else {
      // Snap back
      if (elementRef?.current) {
        elementRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        elementRef.current.style.transform  = 'translateX(0)';
      }
    }

    resetState();
  }, [enabled, elementRef, onBack, resetState]);

  return { swipeHandlers: { onTouchStart, onTouchMove, onTouchEnd } };
}
```

- [ ] **Step 2: Verify file saved**

```bash
cat src/hooks/useSwipeBack.js | head -5
```
Expected: `// src/hooks/useSwipeBack.js`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSwipeBack.js
git commit -m "feat: add useSwipeBack hook for iOS swipe-to-go-back"
```

---

## Task 2: Create `PageTransition` component

**Files:**
- Create: `src/components/PageTransition.jsx`

- [ ] **Step 1: Create the file**

```jsx
// src/components/PageTransition.jsx
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const DURATION = reducedMotion ? 0 : 0.32;
const EASE     = [0.25, 0.46, 0.45, 0.94];

const transition = { type: 'tween', ease: EASE, duration: DURATION };

// direction-aware variants — receives `custom` prop from AnimatePresence
const variants = {
  initial: (direction) => ({
    x: direction === 'pop' ? '-30%' : '100%',
    filter: direction === 'pop' ? 'brightness(0.7)' : 'brightness(1)',
    boxShadow: direction === 'pop' ? 'none' : '-8px 0 20px rgba(0,0,0,0.3)',
  }),
  animate: {
    x: 0,
    filter: 'brightness(1)',
    boxShadow: 'none',
    transition,
  },
  exit: (direction) => ({
    x: direction === 'pop' ? '100%' : '-30%',
    filter: direction === 'pop' ? 'brightness(1)' : 'brightness(0.7)',
    boxShadow: direction === 'pop' ? '-8px 0 20px rgba(0,0,0,0.3)' : 'none',
    transition,
  }),
};

export function PageTransition({ pageKey, direction, children }) {
  return (
    <AnimatePresence mode="popLayout" custom={direction}>
      <motion.div
        key={pageKey}
        custom={direction}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10,
          willChange: 'transform',
          backgroundColor: 'inherit',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Verify file saved**

```bash
cat src/components/PageTransition.jsx | head -5
```
Expected: `// src/components/PageTransition.jsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/PageTransition.jsx
git commit -m "feat: add PageTransition component with iOS parallax animation"
```

---

## Task 3: Wire `navDirection` state into `App.jsx`

**Files:**
- Modify: `src/App.jsx` lines 46–100

- [ ] **Step 1: Add `navDirection` state and update the three nav functions**

In `src/App.jsx`, find the state declarations block (around line 46) and the three navigation functions (lines 67–100). Apply the following changes:

**Add after line 52 (`const [backLabel, setBackLabel] = useState('');`):**
```js
const [navDirection, setNavDirection] = useState(null); // 'push' | 'pop' | null
```

**Replace `setCurrentTab` (lines 67–73) with:**
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

**Replace `navigateTo` (lines 76–83) with:**
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

**Replace `navigateBack` (lines 88–100) with:**
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
  _setCurrentTabState(target.tab);
}, [currentTab]);
```

- [ ] **Step 2: Start the dev server and verify no console errors**

```bash
npm start
```
Expected: App compiles and loads. Navigate to a player — no console errors.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add navDirection state to App.jsx navigation functions"
```

---

## Task 4: Integrate `PageTransition` and `useSwipeBack` into `App.jsx`

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add imports at the top of `App.jsx`**

After the existing imports (around line 17), add:
```js
import { PageTransition } from './components/PageTransition';
import { useSwipeBack } from './hooks/useSwipeBack';
```

- [ ] **Step 2: Add the `LEVEL2_TABS` constant and `pageRef`**

After the `DETAIL_FALLBACKS` constant (line 85), add:
```js
const LEVEL2_TABS = ['playerDetail', 'teamDetail', 'battleDetail', 'pokemonSearch', 'pokemonDetail'];
const isLevel2Tab = (tab) => LEVEL2_TABS.includes(tab);
```

After the refs block (around line 59), add:
```js
const pageRef = useRef(null);
```

- [ ] **Step 3: Instantiate `useSwipeBack`**

After the `navigateBack` function (after line 100), add:
```js
const { swipeHandlers } = useSwipeBack({
  onBack: navigateBack,
  enabled: isLevel2Tab(currentTab),
  elementRef: pageRef,
});
```

- [ ] **Step 4: Replace the level-2 render blocks**

In the `return` block, find and **replace** the five individual level-2 conditionals (lines 424–630 — `playerDetail`, `teamDetail`, `battleDetail`, `pokemonSearch`/`pokemonDetail`) with a single `PageTransition` block.

**Remove these blocks entirely:**
- `{currentTab === 'playerDetail' && (...)}`  (lines 424–446)
- `{currentTab === 'teamDetail' && (...)}` (lines 505–522)
- `{currentTab === 'battleDetail' && (...)}` (lines 556–574)
- `{(currentTab === 'pokemonSearch' || currentTab === 'pokemonDetail') && (...)}` (lines 603–616)
- `{currentTab === 'pokemonDetail' && (...)}` (lines 618–630)

**Add in their place, just before the `<Navigation>` block:**
```jsx
{isLevel2Tab(currentTab) && (
  <PageTransition pageKey={currentTab} direction={navDirection}>
    <div
      ref={pageRef}
      {...swipeHandlers}
      style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}
    >
      {currentTab === 'playerDetail' && (
        <PlayerDetail
          player={selectedPlayer}
          teams={teams}
          battles={battles}
          t={t}
          isDark={isDark}
          initialActiveTab={playerDetailTab}
          backLabel={backLabel}
          onBack={() => {
            setSelectedPlayer(null);
            navigateBack();
          }}
          onUpdate={handleUpdatePlayer}
          onAddTeam={handleAddTeam}
          onUpdateTeam={handleUpdateTeam}
          onDeleteTeam={handleDeleteTeam}
          onSelectTeam={(team, activeTab) => {
            setSelectedTeam(team);
            navigateTo('teamDetail', { playerDetailTab: activeTab });
          }}
        />
      )}
      {currentTab === 'teamDetail' && (
        <TeamDetail
          team={selectedTeam}
          t={t}
          isDark={isDark}
          backLabel={backLabel}
          onBack={() => {
            setSelectedTeam(null);
            navigateBack();
          }}
          onEdit={(team) => {
            setSelectedTeam(team);
            setTeamEditOrigin('detail');
            setShowNewTeamForm(true);
          }}
          onUpdate={handleUpdateTeam}
        />
      )}
      {currentTab === 'battleDetail' && (
        <BattleDetail
          battle={selectedBattle}
          players={players}
          t={t}
          isDark={isDark}
          backLabel={backLabel}
          onBack={() => {
            setSelectedBattle(null);
            navigateBack();
          }}
          onEdit={(b) => {
            setSelectedBattle(b);
            setBattleEditOrigin('detail');
            setShowNewBattleForm(true);
          }}
          onDelete={handleDeleteBattle}
        />
      )}
      {currentTab === 'pokemonSearch' && (
        <PokemonSearchPage
          t={t}
          isDark={isDark}
          backLabel={backLabel}
          onBack={navigateBack}
          onSelectPokemon={(pokemon) => {
            setSelectedPokemon(pokemon);
            navigateTo('pokemonDetail');
          }}
        />
      )}
      {currentTab === 'pokemonDetail' && (
        <PokemonDetailPage
          pokeId={selectedPokemon?.pokeId}
          pokeName={selectedPokemon?.name}
          t={t}
          isDark={isDark}
          backLabel={backLabel}
          onBack={() => {
            setSelectedPokemon(null);
            navigateBack();
          }}
        />
      )}
    </div>
  </PageTransition>
)}
```

> **Note:** The original code kept `PokemonSearchPage` mounted (with `display:none`) while on `pokemonDetail` to preserve search results state. This is incompatible with AnimatePresence (the exiting element reads updated `currentTab`). The plan above drops the keep-mounted trick: navigating back from `pokemonDetail` to `pokemonSearch` remounts the search page (results cleared). This is acceptable for v1.

- [ ] **Step 5: Test forward navigation**

In the running app:
1. Tap a player → should slide in from the right with shadow on left edge
2. Tap back → should slide back to the right
3. Tap an onglet (Équipes, Combats) → no animation, instant switch

- [ ] **Step 6: Test swipe-to-go-back**

1. Navigate to a player detail page
2. Swipe right from anywhere on the page — page should follow finger
3. Release past ~80 px → navigates back
4. Release before 80 px → snaps back in place

- [ ] **Step 7: Verify `SwipeableRow` is not broken**

On the Joueurs or Équipes list, swipe left on a row → delete button still appears (no conflict with swipe-back since it's a left swipe and we only intercept right swipes).

- [ ] **Step 8: Commit**

```bash
git add src/App.jsx
git commit -m "feat: integrate PageTransition and swipe-to-go-back into App"
```

---

## Task 5: Visual QA pass

- [ ] **Step 1: Check `pokemonSearch` → `pokemonDetail` transition**

Navigate: Home → search icon → Pokémon Search page → tap a Pokémon.  
Expected: `pokemonDetail` slides in over `pokemonSearch` (both are level-2 tabs, the transition fires because `pageKey` changes from `pokemonSearch` to `pokemonDetail`).

- [ ] **Step 2: Check dark mode**

Toggle dark mode. Navigate to a detail page.  
Expected: no white flash during transition — `PageTransition` has `backgroundColor: 'inherit'` which should pick up the parent theme.  
If a white flash appears, set `style={{ backgroundColor: isDark ? '#000' : '#fff' }}` on the `motion.div` in `PageTransition.jsx` by passing it as a prop.

- [ ] **Step 3: Check `prefers-reduced-motion`**

In Chrome DevTools → Rendering → Emulate CSS media: `prefers-reduced-motion: reduce`.  
Expected: transitions happen instantly (duration 0), no animation.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: iOS-style navigation transitions complete"
```
