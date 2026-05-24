import React, { useState } from 'react';
import { ChevronLeft, Pencil, Shield } from 'lucide-react';
import { usePokemon } from '../hooks/usePokemon';
import { usePokemonTypes, TYPE_FR, TYPE_COLORS, TYPE_HEX } from '../hooks/usePokemonTypes';
import { PokemonDetailModal } from './PokemonDetailModal';
import { useAuth } from '../hooks/useAuth';

export const TeamDetail = ({
  team,
  t,
  isDark,
  onBack,
  onEdit,
  backLabel = 'Équipes',
}) => {
  const { dbUser, isSuperAdmin } = useAuth();
  const canEdit = isSuperAdmin ||
    !team?.userId ||
    (dbUser?._id && team?.userId && String(team.userId) === String(dbUser._id));

  const { getPokemonImageUrl } = usePokemon();
  const rosterPokeIds = (team?.pokemon || []).map((p) => p.pokeId);
  const pokemonTypes = usePokemonTypes(rosterPokeIds);
  const [viewingPokemon, setViewingPokemon] = useState(null);

  if (!team) return null;

  const thumbSlots = (team.pokemon || []).slice(0, 4);

  return (
    <>
    <div
      className="min-h-screen"
      style={{
        background: isDark
          ? 'radial-gradient(ellipse 130% 75% at 0% 0%, rgba(0,255,150,0.06) 0%, rgba(0,255,150,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(239,186,37,0.05) 0%, rgba(239,186,37,0) 100%), #09090b'
          : 'radial-gradient(ellipse 130% 75% at 0% 0%, rgba(0,255,150,0.35) 0%, rgba(0,255,150,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(239,186,37,0.28) 0%, rgba(239,186,37,0) 100%), #EFF6F9',
      }}
    >
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
            <span className="text-base">{backLabel}</span>
          </button>
          {canEdit && onEdit && (
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
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${team.format === '1v1' ? (isDark ? 'bg-pink-500/15 text-pink-300' : 'bg-pink-50 text-pink-600') : `${t.accentSoftBg} ${t.accentSoftText}`}`}>
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
                  <button
                    key={p.id}
                    onClick={() => setViewingPokemon({ pokeId: p.pokeId, name: p.name })}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left ${!isLast ? `border-b ${t.divider}` : ''}`}
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
                          {types.map((tname) => (
                            <span
                              key={tname}
                              className="pl-1 inline-flex items-stretch rounded-full overflow-hidden"
                              style={{ backgroundColor: TYPE_HEX[tname] || '#828282' }}
                            >
                              <img
                                src={`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${tname}.svg`}
                                alt=""
                                className="w-5 h-5 object-contain flex-shrink-0"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                              <span className="self-center pr-2 text-[10px] font-bold text-white uppercase leading-none">
                                {TYPE_FR[tname] || tname}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={`${t.textTertiary} text-xs font-mono`}>#{p.pokeId}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>

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
