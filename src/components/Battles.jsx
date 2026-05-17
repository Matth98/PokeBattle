import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/dates';
import { usePokemon } from '../hooks/usePokemon';
import { PokemonPicker } from './PokemonPicker';
import { TeamSelectorModal } from './TeamSelectorModal';
import { SwipeableRow } from './SwipeableRow';

const emptyBattle = () => ({
  format: '1v1',
  player1: null,
  player2: null,
  date: new Date().toISOString().split('T')[0],
  notes: '',
  winner: null,
});

// Nombre requis de Pokémon par joueur selon le format
// 1v1 = 3 Pokémon (1 actif, 2 en réserve), 2v2 = 4 Pokémon (2 actifs, 2 en réserve)
const requiredPokemonForFormat = (format) => (format === '1v1' ? 3 : 4);

// Gagnant calculé en fonction des éliminations
// 1 Pokémon éliminé = 1 point pour le joueur adverse
const computeAutoWinner = (team1, team2) => {
  const p1Score = (team2 || []).filter((p) => p.eliminated).length; // points pour player1
  const p2Score = (team1 || []).filter((p) => p.eliminated).length; // points pour player2
  if (p1Score > p2Score) return 'player1';
  if (p2Score > p1Score) return 'player2';
  return null; // égalité, à choisir manuellement
};

