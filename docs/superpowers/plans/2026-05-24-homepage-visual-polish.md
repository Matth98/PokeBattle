# Homepage Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scroll-aware header, icon button style flip, colored background glows, decorative circles, and Match button white border to the homepage.

**Architecture:** All changes are self-contained in `Home.jsx` (scroll state + decorative background + conditional header) and `Navigation.jsx` (Match button ring). No new files, no state lifted to parent. Scroll listener on `window` with 20px threshold.

**Tech Stack:** React (hooks), Tailwind CSS (via CDN), inline styles for blur values not in Tailwind

---

### Task 1: Scroll state in Home.jsx

**Files:**
- Modify: `src/components/Home.jsx:1-2`

- [ ] **Step 1: Add `useState` and `useEffect` to the React import**

In `src/components/Home.jsx`, change line 1 from:
```jsx
import React from 'react';
```
to:
```jsx
import React, { useState, useEffect } from 'react';
```

- [ ] **Step 2: Add scroll listener inside the `Home` component**

After line 20 (`const { getPokemonImageUrl } = usePokemon();`), insert:
```jsx
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
```

- [ ] **Step 3: Verify app still compiles and home page loads without errors**

Run `npm start` and open the app. No console errors. Home renders normally.

- [ ] **Step 4: Commit**

```bash
git add src/components/Home.jsx
git commit -m "feat: add scroll state to Home for scroll-aware header"
```

---

### Task 2: Scroll-aware header styles

**Files:**
- Modify: `src/components/Home.jsx:24-51`

- [ ] **Step 1: Replace static header div classes with conditional ones**

Find the header div (currently `className={`${t.surfaceBlur} sticky top-0 z-10 px-5 pt-12 pb-3 border-b ${t.divider}`}`).

Replace the entire opening `<div` of the header section (lines 25-28) with:
```jsx
      <div
        className={`sticky top-0 z-10 px-5 pb-3 transition-all duration-200 ${
          scrolled
            ? `${t.surfaceBlur} border-b ${t.divider}`
            : 'bg-transparent border-b border-transparent'
        }`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2.5rem)' }}
      >
```

- [ ] **Step 2: Replace static icon button classes with conditional ones**

Find the Search button (line 35-40). Replace its `className` with:
```jsx
className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
  scrolled
    ? `${t.surfaceMuted} ${t.text}`
    : (isDark ? 'bg-white/15 text-white' : 'bg-white text-gray-900')
}`}
```

Find the Dark/Light toggle button (line 43-48). Replace its `className` with:
```jsx
className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
  scrolled
    ? `${t.surfaceMuted} ${t.text}`
    : (isDark ? 'bg-white/15 text-white' : 'bg-white text-gray-900')
}`}
```

- [ ] **Step 3: Verify behavior**

Run `npm start`. On home tab:
- Top of page: header bg transparent, icon buttons white (light) / semi-white (dark), no border
- Scroll down 30px: header blurs in, border appears, buttons switch to muted style
- Scroll back to top: transitions back

- [ ] **Step 4: Commit**

```bash
git add src/components/Home.jsx
git commit -m "feat: scroll-aware header — transparent at top, blur on scroll"
```

---

### Task 3: Colored background glows

**Files:**
- Modify: `src/components/Home.jsx:22-23`

- [ ] **Step 1: Add `relative overflow-hidden` to the outer Home div and insert glow blobs**

Find the outer wrapper div (line 23):
```jsx
    <div className={`min-h-screen ${t.pageBg}`}>
```

Replace with:
```jsx
    <div className={`relative min-h-screen overflow-hidden ${t.pageBg}`}>
      {/* Colored glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        {/* Blob 1 — teal, top-left */}
        <div
          className={`absolute -top-16 -left-10 w-72 h-72 rounded-full ${isDark ? 'opacity-25' : 'opacity-40'}`}
          style={{ background: 'radial-gradient(circle, #34d399, #0d9488)', filter: 'blur(80px)' }}
        />
        {/* Blob 2 — purple/indigo, top-right */}
        <div
          className={`absolute -top-10 -right-16 w-56 h-56 rounded-full ${isDark ? 'opacity-20' : 'opacity-30'}`}
          style={{ background: 'radial-gradient(circle, #a78bfa, #6366f1)', filter: 'blur(70px)' }}
        />
        {/* Blob 3 — amber, mid-right */}
        <div
          className={`absolute top-[40%] -right-12 w-48 h-48 rounded-full ${isDark ? 'opacity-15' : 'opacity-20'}`}
          style={{ background: 'radial-gradient(circle, #fbbf24, #f59e0b)', filter: 'blur(60px)' }}
        />
      </div>
```

