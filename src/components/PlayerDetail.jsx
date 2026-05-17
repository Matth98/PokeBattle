import React, { useState } from 'react';
import { usePokemon } from '../hooks/usePokemon';
import { PokemonPicker } from './PokemonPicker';

export const PlayerDetail = ({
  player,
  t,
  onBack,
  onUpdate,
  isDark
}) => {
  const [addingPokemon, setAddingPokemon] = useState(false);
  const { getPokemonImageUrl } = usePokemon();
  const [deletingPokemon, setDeletingPokemon] = useState(null);

  const handleAddPokemon = async (pokemon) => {
    const updated = {
      ...player,
      pokemon: [...(player.pokemon || []), {
        id: Date.now().toString(),
        pokeId: pokemon.pokeId,
        name: pokemon.name,
        level: 50
      }]
    };
    await onUpdate(player._id, updated);
    setAddingPokemon(false);
  };

  const handleDeletePokemon = async (pokemonId) => {
    const updated = {
      ...player,
      pokemon: player.pokemon.filter(p => p.id !== pokemonId)
    };
    await onUpdate(player._id, updated);
    setDeletingPokemon(null);
  };

  if (!player) return null;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${t.bg}`}>
      <div className={`${t.headerBg} pt-8 pb-6 px-6 border-b ${t.headerBorder}`}>
        <button onClick={onBack} className="text-orange-500 mb-4 font-bold">
          ← Retour
        </button>
        <h1 className={`text-2xl font-black ${t.text}`}>{player.name}</h1>
        <p className={`${t.textSecondary}`}>🏆 {player.stats?.wins || 0}V - {player.stats?.losses || 0}D</p>
      </div>

      <div className="px-6 mt-6 pb-32">
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-lg font-black ${t.text}`}>Pokémon ({player.pokemon?.length || 0})</h2>
          <button
            onClick={() => setAddingPokemon(true)}
            className="bg-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm"
          >
            + Ajouter
          </button>
        </div>

        {!player.pokemon || player.pokemon.length === 0 ? (
          <div className={`${t.bgPrimary} rounded-2xl p-6 border ${t.border} text-center ${t.textSecondary}`}>
            Aucun Pokémon
          </div>
        ) : (
          <div className="space-y-3">
            {player.pokemon.map(p => (
              <div key={p.id} className={`${t.bgPrimary} rounded-2xl p-4 border ${t.border} flex justify-between items-center`}>
                <div className="flex items-center gap-3">
                  <img src={getPokemonImageUrl(p.pokeId)} alt={p.name} className="w-12 h-12 object-contain" />
                  <div>
                    <p className={`font-black ${t.text}`}>{p.name}</p>
                    <p className={`${t.textSecondary} text-sm`}>Niveau {p.level}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDeletingPokemon(p.id)}
                  className="text-red-500 hover:text-red-600 font-bold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Ajouter Pokémon */}
      {addingPokemon && (
        <PokemonPicker
          t={t}
          isDark={isDark}
          title="Ajouter un Pokémon"
          alreadyPickedIds={(player.pokemon || []).map(p => p.pokeId)}
          onSelect={handleAddPokemon}
          onClose={() => setAddingPokemon(false)}
        />
      )}

      {/* Modal Confirmation suppression */}
      {deletingPokemon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
          <div className={`${t.bgPrimary} rounded-2xl p-6 max-w-sm mx-4 border ${t.border}`}>
            <p className={`font-black ${t.text} mb-4`}>Supprimer ce Pokémon ?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingPokemon(null)}
                className={`flex-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} ${t.text} py-2 rounded-lg font-bold`}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeletePokemon(deletingPokemon)}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
