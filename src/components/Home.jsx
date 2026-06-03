import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Users, Shield, Zap, ChevronRight, Trophy, Loader2 } from 'lucide-react';
import { formatDate } from '../utils/dates';
import { sortBattlesDesc } from '../utils/battles';
import { usePokemon } from '../hooks/usePokemon';
import { usePokemonTypes } from '../hooks/usePokemonTypes';
import { calcTypeAdv } from '../utils/mvp';
import { PlayerAvatar } from './PlayerAvatar';
import { useTranslation } from '../hooks/useTranslation';

const StatTile = ({ Icon, value, label, tile, t, onClick }) => (
  <button
    onClick={onClick}
    className={`${t.surface} rounded-2xl p-4 flex flex-col gap-2 text-left w-full shadow-sm active:scale-95 transition-transform duration-100`}
  >
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tile}`}>
      <Icon size={18} strokeWidth={2} />
    </div>
    <p className={`text-2xl font-black ${t.text} leading-none`}>{value}</p>
    <p className={`${t.textSecondary} text-xs font-medium`}>{label}</p>
  </button>
);

export const Home = ({ players, battles, teams, isDark, setIsDark, t, setCurrentTab, setSelectedBattle, onSelectPlayer, onSearchPokemon, onViewPokemon, linkedPlayer, onOpenSettings, onRefresh, deleteAnimSnapshot = null, onDeleteAnimConsumed, isBackground = false, initialScrollY = 0 }) => {
  const tr = useTranslation();
  const recentBattles = useMemo(() => sortBattlesDesc(battles).slice(0, 3), [battles]);

  // ── Animation "nouveau combat" ──────────────────────────────────────────────
  // displayedBattles est la liste réellement rendue ; elle est mise à jour avec
  // un délai pour laisser la modale se fermer avant que la carte apparaisse.
  const [displayedBattles, setDisplayedBattles] = useState(deleteAnimSnapshot ?? recentBattles);
  const [enteringId, setEnteringId]         = useState(null);
  const [deletingId, setDeletingId]         = useState(null);
  const [risingId, setRisingId]             = useState(null);
  const [slidingDownIds, setSlidingDownIds] = useState(new Set());
  const [slidingUpIds, setSlidingUpIds]     = useState(new Set());
  const [shiftOffset, setShiftOffset]       = useState(88);

  const prevFirstIdRef      = useRef(recentBattles[0]?._id);
  const displayedRef        = useRef(deleteAnimSnapshot ?? recentBattles);
  const battleListRef       = useRef(null);
  const phase2Ref           = useRef(null);
  const phase2FiredRef      = useRef(false);
  const deletePhase2Ref      = useRef(null);
  const deletePhase2FiredRef = useRef(false);
  const deleteAnimActiveRef  = useRef(false); // animation de suppression en cours
  const pendingDeleteRef     = useRef(null); // suppression reçue en background

  useEffect(() => { displayedRef.current = displayedBattles; }, [displayedBattles]);

  // Signale à App que le snapshot a été consommé (évite de rejouer l'animation au prochain montage)
  useEffect(() => {
    if (deleteAnimSnapshot) onDeleteAnimConsumed?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerDeleteAnim = useCallback((removed, incoming, snapshot) => {
    let offset = 88;
    if (battleListRef.current) {
      const removedEl = battleListRef.current.querySelector(`[data-battle-id="${removed._id}"]`);
      if (removedEl) offset = removedEl.offsetHeight + 12;
    }
    setShiftOffset(offset);
    deletePhase2FiredRef.current = false;
    deleteAnimActiveRef.current = true;
    deletePhase2Ref.current = () => {
      deleteAnimActiveRef.current = false;
      setDeletingId(null);
      setSlidingUpIds(new Set());
      setDisplayedBattles(snapshot);
      if (incoming) setRisingId(incoming._id);
    };
    setDeletingId(removed._id);
    const removedIndex = displayedRef.current.findIndex(b => b._id === removed._id);
    setSlidingUpIds(new Set(displayedRef.current.slice(removedIndex + 1).map(b => b._id)));
  }, []);

  // Déclenche l'animation en attente quand on revient au foreground
  useEffect(() => {
    if (!isBackground && pendingDeleteRef.current) {
      const { removed, incoming, snapshot } = pendingDeleteRef.current;
      pendingDeleteRef.current = null;
      triggerDeleteAnim(removed, incoming, snapshot);
    }
  }, [isBackground, triggerDeleteAnim]);

  useEffect(() => {
    const newFirstId = recentBattles[0]?._id;
    const oldFirstId = prevFirstIdRef.current;
    prevFirstIdRef.current = newFirstId;

    // Si le nouveau premier ID était déjà dans la liste, c'est une suppression du 1er combat
    // (pas un ajout) — laisser la logique de suppression ci-dessous gérer ça.
    const newFirstWasPresent = newFirstId && displayedRef.current.some(b => b._id === newFirstId);

    if (newFirstId && newFirstId !== oldFirstId && oldFirstId !== undefined && !newFirstWasPresent) {
      // Nouveau combat en tête — attendre la fermeture de la modale
      const snapshot = recentBattles;
      const timer = setTimeout(() => {
        const current = displayedRef.current;

        // Mesure la hauteur du premier slot (carte + gap space-y-3) avant la mise à jour
        let offset = 88;
        if (battleListRef.current) {
          const firstChild = battleListRef.current.querySelector(':scope > div:first-child');
          if (firstChild) offset = firstChild.offsetHeight + 12;
        }
        setShiftOffset(offset);

        // Phase 2 sera déclenchée par animationEnd sur les cartes glissantes
        phase2FiredRef.current = false;
        phase2Ref.current = () => {
          setSlidingDownIds(new Set());
          setDisplayedBattles(snapshot);
          setEnteringId(newFirstId);
        };

        // Phase 1 : toutes les cartes actuelles glissent vers le bas
        setSlidingDownIds(new Set(current.map(b => b._id)));
      }, 260);
      return () => clearTimeout(timer);
    }

    if (!enteringId) {
      const removed = displayedRef.current.find(b => !recentBattles.some(n => n._id === b._id));
      if (removed) {
        const incoming = recentBattles.find(b => !displayedRef.current.some(d => d._id === b._id));
        const snapshot = recentBattles;

        if (isBackground) {
          // Mémorise la suppression, la homepage affichera l'animation au retour
          pendingDeleteRef.current = { removed, incoming, snapshot };
          return;
        }

        if (deleteAnimActiveRef.current) {
          // Animation déjà en cours : mise à jour directe sans animation
          setDeletingId(null);
          setSlidingUpIds(new Set());
          deleteAnimActiveRef.current = false;
          setDisplayedBattles(snapshot);
          return;
        }
        triggerDeleteAnim(removed, incoming, snapshot);
        return;
      }
      setDisplayedBattles(recentBattles);
    }
  }, [recentBattles]); // eslint-disable-line react-hooks/exhaustive-deps

  // Collecte tous les pokeIds présents dans les combats pour le lookup de types
  const allPokeIds = useMemo(() => {
    const ids = new Set();
    for (const b of battles) {
      for (const p of [...(b.team1 || []), ...(b.team2 || [])]) {
        if (p.pokeId) ids.add(p.pokeId);
      }
    }
    return [...ids];
  }, [battles]);

  const pokemonTypes = usePokemonTypes(allPokeIds);

  // TOP 5 MVP :
  // Phase 1 — pour chaque combat AVEC un vainqueur, élit le MVP de l'équipe gagnante
  //           (survivant avec le plus d'avantage de types vs l'équipe adverse).
  //           Compte par paire (joueur × Pokémon).
  // Phase 2 — déduplique par Pokémon : un même Pokémon n'apparaît qu'une fois,
  //           représenté par le joueur qui l'a le plus souvent rendu MVP.
  const topPokemon = useMemo(() => {
    // Attendre que TOUS les types soient chargés avant de calculer
    if (allPokeIds.length > 0 && allPokeIds.some(id => !pokemonTypes[id])) return [];

    const pairCounts = {};
    for (const b of battles) {
      if (!b.winner) continue;
      const winSide  = b.winner === 'player1' ? 'team1' : 'team2';
      const oppSide  = b.winner === 'player1' ? 'team2' : 'team1';
      const winnerId = String(
        b.winner === 'player1'
          ? (b.player1?._id ?? b.player1)
          : (b.player2?._id ?? b.player2),
      );
      const survivors = (b[winSide] || []).filter(p => !p.eliminated);
      if (survivors.length === 0) continue;
      const oppTeam = b[oppSide] || [];

      const scored = survivors.map(p => ({
        ...p,
        score: calcTypeAdv(
          pokemonTypes[p.pokeId] || [],
          oppTeam.map(o => pokemonTypes[o.pokeId] || []),
        ),
      }));
      const mvp = scored.reduce((best, cur) => cur.score > best.score ? cur : best);

      const key = `${winnerId}:${String(mvp.name || mvp.pokeId).toLowerCase()}`;
      if (!pairCounts[key]) pairCounts[key] = { pokeId: mvp.pokeId, name: mvp.name, mvps: 0, playerId: winnerId };
      pairCounts[key].mvps++;
    }

    return Object.values(pairCounts)
      .sort((a, b) => b.mvps - a.mvps)
      .slice(0, 5)
      .map(entry => ({
        ...entry,
        player: players.find(pl => String(pl._id) === entry.playerId) || null,
      }));
  }, [battles, players, pokemonTypes]);
  const { getPokemonImageUrl } = usePokemon();
  // Même logique que Players : initialScrollY évite le flash de topbar au retour.
  const [scrolled, setScrolled] = useState(() => initialScrollY > 20);

  useEffect(() => {
    if (isBackground) return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isBackground]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const THRESHOLD = 64;
  const [pullY, setPullY]         = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullYRef   = useRef(0);
  const startYRef  = useRef(0);
  const pullingRef = useRef(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try { await onRefresh(); } finally { setIsRefreshing(false); }
  }, [onRefresh]);

  useEffect(() => {
    if (isBackground || !onRefresh) return;

    const onTouchStart = (e) => {
      if (window.scrollY > 0) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    };
    const onTouchMove = (e) => {
      if (!pullingRef.current) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) { pullingRef.current = false; setPullY(0); pullYRef.current = 0; return; }
      // Résistance progressive façon iOS
      const y = Math.min(delta * 0.45, THRESHOLD * 1.1);
      pullYRef.current = y;
      setPullY(y);
    };
    const onTouchEnd = async () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      if (pullYRef.current >= THRESHOLD * 0.85) {
        setPullY(0); pullYRef.current = 0;
        await handleRefresh();
      } else {
        setPullY(0); pullYRef.current = 0;
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove',  onTouchMove,  { passive: true });
    window.addEventListener('touchend',   onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove',  onTouchMove);
      window.removeEventListener('touchend',   onTouchEnd);
    };
  }, [isBackground, onRefresh, handleRefresh]);

  const indicatorY = isRefreshing ? 16 : pullY - 44;
  const indicatorOpacity = isRefreshing ? 1 : Math.min(pullY / THRESHOLD, 1);
  const arrowRotation = Math.min(pullY / THRESHOLD, 1) * 180;

  return (
    <>
    {/* Indicateur pull-to-refresh */}
    {(pullY > 0 || isRefreshing) && !isBackground && (
      <div
        className="fixed left-0 right-0 flex justify-center z-50 pointer-events-none"
        style={{
          top: 'env(safe-area-inset-top)',
          transform: `translateY(${indicatorY}px)`,
          opacity: indicatorOpacity,
          transition: (isRefreshing || pullY === 0) ? 'transform 0.3s cubic-bezier(0.32,0.72,0.24,1), opacity 0.2s ease' : 'none',
        }}
      >
        <div className={`w-9 h-9 rounded-full shadow-md flex items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-white'}`}>
          {isRefreshing
            ? <Loader2 size={16} className={`animate-spin ${isDark ? 'text-zinc-300' : 'text-zinc-500'}`} />
            : <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: `rotate(${arrowRotation}deg)`, transition: 'none' }}>
                <path d="M8 2v9M4 7l4 4 4-4" stroke={isDark ? '#a1a1aa' : '#71717a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
          }
        </div>
      </div>
    )}
    <div className="relative min-h-screen">
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10"
        style={{
          background: isDark
            ? 'radial-gradient(130% 75% at 0% 0%, rgba(147,244,185,0.08) 0%, rgba(0,255,150,0) 100%), radial-gradient(120% 70% at 100% 0%, rgba(255,228,162,0.07) 0%, rgba(239,186,37,0) 100%), #09090b'
            : 'radial-gradient(130% 100% at 0% 0%, #93f4b9 0%, rgba(0,255,150,0) 100%), radial-gradient(120% 70% at 100% 0%, #ffe4a2 0%, rgba(239,186,37,0) 100%), rgb(239,246,249)',
        }}
      />
      {/* Decorative circles */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Decorative circles — centered at top-left corner */}
        {[300, 420, 540, 660].map((px) => {
          const vw = `${(px / 390 * 100).toFixed(1)}vw`;
          return (
            <div
              key={px}
              className={`absolute rounded-full border ${isDark ? 'border-white/5' : 'border-white/50'}`}
              style={{ width: vw, height: vw, top: `calc(${vw} / -2)`, left: `calc(${vw} / -2)` }}
            />
          );
        })}
      </div>

      {/* ── En-tête ── */}
      <div
        className={`sticky top-0 z-10 px-4 transition-all duration-200 relative ${
          scrolled ? '' : ''
        }`}
        style={{
          paddingTop: `calc(env(safe-area-inset-top) + 0.75rem + ${isRefreshing ? 44 : pullY * 0.45}px)`,
          paddingBottom: '0.75rem',
          transition: (isRefreshing || pullY === 0) ? 'padding-top 0.3s cubic-bezier(0.32,0.72,0.24,1)' : 'none',
        }}
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
        <div className="flex justify-between items-center relative">
          <div>
            <h1 className={`${scrolled ? 'text-xl' : 'text-3xl'} font-black tracking-tight transition-all duration-300 ${t.text}`}>PokéScores</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSearchPokemon}
              className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} transition-all duration-200 ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'}`}
              style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
              aria-label="Rechercher un Pokémon"
            >
              <Search size={20} />
            </button>
