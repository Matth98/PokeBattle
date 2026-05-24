# Homepage Visual Polish — Design Spec

**Date:** 2026-05-24  
**Scope:** Home.jsx + Navigation.jsx (light + dark modes)

---

## 1. Scroll-aware Header

**Trigger:** `window` scroll listener in `Home.jsx`. `scrolled = window.scrollY > 20`.

| State | Background | Border | Transition |
|-------|-----------|--------|------------|
| `scrolled=false` | `bg-transparent` | none | `transition-all duration-200` |
| `scrolled=true` | `t.surfaceBlur` | `border-b t.divider` | same |

Header remains `sticky top-0 z-10` at all times.

## 2. Icon Buttons (Search + Theme Toggle)

| State | Light mode | Dark mode |
|-------|-----------|-----------|
| `scrolled=false` | `bg-white text-gray-900` | `bg-white/15 text-white` |
| `scrolled=true` | `t.surfaceMuted t.text` (current) | `t.surfaceMuted t.text` (current) |

Same `transition-all duration-200`.

## 3. Colored Glows

Three absolute-positioned blobs inside Home's outer `div` (behind content via `z-0`, content at `z-10` relative).

| Blob | Color | Size | Position | Blur | Opacity light/dark |
|------|-------|------|----------|------|-------------------|
| 1 | teal/emerald | 288×288px | top-left | 80px | 40% / 25% |
| 2 | purple/indigo | 224×224px | top-right | 70px | 30% / 20% |
| 3 | amber | 192×192px | center-right ~40% down | 60px | 20% / 15% |

Outer div needs `relative overflow-hidden`.

## 4. Decorative Circles (top-left corner)

Three concentric circles, `absolute -top-16 -left-16`, `rounded-full border`.

| Circle | Size | Border |
|--------|------|--------|
| Inner | 200×200px | `border border-black/5` (light) / `border-white/5` (dark) |
| Mid | 320×320px | same |
| Outer | 440×440px | same |

`pointer-events-none`, `z-0`.

## 5. Match Button White Border (Navigation.jsx)

Wrap the `60×60` pokeball `<span>` in a `rounded-full ring-2 ring-white/80` container (or `border-2 border-white/80`).

---

## Files Changed

- `src/components/Home.jsx` — scroll listener, glows, circles, conditional header/button styles
- `src/components/Navigation.jsx` — Match button border
