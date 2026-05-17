import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { usePokemon } from '../hooks/usePokemon';
import { PokemonPicker } from './PokemonPicker';

const emptyTeamData = () => ({ name: '', owner: null, format: '2v2', pokemon: [] });

export const Teams = ({
  teams,
  players,
  t,
  isDark,
  onSelectTeam,
  onAddTeam,
  onUpdateTeam,
  onDeleteTeam,
  onDeleteMultiple,
  selectionMode,
  setSelectionMode,
  selectedItems,
  setSelectedItems,
  showForm,
  setShowForm,
  editingTeam,
  clearEditingTeam,
}) => {
  const [newTeamData, setNewTeamData] = useState(emptyTeamData());
  const [teamFormErrors, setTeamFormErrors] = useState({ name: false, owner: false, pokemon: false });
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [pickingPokemon, setPickingPokemon] = useState(false);
  const { getPokemonImageUrl } = usePokemon();

  const isEditing = Boolean(editingTeam && showForm);

  // Pré-remplit le formulaire en mode édition
  useEffect(() => {
    if (isEditing) {
      setNewTeamData({
        name: editingTeam.name || '',
        owner: editingTeam.ownerId || null,
        format: editingTeam.format || '2v2',
        pokemon: (editingTeam.pokemon || []).map((p) => ({
          ...p,
          id: p.id || `${p.pokeId}-${Math.random().toString(36).slice(2, 7)}`,
        })),
      });
    }
  }, [isEditing, editingTeam]);

  const resetForm = () => {
    setNewTeamData(emptyTeamData());
    setTeamFormErrors({ name: false, owner: false, pokemon: false });
    setPickingPokemon(false);
    if (clearEditingTeam) clearEditingTeam();
  };

  // Nombre requis de Pokémon selon le format
  // 1v1 = 3 Pokémon (1 actif, 2 en réserve)
  // 2v2 = 4 Pokémon (2 actifs, 2 en réserve)
  const minPokemonForFormat = (format) => (format === '1v1' ? 3 : 4);

  const handleSelectPokemon = (pokemon) => {
    setNewTeamData((prev) => ({
      ...prev,
      pokemon: [
        ...prev.pokemon,
        {
          id: `${Date.now()}-${pokemon.pokeId}`,
          pokeId: pokemon.pokeId,
          name: pokemon.name,
        },
      ],
    }));
    setPickingPokemon(false);
  };

  const handleRemovePokemonFromForm = (id) => {
    setNewTeamData((prev) => ({
      ...prev,
      pokemon: prev.pokemon.filter((p) => p.id !== id),
    }));
  };

  const handleSaveTeam = async () => {
    const minPokemon = minPokemonForFormat(newTeamData.format);
    const errors = {
      name: !newTeamData.name.trim(),
      owner: !newTeamData.owner,
      pokemon: !newTeamData.pokemon || newTeamData.pokemon.length < minPokemon
    };
    setTeamFormErrors(errors);
    if (errors.name || errors.owner || errors.pokemon) return;

    const owner = players.find(p => p._id === newTeamData.owner);
    const payload = {
      ...newTeamData,
      ownerId: newTeamData.owner,
      owner: owner?.name,
    };
    if (isEditing) {
      await onUpdateTeam(editingTeam._id, payload);
    } else {
      await onAddTeam(payload);
    }
    resetForm();
    setShowForm(false);
  };

  const handleDeleteMultiple = async () => {
    await onDeleteMultiple(selectedItems);
    setSelectionMode(null);
    setSelectedItems([]);
    setDeletingSelected(false);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${t.bg}`}>
      <div className={`${t.headerBg} pt-8 pb-6 px-6 border-b ${t.headerBorder}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className={`text-2xl font-black ${t.text}`}>🛡️ Équipes</h1>
          <div className="flex gap-2">
            {selectionMode === 'teams' ? (
              <>
                <button
                  onClick={() => {
                    setSelectionMode(null);
                    setSelectedItems([]);
                  }}
                  className={`border-2 ${isDark ? 'border-gray-600' : 'border-gray-300'} px-3 py-1 rounded-full font-bold text-sm`}
                >
                  Annuler
                </button>
                <button
                  onClick={() => setSelectedItems(teams.map(t => t._id))}
                  className="bg-blue-500 text-white px-3 py-1 rounded-full font-bold text-sm"
                >
                  Tout sélectionner
                </button>
                <button
                  onClick={() => setDeletingSelected(true)}
                  disabled={selectedItems.length === 0}
                  className={`bg-red-500 text-white px-3 py-1 rounded-full font-bold text-sm ${selectedItems.length === 0 ? 'opacity-50' : ''}`}
                >
                  🗑️ Supprimer
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    if (clearEditingTeam) clearEditingTeam();
                    setNewTeamData(emptyTeamData());
                    setShowForm(true);
                  }}
                  className="bg-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm"
                >
                  + Nouveau
                </button>
                <button
                  onClick={() => setSelectionMode('teams')}
                  className="bg-gray-500 text-white px-4 py-2 rounded-full font-bold text-sm"
                >
                  ✓ Sélectionner
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 mt-6 pb-32 space-y-3">
        {teams.length === 0 ? (
          <div className="h-screen flex items-center justify-center -mt-20">
            <div className="text-center">
              <p className="text-6xl mb-4">🛡️</p>
              <h2 className={`text-2xl font-black ${t.text} mb-2`}>Aucune équipe</h2>
              <p className={`${t.textSecondary} mb-6`}>Crée une équipe pour commencer!</p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-orange-500 text-white px-6 py-3 rounded-full font-black"
              >
                + Créer une équipe
              </button>
            </div>
          </div>
        ) : (
          teams.map(team => (
            <div
              key={team._id}
              className={`${t.bgPrimary} rounded-2xl p-4 border ${selectedItems.includes(team._id) ? 'border-orange-500' : t.border} flex items-center gap-4`}
            >
              {selectionMode === 'teams' && (
                <input
                  type="checkbox"
                  checked={selectedItems.includes(team._id)}
                  onChange={() =>
                    setSelectedItems(
                      selectedItems.includes(team._id)
                        ? selectedItems.filter(id => id !== team._id)
                        : [...selectedItems, team._id]
                    )
                  }
                  className="w-5 h-5"
                />
              )}
              <button
                onClick={() => !selectionMode && onSelectTeam(team)}
                disabled={selectionMode === 'teams'}
                className="flex-1 text-left disabled:opacity-50"
              >
                <h3 className={`font-black ${t.text}`}>{team.name}</h3>
                <p className={`${t.textSecondary} text-sm`}>{team.owner} · {team.format}</p>
              </button>
              {selectionMode !== 'teams' && <ChevronRight size={20} className={`flex-shrink-0 ${t.textSecondary}`} />}
            </div>
          ))
        )}
      </div>

      {/* Modal confirmation suppression */}
      {deletingSelected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
          <div className={`${t.bgPrimary} rounded-2xl p-6 max-w-sm mx-4 border ${t.border}`}>
            <p className={`font-black ${t.text} mb-4`}>
              Supprimer {selectedItems.length} équipe{selectedItems.length > 1 ? 's' : ''} ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingSelected(false)}
                className={`flex-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} ${t.text} py-2 rounded-lg font-bold`}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteMultiple}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Créer Équipe */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex flex-col">
          <div className={`${t.bgPrimary} flex-1 overflow-y-auto flex flex-col`}>
            <div className="p-6 flex-1 overflow-y-auto">
              <h2 className={`text-2xl font-black ${t.text} mb-6`}>
                {isEditing ? 'Modifier l\'équipe' : 'Créer une équipe'}
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Nom"
                  value={newTeamData.name}
                  onChange={(e) => setNewTeamData({ ...newTeamData, name: e.target.value })}
                  className={`w-full border ${teamFormErrors.name ? 'border-red-500' : t.input} rounded-xl px-4 py-3`}
                />
                {teamFormErrors.name && <p className="text-red-500 text-sm">Ce champ est requis</p>}

                <select
                  value={newTeamData.owner || ''}
                  onChange={(e) => setNewTeamData({ ...newTeamData, owner: e.target.value })}
                  className={`w-full border ${teamFormErrors.owner ? 'border-red-500' : t.input} rounded-xl px-4 py-3`}
                >
                  <option value="">Sélectionner un propriétaire</option>
                  {players.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
                {teamFormErrors.owner && <p className="text-red-500 text-sm">Ce champ est requis</p>}

                <div className="flex gap-2">
                  <button
                    onClick={() => setNewTeamData({ ...newTeamData, format: '1v1' })}
                    className={`flex-1 py-3 rounded-xl font-black ${newTeamData.format === '1v1' ? 'bg-orange-500 text-white' : `${t.bgPrimary} border ${t.border}`}`}
                  >
                    1v1
                  </button>
                  <button
                    onClick={() => setNewTeamData({ ...newTeamData, format: '2v2' })}
                    className={`flex-1 py-3 rounded-xl font-black ${newTeamData.format === '2v2' ? 'bg-orange-500 text-white' : `${t.bgPrimary} border ${t.border}`}`}
                  >
                    2v2
                  </button>
                </div>

                {/* Sélection des Pokémon */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className={`block font-bold ${t.text}`}>
                      Pokémon ({newTeamData.pokemon.length}/{minPokemonForFormat(newTeamData.format)} min)
                    </label>
                    <button
                      onClick={() => setPickingPokemon(true)}
                      className="bg-orange-500 text-white px-3 py-1 rounded-full font-bold text-sm"
                    >
                      + Ajouter
                    </button>
                  </div>

                  {newTeamData.pokemon.length === 0 ? (
                    <div className={`rounded-xl p-4 border ${teamFormErrors.pokemon ? 'border-red-500' : t.border} text-center ${t.textSecondary} text-sm`}>
                      Aucun Pokémon sélectionné
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {newTeamData.pokemon.map((p) => (
                        <div
                          key={p.id}
                          className={`flex items-center gap-3 p-2 rounded-xl border ${t.border} ${t.bgPrimary}`}
                        >
                          <img
                            src={getPokemonImageUrl(p.pokeId)}
                            alt={p.name}
                            className="w-10 h-10 object-contain flex-shrink-0"
                            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                          />
                          <span className={`flex-1 font-bold ${t.text}`}>{p.name}</span>
                          <button
                            onClick={() => handleRemovePokemonFromForm(p.id)}
                            className="text-red-500 font-bold px-2"
                            aria-label="Retirer"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {teamFormErrors.pokemon && (
                    <p className="text-red-500 text-sm mt-2">
                      Sélectionne au moins {minPokemonForFormat(newTeamData.format)} Pokémon pour le format {newTeamData.format}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className={`border-t ${t.headerBorder} p-6`}>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className={`flex-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} ${t.text} py-3 rounded-xl font-bold`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveTeam}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-black"
                >
                  {isEditing ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sélection d'un Pokémon pour l'équipe */}
      {pickingPokemon && (() => {
        const owner = players.find((p) => p._id === newTeamData.owner);
        const ownerRoster = (owner?.pokemon || []).map((p) => ({ pokeId: p.pokeId, name: p.name }));
        return (
          <PokemonPicker
            t={t}
            isDark={isDark}
            title="Choisir un Pokémon"
            alreadyPickedIds={newTeamData.pokemon.map((p) => p.pokeId)}
            defaultResults={ownerRoster}
            defaultLabel={owner ? `Pokémon de ${owner.name}` : null}
            onSelect={handleSelectPokemon}
            onClose={() => setPickingPokemon(false)}
          />
        );
      })()}
    </div>
  );
};