<button
              onClick={onOpenSettings}
              className={`w-11 h-11 rounded-full flex items-center justify-center overflow-hidden backdrop-blur-xl ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} transition-all duration-200 ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'}`}
              style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
              aria-label="Paramètres"
            >
              <PlayerAvatar player={linkedPlayer} size={44} textSize="text-sm" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-[1] px-5 mt-4 pb-40 space-y-7">
        {/* ── Statistiques ── */}
        <section>
          <div className="grid grid-cols-3 gap-3">
            <StatTile Icon={Users}  value={players.length} label={tr('nav.players')}  tile={t.iconTileBlue}   t={t} onClick={() => setCurrentTab('players')} />
            <StatTile Icon={Zap}    value={battles.length} label={tr('nav.battles')}  tile={t.iconTileAmber}  t={t} onClick={() => setCurrentTab('battles')} />
            <StatTile Icon={Shield} value={teams.length}   label={tr('nav.teams')}    tile={t.iconTilePurple} t={t} onClick={() => setCurrentTab('teams')} />
          </div>
        </section>

        {/* ── Combats récents ── */}
        <section>
          <div className="flex justify-between items-baseline mb-3 px-1">
            <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary}`}>
              {tr('home.recentBattles')}
            </h2>
            {battles.length > 3 && (
              <button
                onClick={() => setCurrentTab('battles')}
                className={`${t.accent} text-sm font-semibold flex items-center gap-0.5`}
              >
                {tr('home.seeAll')} <ChevronRight size={14} />
              </button>
            )}
          </div>

          {displayedBattles.length === 0 ? (
            <div className={`${t.surface} rounded-2xl p-8 text-center shadow-sm`}>
              <div className={`w-12 h-12 mx-auto rounded-2xl ${t.iconTileAmber} flex items-center justify-center mb-3`}>
                <Zap size={22} />
              </div>
              <p className={`${t.text} font-semibold mb-1`}>{tr('home.noBattles')}</p>
              <p className={`${t.textSecondary} text-sm`}>{tr('home.noBattlesDesc')}</p>
            </div>
          ) : (() => {
            const renderCard = (b, extraClass = '') => {
              const p1 = players.find(p => p._id === b.player1);
              const p2 = players.find(p => p._id === b.player2);
              const p1Elim = (b.team1 || []).filter(p => p.eliminated).length;
              const p2Elim = (b.team2 || []).filter(p => p.eliminated).length;
              return (
                <button
                  onClick={() => { setSelectedBattle(b); setCurrentTab('battleDetail'); }}
                  className={`w-full ${t.surface} rounded-2xl px-4 py-3 flex items-center gap-3 text-left shadow-sm${extraClass ? ` ${extraClass}` : ''}`}
                >
                  {/* Joueur 1 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="relative flex-shrink-0">
                        <PlayerAvatar player={p1} size={40} textSize="text-sm" />
                        {b.winner === 'player1' && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                            <Trophy size={8} strokeWidth={2.5} className="text-white" />
                          </span>
                        )}
                      </div>
                      <p className={`truncate font-semibold text-sm ${b.winner === 'player1' ? t.success : t.text}`}>
                        {p1?.name || '—'}
                      </p>
                    </div>
                    {(b.team1 || []).length > 0 && (
                      <div className="flex gap-0.5">
                        {b.team1.map((pk, i) => (
                          <img key={pk.id || i} src={getPokemonImageUrl(pk.pokeId)} alt={pk.name}
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
                    <p className={`font-black text-2xl ${t.text} whitespace-nowrap leading-none`}>{p2Elim}–{p1Elim}</p>
                    {b.date && <p className={`text-[10px] ${t.textTertiary}`}>{formatDate(b.date)}</p>}
                  </div>
                  {/* Joueur 2 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-end gap-2 mb-1.5">
                      <p className={`truncate text-right font-semibold text-sm ${b.winner === 'player2' ? t.success : t.text}`}>
                        {p2?.name || '—'}
                      </p>
                      <div className="relative flex-shrink-0">
                        <PlayerAvatar player={p2} size={40} textSize="text-sm" />
                        {b.winner === 'player2' && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                            <Trophy size={8} strokeWidth={2.5} className="text-white" />
                          </span>
                        )}
                      </div>
                    </div>
                    {(b.team2 || []).length > 0 && (
                      <div className="flex gap-0.5 justify-end">
                        {b.team2.map((pk, i) => (
                          <img key={pk.id || i} src={getPokemonImageUrl(pk.pokeId)} alt={pk.name}
                            className={`w-6 h-6 object-contain flex-shrink-0 ${pk.eliminated ? 'grayscale opacity-50' : ''}`}
                            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            };

            return (
              <div ref={battleListRef} className="relative space-y-3 overflow-hidden">
                {displayedBattles.map((b) => {
                  if (enteringId === b._id) {
                    return (
                      <div key={b._id} onAnimationEnd={() => setEnteringId(null)}>
                        {renderCard(b, 'anim-battle-card-enter')}
                      </div>
                    );
                  }
                  if (slidingDownIds.has(b._id)) {
                    return (
                      <div
                        key={b._id}
                        className="anim-battle-slide-down"
                        style={{ '--shift-offset': `${shiftOffset}px` }}
                        onAnimationEnd={() => {
                          if (phase2FiredRef.current) return;
                          phase2FiredRef.current = true;
                          phase2Ref.current?.();
                        }}
                      >
                        {renderCard(b)}
                      </div>
                    );
                  }
                  if (deletingId === b._id) {
                    return (
                      <div
                        key={b._id}
                        data-battle-id={b._id}
                        onAnimationEnd={() => {
                          if (deletePhase2FiredRef.current) return;
                          deletePhase2FiredRef.current = true;
                          deletePhase2Ref.current?.();
                        }}
                      >
                        {renderCard(b, 'anim-battle-card-delete')}
                      </div>
                    );
                  }
                  if (slidingUpIds.has(b._id)) {
                    return (
                      <div
                        key={b._id}
                        className="anim-battle-slide-up"
                        style={{ '--shift-offset': `${shiftOffset}px` }}
                      >
                        {renderCard(b)}
                      </div>
                    );
                  }
                  if (risingId === b._id) {
                    return (
                      <div key={b._id} onAnimationEnd={() => setRisingId(null)}>
                        {renderCard(b, 'anim-battle-card-rise')}
                      </div>
                    );
                  }
                  return <div key={b._id} data-battle-id={b._id}>{renderCard(b)}</div>;
                })}
              </div>
            );
          })()}
        </section>

        {/* ── Top joueur ── */}
        {players.length > 0 && battles.length > 0 && (
          <section>
            <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} mb-3 px-1`}>
              {tr('home.topPlayer')}
            </h2>
            {(() => {
              const ranked = [...players]
                .map((p) => ({
                  ...p,
                  total: (p.stats?.wins || 0) + (p.stats?.losses || 0),
                }))
                .filter((p) => p.total > 0)
                .sort((a, b) => (b.stats?.wins || 0) - (a.stats?.wins || 0));
              const top = ranked[0];
              if (!top) {
                return (
                  <div className={`${t.surface} rounded-2xl p-4 text-center ${t.textSecondary} text-sm`}>
                    {tr('home.noWins')}
                  </div>
                );
              }
              return (
                <button
                  onClick={() => onSelectPlayer?.(top)}
                  className={`w-full ${t.surface} rounded-2xl p-4 flex items-center gap-3 text-left shadow-sm`}
                >
                  <PlayerAvatar player={top} size={48} textSize="text-lg" className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`font-black ${t.text} truncate`}>{top.name}</p>
                    <p className={`${t.textSecondary} text-sm`}>
                      {tr('home.winsOf', top.stats?.wins || 0, top.total)}
                    </p>
                  </div>
                  <ChevronRight size={18} className={t.textTertiary} />
                </button>
              );
            })()}
          </section>
        )}

        {/* ── Top Pokémon ── */}
        {topPokemon.length > 0 && (
          <section>
            <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} mb-3 px-1`}>
              Top Pokémon
            </h2>
            <div
              className="overflow-x-auto -mx-5 pb-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
            <div
              className="flex gap-3 pl-5"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {topPokemon.map((p, i) => (
                <button
                  key={p.pokeId}
                  onClick={() => onViewPokemon?.({ pokeId: p.pokeId, name: p.name })}
                  className={`flex-shrink-0 w-[120px] ${t.surface} rounded-2xl pt-3 pb-4 px-3 flex flex-col items-center shadow-sm active:scale-95 transition-transform duration-100`}
                  style={{ scrollSnapAlign: 'start' }}
                >
                  {/* Rang + avatar joueur */}
                  <div className="w-full flex justify-between items-center mb-1">
                    {i <= 2 ? (
                      <img
                        src={i === 0 ? '/medal-gold.png' : i === 1 ? '/medal-silver.png' : '/medal-bronze.png'}
                        alt={i === 0 ? 'Or' : i === 1 ? 'Argent' : 'Bronze'}
                        className="w-6 h-6 object-contain flex-shrink-0"
                      />
                    ) : (
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${t.surfaceMuted} ${t.textTertiary}`}>
                        {i + 1}
                      </span>
                    )}
                    {p.player && (
                      <PlayerAvatar player={p.player} size={20} textSize="text-[7px]" className="flex-shrink-0" />
                    )}
                  </div>
                  {/* Sprite */}
                  <img
                    src={getPokemonImageUrl(p.pokeId)}
                    alt={p.name}
                    className="w-16 h-16 object-contain"
                    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                  />
                  {/* Nom */}
                  <p className={`font-bold text-xs ${t.text} truncate w-full text-center mt-1 leading-tight`}>
                    {p.name}
                  </p>
                  {/* Victoires */}
                  <p className={`text-[11px] ${t.textSecondary} mt-0.5`}>
                    {p.mvps} titre{p.mvps > 1 ? 's' : ''}
                  </p>
                </button>
              ))}
              {/* Spacer droit : gap(12px) + w-2(8px) = 20px = même gouttière qu'à gauche */}
              <div className="flex-shrink-0 w-2" aria-hidden="true" />
            </div>
            </div>
          </section>
        )}
      </div>
    </div>

    </>
  );
};
