import React, { useState, useEffect, useMemo } from 'react';
import { Search, Users, Shield, Zap, ChevronRight, Trophy } from 'lucide-react';
import { formatDate } from '../utils/dates';
import { sortBattlesDesc } from '../utils/battles';
import { usePokemon } from '../hooks/usePokemon';
import { usePokemonTypes } from '../hooks/usePokemonTypes';
import { computeBattleMvp } from '../utils/mvp';
import { PlayerAvatar } from './PlayerAvatar';
import { PokemonDetailModal } from './PokemonDetailModal';
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

export const Home = ({ players, battles, teams, isDark, setIsDark, t, setCurrentTab, setSelectedBattle, onSelectPlayer, onSearchPokemon, linkedPlayer, onOpenSettings }) => {
  const tr = useTranslation();
  const recentBattles = sortBattlesDesc(battles).slice(0, 3);

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

  // TOP 5 MVP : pour chaque combat, on élit UN seul MVP via l'avantage de types
  // (même algorithme que BattleDetail), puis on compte par paire (joueur × Pokémon).
  const topPokemon = useMemo(() => {
    const counts = {};
    for (const b of battles) {
      const mvp = computeBattleMvp(b, pokemonTypes);
      if (!mvp) continue;
      const playerId = String(
        mvp.side === 'team1'
          ? (b.player1?._id ?? b.player1)
          : (b.player2?._id ?? b.player2),
      );
      const key = `${playerId}:${mvp.pokeId}`;
      if (!counts[key]) {
        counts[key] = { pokeId: mvp.pokeId, name: mvp.name, mvps: 0, playerId };
      }
      counts[key].mvps++;
    }
    return Object.values(counts)
      .sort((a, b) => b.mvps - a.mvps)
      .slice(0, 5)
      .map((entry) => ({
        ...entry,
        player: players.find((pl) => String(pl._id) === entry.playerId) || null,
      }));
  }, [battles, players, pokemonTypes]);
  const { getPokemonImageUrl } = usePokemon();
  const [scrolled, setScrolled] = useState(false);
  const [viewingPokemon, setViewingPokemon] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
    <div className="relative min-h-screen">
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10"
        style={{
          background: isDark
            ? 'radial-gradient(130% 100% at 0% 0%, rgba(147,244,185,0.08) 0%, rgba(0,255,150,0) 100%), radial-gradient(120% 70% at 100% 0%, rgba(255,228,162,0.07) 0%, rgba(239,186,37,0) 100%), #09090b'
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
        className={`sticky top-0 z-10 px-4 transition-all duration-200 ${
          scrolled
            ? `${t.surfaceBlur} border-b ${t.divider}`
            : 'bg-transparent border-b border-transparent'
        }`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)', paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center justify-between">
          <h1 className={`text-3xl font-black tracking-tight ${t.text}`}>PokéScores</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onSearchPokemon}
              className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} shadow-sm transition-all duration-200 ${
                scrolled
                  ? `${t.surfaceMuted} ${t.text}`
                  : (isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900')
              }`}
              style={isDark ? { boxShadow: '1px 1px #ffffff36', borderTop: '1px solid #ffffff36' } : undefined}
              aria-label="Rechercher un Pokémon"
            >
              <Search size={20} />
            </button>
<button
              onClick={onOpenSettings}
              className={`w-11 h-11 rounded-full flex items-center justify-center overflow-hidden backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} shadow-sm transition-all duration-200 ${
                scrolled
                  ? `${t.surfaceMuted} ${t.text}`
                  : (isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900')
              }`}
              style={isDark ? { boxShadow: '1px 1px #ffffff36', borderTop: '1px solid #ffffff36' } : undefined}
              aria-label="Paramètres"
            >
              <PlayerAvatar player={linkedPlayer} size={44} textSize="text-sm" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-[1] px-5 mt-5 pb-40 space-y-7">
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

          {recentBattles.length === 0 ? (
            <div className={`${t.surface} rounded-2xl p-8 text-center shadow-sm`}>
              <div className={`w-12 h-12 mx-auto rounded-2xl ${t.iconTileAmber} flex items-center justify-center mb-3`}>
                <Zap size={22} />
              </div>
              <p className={`${t.text} font-semibold mb-1`}>{tr('home.noBattles')}</p>
              <p className={`${t.textSecondary} text-sm`}>{tr('home.noBattlesDesc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBattles.map((b) => {
                const p1 = players.find(p => p._id === b.player1);
                const p2 = players.find(p => p._id === b.player2);
                const p1Elim = (b.team1 || []).filter(p => p.eliminated).length;
                const p2Elim = (b.team2 || []).filter(p => p.eliminated).length;
                return (
                  <button
                    key={b._id}
                    onClick={() => {
                      setSelectedBattle(b);
                      setCurrentTab('battleDetail');
                    }}
                    className={`w-full ${t.surface} rounded-2xl px-4 py-3 flex items-center gap-3 text-left shadow-sm`}
                  >
                    {/* Joueur 1 — avatar + nom + Pokémon */}
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
                            <img
                              key={pk.id || i}
                              src={getPokemonImageUrl(pk.pokeId)}
                              alt={pk.name}
                              className={`w-6 h-6 object-contain flex-shrink-0 ${pk.eliminated ? 'grayscale opacity-50' : ''}`}
                              onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Format + score centré */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${b.format === '1v1' ? (isDark ? 'bg-pink-300/10 text-pink-300' : 'bg-pink-600/10 text-pink-600') : (isDark ? 'bg-indigo-300/10 text-indigo-300' : 'bg-indigo-600/10 text-indigo-600')}`}>
                        {b.format}
                      </span>
                      <p className={`font-black text-2xl ${t.text} whitespace-nowrap leading-none`}>
                        {p2Elim}–{p1Elim}
                      </p>
                      {b.date && (
                        <p className={`text-[10px] ${t.textTertiary}`}>{formatDate(b.date)}</p>
                      )}
                    </div>

                    {/* Joueur 2 — Pokémon + nom + avatar */}
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
                            <img
                              key={pk.id || i}
                              src={getPokemonImageUrl(pk.pokeId)}
                              alt={pk.name}
                              className={`w-6 h-6 object-contain flex-shrink-0 ${pk.eliminated ? 'grayscale opacity-50' : ''}`}
                              onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
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
                  onClick={() => setViewingPokemon({ pokeId: p.pokeId, name: p.name })}
                  className={`flex-shrink-0 w-[120px] ${t.surface} rounded-2xl pt-3 pb-4 px-3 flex flex-col items-center shadow-sm active:scale-95 transition-transform duration-100`}
                  style={{ scrollSnapAlign: 'start' }}
                >
                  {/* Rang + avatar joueur */}
                  <div className="w-full flex justify-between items-center mb-1">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                      i === 0
                        ? 'bg-amber-400 text-white'
                        : i === 1
                          ? isDark ? 'bg-zinc-500 text-white' : 'bg-gray-300 text-gray-700'
                          : i === 2
                            ? 'bg-amber-700/70 text-white'
                            : `${t.surfaceMuted} ${t.textTertiary}`
                    }`}>
                      {i + 1}
                    </span>
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

    {/* ── Détail Pokémon (bottom sheet) ── */}
    {viewingPokemon && (
      <PokemonDetailModal
        pokeId={viewingPokemon.pokeId}
        pokeName={viewingPokemon.name}
        t={t}
        isDark={isDark}
        onClose={() => setViewingPokemon(null)}
      />
    )}
    </>
  );
};
