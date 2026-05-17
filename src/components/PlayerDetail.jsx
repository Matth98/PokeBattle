import React, { useState } from 'react';
import { usePokemon } from '../hooks/usePokemon';
import { PokemonPicker } from './PokemonPicker';
import { SwipeableRow } from './SwipeableRow';

export const PlayerDetail = ({
  player,
  teams = [],
  t,
  onBack,
  onUpdate,
  onUpdateTeam,
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

  // Pokémon en cours de suppression (objet complet, pas juste l'id)
  const deletingPokemonObj = deletingPokemon
    ? player.pokemon.find((p) => p.id === deletingPokemon)
    : null;

  // Équipes du joueur qui contiennent ce Pokémon (matching par pokeId)
  const teamsContainingDeleted = deletingPokemonObj
    ? teams.filter(
        (team) =>
          team.ownerId === player._id &&
          (team.pokemon || []).some((p) => p.pokeId === deletingPokemonObj.pokeId)
      )
    : [];

  const handleDeletePokemon = async () => {
    if (!deletingPokemonObj) return;
    const pokeIdToRemove = deletingPokemonObj.pokeId;

    // 1. Retirer le Pokémon des équipes concernées
    if (onUpdateTeam) {
      for (const team of teamsContainingDeleted) {
        await onUpdateTeam(team._id, {
          ...team,
          pokemon: (team.pokemon || []).filter((p) => p.pokeId !== pokeIdToRemove),
        });
      }
    }

    // 2. Retirer le Pokémon du roster du joueur
    await onUpdate(player._id, {
      ...player,
      pokemon: player.pokemon.filter((p) => p.id !== deletingPokemon),
    });

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
              <SwipeableRow
                key={p.id}
                onDelete={() => setDeletingPokemon(p.id)}
                className="rounded-2xl"
              >
                <div className={`${t.bgPrimary} rounded-2xl p-4 border ${t.border} flex justify-between items-center`}>
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
              </SwipeableRow>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center px-4">
          <div className={`${t.bgPrimary} rounded-2xl p-6 max-w-sm w-full border ${t.border}`}>
            <p className={`font-black text-lg ${t.text} mb-2`}>
              Supprimer {deletingPokemonObj?.name} ?
            </p>

            {teamsContainingDeleted.length > 0 && (
              <div className={`mt-3 mb-4 p-3 rounded-lg border border-orange-400 bg-orange-500 bg-opacity-10`}>
                <p className={`text-sm font-bold text-orange-500 mb-1`}>
                  ⚠️ {deletingPokemonObj?.name} est utilisé dans {teamsContainingDeleted.length === 1 ? 'une équipe' : `${teamsContainingDeleted.length} équipes`} :
                </p>
                <ul className={`text-sm ${t.text} list-disc list-inside`}>
                  {teamsContainingDeleted.map((team) => (
                    <li key={team._id}>
                      <span className="font-bold">{team.name}</span>
                      <span className={t.textSecondary}> ({team.format})</span>
                    </li>
                  ))}
                </ul>
                <p className={`text-xs ${t.textSecondary} mt-2`}>
                  Il sera également retiré de {teamsContainingDeleted.length === 1 ? 'cette équipe' : 'ces équipes'}.
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setDeletingPokemon(null)}
                className={`flex-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} ${t.text} py-3 rounded-lg font-bold`}
              >
                Annuler
              </button>
              <button
                onClick={handleDeletePokemon}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg font-bold"
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
