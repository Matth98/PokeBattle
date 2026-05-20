import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Check, CheckSquare, Zap, Calendar, ChevronUp, ChevronDown, Shield, GripVertical, Loader2 } from 'lucide-react';
import { formatDate } from '../utils/dates';
import { groupBattlesByDate, sortBattlesDesc } from '../utils/battles';
import { usePokemon } from '../hooks/usePokemon';
import { useAnimatedClose } from '../hooks/useAnimatedClose';
import { PokemonPicker } from './PokemonPicker';
import { TeamSelectorModal } from './TeamSelectorModal';
import { SwipeableRow } from './SwipeableRow';
import { DraggableList } from './DraggableList';

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
  renderPage = true,
}) => {
  const [newBattleData, setNewBattleData] = useState(emptyBattle());
  const [battleSelectedPokemon, setBattleSelectedPokemon] = useState({ player1: [], player2: [] });
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
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

  // Fermeture animée du formulaire (Cancel ou après sauvegarde)
  const [isFormClosing, setIsFormClosing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const closeFormWithAnimation = useCallback(() => {
    setIsFormClosing(true);
    setTimeout(() => {
      setIsFormClosing(false);
      resetForm();
      setShowForm(false);
    }, 240);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fermeture animée des modales de confirmation
  const { isClosing: isConfirmDeleteClosing, handleClose: cancelConfirmDelete } = useAnimatedClose(
    () => setConfirmingDeleteId(null), 180,
  );
  const { isClosing: isDeletingSelectedClosing, handleClose: cancelDeletingSelected } = useAnimatedClose(
    () => setDeletingSelected(false), 180,
  );

  // Toggle l'état "éliminé" d'un Pokémon
  const handleToggleEliminated = (slot, id) => {
    setBattleSelectedPokemon((prev) => ({
      ...prev,
      [slot]: prev[slot].map((p) =>
        p.id === id ? { ...p, eliminated: !p.eliminated } : p
      ),
    }));
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
    return [...player.pokemon]
      .sort((a, b) => a.pokeId - b.pokeId)
      .map((p) => ({ pokeId: p.pokeId, name: p.name }));
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
    setIsSaving(true);
    try {
      if (isEditing) {
        await onUpdateBattle(editingBattle._id, payload);
      } else {
        await onAddBattle(payload);
      }
      // Ajoute automatiquement au roster les Pokémon qui n'y sont pas déjà
      await syncBattlePokemonToRosters(payload);
    } finally {
      setIsSaving(false);
    }
    closeFormWithAnimation();
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

  const sortedBattles = sortBattlesDesc(battles);
  const groupedBattles = groupBattlesByDate(sortedBattles);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  const toggleGroup = (date) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };
  const inSelection = selectionMode === 'battles';

  return (
    <>
      {renderPage && (
        <div className={`min-h-screen ${t.pageBg}`}>
      {/* ── En-tête sticky ── */}
      <div
        className={`${t.surfaceBlur} sticky top-0 z-10 px-5 pt-12 pb-3 border-b ${t.divider}`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2.5rem)' }}
      >
        <div className="flex justify-between items-center">
          <h1 className={`text-3xl font-black tracking-tight ${t.text}`}>Combats</h1>
          <div className="flex items-center gap-2">
            {inSelection ? (
              <>
                <button
                  onClick={() => setSelectedItems(battles.map((b) => b._id))}
                  className={`px-3 h-9 rounded-full ${t.surfaceMuted} ${t.text} text-sm font-semibold`}
                >
                  Tout
                </button>
                <button
                  onClick={() => setDeletingSelected(true)}
                  disabled={selectedItems.length === 0}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${t.dangerBg} text-white ${selectedItems.length === 0 ? 'opacity-40' : ''}`}
                  aria-label="Supprimer la sélection"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => {
                    setSelectionMode(null);
                    setSelectedItems([]);
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${t.surfaceMuted} ${t.text}`}
                  aria-label="Annuler"
                >
                  <X size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setSelectionMode('battles')}
                  disabled={battles.length === 0}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${t.surfaceMuted} ${t.text} ${battles.length === 0 ? 'opacity-40' : ''}`}
                  aria-label="Sélectionner"
                >
                  <CheckSquare size={18} />
                </button>
                <button
                  onClick={() => {
                    if (clearEditingBattle) clearEditingBattle();
                    setNewBattleData(emptyBattle());
                    setBattleSelectedPokemon({ player1: [], player2: [] });
                    setShowForm(true);
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${t.accentBg} text-white`}
                  aria-label="Nouveau combat"
                >
                  <Plus size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 pb-32">
        {battles.length === 0 ? (
          <div className={`${t.surface} rounded-2xl p-10 text-center mt-12`}>
            <div className={`w-14 h-14 mx-auto rounded-2xl ${t.iconTileAmber} flex items-center justify-center mb-4`}>
              <Zap size={26} />
            </div>
            <p className={`${t.text} font-bold text-lg mb-1`}>Aucun combat</p>
            <p className={`${t.textSecondary} text-sm mb-6`}>Enregistre ton premier combat.</p>
            <button
              onClick={() => setShowForm(true)}
              className={`${t.accentBg} text-white px-5 py-2.5 rounded-full font-semibold inline-flex items-center gap-2`}
            >
              <Plus size={16} />
              Enregistrer un combat
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedBattles.map((group) => {
              const isCollapsed = collapsedGroups.has(group.date);
              return (
                <div key={group.date} className={`${t.surface} rounded-2xl overflow-hidden`}>
                  <button
                    onClick={() => toggleGroup(group.date)}
                    className={`no-press-fx w-full flex items-center justify-between gap-2 px-4 py-3 ${t.surfaceMuted} active:opacity-80`}
                  >
                    <span className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${t.textSecondary}`}>
                      <Calendar size={13} />
                      {formatDate(group.date)}
                    </span>
                    <span className={`flex items-center gap-2`}>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${isDark ? `${t.surfaceMuted} ${t.textSecondary}` : 'bg-gray-200 text-gray-600'}`}>{group.battles.length}</span>
                      {isCollapsed
                        ? <ChevronDown size={16} className={t.textSecondary} />
                        : <ChevronUp size={16} className={t.textSecondary} />}
                    </span>
                  </button>

                  {!isCollapsed && group.battles.map((b, idx) => {
                    const p1 = players.find((p) => p._id === b.player1);
                    const p2 = players.find((p) => p._id === b.player2);
                    const p1Elim = (b.team1 || []).filter((p) => p.eliminated).length;
                    const p2Elim = (b.team2 || []).filter((p) => p.eliminated).length;
                    const isSelected = selectedItems.includes(b._id);
                    const isLast = idx === group.battles.length - 1;

                    return (
                      <SwipeableRow
                        key={b._id}
                        onDelete={() => setConfirmingDeleteId(b._id)}
                        disabled={inSelection}
                        surfaceClass={t.surface}
                        className={[
                          !isLast ? `border-b ${t.divider}` : '',
                          isLast ? 'rounded-b-2xl' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <button
                          onClick={() =>
                            inSelection
                              ? setSelectedItems(
                                  isSelected
                                    ? selectedItems.filter((id) => id !== b._id)
                                    : [...selectedItems, b._id]
                                )
                              : onSelectBattle(b)
                          }
                          className={`w-full flex items-center gap-3 px-4 py-3 ${t.surface} text-left`}
                        >
                          {inSelection && (
                            <span
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? `${t.accentBg} border-transparent` : `${t.textTertiary} border-current`}`}
                            >
                              {isSelected && <Check size={14} className="text-white" />}
                            </span>
                          )}

                          {/* Joueur 1 — nom + Pokémon ferré gauche */}
                          <div className="flex-1 min-w-0">
                            <p className={`truncate font-semibold text-sm ${b.winner === 'player1' ? t.accent : t.text}`}>
                              {p1?.name || '—'}
                            </p>
                            {(b.team1 || []).length > 0 && (
                              <div className="flex gap-0.5 mt-1">
                                {b.team1.map((pk, i) => (
                                  <img
                                    key={pk.id || i}
                                    src={getPokemonImageUrl(pk.pokeId)}
                                    alt={pk.name}
                                    className={`w-6 h-6 object-contain flex-shrink-0 ${pk.eliminated ? 'grayscale opacity-50' : ''}`}
                                    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Format + score centré */}
                          <div className="flex-shrink-0 flex flex-col items-center gap-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${t.accentSoftBg} ${t.accentSoftText}`}>
                              {b.format}
                            </span>
                            <p className={`font-black text-xl ${t.text} whitespace-nowrap leading-none`}>
                              {p2Elim}–{p1Elim}
                            </p>
                          </div>

                          {/* Joueur 2 — nom + Pokémon ferré droite */}
                          <div className="flex-1 min-w-0">
                            <p className={`truncate text-right font-semibold text-sm ${b.winner === 'player2' ? t.accent : t.text}`}>
                              {p2?.name || '—'}
                            </p>
                            {(b.team2 || []).length > 0 && (
                              <div className="flex gap-0.5 mt-1 justify-end">
                                {b.team2.map((pk, i) => (
                                  <img
                                    key={pk.id || i}
                                    src={getPokemonImageUrl(pk.pokeId)}
                                    alt={pk.name}
                                    className={`w-6 h-6 object-contain flex-shrink-0 ${pk.eliminated ? 'grayscale opacity-50' : ''}`}
                                    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </button>
                      </SwipeableRow>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  )}

      {/* ── Modale confirmation suppression unitaire (swipe) ── */}
      {confirmingDeleteId && (() => {
        const b = battles.find((x) => x._id === confirmingDeleteId);
        const p1 = b ? players.find((p) => p._id === b.player1) : null;
        const p2 = b ? players.find((p) => p._id === b.player2) : null;
        return (
          <div className={`fixed inset-0 ${t.overlay} ${isConfirmDeleteClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
            <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isConfirmDeleteClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
              <p className={`font-black text-lg ${t.text} mb-1`}>
                Supprimer ce combat ?
              </p>
              {p1 && p2 && (
                <p className={`${t.textSecondary} text-sm mb-1`}>
                  {p1.name} vs {p2.name}
                </p>
              )}
              <p className={`${t.textSecondary} text-sm mb-5`}>Cette action est définitive.</p>
              <div className="flex gap-2">
                <button
                  onClick={cancelConfirmDelete}
                  className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
                >
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    await onDeleteBattle(confirmingDeleteId);
                    setConfirmingDeleteId(null);
                  }}
                  className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white`}
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modale confirmation suppression multiple ── */}
      {deletingSelected && (
        <div className={`fixed inset-0 ${t.overlay} ${isDeletingSelectedClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isDeletingSelectedClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
            <p className={`font-black text-lg ${t.text} mb-1`}>
              Supprimer {selectedItems.length} combat{selectedItems.length > 1 ? 's' : ''} ?
            </p>
            <p className={`${t.textSecondary} text-sm mb-5`}>Cette action est définitive.</p>
            <div className="flex gap-2">
              <button
                onClick={cancelDeletingSelected}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteMultiple}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white`}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Formulaire Nouveau / Modifier combat (full-screen sheet iOS) ── */}
      {showForm && (
        <div className={`fixed inset-0 ${t.overlay} ${isFormClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex flex-col`}>
          <div className={`${t.surfaceModal} flex-1 overflow-hidden flex flex-col mt-12 sm:mt-20 rounded-t-3xl ${isFormClosing ? 'anim-slide-down' : 'anim-slide-up'}`}>
            {/* Barre supérieure */}
            <div className={`${t.surface} px-5 pt-3 pb-3 border-b ${t.divider} flex items-center`}>
              <div className="flex-1">
                <button
                  onClick={closeFormWithAnimation}
                  disabled={isSaving}
                  className={`${t.accent} font-semibold disabled:opacity-40`}
                >
                  Annuler
                </button>
              </div>
              <h2 className={`text-base font-black ${t.text}`}>
                {isEditing ? 'Modifier le combat' : 'Nouveau combat'}
              </h2>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={handleSaveBattle}
                  disabled={isSaving}
                  className={`${t.accent} font-bold flex items-center gap-1 disabled:opacity-60`}
                >
                  {isSaving
                    ? <Loader2 size={16} className="animate-spin" />
                    : (isEditing ? 'Enregistrer' : 'Créer')}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
              {/* Format - Segmented control */}
              <div>
                <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                  Format
                </label>
                <div className={`flex gap-1 p-1 rounded-xl ${t.surfaceMuted}`}>
                  {['1v1', '2v2'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setNewBattleData({ ...newBattleData, format: fmt })}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
                        newBattleData.format === fmt
                          ? isDark
                            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                            : `${t.surface} ${t.text} shadow-sm`
                          : t.textSecondary
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sections joueurs */}
              {['player1', 'player2'].map((slot, idx) => {
                const playerId = newBattleData[slot];
                const slotPokemon = battleSelectedPokemon[slot] || [];
                const otherSlot = slot === 'player1' ? 'player2' : 'player1';
                const selectablePlayers = players.filter((p) => p._id !== newBattleData[otherSlot]);
                return (
                  <div key={slot} className="space-y-2">
                    <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} ml-1 block`}>
                      Joueur {idx + 1}
                    </label>
                    <select
                      value={playerId || ''}
                      onChange={(e) => handleChangePlayer(slot, e.target.value)}
                      className={`w-full ${t.inputSoft} rounded-xl px-4 py-3 outline-none focus:ring-2 ${t.accentRing}`}
                    >
                      <option value="">Sélectionner un joueur</option>
                      {selectablePlayers.map((p) => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>

                    {playerId && (
                      <>
                        <div className="flex items-center justify-between pt-1 px-1">
                          <p className={`text-xs font-semibold ${t.textSecondary}`}>
                            Pokémon (
                            <span className={slotPokemon.length === required ? t.success : t.warning}>
                              {slotPokemon.length}/{required}
                            </span>
                            )
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setPickerState({ slot, mode: 'team' })}
                            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm ${t.accentSoftBg} ${t.accentSoftText}`}
                          >
                            <Shield size={15} />
                            Équipe
                          </button>
                          <button
                            onClick={() => setPickerState({ slot, mode: 'pokemon' })}
                            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm ${t.accentBg} text-white`}
                          >
                            <Plus size={15} />
                            Ajouter
                          </button>
                        </div>

                        {slotPokemon.length === 0 ? (
                          <div className={`${t.surfaceInset} rounded-2xl p-4 text-center ${t.textSecondary} text-sm`}>
                            Aucun Pokémon sélectionné
                          </div>
                        ) : (
                          <div className={`${t.surfaceInset} rounded-2xl overflow-hidden`}>
                            <DraggableList
                              items={slotPokemon}
                              getKey={(p) => p.id}
                              onReorder={(next) =>
                                setBattleSelectedPokemon((prev) => ({ ...prev, [slot]: next }))
                              }
                              renderItem={(p, dragHandleProps, isDragging) => {
                                const pIdx = slotPokemon.findIndex((x) => x.id === p.id);
                                const isLast = pIdx === slotPokemon.length - 1;
                                return (
                                  <SwipeableRow
                                    onDelete={() => handleRemovePokemonFromSlot(slot, p.id)}
                                    surfaceClass={t.surfaceInset}
                                    className={!isLast ? `border-b ${t.divider}` : ''}
                                    disabled={isDragging}
                                  >
                                    <div className="flex items-center gap-2 px-2 py-2">
                                      {/* Poignée de drag & drop */}
                                      <span
                                        {...dragHandleProps}
                                        className={`${t.textTertiary} active:${t.text} flex-shrink-0 px-1 py-1.5 -my-1.5 select-none`}
                                        aria-label="Réorganiser"
                                        title="Glisse pour réordonner"
                                      >
                                        <GripVertical size={18} />
                                      </span>
                                      {/* Checkbox d'élimination — pastille ronde */}
                                      <button
                                        onClick={() => handleToggleEliminated(slot, p.id)}
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                                          p.eliminated
                                            ? 'bg-red-500 border-transparent'
                                            : `${t.textTertiary} border-current`
                                        }`}
                                        aria-label={p.eliminated ? 'Marquer non éliminé' : 'Marquer éliminé'}
                                        title="Cocher = éliminé (donne 1 point à l'adversaire)"
                                      >
                                        {p.eliminated && <Check size={12} className="text-white" />}
                                      </button>
                                      <img
                                        src={getPokemonImageUrl(p.pokeId)}
                                        alt={p.name}
                                        className={`w-9 h-9 object-contain flex-shrink-0 ${p.eliminated ? 'grayscale opacity-50' : ''}`}
                                        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                                      />
                                      <span className={`flex-1 font-semibold text-sm truncate ${p.eliminated ? `${t.textTertiary} line-through` : t.text}`}>
                                        {p.name}
                                      </span>
                                    </div>
                                  </SwipeableRow>
                                );
                              }}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {/* Score live + sélection du gagnant */}
              {(newBattleData.player1 || newBattleData.player2) && (
                <div>
                  <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                    Score
                  </label>
                  <div className={`${t.surfaceInset} rounded-2xl p-4 space-y-3`}>
                    <div className="flex items-center gap-3">
                      <p className={`flex-1 min-w-0 truncate text-left font-black text-base ${newBattleData.winner === 'player1' ? t.accent : t.text}`}>
                        {players.find((p) => p._id === newBattleData.player1)?.name || 'Joueur 1'}
                      </p>
                      <p className={`font-black text-3xl ${t.text} whitespace-nowrap`}>
                        {p1Score}–{p2Score}
                      </p>
                      <p className={`flex-1 min-w-0 truncate text-right font-black text-base ${newBattleData.winner === 'player2' ? t.accent : t.text}`}>
                        {players.find((p) => p._id === newBattleData.player2)?.name || 'Joueur 2'}
                      </p>
                    </div>
                    <div className={`pt-2 border-t ${t.divider}`}>
                      <label className={`block text-xs font-semibold ${t.textSecondary} mb-1`}>
                        Gagnant
                      </label>
                      <select
                        value={newBattleData.winner || ''}
                        onChange={(e) => handleWinnerChange(e.target.value)}
                        className={`w-full ${t.inputSoft} rounded-lg px-3 py-2 outline-none focus:ring-2 ${t.accentRing}`}
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
                </div>
              )}

              {/* Date */}
              <div>
                <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                  Date
                </label>
                <div className={`${t.inputSoft} rounded-xl px-3 py-2 flex items-center gap-2`}>
                  <Calendar size={16} className={t.textTertiary} />
                  <input
                    type="date"
                    value={newBattleData.date}
                    onChange={(e) => setNewBattleData({ ...newBattleData, date: e.target.value })}
                    className={`flex-1 bg-transparent outline-none ${t.text}`}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                  Notes
                </label>
                <textarea
                  placeholder="Ajoute une note (optionnel)"
                  value={newBattleData.notes}
                  onChange={(e) => setNewBattleData({ ...newBattleData, notes: e.target.value })}
                  className={`w-full ${t.inputSoft} rounded-xl px-4 py-3 outline-none focus:ring-2 ${t.accentRing} resize-none`}
                  rows="3"
                />
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
    </>
  );
};