Note: The closing `</div>` at the end of the component (line 223) closes the original outer div — it now closes this new outer div. No change needed there.

- [ ] **Step 2: Make sure content is above glows**

The sticky header has `z-10`, main content section `<div className="px-5 mt-5 pb-32 space-y-7">` needs `relative z-10` to sit above the `z-0` glows:

Find line 53:
```jsx
      <div className="px-5 mt-5 pb-32 space-y-7">
```
Replace with:
```jsx
      <div className="relative z-10 px-5 mt-5 pb-32 space-y-7">
```

- [ ] **Step 3: Verify glows visible**

Run `npm start`. Three soft colored blobs visible in background. Content still readable on top. Works in both light and dark modes.

- [ ] **Step 4: Commit**

```bash
git add src/components/Home.jsx
git commit -m "feat: add colored background glows to home page"
```

---

### Task 4: Decorative circles (top-left corner)

**Files:**
- Modify: `src/components/Home.jsx` (inside the `aria-hidden` glow container from Task 3)

- [ ] **Step 1: Add concentric circle decorations inside the glow container**

Inside the `aria-hidden` div added in Task 3, after the three blob divs and before the closing `</div>`, add:
```jsx
        {/* Decorative circles — top-left */}
        <div className={`absolute -top-16 -left-16 w-[200px] h-[200px] rounded-full border ${isDark ? 'border-white/5' : 'border-black/5'}`} />
        <div className={`absolute -top-16 -left-16 w-[320px] h-[320px] rounded-full border ${isDark ? 'border-white/5' : 'border-black/5'}`} />
        <div className={`absolute -top-16 -left-16 w-[440px] h-[440px] rounded-full border ${isDark ? 'border-white/5' : 'border-black/5'}`} />
```

- [ ] **Step 2: Verify circles visible**

Run `npm start`. Three faint concentric rings visible in top-left corner, behind all content. Very subtle (5% opacity).

- [ ] **Step 3: Commit**

```bash
git add src/components/Home.jsx
git commit -m "feat: add decorative circles to home page background"
```

---

### Task 5: White border around Match button

**Files:**
- Modify: `src/components/Navigation.jsx:52-68`

- [ ] **Step 1: Wrap pokeball image span in a bordered container**

Find the Match button inner span (line 57):
```jsx
          <span className="w-[60px] h-[60px] active:scale-95 transition flex items-center justify-center">
```

Replace with:
```jsx
          <span className="w-[66px] h-[66px] rounded-full border-2 border-white/80 flex items-center justify-center active:scale-95 transition">
```

This adds a 2px white border (80% opacity) as a ring around the 60px pokeball, with 3px of padding on each side from the border to the image. The image `img` stays `w-[60px] h-[60px]` unchanged.

- [ ] **Step 2: Verify border visible**

Run `npm start`. Match button in nav has a soft white circular border around the pokeball image. Tap still works. "Match" label unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/components/Navigation.jsx
git commit -m "feat: add white border ring to Match nav button"
```

---

## Self-Review

**Spec coverage:**
- ✅ Header transparent at top, blur on scroll — Task 2
- ✅ Header fixed/sticky maintained — Task 2 (`sticky top-0` unchanged)
- ✅ Icon buttons white bg at top, current style on scroll — Task 2
- ✅ Colored glows — Task 3
- ✅ Decorative circles top-left — Task 4
- ✅ Match button white border — Task 5
- ✅ Both light + dark modes — all tasks handle `isDark` conditional

**Placeholder scan:** None found.

**Type consistency:** No shared types. `scrolled`, `isDark`, `t` used consistently throughout.
