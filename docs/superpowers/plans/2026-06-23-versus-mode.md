# Mode Versus — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une page Versus accessible depuis `PlayerDetail` pour comparer deux joueurs — score H2H, liste de combats filtrables, stats globales côte à côte et Pokémon favoris.

**Architecture:** Nouveau composant `VersusPage.jsx` enregistré comme sub-page dans `App.jsx` (pattern identique à `BattleDetail`/`TeamDetail`). Toute la logique de calcul est dans des `useMemo` à l'intérieur du composant, sans requête réseau supplémentaire. Un bouton "Comparer" dans le header de `PlayerDetail` déclenche la navigation.

**Tech Stack:** React, framer-motion, lucide-react, Tailwind CSS, usePokemonTypes (hook existant)

## Global Constraints

- Suivre exactement les patterns de style/animation existants (framer-motion pour les sheets, même tokens de thème `t.*`)
- Pas de requête réseau supplémentaire — toutes les données viennent des props `players`, `battles`, `teams` de `App.jsx`
- Pas de nouveau hook — calculs en `useMemo` dans `VersusPage`
- `'versusDetail'` doit figurer dans `SUB_PAGES` pour que `useEdgeSwipeBack` fonctionne
- Ne pas modifier la logique métier existante de `PlayerDetail` (juste ajouter deux props et un bouton)

---

## File Map

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `src/components/VersusPage.jsx` | Créer | Page complète : duel banner, sélecteur joueur (sheet), H2H, stats, pokémon favoris |
| `src/App.jsx` | Modifier | +`versusDetail` dans SUB_PAGES, +état, +render, +background layer |
| `src/components/PlayerDetail.jsx` | Modifier | +props `allPlayers`/`onCompare`, +bouton Comparer dans le header |

---

## Task 1 — VersusPage : scaffold + sélecteur de joueur

**Files:**
- Create: `src/components/VersusPage.jsx`

**Interfaces:**
- Produces: composant `VersusPage` exporté avec props `{ players, battles, teams, t, isDark, initialP1Id, initialP2Id, onBack, backLabel, isBackground }`

- [ ] **Step 1 : Créer le fichier avec le scaffold et le duel banner**

