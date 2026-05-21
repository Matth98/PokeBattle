# iOS-style Navigation Transitions — Design Spec

**Date:** 2026-05-21  
**Status:** Approved  

---

## Goal

Add iOS-style lateral page transitions to the Pokébattle app when navigating between level-1 (tab lists) and level-2 (detail pages). Includes reverse animation on back, and swipe-to-go-back from anywhere on the screen.

---

## Context

The app uses a custom state-based navigation system in `App.jsx` (no React Router). `framer-motion` v12 is already installed. Navigation depth is managed with:

- `navigateTo(newTab, extra)` — forward navigation, pushes to `navStack`
- `navigateBack()` — pops from `navStack`
- `setCurrentTab(newTab)` — tab-bar switch, resets stack (no animation)

Level-2 pages: `playerDetail`, `teamDetail`, `battleDetail`, `pokemonSearch`, `pokemonDetail`.

---

## Design Decisions

| Question | Choice |
|---|---|
| Animation style | iOS Parallax + left-edge shadow (option C) |
| Swipe zone | Full screen (from anywhere) |
| Header during transition | Slides with content as one block |

---

## Architecture

### 1. `navDirection` state — `App.jsx`

Add a single new state:

```js
const [navDirection, setNavDirection] = useState(null); // 'push' | 'pop' | null
```

Update the three navigation functions:

- `navigateTo()` → `setNavDirection('push')` before changing tab
- `navigateBack()` → `setNavDirection('pop')` before changing tab
- `setCurrentTab()` → `setNavDirection(null)` (tab-bar tap, no animation)

### 2. `PageTransition` component — `src/components/PageTransition.jsx`

Wraps all level-2 pages in `App.jsx`. Props: `pageKey` (string), `direction` (`'push' | 'pop' | null`).

Uses `AnimatePresence mode="popLayout"` so both the outgoing and incoming pages coexist in the DOM during the ~320 ms transition. Each page is a `motion.div` keyed on `pageKey`.

**Variants (direction-aware via `custom` prop):**

| Phase | `push` | `pop` |
|---|---|---|
| `initial` | `x: 100%` + left box-shadow | `x: -30%` + `brightness(0.7)` |
| `animate` | `x: 0`, shadow fades, `brightness(1)` | same |
| `exit` | `x: -30%` + `brightness(0.7)` | `x: 100%` + left box-shadow |

Shadow spec: `box-shadow: -8px 0 20px rgba(0,0,0,0.3)` on the left edge of the level-2 page.

Transition: `{ type: 'tween', ease: [0.25, 0.46, 0.45, 0.94], duration: 0.32 }` (matches iOS UINavigationController easing).

**`prefers-reduced-motion`:** if `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, duration is set to `0`.

### 3. `useSwipeBack` hook — `src/hooks/useSwipeBack.js`

Returns `{ swipeHandlers }` (object with `onTouchStart`, `onTouchMove`, `onTouchEnd`).

Props: `{ onBack, enabled }`.

**Behavior:**

1. `onTouchStart` — records `startX`, `startY` via refs (no setState).
2. `onTouchMove` — locks axis on first significant move (`|dx| > |dy|`). Once locked horizontal, translates the page element directly via a DOM ref (zero re-renders during drag).
3. `onTouchEnd`:
   - `offset.x > 80px` **or** `velocityX > 500px/s` → calls `onBack()`. AnimatePresence handles the rest.
   - Otherwise → CSS spring-back: `transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)`, `transform: translateX(0)`.

**Conflict avoidance:**
- Ignores touches that start on a `[data-swipe-row]` element (existing delete-swipe rows).
- Ignores gestures where axis locks to Y (vertical scroll takes priority).
- Only active when `enabled = true` (level-2 pages only).

### 4. Integration in `App.jsx`

Add helper:

```js
const LEVEL2_TABS = ['playerDetail','teamDetail','battleDetail','pokemonSearch','pokemonDetail'];
const isLevel2Tab = (tab) => LEVEL2_TABS.includes(tab);
```

Replace the conditional rendering of level-2 pages:

```jsx
{isLevel2Tab(currentTab) && (
  <PageTransition pageKey={currentTab} direction={navDirection}>
    <div ref={pageRef} {...swipeHandlers} style={{ position: 'absolute', inset: 0 }}>
      {currentTab === 'playerDetail'  && <PlayerDetail  ... />}
      {currentTab === 'teamDetail'    && <TeamDetail    ... />}
      {currentTab === 'battleDetail'  && <BattleDetail  ... />}
      {currentTab === 'pokemonSearch' && <PokemonSearchPage ... />}
      {currentTab === 'pokemonDetail' && <PokemonDetailPage ... />}
    </div>
  </PageTransition>
)}
```

`useSwipeBack` is instantiated once in `App.jsx`:

```js
const { swipeHandlers } = useSwipeBack({
  onBack: navigateBack,
  enabled: isLevel2Tab(currentTab),
});
```

**What does NOT change:**
- `<Navigation>` (bottom tab bar) — remains outside, never animated
- Individual page components (`PlayerDetail`, `TeamDetail`, etc.) — zero changes
- `navigateTo` / `navigateBack` call signatures — unchanged

---

## File Summary

| File | Action |
|---|---|
| `src/App.jsx` | Add `navDirection` state, update 3 nav functions, add `isLevel2Tab`, wrap level-2 pages in `PageTransition`, add `useSwipeBack` |
| `src/components/PageTransition.jsx` | New component |
| `src/hooks/useSwipeBack.js` | New hook |

No new dependencies.
