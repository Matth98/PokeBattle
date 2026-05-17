import React from 'react';
import { usePokemon } from '../hooks/usePokemon';

export const TeamDetail = ({
  team,
  t,
  isDark,
  onBack,
  onUpdate
}) => {
  const { getPokemonImageUrl } = usePokemon();

  if (!team) return null;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${t.bg}`}>
      <div className={`${t.headerBg} pt-8 pb-6 px-6 border-b ${t.headerBorder}`}>
        <button onClick={onBack} className="text-orange-500 mb-4 font-bold">
          ← Retour
        </button>
        <h1 className={`text-2xl font-black ${t.text}`}>{team.name}</h1>
        <p className={`${t.textSecondary}`}>{team.owner} · {team.format}</p>
      </div>

      <div className="px-6 mt-6 pb-32">
        <h2 className={`text-lg font-black ${t.text} mb-4`}>Pokémon ({team.pokemon?.length || 0})</h2>
        {!team.pokemon || team.pokemon.length === 0 ? (
          <div className={`${t.bgPrimary} rounded-2xl p-6 border ${t.border} text-center ${t.textSecondary}`}>
            Aucun Pokémon
          </div>
        ) : (
          <div className="space-y-3">
            {team.pokemon.map(p => (
              <div key={p.id} className={`${t.bgPrimary} rounded-2xl p-4 border ${t.border} flex items-center gap-3`}>
                <img src={getPokemonImageUrl(p.pokeId)} alt={p.name} className="w-12 h-12 object-contain" />
                <div>
                  <p className={`font-black ${t.text}`}>{p.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
