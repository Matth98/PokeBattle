import React from 'react';
import { ChevronLeft, Pencil, Shield } from 'lucide-react';
import { usePokemon } from '../hooks/usePokemon';
import { usePokemonTypes, TYPE_FR, TYPE_COLORS } from '../hooks/usePokemonTypes';

export const TeamDetail = ({
  team,
  t,
  isDark,
  onBack,
  onEdit,
}) => {
  const { getPokemonImageUrl } = usePokemon();
  const rosterPokeIds = (team?.pokemon || []).map((p) => p.pokeId);
  const pokemonTypes = usePokemonTypes(rosterPokeIds);

  if (!team) return null;

  const thumbSlots = (team.pokemon || []).slice(0, 4);

  return (
    <div className={`min-h-screen ${t.pageBg}`}>
      {/* ── En-tête sticky ── */}
      <div
        className={`${t.surfaceBlur} sticky top-0 z-10 px-4 border-b ${t.divider}`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)', paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className={`flex items-center gap-1 -ml-1 ${t.accent} font-semibold`}
            aria-label="Retour"
          >
            <ChevronLeft size={22} />
            <span className="text-base">Équipes</span>
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(team)}
              className={`flex items-center gap-1 ${t.accent} font-semibold`}
            >
              <Pencil size={16} />
              <span className="text-base">Modifier</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-5 mt-6 pb-32 space-y-6">
        {/* ── Hero ── */}
        <div className="flex flex-col items-center text-center">
          {/* Grosse miniature 2x2 */}
          <div className={`w-28 h-28 rounded-3xl ${t.surfaceMuted} p-2 grid grid-cols-2 grid-rows-2 gap-1 mb-4`}>
            {[0, 1, 2, 3].map((i) => {
              const p = thumbSlots[i];
              return (
                <div key={i} className="flex items-center justify-center overflow-hidden">
                  {p ? (
                    <img
                      src={getPokemonImageUrl(p.pokeId)}
                      alt={p.name}
                      className="w-full h-full object-contain"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
          <h1 className={`text-2xl font-black tracking-tight ${t.text}`}>{team.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <p className={`${t.textSecondary} text-sm`}>{team.owner}</p>
            <span className="text-xs opacity-30">•</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${t.accentSoftBg} ${t.accentSoftText}`}>
              {team.format}
            </span>
          </div>
        </div>

        {/* ── Pokémon ── */}
        <section>
          <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} mb-3 px-1`}>
            Pokémon ({team.pokemon?.length || 0})
          </h2>
          {!team.pokemon || team.pokemon.length === 0 ? (
            <div className={`${t.surface} rounded-2xl p-8 text-center`}>
              <div className={`w-12 h-12 mx-auto rounded-2xl ${t.iconTileIndigo} flex items-center justify-center mb-3`}>
                <Shield size={22} />
              </div>
              <p className={`${t.textSecondary} text-sm`}>Aucun Pokémon dans cette équipe</p>
            </div>
          ) : (
            <div className={`${t.surface} rounded-2xl overflow-hidden`}>
              {team.pokemon.map((p, idx) => {
                const isLast = idx === team.pokemon.length - 1;
                const types = pokemonTypes[p.pokeId] || [];
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 px-4 py-3 ${!isLast ? `border-b ${t.divider}` : ''}`}
                  >
                    <img
                      src={getPokemonImageUrl(p.pokeId)}
                      alt={p.name}
                      className="w-11 h-11 object-contain flex-shrink-0"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${t.text} truncate`}>{p.name}</p>
                      {types.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {types.map((tname) => {
                            const colors = TYPE_COLORS[tname] || { bg: 'bg-gray-400', text: 'text-white' };
                            return (
                              <span
                                key={tname}
                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${colors.bg} ${colors.text}`}
                              >
                                {TYPE_FR[tname] || tname}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <span className={`${t.textTertiary} text-xs font-mono`}>#{p.pokeId}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
