import React, { useState, useEffect } from 'react';
import { Moon, Sun, Search, Users, Shield, Zap, ChevronRight, Trophy } from 'lucide-react';
import { formatDate } from '../utils/dates';
import { sortBattlesDesc } from '../utils/battles';
import { usePokemon } from '../hooks/usePokemon';
import { PlayerAvatar } from './PlayerAvatar';

const StatTile = ({ Icon, value, label, tile, t }) => (
  <div className={`${t.surface} rounded-2xl p-4 flex flex-col gap-2`}>
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tile}`}>
      <Icon size={18} strokeWidth={2} />
    </div>
    <p className={`text-2xl font-black ${t.text} leading-none`}>{value}</p>
    <p className={`${t.textSecondary} text-xs font-medium`}>{label}</p>
  </div>
);

export const Home = ({ players, battles, teams, isDark, setIsDark, t, setCurrentTab, setSelectedBattle, onSelectPlayer, onSearchPokemon }) => {
  const recentBattles = sortBattlesDesc(battles).slice(0, 3);
  const { getPokemonImageUrl } = usePokemon();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative min-h-screen">
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 130% 75% at 0% 0%, rgba(0,255,150,0.06) 0%, rgba(0,255,150,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(239,186,37,0.05) 0%, rgba(239,186,37,0) 100%), #09090b'
            : 'radial-gradient(ellipse 130% 75% at 0% 0%, rgba(0,255,150,0.35) 0%, rgba(0,255,150,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(239,186,37,0.28) 0%, rgba(239,186,37,0) 100%), #EFF6F9',
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
              className={`absolute rounded-full border ${isDark ? 'border-white/5' : 'border-black/[0.06]'}`}
              style={{ width: vw, height: vw, top: `calc(${vw} / -2)`, left: `calc(${vw} / -2)` }}
            />
          );
        })}
      </div>

      {/* ── En-tête ── */}
      <div
        className={`sticky top-0 z-10 px-5 pb-3 transition-all duration-200 ${
          scrolled
            ? `${t.surfaceBlur} border-b ${t.divider}`
            : 'bg-transparent border-b border-transparent'
        }`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2.5rem)' }}
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`text-3xl font-black tracking-tight ${t.text}`}>PokéScores</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSearchPokemon}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                scrolled
                  ? `${t.surfaceMuted} ${t.text}`
                  : (isDark ? 'bg-white/15 text-white' : 'bg-white text-gray-900')
              }`}
              aria-label="Rechercher un Pokémon"
            >
              <Search size={18} />
            </button>
            <button
              onClick={() => setIsDark(!isDark)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                scrolled
                  ? `${t.surfaceMuted} ${t.text}`
                  : (isDark ? 'bg-white/15 text-white' : 'bg-white text-gray-900')
              }`}
              aria-label={isDark ? 'Mode clair' : 'Mode sombre'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-[1] px-5 mt-5 pb-32 space-y-7">
        {/* ── Statistiques ── */}
        <section>
          <div className="grid grid-cols-3 gap-3">
            <StatTile Icon={Users} value={players.length} label="Joueurs" tile={t.iconTileEmerald} t={t} />
            <StatTile Icon={Shield} value={teams.length} label="Équipes" tile={t.iconTileIndigo} t={t} />
            <StatTile Icon={Zap} value={battles.length} label="Combats" tile={t.iconTileAmber} t={t} />
          </div>
        </section>

        {/* ── Combats récents ── */}
        <section>
          <div className="flex justify-between items-baseline mb-3 px-1">
            <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary}`}>
              Combats récents
            </h2>
            {battles.length > 3 && (
              <button
                onClick={() => setCurrentTab('battles')}
                className={`${t.accent} text-sm font-semibold flex items-center gap-0.5`}
              >
                Tout voir <ChevronRight size={14} />
              </button>
            )}
          </div>

          {recentBattles.length === 0 ? (
            <div className={`${t.surface} rounded-2xl p-8 text-center`}>
              <div className={`w-12 h-12 mx-auto rounded-2xl ${t.iconTileAmber} flex items-center justify-center mb-3`}>
                <Zap size={22} />
              </div>
              <p className={`${t.text} font-semibold mb-1`}>Aucun combat</p>
              <p className={`${t.textSecondary} text-sm`}>Enregistre ton premier combat depuis l'onglet Combats.</p>
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
                    className={`w-full ${t.surface} rounded-2xl px-4 py-3 flex items-center gap-3 text-left`}
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

        {/* ── Bilan rapide (optionnel) ── */}
        {players.length > 0 && battles.length > 0 && (
          <section>
            <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} mb-3 px-1`}>
              Top joueur
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
                    Pas encore de victoires enregistrées
                  </div>
                );
              }
              return (
                <button
                  onClick={() => onSelectPlayer?.(top)}
                  className={`w-full ${t.surface} rounded-2xl p-4 flex items-center gap-3 text-left`}
                >
                  <PlayerAvatar player={top} size={48} textSize="text-lg" className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`font-black ${t.text} truncate`}>{top.name}</p>
                    <p className={`${t.textSecondary} text-sm`}>
                      {top.stats?.wins || 0} victoire{(top.stats?.wins || 0) > 1 ? 's' : ''} sur {top.total} combat{top.total > 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronRight size={18} className={t.textTertiary} />
                </button>
              );
            })()}
          </section>
        )}
      </div>
    </div>
  );
};