export const Battles = ({
  battles,
  players,
  teams = [],
  t,
  isDark,
  onSelectBattle,
  onAddBattle,
  onUpdateBattle,
  onUpdatePlayer,
  onDeleteBattle,
  onDeleteMultiple,
  selectionMode,
  setSelectionMode,
  selectedItems,
  setSelectedItems,
  showForm,
  setShowForm,
  editingBattle,
  clearEditingBattle,
}) => {
  const [newBattleData, setNewBattleData] = useState(emptyBattle());
  const [battleSelectedPokemon, setBattleSelectedPokemon] = useState({ player1: [], player2: [] });
  const [deletingSelected, setDeletingSelected] = useState(false);
  // Quel modal est ouvert et pour quel slot ('player1' | 'player2')
  const [pickerState, setPickerState] = useState({ slot: null, mode: null }); // mode: 'team' | 'pokemon'
  const { getPokemonImageUrl } = usePokemon();

  const isEditing = Boolean(editingBattle && showForm);

  // Pré-remplit le formulaire quand on ouvre en mode édition
  useEffect(() => {
    if (isEditing) {
      setNewBattleData({
        format: editingBattle.format || '1v1',
        player1: editingBattle.player1 || null,
        player2: editingBattle.player2 || null,
        date: editingBattle.date
          ? new Date(editingBattle.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        notes: editingBattle.notes || '',
        winner: editingBattle.winner || null,
      });
      const team1 = (editingBattle.team1 || []).map((p) => ({ ...p, id: p.id || `${p.pokeId}-${Math.random()}` }));
      const team2 = (editingBattle.team2 || []).map((p) => ({ ...p, id: p.id || `${p.pokeId}-${Math.random()}` }));
      setBattleSelectedPokemon({ player1: team1, player2: team2 });
    }
  }, [isEditing, editingBattle]);

  // Score calculé en direct (1 Pokémon éliminé = 1 point pour l'adversaire)
  const p1Score = (battleSelectedPokemon.player2 || []).filter((p) => p.eliminated).length;
  const p2Score = (battleSelectedPokemon.player1 || []).filter((p) => p.eliminated).length;
  const autoWinner = computeAutoWinner(battleSelectedPokemon.player1, battleSelectedPokemon.player2);

  // Mise à jour automatique du gagnant à chaque changement d'élimination.
  // L'utilisateur peut toujours écraser manuellement via le sélecteur — son choix
  // tient jusqu'à la prochaine modification d'une case "éliminé".
  useEffect(() => {
    if (autoWinner) {
      setNewBattleData((prev) =>
        prev.winner === autoWinner ? prev : { ...prev, winner: autoWinner }
      );
    }
  }, [autoWinner]);

  const resetForm = () => {
    setNewBattleData(emptyBattle());
    setBattleSelectedPokemon({ player1: [], player2: [] });
    setPickerState({ slot: null, mode: null });
    if (clearEditingBattle) clearEditingBattle();
  };

  // Toggle l'état "éliminé" d'un Pokémon
  const handleToggleEliminated = (slot, id) => {
    setBattleSelectedPokemon((prev) => ({
      ...prev,
      [slot]: prev[slot].map((p) =>
        p.id === id ? { ...p, eliminated: !p.eliminated } : p
      ),
    }));
  };

  // Déplace un Pokémon vers le haut ou le bas
  const handleMovePokemon = (slot, index, direction) => {
    setBattleSelectedPokemon((prev) => {
      const list = [...prev[slot]];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return prev;
      [list[index], list[targetIdx]] = [list[targetIdx], list[index]];
      return { ...prev, [slot]: list };
    });
  };

  // Changement manuel du gagnant — écrase la valeur auto, tient jusqu'à la
  // prochaine modification d'une case "éliminé".
  const handleWinnerChange = (value) => {
    setNewBattleData((prev) => ({ ...prev, winner: value || null }));
  };

  const closePicker = () => setPickerState({ slot: null, mode: null });

  // Quand l'utilisateur change un joueur, on reset ses Pokémon sélectionnés
  const handleChangePlayer = (slot, playerId) => {
    setNewBattleData({ ...newBattleData, [slot]: playerId });
    setBattleSelectedPokemon((prev) => ({ ...prev, [slot]: [] }));
  };

  // Sélection d'une équipe complète → remplace les Pokémon du slot
  const handleSelectTeam = (team) => {
    const slot = pickerState.slot;
    setBattleSelectedPokemon((prev) => ({
      ...prev,
      [slot]: (team.pokemon || []).map((p) => ({
        id: `${Date.now()}-${p.pokeId}`,
        pokeId: p.pokeId,
        name: p.name,
        eliminated: false,
      })),
    }));
    closePicker();
  };

  // Ajout d'un Pokémon individuel au slot
  const handleAddPokemonToSlot = (pokemon) => {
    const slot = pickerState.slot;
    setBattleSelectedPokemon((prev) => ({
      ...prev,
      [slot]: [
        ...prev[slot],
        {
          id: `${Date.now()}-${pokemon.pokeId}`,
          pokeId: pokemon.pokeId,
          name: pokemon.name,
          eliminated: false,
        },
      ],
    }));
    closePicker();
  };

  const handleRemovePokemonFromSlot = (slot, id) => {
    setBattleSelectedPokemon((prev) => ({
      ...prev,
      [slot]: prev[slot].filter((p) => p.id !== id),
    }));
  };

  // Pokémon du roster du joueur (pour l'affichage par défaut dans PokemonPicker)
  const getPlayerRoster = (playerId) => {
    const player = players.find((p) => p._id === playerId);
    if (!player || !player.pokemon) return [];
    return player.pokemon.map((p) => ({ pokeId: p.pokeId, name: p.name }));
  };

  const required = requiredPokemonForFormat(newBattleData.format);

  const handleSaveBattle = async () => {
    if (!newBattleData.player1 || !newBattleData.player2) {
      alert('Sélectionne les deux joueurs');
      return;
    }
    if (battleSelectedPokemon.player1.length !== required || battleSelectedPokemon.player2.length !== required) {
      alert(`Chaque joueur doit avoir exactement ${required} Pokémon pour le format ${newBattleData.format}`);
      return;
    }
    if (!newBattleData.winner) {
      alert('Le gagnant n\'a pas pu être déterminé. Coche les Pokémon éliminés ou choisis le gagnant manuellement.');
      return;
    }
    const payload = {
      ...newBattleData,
      team1: battleSelectedPokemon.player1,
      team2: battleSelectedPokemon.player2,
    };
    if (isEditing) {
      await onUpdateBattle(editingBattle._id, payload);
    } else {
      await onAddBattle(payload);
    }
    // Ajoute automatiquement au roster les Pokémon qui n'y sont pas déjà
    await syncBattlePokemonToRosters(payload);
    resetForm();
    setShowForm(false);
  };

  // Synchronise les Pokémon du combat avec le roster des joueurs
  // — tout Pokémon présent dans team1/team2 mais absent du roster est ajouté.
  const syncBattlePokemonToRosters = async (payload) => {
    if (!onUpdatePlayer) return;
    for (const slot of ['player1', 'player2']) {
      const playerId = payload[slot];
      const teamKey = slot === 'player1' ? 'team1' : 'team2';
      const battlePokemon = payload[teamKey] || [];
      const player = players.find((p) => p._id === playerId);
      if (!player) continue;
      const existingIds = new Set((player.pokemon || []).map((p) => p.pokeId));
      const toAdd = battlePokemon
        .filter((p) => !existingIds.has(p.pokeId))
        .map((p) => ({
          id: `${Date.now()}-${p.pokeId}-${Math.random().toString(36).slice(2, 7)}`,
          pokeId: p.pokeId,
          name: p.name,
          level: 50,
        }));
      if (toAdd.length === 0) continue;
      await onUpdatePlayer(playerId, {
        ...player,
        pokemon: [...(player.pokemon || []), ...toAdd],
      });
    }
  };

  const handleDeleteMultiple = async () => {
    await onDeleteMultiple(selectedItems);
    setSelectionMode(null);
    setSelectedItems([]);
    setDeletingSelected(false);
  };

  const sortedBattles = [...battles].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className={`min-h-screen bg-gradient-to-br ${t.bg}`}>
      <div className={`${t.headerBg} pt-8 pb-6 px-6 border-b ${t.headerBorder}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className={`text-2xl font-black ${t.text}`}>⚡ Combats</h1>
          <div className="flex gap-2">
            {selectionMode === 'battles' ? (
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
                  onClick={() => setSelectedItems(battles.map(b => b._id))}
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
                    if (clearEditingBattle) clearEditingBattle();
                    setNewBattleData(emptyBattle());
                    setBattleSelectedPokemon({ player1: [], player2: [] });
                    setShowForm(true);
                  }}
                  className="bg-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm"
                >
                  + Nouveau
                </button>
                <button
                  onClick={() => setSelectionMode('battles')}
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
        {battles.length === 0 ? (
          <div className="h-screen flex items-center justify-center -mt-20">
            <div className="text-center">
              <p className="text-6xl mb-4">⚡</p>
              <h2 className={`text-2xl font-black ${t.text} mb-2`}>Aucun combat</h2>
              <p className={`${t.textSecondary} mb-6`}>Enregistre ton premier combat!</p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-orange-500 text-white px-6 py-3 rounded-full font-black"
              >
                + Enregistrer un combat
              </button>
            </div>
          </div>
        ) : (
          sortedBattles.map(b => {
            const p1 = players.find(p => p._id === b.player1);
            const p2 = players.find(p => p._id === b.player2);
            const p1Elim = (b.team1 || []).filter(p => p.eliminated).length;
            const p2Elim = (b.team2 || []).filter(p => p.eliminated).length;

            return (
              <div
                key={b._id}
                className={`w-full ${t.bgPrimary} rounded-2xl p-6 border ${selectedItems.includes(b._id) ? 'border-orange-500' : t.border} hover:shadow-md transition`}
              >
                {selectionMode === 'battles' && (
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(b._id)}
                    onChange={() =>
                      setSelectedItems(
                        selectedItems.includes(b._id)
                          ? selectedItems.filter(id => id !== b._id)
                          : [...selectedItems, b._id]
                      )
                    }
                    className="mb-3 w-5 h-5"
                  />
                )}
                <button
                  onClick={() => !selectionMode && onSelectBattle(b)}
                  disabled={selectionMode === 'battles'}
                  className="w-full text-left disabled:opacity-50"
                >
                  <div className="text-center mb-4">
                    <span className="inline-block bg-orange-500 bg-opacity-20 text-orange-500 px-3 py-1 rounded-full font-bold text-xs">
                      {b.format}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <p className={`flex-1 min-w-0 truncate text-left font-black text-lg ${b.winner === 'player1' ? 'text-orange-500' : t.text}`}>
                      {p1?.name}
                    </p>
                    <p className="font-black text-3xl text-orange-500 whitespace-nowrap">{p2Elim} - {p1Elim}</p>
                    <p className={`flex-1 min-w-0 truncate text-right font-black text-lg ${b.winner === 'player2' ? 'text-orange-500' : t.text}`}>
                      {p2?.name}
                    </p>
                  </div>
                  <p className={`${t.textSecondary} text-xs flex items-center justify-center gap-2`}>
                    <span>📅</span>
                    <span>{formatDate(b.date)}</span>
                  </p>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Modal confirmation suppression */}
      {deletingSelected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
          <div className={`${t.bgPrimary} rounded-2xl p-6 max-w-sm mx-4 border ${t.border}`}>
            <p className={`font-black ${t.text} mb-4`}>
              Supprimer {selectedItems.length} combat{selectedItems.length > 1 ? 's' : ''} ?
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

      {/* Modal Nouveau combat */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex flex-col">
          <div className={`${t.bgPrimary} flex-1 overflow-y-auto flex flex-col`}>
            <div className="p-6 flex-1 overflow-y-auto">
              <h2 className={`text-2xl font-black ${t.text} mb-6`}>
                {isEditing ? 'Modifier le combat' : 'Nouveau combat'}
              </h2>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewBattleData({ ...newBattleData, format: '1v1' })}
                    className={`flex-1 py-3 rounded-xl font-black ${newBattleData.format === '1v1' ? 'bg-orange-500 text-white' : `${t.bgPrimary} border ${t.border}`}`}
                  >
                    1v1
                  </button>
                  <button
                    onClick={() => setNewBattleData({ ...newBattleData, format: '2v2' })}
                    className={`flex-1 py-3 rounded-xl font-black ${newBattleData.format === '2v2' ? 'bg-orange-500 text-white' : `${t.bgPrimary} border ${t.border}`}`}
                  >
                    2v2
                  </button>
                </div>

                {/* Sections joueurs avec sélection Pokémon */}
                {['player1', 'player2'].map((slot, idx) => {
                  const playerId = newBattleData[slot];
                  const slotPokemon = battleSelectedPokemon[slot] || [];
                  return (
                    <div key={slot} className={`rounded-xl border ${t.border} p-4`}>
                      <label className={`block font-bold text-orange-500 text-sm uppercase mb-2`}>
                        Joueur {idx + 1}
                      </label>
                      <select
                        value={playerId || ''}
                        onChange={(e) => handleChangePlayer(slot, e.target.value)}
                        className={`w-full border ${t.input} rounded-xl px-4 py-3 mb-3`}
                      >
                        <option value="">Sélectionner un joueur</option>
                        {players
                          .filter((p) => {
                            // empêche de choisir 2x le même joueur
                            const otherSlot = slot === 'player1' ? 'player2' : 'player1';
                            return p._id !== newBattleData[otherSlot];
                          })
                          .map((p) => (
                            <option key={p._id} value={p._id}>{p.name}</option>
                          ))}
                      </select>

                      {/* Boutons Équipe / Ajouter (visibles seulement si joueur choisi) */}
                      {playerId && (
                        <>
                          <p className={`text-xs font-bold uppercase ${t.textSecondary} mb-2`}>
                            Pokémon (
                            <span className={slotPokemon.length === required ? 'text-green-500' : 'text-orange-500'}>
                              {slotPokemon.length}/{required}
                            </span>
                            )
                          </p>
                          <div className="flex gap-2 mb-3">
                            <button
                              onClick={() => setPickerState({ slot, mode: 'team' })}
                              className="flex-1 bg-indigo-500 text-white py-2 rounded-xl font-bold text-sm"
                            >
                              🛡️ Équipe
                            </button>
                            <button
                              onClick={() => setPickerState({ slot, mode: 'pokemon' })}
                              className="flex-1 bg-purple-500 text-white py-2 rounded-xl font-bold text-sm"
                            >
                              + Ajouter
                            </button>
                          </div>

                          {slotPokemon.length === 0 ? (
                            <p className={`${t.textSecondary} text-sm text-center py-2`}>
                              Aucun Pokémon sélectionné
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {slotPokemon.map((p, pIdx) => (
                                <SwipeableRow
                                  key={p.id}
                                  onDelete={() => handleRemovePokemonFromSlot(slot, p.id)}
                                  className="rounded-lg"
                                >
                                  <div
                                    className={`${t.bgPrimary} flex items-center gap-2 p-2 rounded-lg border ${
                                      p.eliminated ? 'border-red-400' : t.border
                                    }`}
                                  >
                                    {/* Flèches de réorganisation */}
                                    <div className="flex flex-col">
                                      <button
                                        onClick={() => handleMovePokemon(slot, pIdx, 'up')}
                                        disabled={pIdx === 0}
                                        className={`leading-none text-xs ${t.textSecondary} ${pIdx === 0 ? 'opacity-30' : 'hover:text-orange-500'}`}
                                        aria-label="Monter"
                                      >
                                        ▲
                                      </button>
                                      <button
                                        onClick={() => handleMovePokemon(slot, pIdx, 'down')}
                                        disabled={pIdx === slotPokemon.length - 1}
                                        className={`leading-none text-xs ${t.textSecondary} ${pIdx === slotPokemon.length - 1 ? 'opacity-30' : 'hover:text-orange-500'}`}
                                        aria-label="Descendre"
                                      >
                                        ▼
                                      </button>
                                    </div>
                                    {/* Checkbox d'élimination */}
                                    <input
                                      type="checkbox"
                                      checked={Boolean(p.eliminated)}
                                      onChange={() => handleToggleEliminated(slot, p.id)}
                                      className="w-4 h-4 accent-red-500 flex-shrink-0"
                                      aria-label="Éliminé"
                                      title="Cocher = éliminé (donne 1 point à l'adversaire)"
                                    />
                                    <img
                                      src={getPokemonImageUrl(p.pokeId)}
                                      alt={p.name}
                                      className={`w-8 h-8 object-contain flex-shrink-0 ${p.eliminated ? 'grayscale opacity-60' : ''}`}
                                      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                                    />
                                    <span className={`flex-1 font-bold text-sm ${p.eliminated ? `${t.textSecondary} line-through` : t.text}`}>
                                      {p.name}
                                    </span>
                                    <button
                                      onClick={() => handleRemovePokemonFromSlot(slot, p.id)}
                                      className="text-red-500 font-bold px-2"
                                      aria-label="Retirer"
                                    >
                                      ×
                                    </button>
                                  </div>
                                </SwipeableRow>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Score live + sélection du gagnant */}
                {(newBattleData.player1 || newBattleData.player2) && (
                  <div className={`rounded-xl border ${t.border} p-4 space-y-3`}>
                    <p className={`text-xs font-bold uppercase ${t.textSecondary}`}>Score</p>
                    <div className="flex items-center gap-3">
                      <p className={`flex-1 min-w-0 truncate text-left font-black text-base ${newBattleData.winner === 'player1' ? 'text-orange-500' : t.text}`}>
                        {players.find((p) => p._id === newBattleData.player1)?.name || 'Joueur 1'}
                      </p>
                      <p className="font-black text-3xl text-orange-500 whitespace-nowrap">
                        {p1Score} - {p2Score}
                      </p>
                      <p className={`flex-1 min-w-0 truncate text-right font-black text-base ${newBattleData.winner === 'player2' ? 'text-orange-500' : t.text}`}>
                        {players.find((p) => p._id === newBattleData.player2)?.name || 'Joueur 2'}
                      </p>
                    </div>

                    <div>
                      <label className={`block text-xs font-bold uppercase ${t.textSecondary} mb-1`}>
                        Gagnant
                      </label>
                      <select
                        value={newBattleData.winner || ''}
                        onChange={(e) => handleWinnerChange(e.target.value)}
                        className={`w-full border ${t.input} rounded-xl px-4 py-3`}
                      >
                        <option value="">À déterminer (égalité)</option>
                        {newBattleData.player1 && (
                          <option value="player1">{players.find((p) => p._id === newBattleData.player1)?.name}</option>
                        )}
                        {newBattleData.player2 && (
                          <option value="player2">{players.find((p) => p._id === newBattleData.player2)?.name}</option>
                        )}
                      </select>
                    </div>
                  </div>
                )}

                <input
                  type="date"
                  value={newBattleData.date}
                  onChange={(e) => setNewBattleData({ ...newBattleData, date: e.target.value })}
                  className={`w-full border ${t.input} rounded-xl px-4 py-3`}
                />

                <textarea
                  placeholder="Notes (optionnel)"
                  value={newBattleData.notes}
                  onChange={(e) => setNewBattleData({ ...newBattleData, notes: e.target.value })}
                  className={`w-full border ${t.input} rounded-xl px-4 py-3`}
                  rows="3"
                />
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
                  onClick={handleSaveBattle}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-black"
                >
                  {isEditing ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal sélection d'équipe */}
      {pickerState.mode === 'team' && pickerState.slot && (
        <TeamSelectorModal
          t={t}
          isDark={isDark}
          teams={teams}
          playerId={newBattleData[pickerState.slot]}
          format={newBattleData.format}
          onSelect={handleSelectTeam}
          onClose={closePicker}
        />
      )}

      {/* Modal recherche/ajout d'un Pokémon */}
      {pickerState.mode === 'pokemon' && pickerState.slot && (
        <PokemonPicker
          t={t}
          isDark={isDark}
          title="Ajouter un Pokémon"
          alreadyPickedIds={(battleSelectedPokemon[pickerState.slot] || []).map((p) => p.pokeId)}
          defaultResults={getPlayerRoster(newBattleData[pickerState.slot])}
          defaultLabel="Pokémon du joueur"
          onSelect={handleAddPokemonToSlot}
          onClose={closePicker}
        />
      )}
    </div>
  );
};