```jsx
// src/components/VersusPage.jsx
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ChevronLeft, ChevronDown, GitCompare } from 'lucide-react';
import { PlayerAvatar } from './PlayerAvatar';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { getPokemonImageUrl as getPokemonImageUrlStatic, getPokemonSpriteId } from '../hooks/usePokemon';
import { usePokemonTypes, TYPE_FR, TYPE_COLORS } from '../hooks/usePokemonTypes';
import { TYPE_SUPER_EFFECTIVE } from '../utils/mvp';
import { sortBattlesDesc } from '../utils/battles';
import { formatDate } from '../utils/dates';

function PlayerSelectorSheet({ players, excludeId, isDark, t, onSelect, onClose }) {
  useBodyScrollLock();
  const H = typeof window !== 'undefined' ? window.innerHeight : 800;
  const y = useMotionValue(H);
  const overlayOpacity = useTransform(y, [0, H * 0.5], [1, 0]);

  const dismiss = useCallback((vel = 600) => {
    animate(y, H, { type: 'spring', damping: 18, stiffness: 200, velocity: vel, restDelta: 1 });
    setTimeout(onClose, 300);
  }, [y, H, onClose]);

  const snapBack = useCallback(() => {
    animate(y, 0, { type: 'spring', damping: 30, stiffness: 400 });
  }, [y]);

  const sheetRef = useRef(null);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    let startY = 0, lastY = 0, lastTime = 0, tracking = false;
    const onTouchStart = (e) => { startY = e.touches[0].clientY; lastY = startY; lastTime = Date.now(); tracking = false; };
    const onTouchMove = (e) => {
      const cur = e.touches[0].clientY;
      const delta = cur - startY;
      lastY = cur; lastTime = Date.now();
      if (!tracking) { if (delta > 8) tracking = true; else return; }
      e.preventDefault();
      if (delta > 0) y.set(delta);
    };
    const onTouchEnd = () => {
      if (!tracking) return;
      tracking = false;
      const delta = lastY - startY;
      const vel = (lastY - startY) / Math.max(1, Date.now() - (lastTime - 50));
      if (vel > 0.5 || delta > 100) dismiss(vel * 1000); else snapBack();
    };
    sheet.addEventListener('touchstart', onTouchStart, { passive: true });
    sheet.addEventListener('touchmove', onTouchMove, { passive: false });
    sheet.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      sheet.removeEventListener('touchstart', onTouchStart);
      sheet.removeEventListener('touchmove', onTouchMove);
      sheet.removeEventListener('touchend', onTouchEnd);
    };
  }, [y, dismiss, snapBack]);

  const available = players.filter((p) => String(p._id) !== String(excludeId));

  return (
    <motion.div
      className="fixed inset-0 z-[10000] flex flex-col justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', opacity: overlayOpacity }}
      onClick={() => dismiss()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <motion.div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative rounded-t-3xl overflow-hidden ${isDark ? 'bg-zinc-900' : 'bg-white'}`}
        style={{ y }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`} />
        </div>
        <div className="px-5 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)' }}>
          <h2 className={`font-black text-lg mb-4 ${t.text}`}>Choisir un joueur</h2>
          <div className={`${t.surface} rounded-2xl overflow-hidden`}>
            {available.map((p, idx) => (
              <button
                key={p._id}
                onClick={() => { onSelect(p); dismiss(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left ${idx < available.length - 1 ? `border-b ${t.divider}` : ''}`}
              >
                <PlayerAvatar player={p} size={40} textSize="text-sm" />
                <span className={`font-semibold ${t.text}`}>{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function VersusPage({
  players = [],
  battles = [],
  teams = [],
  t,
  isDark,
  initialP1Id = null,
  initialP2Id = null,
  onBack,
  backLabel = 'Joueur',
  isBackground = false,
}) {
  const [p1Id, setP1Id] = useState(initialP1Id);
  const [p2Id, setP2Id] = useState(initialP2Id);
  const [selectorFor, setSelectorFor] = useState(null); // 'p1' | 'p2' | null

  const p1 = useMemo(() => players.find((p) => String(p._id) === String(p1Id)) || null, [players, p1Id]);
  const p2 = useMemo(() => players.find((p) => String(p._id) === String(p2Id)) || null, [players, p2Id]);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (isBackground) return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isBackground]);

  useBodyScrollLock(!!selectorFor);

  return (
    <div className="min-h-screen">
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10"
        style={{
          background: isDark
            ? 'radial-gradient(130% 75% at 0% 0%, rgba(0,203,255,0.06) 0%, rgba(0,203,255,0) 100%), #09090b'
            : 'radial-gradient(130% 100% at 0% 0%, rgba(0,203,255,0.35) 0%, rgba(0,203,255,0) 100%), #EFF6F9',
        }}
      />

      {/* Header sticky */}
      <div
        className={`sticky top-0 z-10 px-4 relative`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)', paddingBottom: '0.75rem' }}
      >
        <div className={`absolute inset-x-0 top-0 bottom-0 pointer-events-none transition-opacity duration-300`} style={{
          opacity: scrolled ? 1 : 0,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }} />
        <div className={`absolute inset-x-0 top-0 bottom-0 pointer-events-none transition-opacity duration-300`} style={{
          opacity: scrolled ? 1 : 0,
          background: isDark ? 'rgba(9,9,11,0.85)' : 'rgba(255,255,255,0.9)',
        }} />

        <div className="relative flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900 border border-white/20 shadow-[0_4px_24px_rgba(0,0,0,0.12)]'}`}
            style={isDark ? { boxShadow: 'rgba(255,255,255,.21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
            aria-label="Retour"
          >
            <ChevronLeft size={24} className="-translate-x-px" />
          </button>
          <h1 className={`font-black text-lg ${t.text}`}>Versus</h1>
        </div>

        {/* Duel Banner */}
        <div className={`${t.surface} rounded-2xl p-4 flex items-center gap-3`}>
          {/* P1 */}
          <button
            onClick={() => setSelectorFor('p1')}
            className="flex-1 flex flex-col items-center gap-1.5 min-w-0"
          >
            {p1 ? (
              <PlayerAvatar player={p1} size={52} textSize="text-xl" />
            ) : (
              <div className={`w-[52px] h-[52px] rounded-full flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-black/[0.06]'}`}>
                <span className={`text-xl ${t.textTertiary}`}>?</span>
              </div>
            )}
            <p className={`text-xs font-bold truncate max-w-full ${p1 ? t.text : t.textTertiary}`}>
              {p1 ? p1.name : 'Choisir'}
            </p>
            <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${t.accent}`}>
              Changer <ChevronDown size={10} />
            </span>
          </button>

          {/* VS */}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
            <GitCompare size={16} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
          </div>

          {/* P2 */}
          <button
            onClick={() => setSelectorFor('p2')}
            className="flex-1 flex flex-col items-center gap-1.5 min-w-0"
          >
            {p2 ? (
              <PlayerAvatar player={p2} size={52} textSize="text-xl" />
            ) : (
              <div className={`w-[52px] h-[52px] rounded-full flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-black/[0.06]'}`}>
                <span className={`text-xl ${t.textTertiary}`}>?</span>
              </div>
            )}
            <p className={`text-xs font-bold truncate max-w-full ${p2 ? t.text : t.textTertiary}`}>
              {p2 ? p2.name : 'Choisir'}
            </p>
            <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${t.accent}`}>
              Changer <ChevronDown size={10} />
            </span>
          </button>
        </div>
      </div>

      <div className="px-5 pb-40 space-y-6 mt-4">
        {(!p1 || !p2) && (
          <div className={`${t.surface} rounded-2xl p-8 text-center`}>
            <p className={`font-black text-base ${t.text} mb-1`}>Sélectionne deux joueurs</p>
            <p className={`${t.textSecondary} text-sm`}>Choisis P1 et P2 ci-dessus pour lancer la comparaison.</p>
          </div>
        )}
      </div>

      {/* Player Selector Sheet */}
      {selectorFor && (
        <PlayerSelectorSheet
          players={players}
          excludeId={selectorFor === 'p1' ? p2Id : p1Id}
          isDark={isDark}
          t={t}
          onSelect={(player) => {
            if (selectorFor === 'p1') setP1Id(player._id);
            else setP2Id(player._id);
          }}
          onClose={() => setSelectorFor(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier manuellement le composant**

Le composant n'est pas encore branché dans App.jsx — vérification du rendu possible seulement après Task 4. Passer à Task 2.

---

## Task 2 — Section Face à face (H2H)

**Files:**
- Modify: `src/components/VersusPage.jsx` — ajouter la section H2H dans le `div.space-y-6` conditionnel sur `p1 && p2`

**Interfaces:**
- Consumes: `p1`, `p2` (Player objects), `battles` (Battle[]), `t`, `isDark` — tous déjà disponibles dans VersusPage

- [ ] **Step 1 : Ajouter les calculs H2H en useMemo**

Ajouter ces `useMemo` dans le corps de `VersusPage`, après les déclarations de `p1`/`p2` et avant le `return` :

```jsx
const [dateFilter, setDateFilter] = useState('');

const h2hBattles = useMemo(() => {
  if (!p1 || !p2) return [];
  return sortBattlesDesc(battles.filter((b) =>
    (String(b.player1) === String(p1._id) && String(b.player2) === String(p2._id)) ||
    (String(b.player1) === String(p2._id) && String(b.player2) === String(p1._id))
  ));
}, [battles, p1, p2]);

const h2hFiltered = useMemo(() => {
  if (!dateFilter) return h2hBattles;
  return h2hBattles.filter((b) => b.date === dateFilter);
}, [h2hBattles, dateFilter]);

const h2hScore = useMemo(() => {
  if (!p1) return { p1: 0, p2: 0 };
  return h2hFiltered.reduce((acc, b) => {
    const isP1 = String(b.player1) === String(p1._id);
    if (b.winner === 'player1') { if (isP1) acc.p1++; else acc.p2++; }
    else if (b.winner === 'player2') { if (!isP1) acc.p1++; else acc.p2++; }
    return acc;
  }, { p1: 0, p2: 0 });
}, [h2hFiltered, p1]);

const recentH2HForm = useMemo(() => {
  if (!p1) return [];
  return h2hBattles.slice(0, 5).reverse().map((b) => {
    const isP1 = String(b.player1) === String(p1._id);
    return (isP1 && b.winner === 'player1') || (!isP1 && b.winner === 'player2');
  });
}, [h2hBattles, p1]);
```

- [ ] **Step 2 : Ajouter la section H2H dans le JSX**

Remplacer le bloc `{(!p1 || !p2) && ...}` par :

```jsx
{(!p1 || !p2) && (
  <div className={`${t.surface} rounded-2xl p-8 text-center`}>
    <p className={`font-black text-base ${t.text} mb-1`}>Sélectionne deux joueurs</p>
    <p className={`${t.textSecondary} text-sm`}>Choisis P1 et P2 ci-dessus pour lancer la comparaison.</p>
  </div>
)}

{p1 && p2 && (
  <>
    {/* ── Face à face ── */}
    <section>
      <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} px-1 mb-3`}>
        Face à face
      </h2>

      {/* Score H2H */}
      <div className={`${t.surface} rounded-2xl p-5 flex flex-col items-center gap-3`}>
        <div className="flex items-center gap-4">
          <span className={`text-5xl font-black ${t.text}`}>{h2hScore.p1}</span>
          <span className={`text-2xl font-bold ${t.textTertiary}`}>–</span>
          <span className={`text-5xl font-black ${t.text}`}>{h2hScore.p2}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${t.textSecondary} truncate max-w-[90px] text-right`}>{p1.name}</span>
          <span className={`text-xs ${t.textTertiary}`}>vs</span>
          <span className={`text-xs font-semibold ${t.textSecondary} truncate max-w-[90px]`}>{p2.name}</span>
        </div>

        {/* Forme 5 derniers H2H */}
        {recentH2HForm.length > 0 && (
          <div className="flex items-center gap-0.5">
            <span className={`${t.textTertiary} text-xs mr-1`}>5 derniers :</span>
            {recentH2HForm.map((won, i) => (
              <svg key={i} viewBox="0 0 36.57 27.78" className="w-5 h-5 flex-shrink-0" fill={won ? '#22c55e' : '#ef4444'} xmlns="http://www.w3.org/2000/svg">
                <path d="M16.67,9.91c-2.19.91-3.23,3.41-2.32,5.6.91,2.19,3.41,3.23,5.6,2.32,2.19-.91,3.23-3.41,2.32-5.6-.91-2.19-3.41-3.23-5.6-2.32Z"/>
                <path d="M36.24,7.7l-8.73,3.61c1.28,4.61-1.05,9.57-5.57,11.45-4.53,1.88-9.69.02-12.04-4.15l-3.98,1.65c3.27,6.35,10.94,9.25,17.66,6.46,5.44-2.25,8.67-7.58,8.56-13.15l4.43-5.08-.33-.79Z"/>
                <path d="M14.59,5.02c4.53-1.88,9.68-.02,12.03,4.15l3.98-1.65C27.34,1.17,19.67-1.72,12.95,1.06,7.5,3.32,4.26,8.66,4.39,14.23L0,19.27l.33.79,8.69-3.6c-1.28-4.61,1.05-9.57,5.58-11.44Z"/>
              </svg>
            ))}
          </div>
        )}
      </div>

      {/* Filtre par date */}
      <div className={`flex items-center gap-3 ${t.surface} rounded-xl px-3 py-2 mt-3`}>
        <span className={`text-xs font-semibold ${t.textSecondary} flex-shrink-0`}>Filtrer par date</span>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className={`flex-1 bg-transparent outline-none ${t.text} text-sm`}
        />
        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            className={`text-xs font-semibold ${t.accent}`}
          >
            Effacer
          </button>
        )}
      </div>

      {/* Liste des combats H2H */}
      <div className="mt-3">
        {h2hBattles.length === 0 ? (
          <div className={`${t.surface} rounded-2xl p-6 text-center`}>
            <p className={`${t.textSecondary} text-sm`}>Aucun combat entre ces deux joueurs pour l'instant.</p>
          </div>
        ) : h2hFiltered.length === 0 ? (
          <div className={`${t.surface} rounded-2xl p-6 text-center`}>
            <p className={`${t.textSecondary} text-sm`}>Aucun combat à cette date.</p>
          </div>
        ) : (
          <div className={`${t.surface} rounded-2xl overflow-hidden`}>
            {h2hFiltered.map((b, idx) => {
              const bp1 = p1._id === b.player1 ? p1 : p2;
              const bp2 = p1._id === b.player1 ? p2 : p1;
              const p1Elim = (b.team1 || []).filter((p) => p.eliminated).length;
              const p2Elim = (b.team2 || []).filter((p) => p.eliminated).length;
              const isLast = idx === h2hFiltered.length - 1;
              return (
                <div
                  key={b._id}
                  className={`flex items-center gap-3 px-4 py-3 ${!isLast ? `border-b ${t.divider}` : ''}`}
                >
                  {/* P1 side */}
                  <div className="flex-1 min-w-0 flex flex-col items-center gap-1">
                    <PlayerAvatar player={bp1} size={40} textSize="text-sm" />
                    {b.winner === 'player1' ? (
                      <span className="inline-flex px-2 rounded-full font-semibold bg-emerald-500 text-white truncate max-w-full" style={{ fontSize: '13px', paddingTop: '1px', paddingBottom: '1px' }}>
                        {bp1?.name || '—'}
                      </span>
                    ) : (
                      <p className={`truncate text-center font-semibold ${t.text}`} style={{ fontSize: '13px' }}>{bp1?.name || '—'}</p>
                    )}
                    {(b.team1 || []).length > 0 && (
                      <div className="flex gap-0.5 justify-center flex-nowrap overflow-hidden mt-1">
                        {b.team1.map((pk, i) => (
                          <img key={pk.id || i} src={getPokemonImageUrlStatic(getPokemonSpriteId(pk))} alt={pk.name}
                            className={`w-6 h-6 object-contain flex-shrink-0 ${pk.eliminated ? 'grayscale opacity-50' : ''}`}
                            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Score */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${b.format === '1v1' ? (isDark ? 'bg-purple-300/10 text-purple-300' : 'bg-purple-600/10 text-purple-600') : (isDark ? 'bg-teal-300/10 text-teal-300' : 'bg-teal-600/10 text-teal-600')}`}>
                      {b.format}
                    </span>
                    <p className={`font-black text-3xl ${t.text} whitespace-nowrap leading-none`}>
                      {p2Elim}–{p1Elim}
                    </p>
                    {b.date && <p className={`text-[10px] ${t.textTertiary}`}>{formatDate(b.date)}</p>}
                  </div>
                  {/* P2 side */}
                  <div className="flex-1 min-w-0 flex flex-col items-center gap-1">
                    <PlayerAvatar player={bp2} size={40} textSize="text-sm" />
                    {b.winner === 'player2' ? (
                      <span className="inline-flex px-2 rounded-full font-semibold bg-emerald-500 text-white truncate max-w-full" style={{ fontSize: '13px', paddingTop: '1px', paddingBottom: '1px' }}>
                        {bp2?.name || '—'}
                      </span>
                    ) : (
                      <p className={`truncate text-center font-semibold ${t.text}`} style={{ fontSize: '13px' }}>{bp2?.name || '—'}</p>
                    )}
                    {(b.team2 || []).length > 0 && (
                      <div className="flex gap-0.5 justify-center flex-nowrap overflow-hidden mt-1">
                        {b.team2.map((pk, i) => (
                          <img key={pk.id || i} src={getPokemonImageUrlStatic(getPokemonSpriteId(pk))} alt={pk.name}
                            className={`w-6 h-6 object-contain flex-shrink-0 ${pk.eliminated ? 'grayscale opacity-50' : ''}`}
                            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  </>
)}
```

- [ ] **Step 3 : Vérifier**

Après le branchement dans App.jsx (Task 4), ouvrir la page Versus depuis un joueur, sélectionner deux joueurs ayant des combats communs. Vérifier : score correct, forme visible, filtre date opérationnel, liste des combats affichée.

---

## Task 3 — Stats globales + Pokémon favoris

**Files:**
- Modify: `src/components/VersusPage.jsx` — ajouter deux sections dans le `{p1 && p2 && (<>...</>)}`

**Interfaces:**
- Consumes: `battles`, `p1`, `p2`, `usePokemonTypes` (déjà importé)

- [ ] **Step 1 : Ajouter les calculs de stats globales en useMemo**

Ajouter dans le corps de `VersusPage`, après les useMemo H2H :

```jsx
// Rassemble tous les pokeIds des deux joueurs pour usePokemonTypes
const allPokeIdsForTypes = useMemo(() => {
  const ids = new Set();
  battles.forEach((b) => {
    [...(b.team1 || []), ...(b.team2 || [])].forEach((p) => { if (p?.pokeId) ids.add(p.pokeId); });
  });
  return [...ids];
}, [battles]);

const pokemonTypes = usePokemonTypes(allPokeIdsForTypes);

function calcPlayerStats(player, allBattles, pTypes) {
  if (!player) return null;
  const pb = allBattles.filter((b) => String(b.player1) === String(player._id) || String(b.player2) === String(player._id));
  const wins = pb.filter((b) => (String(b.player1) === String(player._id) && b.winner === 'player1') || (String(b.player2) === String(player._id) && b.winner === 'player2')).length;
  const losses = pb.length - wins;
  const winRate = pb.length > 0 ? Math.round((wins / pb.length) * 100) : null;

  const koInfliges = pb.reduce((sum, b) => {
    const opp = String(b.player1) === String(player._id) ? (b.team2 || []) : (b.team1 || []);
    return sum + opp.filter((p) => p.eliminated).length;
  }, 0);
  const koRecus = pb.reduce((sum, b) => {
    const mine = String(b.player1) === String(player._id) ? (b.team1 || []) : (b.team2 || []);
    return sum + mine.filter((p) => p.eliminated).length;
  }, 0);
  const perfectWins = pb.filter((b) => {
    const isWinner = (String(b.player1) === String(player._id) && b.winner === 'player1') || (String(b.player2) === String(player._id) && b.winner === 'player2');
    if (!isWinner) return false;
    const mine = String(b.player1) === String(player._id) ? (b.team1 || []) : (b.team2 || []);
    return mine.length > 0 && mine.every((p) => !p.eliminated);
  }).length;

  const formatCounts = pb.reduce((acc, b) => { const f = b.format || 'Format ?'; acc.set(f, (acc.get(f) || 0) + 1); return acc; }, new Map());
  const favoriteFormat = [...formatCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const myBattlePokemon = pb.flatMap((b) => String(b.player1) === String(player._id) ? (b.team1 || []) : (b.team2 || []));

  const typeCounts = new Map();
  myBattlePokemon.forEach((p) => {
    (pTypes[p?.pokeId] || []).forEach((tn) => typeCounts.set(tn, (typeCounts.get(tn) || 0) + 1));
  });
  const mostUsedTypeEntry = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const pokemonCounts = myBattlePokemon.reduce((acc, p) => {
    if (!p?.pokeId) return acc;
    const cur = acc.get(p.pokeId) || { pokeId: p.pokeId, name: p.name, count: 0 };
    acc.set(p.pokeId, { ...cur, name: p.name || cur.name, count: cur.count + 1 });
    return acc;
  }, new Map());
  const mostUsedPokemon = [...pokemonCounts.values()].sort((a, b) => b.count - a.count)[0] || null;

  // MVP
  const mvpCounts = new Map();
  pb.forEach((b) => {
    const isP1 = String(b.player1) === String(player._id);
    const myTeam = (isP1 ? b.team1 : b.team2) || [];
    const oppTeam = (isP1 ? b.team2 : b.team1) || [];
    const survivors = myTeam.filter((p) => !p.eliminated);
    if (!survivors.length) return;
    const calcAdv = (pok) => {
      let score = 0;
      for (const mt of (pTypes[pok.pokeId] || [])) {
        for (const opp of oppTeam) {
          for (const ot of (pTypes[opp.pokeId] || [])) {
            if ((TYPE_SUPER_EFFECTIVE[mt] || []).includes(ot)) score++;
          }
        }
      }
      return score;
    };
    const mvp = survivors.reduce((best, cur) => calcAdv(cur) > calcAdv(best) ? cur : best);
    const key = `${mvp.pokeId}:${mvp.name}`;
    const prev = mvpCounts.get(key) || { pokeId: mvp.pokeId, name: mvp.name, count: 0 };
    mvpCounts.set(key, { ...prev, count: prev.count + 1 });
  });
  const mvp = mvpCounts.size > 0 ? [...mvpCounts.values()].reduce((best, cur) => cur.count > best.count ? cur : best) : null;

  const top3 = [...pokemonCounts.values()].sort((a, b) => b.count - a.count).slice(0, 3);

  return { wins, losses, winRate, koInfliges, koRecus, perfectWins, favoriteFormat, mostUsedTypeEntry, mostUsedPokemon, mvp, top3 };
}

const stats1 = useMemo(() => calcPlayerStats(p1, battles, pokemonTypes), [p1, battles, pokemonTypes]); // eslint-disable-line react-hooks/exhaustive-deps
const stats2 = useMemo(() => calcPlayerStats(p2, battles, pokemonTypes), [p2, battles, pokemonTypes]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 2 : Ajouter la section Stats globales dans le JSX**

Ajouter après la section `Face à face`, toujours dans le `{p1 && p2 && (<>...</>)}` :

```jsx
{/* ── Stats globales ── */}
{stats1 && stats2 && (
  <section>
    <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} px-1 mb-3`}>
      Stats globales
    </h2>
    <div className={`${t.surface} rounded-2xl overflow-hidden`}>
      {/* Header colonnes */}
      <div className={`flex items-center px-4 py-2 border-b ${t.divider} ${t.surfaceMuted}`}>
        <div className="w-1/3" />
        <div className="w-1/3 text-center">
          <span className={`text-xs font-bold truncate block ${t.text}`}>{p1.name}</span>
        </div>
        <div className="w-1/3 text-center">
          <span className={`text-xs font-bold truncate block ${t.text}`}>{p2.name}</span>
        </div>
      </div>
      {[
        { label: 'Victoires',          v1: stats1.wins,         v2: stats2.wins,         cmp: 'max',  fmt: (v) => v },
        { label: 'Défaites',           v1: stats1.losses,       v2: stats2.losses,       cmp: 'min',  fmt: (v) => v },
        { label: 'Winrate',            v1: stats1.winRate,      v2: stats2.winRate,      cmp: 'max',  fmt: (v) => v != null ? `${v}%` : '—' },
        { label: 'KO infligés',        v1: stats1.koInfliges,   v2: stats2.koInfliges,   cmp: 'max',  fmt: (v) => v },
        { label: 'KO reçus',           v1: stats1.koRecus,      v2: stats2.koRecus,      cmp: 'min',  fmt: (v) => v },
        { label: 'Victoires parfaites',v1: stats1.perfectWins,  v2: stats2.perfectWins,  cmp: 'max',  fmt: (v) => v },
        { label: 'Type favori',        v1: stats1.mostUsedTypeEntry ? (TYPE_FR[stats1.mostUsedTypeEntry[0]] || stats1.mostUsedTypeEntry[0]) : '—', v2: stats2.mostUsedTypeEntry ? (TYPE_FR[stats2.mostUsedTypeEntry[0]] || stats2.mostUsedTypeEntry[0]) : '—', cmp: null, fmt: (v) => v },
        { label: 'Format favori',      v1: stats1.favoriteFormat ? stats1.favoriteFormat[0] : '—', v2: stats2.favoriteFormat ? stats2.favoriteFormat[0] : '—', cmp: null, fmt: (v) => v },
        { label: 'MVP',                v1: stats1.mvp?.name || '—', v2: stats2.mvp?.name || '—', cmp: null, fmt: (v) => v },
        { label: 'Pokémon + utilisé',  v1: stats1.mostUsedPokemon?.name || '—', v2: stats2.mostUsedPokemon?.name || '—', cmp: null, fmt: (v) => v },
      ].map(({ label, v1, v2, cmp, fmt }, idx, arr) => {
        const win1 = cmp === 'max' ? v1 > v2 : cmp === 'min' ? v1 < v2 : false;
        const win2 = cmp === 'max' ? v2 > v1 : cmp === 'min' ? v2 < v1 : false;
        const isLast = idx === arr.length - 1;
        return (
          <div key={label} className={`flex items-center px-4 py-3 ${!isLast ? `border-b ${t.divider}` : ''}`}>
            <div className="w-1/3">
              <span className={`text-xs font-medium ${t.textSecondary}`}>{label}</span>
            </div>
            <div className="w-1/3 text-center">
              <span className={`text-sm font-bold ${win1 ? (isDark ? 'text-indigo-400' : 'text-indigo-600') : t.text}`}>
                {fmt(v1)}
              </span>
            </div>
            <div className="w-1/3 text-center">
              <span className={`text-sm font-bold ${win2 ? (isDark ? 'text-indigo-400' : 'text-indigo-600') : t.text}`}>
                {fmt(v2)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  </section>
)}

{/* ── Pokémon favoris ── */}
{stats1 && stats2 && (
  <section>
    <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} px-1 mb-3`}>
      Pokémon favoris
    </h2>
    <div className="grid grid-cols-2 gap-3">
      {[{ player: p1, top3: stats1.top3 }, { player: p2, top3: stats2.top3 }].map(({ player, top3 }) => (
        <div key={player._id} className={`${t.surface} rounded-2xl p-4`}>
          <p className={`text-xs font-bold ${t.textSecondary} mb-3 truncate`}>{player.name}</p>
          {top3.length === 0 ? (
            <p className={`text-xs ${t.textTertiary}`}>Aucun combat</p>
          ) : (
            <div className="space-y-2">
              {top3.map((pk) => (
                <div key={pk.pokeId} className="flex items-center gap-2">
                  <img
                    src={getPokemonImageUrlStatic(pk.pokeId)}
                    alt={pk.name}
                    className="w-9 h-9 object-contain flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                  />
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${t.text} truncate`}>{pk.name}</p>
                    <p className={`text-[10px] ${t.textTertiary}`}>{pk.count} combat{pk.count > 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  </section>
)}
```

- [ ] **Step 3 : Vérifier manuellement (après Task 4)**

Sélectionner deux joueurs. Vérifier : stats correctes dans chaque colonne, valeur gagnante en indigo, type/format/MVP affichés sans mise en évidence, top 3 Pokémon avec sprites et compteurs.

---

## Task 4 — Branchement App.jsx + bouton dans PlayerDetail

**Files:**
- Modify: `src/App.jsx` — 5 zones précises
- Modify: `src/components/PlayerDetail.jsx` — header + 2 props

**Interfaces:**
- Consumes: `VersusPage` (Task 1–3), props existantes de `PlayerDetail`

### Partie A — App.jsx

- [ ] **Step 1 : Importer VersusPage et ajouter à SUB_PAGES**

Trouver la ligne 8 (`import { PlayerDetail } ...`) et ajouter après :
```jsx
import { VersusPage } from './components/VersusPage';
```

Trouver la ligne 31 :
```js
const SUB_PAGES = ['playerDetail', 'teamDetail', 'battleDetail', 'pokemonSearch', 'pokemonDetail'];
```
Remplacer par :
```js
const SUB_PAGES = ['playerDetail', 'teamDetail', 'battleDetail', 'pokemonSearch', 'pokemonDetail', 'versusDetail'];
```

- [ ] **Step 2 : Ajouter l'état selectedVersusPlayers**

Après la ligne `const [selectedPokemon, setSelectedPokemon] = useState(null);` (ligne ~87), ajouter :
```js
const [selectedVersusPlayers, setSelectedVersusPlayers] = useState({ p1Id: null, p2Id: null });
```

- [ ] **Step 3 : Ajouter le fallback de navigation pour versusDetail**

Trouver la ligne :
```js
const DETAIL_FALLBACKS = { battleDetail: 'battles', teamDetail: 'teams', playerDetail: 'players', pokemonDetail: 'pokemonSearch', pokemonSearch: 'home' };
```
Remplacer par :
```js
const DETAIL_FALLBACKS = { battleDetail: 'battles', teamDetail: 'teams', playerDetail: 'players', pokemonDetail: 'pokemonSearch', pokemonSearch: 'home', versusDetail: 'playerDetail' };
```

- [ ] **Step 4 : Ajouter la prop onCompare à PlayerDetail dans le render principal**

Trouver le bloc `{currentTab === 'playerDetail' && (` (ligne ~799). Dans la liste des props de `<PlayerDetail ...>`, ajouter :
```jsx
allPlayers={sortedPlayers}
onCompare={(p1Id) => {
  setSelectedVersusPlayers({ p1Id, p2Id: null });
  navigateTo('versusDetail');
}}
```

- [ ] **Step 5 : Ajouter le render de VersusPage (page courante)**

Après le bloc `{currentTab === 'teamDetail' && ...}` (vers ligne 873), ajouter :
```jsx
{currentTab === 'versusDetail' && (
  <VersusPage
    players={sortedPlayers}
    battles={battles}
    teams={sortedTeams}
    t={t}
    isDark={isDark}
    initialP1Id={selectedVersusPlayers.p1Id}
    initialP2Id={selectedVersusPlayers.p2Id}
    backLabel={backLabel}
    onBack={navigateBack}
  />
)}
```

- [ ] **Step 6 : Ajouter le background layer pour le swipe-back**

Dans le bloc `{prevTab && SUB_PAGES.includes(currentTab) && ...}`, après la dernière ligne `{prevTab === 'pokemonSearch' && ...}` (ligne ~730), ajouter :
```jsx
{prevTab === 'versusDetail' && (
  <VersusPage
    players={sortedPlayers}
    battles={battles}
    teams={sortedTeams}
    t={t}
    isDark={isDark}
    initialP1Id={selectedVersusPlayers.p1Id}
    initialP2Id={selectedVersusPlayers.p2Id}
    backLabel={backLabel}
    onBack={() => {}}
    isBackground
  />
)}
```

### Partie B — PlayerDetail.jsx

- [ ] **Step 7 : Ajouter les props allPlayers et onCompare**

Trouver les props destructurées de `PlayerDetail` (ligne ~145) :
```jsx
export const PlayerDetail = ({
  player,
  teams = [],
  battles = [],
  ...
  isBackground = false,
}) => {
```
Ajouter `allPlayers = []` et `onCompare` à la liste des props :
```jsx
export const PlayerDetail = ({
  player,
  teams = [],
  battles = [],
  ...
  isBackground = false,
  allPlayers = [],
  onCompare,
}) => {
```

- [ ] **Step 8 : Ajouter l'import de GitCompare**

Trouver la ligne d'import de lucide-react (ligne ~8). Ajouter `GitCompare` à la liste :
```jsx
import {
  AlertTriangle,
  Camera,
  ChevronLeft,
  ChevronRight,
  Flame,
  GitCompare,
  HelpCircle,
  ...
} from 'lucide-react';
```

- [ ] **Step 9 : Ajouter le bouton Comparer dans le header**

Trouver le bouton "Modifier" dans le header (ligne ~922). Il ressemble à :
```jsx
{canEdit && (
  <button
    onClick={openEditPlayer}
    className={`w-11 h-11 ...`}
    aria-label="Modifier"
  >
    <Pencil size={20} />
  </button>
)}
```
Juste avant ce bloc `{canEdit && (` du bouton Modifier, insérer :
```jsx
{onCompare && allPlayers.length >= 2 && (
  <button
    onClick={() => onCompare(player._id)}
    className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} transition-all duration-200 ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'} ${selectionMode ? 'absolute opacity-0 scale-0 pointer-events-none' : 'relative opacity-100 scale-100'}`}
    style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
    aria-label="Comparer"
  >
    <GitCompare size={20} />
  </button>
)}
```

- [ ] **Step 10 : Vérification manuelle complète**

1. Ouvrir la fiche d'un joueur → vérifier que le bouton GitCompare apparaît dans le header (si ≥ 2 joueurs dans l'app)
2. Taper le bouton → la page Versus s'ouvre avec P1 pré-sélectionné
3. Taper "Changer" sur P2 → le sheet s'ouvre, P1 n'est pas dans la liste
4. Sélectionner P2 → score H2H apparaît, liste des combats visible
5. Activer le filtre date → la liste se filtre, le score se met à jour
6. Vider le filtre → tous les combats réapparaissent
7. Swipe-back depuis le bord gauche → retour à `PlayerDetail` avec animation
8. Taper "Changer" sur P1 → P2 n'est pas dans la liste
9. Vérifier les stats globales et Pokémon favoris pour deux joueurs avec des combats
