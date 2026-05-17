import React from 'react';
import { usePokemon } from '../hooks/usePokemon';
import { SwipeableRow } from './SwipeableRow';

export const TeamDetail = ({
  team,
  t,
  isDark,
  onBack,
  onEdit,
  onUpdate,
}) => {
  const { getPokemonImageUrl } = usePokemon();

  if (!team) return null;

  const handleDeletePokemon = (pokemonId) => {
    const updated = {
      ...team,
      pokemon: (team.pokemon || []).filter((p) => p.id !== pokemonId),
    };
    onUpdate(team._id, updated);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${t.bg}`}>
      <div className={`${t.headerBg} pt-8 pb-6 px-6 border-b ${t.headerBorder}`}>
        <div className="flex justify-between items-start mb-4">
          <button onClick={onBack} className="text-orange-500 font-bold">
            ← Retour
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(team)}
              className="bg-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm"
            >
              ✏️ Modifier
            </button>
          )}
        </div>
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
            {team.pokemon.map((p) => (
              <SwipeableRow
                key={p.id}
                onDelete={() => handleDeletePokemon(p.id)}
                className="rounded-2xl"
              >
                <div className={`${t.bgPrimary} rounded-2xl p-4 border ${t.border} flex items-center gap-3`}>
                  <img
                    src={getPokemonImageUrl(p.pokeId)}
                    alt={p.name}
                    className="w-12 h-12 object-contain"
                    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                  />
                  <div>
                    <p className={`font-black ${t.text}`}>{p.name}</p>
                  </div>
                </div>
              </SwipeableRow>
            ))}
          </div>
        )}
        <p className={`${t.textSecondary} text-xs text-center mt-4`}>
          Glissez un Pokémon vers la gauche pour le supprimer
        </p>
      </div>
    </div>
  );
};
