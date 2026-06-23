// src/components/VersusPage.jsx
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ChevronLeft, ChevronDown, ChevronUp, Plus, Calendar } from 'lucide-react';
import { PlayerAvatar } from './PlayerAvatar';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { getPokemonImageUrl as getPokemonImageUrlStatic, getPokemonSpriteId } from '../hooks/usePokemon';
import { usePokemonTypes, TYPE_FR, TYPE_COLORS, TYPE_HEX } from '../hooks/usePokemonTypes';
import { TYPE_SUPER_EFFECTIVE } from '../utils/mvp';
import { sortBattlesDesc, groupBattlesByDate } from '../utils/battles';
import { formatDate } from '../utils/dates';

function PlayerSelectorSheet({ players, excludeId, isDark, t, onSelect, onClose, onClear, hasPlayer }) {
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
      className="fixed inset-0 z-[99999] flex flex-col justify-end"
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
          {hasPlayer && onClear && (
            <button
              onClick={() => { onClear(); dismiss(); }}
              className={`mt-3 w-full py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
            >
              Réinitialiser
            </button>
          )}
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
  onSelectBattle,
  onAddBattle,
}) {
  const [p1Id, setP1Id] = useState(initialP1Id);
  const [p2Id, setP2Id] = useState(initialP2Id);
  const [selectorFor, setSelectorFor] = useState(null); // 'p1' | 'p2' | null

  const p1 = useMemo(() => players.find((p) => String(p._id) === String(p1Id)) || null, [players, p1Id]);
  const p2 = useMemo(() => players.find((p) => String(p._id) === String(p2Id)) || null, [players, p2Id]);

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

  const h2hDates = useMemo(() => {
    const dates = [...new Set(h2hBattles.filter((b) => b.date).map((b) => b.date))].sort().reverse();
    return dates;
  }, [h2hBattles]);

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

  const renderBattleRow = (b, idx, total, showDate) => {
    const bp1 = String(p1._id) === String(b.player1) ? p1 : p2;
    const bp2 = String(p1._id) === String(b.player1) ? p2 : p1;
    const p1Elim = (b.team1 || []).filter((p) => p.eliminated).length;
    const p2Elim = (b.team2 || []).filter((p) => p.eliminated).length;
    const isLast = idx === total - 1;
    return (
      <button
        key={b._id}
        onClick={() => onSelectBattle?.(b)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${!isLast ? `border-b ${t.divider}` : ''} ${onSelectBattle ? 'active:opacity-70' : ''}`}
      >
        <div className="flex-1 min-w-0 flex flex-col items-center gap-1">
          <PlayerAvatar player={bp1} size={40} textSize="text-sm" />
          {b.winner === 'player1' ? (
            <span className="inline-flex px-2 rounded-full font-semibold bg-emerald-500 text-white truncate max-w-full" style={{ fontSize: '13px', paddingTop: '1px', paddingBottom: '1px' }}>{bp1?.name || '—'}</span>
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
        <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${b.format === '1v1' ? (isDark ? 'bg-purple-300/10 text-purple-300' : 'bg-purple-600/10 text-purple-600') : (isDark ? 'bg-teal-300/10 text-teal-300' : 'bg-teal-600/10 text-teal-600')}`}>
            {b.format}
          </span>
          <p className={`font-black text-3xl ${t.text} whitespace-nowrap leading-none`}>{p2Elim}–{p1Elim}</p>
          {showDate && b.date && <p className={`text-[10px] ${t.textTertiary}`}>{formatDate(b.date)}</p>}
        </div>
        <div className="flex-1 min-w-0 flex flex-col items-center gap-1">
          <PlayerAvatar player={bp2} size={40} textSize="text-sm" />
          {b.winner === 'player2' ? (
            <span className="inline-flex px-2 rounded-full font-semibold bg-emerald-500 text-white truncate max-w-full" style={{ fontSize: '13px', paddingTop: '1px', paddingBottom: '1px' }}>{bp2?.name || '—'}</span>
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
      </button>
    );
  };

  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const toggleGroup = (date) => setCollapsedGroups((prev) => {
    const next = new Set(prev);
    if (next.has(date)) next.delete(date); else next.add(date);
    return next;
  });

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

      {/* Header sticky — retour + titre centré uniquement */}
      <div
        className="sticky top-0 z-10 px-4 relative"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)', paddingBottom: '0rem' }}
      >
        <div className="absolute inset-x-0 top-0 -bottom-12 pointer-events-none transition-opacity duration-300" style={{
          opacity: scrolled ? 1 : 0,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
        }} />
        <div className="absolute inset-x-0 top-0 -bottom-12 pointer-events-none transition-opacity duration-300" style={{
          opacity: scrolled ? 1 : 0,
          background: isDark
            ? 'linear-gradient(to bottom, rgba(9,9,11,0.85) 0%, transparent 100%)'
            : 'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, transparent 100%)',
        }} />
        <div className="relative flex items-center justify-center h-11">
          <button
            onClick={onBack}
            className={`absolute left-0 w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900 border border-white/20 shadow-[0_4px_24px_rgba(0,0,0,0.12)]'}`}
            style={isDark ? { boxShadow: 'rgba(255,255,255,.21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
            aria-label="Retour"
          >
            <ChevronLeft size={24} className="-translate-x-px" />
          </button>
          <h1 className={`font-black text-lg ${t.text}`}>Versus</h1>
          {onAddBattle && (
            <button
              onClick={() => onAddBattle(p1Id, p2Id)}
              className={`absolute right-0 w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} ${t.accentBg} text-white`}
              style={isDark ? { boxShadow: 'rgba(255,255,255,.21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
              aria-label="Nouveau combat"
            >
              <Plus size={22} />
            </button>
          )}
        </div>
      </div>

      <div className={`px-5 space-y-6 mt-6 ${p1 && p2 ? 'pb-16' : ''}`} style={p1 && p2 ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)' } : undefined}>
        {/* Sélecteur de joueurs — 3 blocs séparés */}
        <div className="flex items-center gap-3">
          {/* P1 */}
          <div className={`flex-1 ${t.surface} rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 min-w-0 h-[130px]`}>
            <button onClick={() => setSelectorFor('p1')}>
              {p1 ? (
                <PlayerAvatar player={p1} size={52} textSize="text-xl" />
              ) : (
                <div className={`w-[52px] h-[52px] rounded-full flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-black/[0.06]'}`}>
                  <span className={`text-xl ${t.textTertiary}`}>?</span>
                </div>
              )}
            </button>
            <button onClick={() => setSelectorFor('p1')} className="flex flex-col items-center gap-1 w-full min-w-0">
              <p className={`text-sm font-bold truncate w-full text-center ${p1 ? t.text : t.textTertiary}`}>
                {p1 ? p1.name : 'Choisir'}
              </p>
              <span className={`text-xs font-semibold flex items-center gap-0.5 ${t.accent}`}>
                {p1 ? 'Changer' : 'Joueur'} <ChevronDown size={12} />
              </span>
            </button>
          </div>

          {/* VS */}
          <div className="flex-shrink-0 flex items-center justify-center w-9">
            <span className={`font-black text-sm ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>VS</span>
          </div>

          {/* P2 */}
          <div className={`flex-1 ${t.surface} rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 min-w-0 h-[130px]`}>
            <button onClick={() => setSelectorFor('p2')}>
              {p2 ? (
                <PlayerAvatar player={p2} size={52} textSize="text-xl" />
              ) : (
                <div className={`w-[52px] h-[52px] rounded-full flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-black/[0.06]'}`}>
                  <span className={`text-xl ${t.textTertiary}`}>?</span>
                </div>
              )}
            </button>
            <button onClick={() => setSelectorFor('p2')} className="flex flex-col items-center gap-1 w-full min-w-0">
              <p className={`text-sm font-bold truncate w-full text-center ${p2 ? t.text : t.textTertiary}`}>
                {p2 ? p2.name : 'Choisir'}
              </p>
              <span className={`text-xs font-semibold flex items-center gap-0.5 ${t.accent}`}>
                {p2 ? 'Changer' : 'Joueur'} <ChevronDown size={12} />
              </span>
            </button>
          </div>
        </div>

        {/* Filtre de date — juste après le sélecteur de joueurs */}
        {p1 && p2 && h2hDates.length > 1 && (
          <div>
            <label className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>Date</label>
            <div className={`${isDark ? 'bg-white/10' : 'bg-white/40'} rounded-xl px-3 py-2 flex items-center gap-2`}>
              <Calendar size={16} className={t.textTertiary} />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={`flex-1 bg-transparent outline-none ${t.text} appearance-none`}
              >
                <option value="">Tous les combats</option>
                {h2hDates.map((date) => (
                  <option key={date} value={date}>{formatDate(date)}</option>
                ))}
              </select>
              {dateFilter
                ? <button onClick={() => setDateFilter('')} className={`text-xs font-semibold ${t.accent} flex-shrink-0`}>Effacer</button>
                : <ChevronDown size={16} className={`${t.textTertiary} flex-shrink-0`} />
              }
            </div>
          </div>
        )}

        {(!p1 || !p2) && (
          <div className="flex flex-col items-center justify-center text-center !mt-0" style={{ minHeight: 'calc(-194px + 100dvh)' }}>
            <p className={`font-black text-base ${t.text} mb-1`}>Sélectionne deux joueurs</p>
            <p className={`${t.textSecondary} text-sm`}>Appuie sur les deux emplacements ci-dessus pour choisir les joueurs à comparer.</p>
          </div>
        )}

        {p1 && p2 && (
          <>
            {/* ── Face à face — score + forme uniquement ── */}
            <section>
              <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} px-1 mb-3`}>
                Face à face
              </h2>
              <div className={`${t.surface} rounded-2xl p-5 flex flex-col items-center gap-3`}>
                <div className="flex items-center gap-4">
                  <span className={`text-5xl font-black ${h2hScore.p1 > h2hScore.p2 ? 'text-emerald-500' : h2hScore.p1 < h2hScore.p2 ? 'text-red-500' : t.text}`}>{h2hScore.p1}</span>
                  <span className={`text-2xl font-bold ${t.textTertiary}`}>–</span>
                  <span className={`text-5xl font-black ${h2hScore.p2 > h2hScore.p1 ? 'text-emerald-500' : h2hScore.p2 < h2hScore.p1 ? 'text-red-500' : t.text}`}>{h2hScore.p2}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 max-w-[90px]">
                    <PlayerAvatar player={p1} size={20} textSize="text-[9px]" />
                    <span className={`text-xs font-semibold ${t.textSecondary} truncate`}>{p1.name}</span>
                  </div>
                  <span className={`text-xs ${t.textTertiary} flex-shrink-0`}>vs</span>
                  <div className="flex items-center gap-1.5 max-w-[90px]">
                    <PlayerAvatar player={p2} size={20} textSize="text-[9px]" />
                    <span className={`text-xs font-semibold ${t.textSecondary} truncate`}>{p2.name}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Stats globales — masquées si une date est filtrée ── */}
            {!dateFilter && stats1 && stats2 && (
              <section>
                <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} px-1 mb-3`}>
                  Stats globales
                </h2>
                <div className={`${t.surface} rounded-2xl overflow-hidden`}>
                  <div className={`flex items-center px-4 py-2 border-b ${t.divider}`}>
                    <div className="w-1/3" />
                    <div className="w-1/3 flex flex-col items-center gap-1">
                      <PlayerAvatar player={p1} size={28} textSize="text-xs" />
                      <span className={`text-xs font-bold truncate block ${t.text}`}>{p1.name}</span>
                    </div>
                    <div className="w-1/3 flex flex-col items-center gap-1">
                      <PlayerAvatar player={p2} size={28} textSize="text-xs" />
                      <span className={`text-xs font-bold truncate block ${t.text}`}>{p2.name}</span>
                    </div>
                  </div>
                  {[
                    { label: 'Victoires',           v1: stats1.wins,        v2: stats2.wins,        cmp: 'max', fmt: (v) => v },
                    { label: 'Défaites',            v1: stats1.losses,      v2: stats2.losses,      cmp: 'min', fmt: (v) => v },
                    { label: 'Winrate',             v1: stats1.winRate,     v2: stats2.winRate,     cmp: 'max', fmt: (v) => v != null ? `${v}%` : '—' },
                    { label: 'KO infligés',         v1: stats1.koInfliges,  v2: stats2.koInfliges,  cmp: 'max', fmt: (v) => v },
                    { label: 'KO reçus',            v1: stats1.koRecus,     v2: stats2.koRecus,     cmp: 'min', fmt: (v) => v },
                    { label: 'Victoires parfaites', v1: stats1.perfectWins, v2: stats2.perfectWins, cmp: 'max', fmt: (v) => v },
                    {
                      label: 'Type favori',
                      v1: stats1.mostUsedTypeEntry?.[0] || null,
                      v2: stats2.mostUsedTypeEntry?.[0] || null,
                      cmp: null,
                      fmt: (v) => v ? (TYPE_FR[v] || v) : '—',
                      render: (typeKey) => typeKey ? (
                        <span
                          className="pl-1 inline-flex items-stretch rounded-full overflow-hidden"
                          style={{ backgroundColor: TYPE_HEX[typeKey] || '#828282' }}
                        >
                          <img
                            src={`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${typeKey}.svg`}
                            alt=""
                            className="w-5 h-5 object-contain flex-shrink-0"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <span className="self-center pr-2 text-[10px] font-bold text-white uppercase leading-none">{TYPE_FR[typeKey] || typeKey}</span>
                        </span>
                      ) : <span className={t.textTertiary}>—</span>,
                    },
                    {
                      label: 'Format favori',
                      v1: stats1.favoriteFormat ? stats1.favoriteFormat[0] : null,
                      v2: stats2.favoriteFormat ? stats2.favoriteFormat[0] : null,
                      cmp: null,
                      fmt: (v) => v || '—',
                      render: (fmt) => fmt ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${fmt === '1v1' ? (isDark ? 'bg-purple-300/10 text-purple-300' : 'bg-purple-600/10 text-purple-600') : (isDark ? 'bg-teal-300/10 text-teal-300' : 'bg-teal-600/10 text-teal-600')}`}>
                          {fmt}
                        </span>
                      ) : <span className={t.textTertiary}>—</span>,
                    },
                    {
                      label: 'MVP',
                      v1: stats1.mvp || null,
                      v2: stats2.mvp || null,
                      cmp: null,
                      fmt: (v) => v?.name || '—',
                      render: (mvp) => mvp ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <img src={getPokemonImageUrlStatic(mvp.pokeId)} alt={mvp.name} className="w-10 h-10 object-contain" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                          <span className={`text-xs font-semibold ${t.text} text-center leading-tight`}>{mvp.name}</span>
                        </div>
                      ) : <span className={t.textTertiary}>—</span>,
                    },
                    {
                      label: 'Pokémon + utilisé',
                      v1: stats1.mostUsedPokemon || null,
                      v2: stats2.mostUsedPokemon || null,
                      cmp: null,
                      fmt: (v) => v?.name || '—',
                      render: (pk) => pk ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <img src={getPokemonImageUrlStatic(pk.pokeId)} alt={pk.name} className="w-10 h-10 object-contain" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                          <span className={`text-xs font-semibold ${t.text} text-center leading-tight`}>{pk.name}</span>
                        </div>
                      ) : <span className={t.textTertiary}>—</span>,
                    },
                  ].map(({ label, v1, v2, cmp, fmt, render }, idx, arr) => {
                    const win1 = cmp === 'max' ? v1 > v2 : cmp === 'min' ? v1 < v2 : false;
                    const win2 = cmp === 'max' ? v2 > v1 : cmp === 'min' ? v2 < v1 : false;
                    const isLast = idx === arr.length - 1;
                    return (
                      <div key={label} className={`flex items-center px-4 py-3 ${!isLast ? `border-b ${t.divider}` : ''}`}>
                        <div className="w-1/3">
                          <span className={`text-xs font-medium ${t.textSecondary}`}>{label}</span>
                        </div>
                        <div className="w-1/3 flex justify-center">
                          {render ? render(v1) : (
                            <span className={`text-sm font-bold ${win1 ? 'text-emerald-500' : win2 ? 'text-red-500' : t.text}`}>
                              {fmt(v1)}
                            </span>
                          )}
                        </div>
                        <div className="w-1/3 flex justify-center">
                          {render ? render(v2) : (
                            <span className={`text-sm font-bold ${win2 ? 'text-emerald-500' : win1 ? 'text-red-500' : t.text}`}>
                              {fmt(v2)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Pokémon favoris — masqués si une date est filtrée ── */}
            {!dateFilter && stats1 && stats2 && (
              <section>
                <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} px-1 mb-3`}>
                  Pokémon favoris
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {[{ player: p1, top3: stats1.top3 }, { player: p2, top3: stats2.top3 }].map(({ player, top3 }) => (
                    <div key={player._id} className={`${t.surface} rounded-2xl p-4`}>
                      <div className="flex items-center gap-2 mb-3 min-w-0">
                        <PlayerAvatar player={player} size={24} textSize="text-[10px]" />
                        <p className={`text-xs font-bold ${t.textSecondary} truncate`}>{player.name}</p>
                      </div>
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

            {/* ── Combats — filtre date + liste (dernière section) ── */}
            <section>
              <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} px-1 mb-3`}>
                Combats
              </h2>

              {/* Liste des combats H2H */}
              {h2hBattles.length === 0 ? (
                <div className={`${t.surface} rounded-2xl p-6 text-center`}>
                  <p className={`${t.textSecondary} text-sm`}>Aucun combat entre ces deux joueurs pour l'instant.</p>
                </div>
              ) : h2hFiltered.length === 0 ? (
                <div className={`${t.surface} rounded-2xl p-6 text-center`}>
                  <p className={`${t.textSecondary} text-sm`}>Aucun combat à cette date.</p>
                </div>
              ) : dateFilter ? (
                /* Vue filtrée : liste plate sans en-tête de groupe */
                <div className={`${t.surface} rounded-2xl overflow-hidden`}>
                  {h2hFiltered.map((b, idx) => renderBattleRow(b, idx, h2hFiltered.length, true))}
                </div>
              ) : (
                /* Vue globale : groupée par date */
                <div className="space-y-3">
                  {groupBattlesByDate(h2hFiltered).map((group) => {
                    const isCollapsed = collapsedGroups.has(group.date);
                    const gp1Wins = group.battles.filter((b) =>
                      (String(b.player1) === String(p1._id) && b.winner === 'player1') ||
                      (String(b.player2) === String(p1._id) && b.winner === 'player2')
                    ).length;
                    const gp2Wins = group.battles.filter((b) =>
                      (String(b.player1) === String(p2._id) && b.winner === 'player1') ||
                      (String(b.player2) === String(p2._id) && b.winner === 'player2')
                    ).length;
                    return (
                      <div key={group.date} className={`${t.surface} rounded-2xl overflow-hidden`}>
                        <button
                          onClick={() => toggleGroup(group.date)}
                          className={`no-press-fx w-full flex items-center justify-between gap-2 px-4 py-3 ${t.surfaceMuted} active:opacity-80`}
                        >
                          <span className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${t.textSecondary}`}>
                            <Calendar size={13} />
                            {formatDate(group.date)}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${isDark ? `${t.surfaceMuted} ${t.textSecondary}` : 'bg-gray-200 text-gray-600'}`}>{group.battles.length}</span>
                            {isCollapsed
                              ? <ChevronDown size={16} className={t.textSecondary} />
                              : <ChevronUp size={16} className={t.textSecondary} />}
                          </span>
                        </button>

                        {!isCollapsed && (
                          <div className={`px-4 py-2.5 flex flex-wrap gap-x-5 gap-y-1.5 border-b ${t.divider}`}>
                            {[{ player: p1, wins: gp1Wins, losses: gp2Wins }, { player: p2, wins: gp2Wins, losses: gp1Wins }].map(({ player, wins, losses }) => (
                              <div key={player._id} className="flex items-center gap-1.5">
                                <PlayerAvatar player={player} size={20} textSize="text-[9px]" />
                                <span className={`text-xs font-bold ${t.text}`}>{player.name}</span>
                                <span className={`text-[11px] font-semibold ${t.success}`}>{wins}V</span>
                                <span className={`text-[11px] ${t.textTertiary}`}>·</span>
                                <span className={`text-[11px] font-semibold ${isDark ? 'text-red-400' : 'text-red-500'}`}>{losses}D</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {!isCollapsed && group.battles.map((b, idx) => renderBattleRow(b, idx, group.battles.length, false))}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Player Selector Sheet — rendu via portal pour passer au-dessus de la navigation */}
      {selectorFor && createPortal(
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
          hasPlayer={selectorFor === 'p1' ? !!p1 : !!p2}
          onClear={() => {
            if (selectorFor === 'p1') setP1Id(null);
            else setP2Id(null);
          }}
        />,
        document.body
      )}
    </div>
  );
}
