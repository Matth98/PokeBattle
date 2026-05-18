import React from 'react';
import { Moon, Sun, Users, Shield, Zap, Calendar, ChevronRight, Trophy } from 'lucide-react';
import { formatDate } from '../utils/dates';

const StatTile = ({ Icon, value, label, tile, t }) => (
  <div className={`${t.surface} rounded-2xl p-4 flex flex-col gap-2`}>
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tile}`}>
      <Icon size={18} strokeWidth={2} />
    </div>
    <p className={`text-2xl font-black ${t.text} leading-none`}>{value}</p>
    <p className={`${t.textSecondary} text-xs font-medium`}>{label}</p>
  </div>
);

export const Home = ({ players, battles, teams, isDark, setIsDark, t, setCurrentTab, setSelectedBattle }) => {
  const recentBattles = [...battles]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5);

  return (
    <div className={`min-h-screen ${t.pageBg}`}>
      {/* ── En-tête ── */}
      <div
        className={`${t.surfaceBlur} sticky top-0 z-10 px-5 pt-12 pb-3 border-b ${t.divider}`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2.5rem)' }}
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`text-3xl font-black tracking-tight ${t.text}`}>PokéScores</h1>
            <p className={`${t.textSecondary} text-sm mt-0.5`}>Tes combats, tes équipes, tes stats.</p>
          </div>
          <button
            onClick={() => setIsDark(!isDark)}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${t.surfaceMuted} ${t.text}`}
            aria-label={isDark ? 'Mode clair' : 'Mode sombre'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      <div className="px-5 mt-5 pb-32 space-y-7">
        {/* ── Statistiques ── */}
        <section>
          <div className="grid grid-cols-3 gap-3">
            <StatTile Icon={Users} value={players.length} label="Joueurs" tile={t.iconTileBlue} t={t} />
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
            {battles.length > 5 && (
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
            <div className={`${t.surface} rounded-2xl overflow-hidden`}>
              {recentBattles.map((b, idx) => {
                const p1 = players.find(p => p._id === b.player1);
                const p2 = players.find(p => p._id === b.player2);
                const p1Elim = (b.team1 || []).filter(p => p.eliminated).length;
                const p2Elim = (b.team2 || []).filter(p => p.eliminated).length;
                const isLast = idx === recentBattles.length - 1;
                return (
                  <button
                    key={b._id}
                    onClick={() => {
                      setSelectedBattle(b);
                      setCurrentTab('battleDetail');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 ${
                      !isLast ? `border-b ${t.divider}` : ''
                    } active:bg-black/5 dark:active:bg-white/5`}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${t.iconTileAmber} flex items-center justify-center`}>
                      <Zap size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`flex-1 min-w-0 truncate text-left font-semibold text-sm ${b.winner === 'player1' ? t.accent : t.text}`}>
                          {p1?.name || '—'}
                        </p>
                        <p className={`font-black text-base ${t.text} whitespace-nowrap px-1`}>
                          {p2Elim}–{p1Elim}
                        </p>
                        <p className={`flex-1 min-w-0 truncate text-right font-semibold text-sm ${b.winner === 'player2' ? t.accent : t.text}`}>
                          {p2?.name || '—'}
                        </p>
                      </div>
                      <div className={`flex items-center gap-1.5 mt-0.5 ${t.textTertiary} text-xs`}>
                        <Calendar size={11} />
                        <span>{formatDate(b.date)}</span>
                        <span className="text-[10px]">•</span>
                        <span className="font-medium">{b.format}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className={t.textTertiary} />
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
                <div className={`${t.surface} rounded-2xl p-4 flex items-center gap-3`}>
                  <div className={`w-12 h-12 rounded-2xl ${t.iconTileAmber} flex items-center justify-center`}>
                    <Trophy size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-black ${t.text} truncate`}>{top.name}</p>
                    <p className={`${t.textSecondary} text-sm`}>
                      {top.stats?.wins || 0} victoire{(top.stats?.wins || 0) > 1 ? 's' : ''} sur {top.total} combat{top.total > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              );
            })()}
          </section>
        )}
      </div>
    </div>
  );
};
