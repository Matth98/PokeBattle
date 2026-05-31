import React, { useState, useEffect } from 'react';
import { ChevronLeft, Pencil, Shield } from 'lucide-react';
import { usePokemon } from '../hooks/usePokemon';
import { usePokemonTypes, TYPE_FR, TYPE_COLORS, TYPE_HEX } from '../hooks/usePokemonTypes';
import { PokemonDetailModal } from './PokemonDetailModal';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';

export const TeamDetail = ({
  team,
  t,
  isDark,
  onBack,
  onEdit,
  backLabel = 'Équipes',
  onViewingPokemonChange = null,
}) => {
  const tr = useTranslation();
  const { dbUser, isSuperAdmin } = useAuth();
  const canEdit = isSuperAdmin ||
    (dbUser?._id && team?.userId && String(team.userId) === String(dbUser._id));

  const { getPokemonImageUrl } = usePokemon();
  const rosterPokeIds = (team?.pokemon || []).map((p) => p.pokeId);
  const pokemonTypes = usePokemonTypes(rosterPokeIds);
  const [viewingPokemon, setViewingPokemon] = useState(null);
  useEffect(() => {
    onViewingPokemonChange?.(viewingPokemon !== null);
  }, [viewingPokemon, onViewingPokemonChange]);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!team) return null;

  const thumbSlots = (team.pokemon || []).slice(0, 4);

  return (
    <>
    <div className="min-h-screen">
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10"
        data-scroll-gradient
        style={{
          background: isDark
            ? 'radial-gradient(130% 75% at 0% 0%, rgba(72,0,255,0.06) 0%, rgba(72,0,255,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(125,252,116,0.05) 0%, rgba(125,252,116,0) 100%), #09090b'
            : 'radial-gradient(130% 100% at 0% 0%, rgba(72,0,255,0.35) 0%, rgba(72,0,255,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(125,252,116,0.28) 0%, rgba(125,252,116,0) 100%), #EFF6F9',
        }}
      />
      {/* ── En-tête sticky ── */}
      <div
        className="sticky top-0 z-10 px-4 relative"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)', paddingBottom: '0.75rem' }}
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
        <div className="flex items-center justify-between relative">
          <button
            onClick={onBack}
            className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'}`}
            style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
            aria-label={tr('common.back')}
          >
            <ChevronLeft size={24} className="-translate-x-px" />
          </button>
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(team)}
              className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'}`}
              style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
              aria-label={tr('common.edit')}
            >
              <Pencil size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="px-5 mt-1 pb-40 space-y-6">
        {/* ── Hero ── */}
        <div className="flex flex-col items-center text-center">
          {/* Grosse miniature 2x2 */}
          <div className={`w-28 h-28 rounded-3xl ${isDark ? 'bg-white/[0.05]' : 'bg-white/30'} p-2 grid grid-cols-2 grid-rows-2 gap-1 mb-4`}>
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
            <span className={`${t.textSecondary} text-sm`}>·</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${team.format === '1v1' ? (isDark ? 'bg-purple-300/10 text-purple-300' : 'bg-purple-600/10 text-purple-600') : (isDark ? 'bg-teal-300/10 text-teal-300' : 'bg-teal-600/10 text-teal-600')}`}>
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
              <p className={`${t.textSecondary} text-sm`}>{tr('teams.noTeamPokemon')}</p>
            </div>
          ) : (
            <div className={`${t.surface} rounded-2xl overflow-hidden shadow-sm`}>
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
