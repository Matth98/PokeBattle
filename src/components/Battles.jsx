import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Check, CheckSquare, Zap, Calendar, ChevronUp, ChevronDown, Shield, GripVertical, Loader2, Trophy } from 'lucide-react';
import { formatDate } from '../utils/dates';
import { groupBattlesByDate, sortBattlesDesc } from '../utils/battles';
import { usePokemon } from '../hooks/usePokemon';
import { PlayerAvatar } from './PlayerAvatar';
import { useAnimatedClose } from '../hooks/useAnimatedClose';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { PokemonPicker } from './PokemonPicker';
import { TeamSelectorModal } from './TeamSelectorModal';
import { SwipeableRow } from './SwipeableRow';
import { DraggableList } from './DraggableList';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';

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
  onSyncPokemon,
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
  const tr = useTranslation();
  const { dbUser, isSuperAdmin } = useAuth();
  // Vérifie si l'utilisateur est participant du combat (player1 ou player2).
  // Gère les deux cas : player1/player2 populé {_id, name} ou ID brut (string).
  const isParticipant = (battle) =>
    dbUser?.playerId && (
      String(battle.player1?._id ?? battle.player1) === String(dbUser.playerId) ||
      String(battle.player2?._id ?? battle.player2) === String(dbUser.playerId)
    );
  const canDeleteBattle = (battle) =>
    isSuperAdmin || isParticipant(battle);
  // En mode sélection, seules les batailles supprimables sont sélectionnables.
  const canSelectBattle = (b) => canDeleteBattle(b);
  // Combats sur lesquels l'utilisateur a des droits (suppression / sélection)
  const myBattles = battles.filter((b) => canDeleteBattle(b));

  const [newBattleData, setNewBattleData] = useState(emptyBattle());
  const [battleSelectedPokemon, setBattleSelectedPokemon] = useState({ player1: [], player2: [] });
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  // Quel modal est ouvert et pour quel slot ('player1' | 'player2')
  const [pickerState, setPickerState] = useState({ slot: null, mode: null }); // mode: 'team' | 'pokemon'
  const { getPokemonImageUrl } = usePokemon();

  const isEditing = Boolean(editingBattle && showForm);
  // Prevent background scroll on iOS when the form is open
  useBodyScrollLock(showForm);

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

  // Pour les non-admins en création : pré-remplit player1 avec le joueur lié
  useEffect(() => {
    if (showForm && !isEditing && !isSuperAdmin && dbUser?.playerId) {
      setNewBattleData((prev) => ({ ...prev, player1: dbUser.playerId }));
    }
  }, [showForm, isEditing, isSuperAdmin, dbUser?.playerId]);

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
  const [openPlayerDropdown, setOpenPlayerDropdown] = useState(null);
  const [openWinnerDropdown, setOpenWinnerDropdown] = useState(false);
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
  // Utilise onSyncPokemon (silencieux, sans toast) pour les deux joueurs,
  // y compris les joueurs revendiqués par un autre compte.
  const syncBattlePokemonToRosters = async (payload) => {
    const syncFn = onSyncPokemon || onUpdatePlayer;
    if (!syncFn) return;
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
      await syncFn(playerId, {
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

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {renderPage && (
        <div className="relative min-h-screen">
          <div
            aria-hidden="true"
            className="fixed inset-0 -z-10"
            style={{
              background: isDark
                ? 'radial-gradient(130% 75% at 0% 0%, rgba(255,191,0,0.06) 0%, rgba(255,191,0,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(255,0,229,0.05) 0%, rgba(255,0,229,0) 100%), #09090b'
                : 'radial-gradient(130% 100% at 0% 0%, rgba(255,191,0,0.35) 0%, rgba(255,191,0,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(255,0,229,0.28) 0%, rgba(255,0,229,0) 100%), #EFF6F9',
            }}
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            {[300, 420, 540, 660].map((px) => {
              const vw = `${(px / 390 * 100).toFixed(1)}vw`;
              return (
                <div
                  key={px}
                  className={`absolute rounded-full border ${isDark ? 'border-white/5' : 'border-white/50'}`}
                  style={{ width: vw, height: vw, top: `calc(${vw} / -2)`, left: `calc(${vw} / -2)` }}
                />
              );
            })}
          </div>
      {/* ── En-tête sticky ── */}
      <div
        className={`sticky top-0 z-10 px-5 pb-3 transition-all duration-200 ${
          scrolled
            ? `${t.surfaceBlur} border-b ${t.divider}`
            : 'bg-transparent border-b border-transparent'
        }`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2.5rem)' }}
      >
        <div className="flex justify-between items-center">
          <h1 className={`text-3xl font-black tracking-tight ${t.text}`}>{tr('battles.title')}</h1>
          <div className="flex items-center gap-2">
            {inSelection ? (
              <>
                {myBattles.length > 0 && (
                  <button
                    onClick={() => setSelectedItems(myBattles.map((b) => b._id))}
                    className={`px-5 h-11 rounded-full backdrop-blur-xl ${isDark || scrolled ? '' : 'border border-white/20'} ${!scrolled ? 'shadow-sm' : ''} transition-all duration-200 ${scrolled ? `${t.surfaceMuted} ${t.text}` : (isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900')} text-sm font-semibold`}
                    style={isDark ? { boxShadow: '1px 1px #ffffff36', borderTop: '1px solid #ffffff36' } : undefined}
                  >
                    {tr('common.all')}
                  </button>
                )}
                <button
                  onClick={() => setDeletingSelected(true)}
                  disabled={selectedItems.length === 0}
                  className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark || scrolled ? '' : 'border border-white/20'} ${!scrolled ? 'shadow-sm' : ''} ${t.dangerBg} text-white ${selectedItems.length === 0 ? 'opacity-40' : ''}`}
                  style={isDark ? { boxShadow: '1px 1px #ffffff36', borderTop: '1px solid #ffffff36' } : undefined}
                  aria-label="Supprimer la sélection"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => {
                    setSelectionMode(null);
                    setSelectedItems([]);
                  }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark || scrolled ? '' : 'border border-white/20'} ${!scrolled ? 'shadow-sm' : ''} transition-all duration-200 ${scrolled ? `${t.surfaceMuted} ${t.text}` : (isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900')}`}
                  style={isDark ? { boxShadow: '1px 1px #ffffff36', borderTop: '1px solid #ffffff36' } : undefined}
                  aria-label="Annuler"
                >
                  <X size={20} />
                </button>
              </>
            ) : (
              <>
                {myBattles.length > 0 && (
                  <button
                    onClick={() => setSelectionMode('battles')}
                    className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark || scrolled ? '' : 'border border-white/20'} ${!scrolled ? 'shadow-sm' : ''} transition-all duration-200 ${scrolled ? `${t.surfaceMuted} ${t.text}` : (isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900')}`}
                    style={isDark ? { boxShadow: '1px 1px #ffffff36', borderTop: '1px solid #ffffff36' } : undefined}
                    aria-label="Sélectionner"
                  >
                    <CheckSquare size={20} />
                  </button>
                )}
                <button
                  onClick={() => {
                    if (clearEditingBattle) clearEditingBattle();
                    setNewBattleData(emptyBattle());
                    setBattleSelectedPokemon({ player1: [], player2: [] });
                    setShowForm(true);
                  }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark || scrolled ? '' : 'border border-white/20'} ${!scrolled ? 'shadow-sm' : ''} ${t.accentBg} text-white`}
                  style={isDark ? { boxShadow: '1px 1px #ffffff36', borderTop: '1px solid #ffffff36' } : undefined}
                  aria-label="Nouveau combat"
                >
                  <Plus size={22} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-[1] px-5 mt-5 pb-40">
        {battles.length === 0 ? (
          <div className={`${t.surface} rounded-2xl p-10 text-center mt-12 shadow-sm`}>
            <div className={`w-14 h-14 mx-auto rounded-2xl ${t.iconTileAmber} flex items-center justify-center mb-4`}>
              <Zap size={26} />
            </div>
            <p className={`${t.text} font-bold text-lg mb-1`}>{tr('battles.none')}</p>
            <p className={`${t.textSecondary} text-sm mb-6`}>{tr('battles.noneDesc')}</p>
            <button
              onClick={() => setShowForm(true)}
              className={`${t.accentBg} text-white px-5 py-2.5 rounded-full font-semibold inline-flex items-center gap-2`}
            >
              <Plus size={16} />
              {tr('battles.new')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedBattles.map((group) => {
              const isCollapsed = collapsedGroups.has(group.date);
              return (
                <div key={group.date} className={`${t.surface} rounded-2xl overflow-hidden shadow-sm`}>
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
                        onDelete={canDeleteBattle(b) ? () => setConfirmingDeleteId(b._id) : undefined}
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
                              ? canSelectBattle(b) && setSelectedItems(
                                  isSelected
                                    ? selectedItems.filter((id) => id !== b._id)
                                    : [...selectedItems, b._id]
                                )
                              : onSelectBattle(b)
                          }
                          className={`w-full flex items-center gap-3 px-4 py-3 ${t.surface} text-left`}
                        >
                          {inSelection && canSelectBattle(b) && (
                            <span
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? `${t.accentBg} border-transparent` : `${t.textTertiary} border-current`}`}
                            >
                              {isSelected && <Check size={14} className="text-white" />}
                            </span>
                          )}

                          {/* Joueur 1 — avatar + nom + Pokémon ferré gauche */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="relative flex-shrink-0">
                                <PlayerAvatar player={p1} size={40} textSize="text-sm" />
                                {b.winner === 'player1' && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                                    <Trophy size={8} strokeWidth={2.5} className="text-white" />
                                  </span>
                                )}
                              </div>
                              <p className={`truncate font-semibold text-sm ${b.winner === 'player1' ? t.success : t.text}`}>
                                {p1?.name || '—'}
                              </p>
                            </div>
                            {(b.team1 || []).length > 0 && (
                              <div className="flex gap-0.5">
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
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${b.format === '1v1' ? (isDark ? 'bg-pink-300/10 text-pink-300' : 'bg-pink-600/10 text-pink-600') : (isDark ? 'bg-indigo-300/10 text-indigo-300' : 'bg-indigo-600/10 text-indigo-600')}`}>
                              {b.format}
                            </span>
                            <p className={`font-black text-2xl ${t.text} whitespace-nowrap leading-none`}>
                              {p2Elim}–{p1Elim}
                            </p>
                          </div>

                          {/* Joueur 2 — Pokémon + nom + avatar ferré droite */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-end gap-2 mb-1.5">
                              <p className={`truncate text-right font-semibold text-sm ${b.winner === 'player2' ? t.success : t.text}`}>
                                {p2?.name || '—'}
                              </p>
                              <div className="relative flex-shrink-0">
                                <PlayerAvatar player={p2} size={40} textSize="text-sm" />
                                {b.winner === 'player2' && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                                    <Trophy size={8} strokeWidth={2.5} className="text-white" />
                                  </span>
                                )}
                              </div>
                            </div>
                            {(b.team2 || []).length > 0 && (
                              <div className="flex gap-0.5 justify-end">
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
                {tr('battles.deleteTitle')}
              </p>
              {p1 && p2 && (
                <p className={`${t.textSecondary} text-sm mb-1`}>
                  {p1.name} vs {p2.name}
                </p>
              )}
              <p className={`${t.textSecondary} text-sm mb-5`}>{tr('common.irreversible')}</p>
              <div className="flex gap-2">
                <button
                  onClick={cancelConfirmDelete}
                  className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
                >
                  {tr('common.cancel')}
                </button>
                <button
                  onClick={async () => {
                    await onDeleteBattle(confirmingDeleteId);
                    setConfirmingDeleteId(null);
                  }}
                  className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white`}
                >
                  {tr('common.delete')}
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
              {tr('battles.deleteMultipleTitle', selectedItems.length)}
            </p>
            <p className={`${t.textSecondary} text-sm mb-5`}>{tr('common.irreversible')}</p>
            <div className="flex gap-2">
              <button
                onClick={cancelDeletingSelected}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
              >
                {tr('common.cancel')}
              </button>
              <button
                onClick={handleDeleteMultiple}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white`}
              >
                {tr('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Formulaire Nouveau / Modifier combat (full-screen sheet iOS) ── */}
      {showForm && (
        <div className={`fixed inset-0 ${t.overlay} ${isFormClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex flex-col`}>
          <div className={`${t.surfaceModal} flex-1 overflow-hidden flex flex-col rounded-t-3xl ${isFormClosing ? 'anim-slide-down' : 'anim-slide-up'}`} style={{ marginTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}>
            {/* Barre supérieure */}
            <div className={`${t.surface} px-5 pt-3 pb-3 border-b ${t.divider} flex items-center`}>
              <div className="flex-1">
                <button
                  onClick={closeFormWithAnimation}
                  disabled={isSaving}
                  className={`${t.accent} font-semibold disabled:opacity-40`}
                >
                  {tr('common.cancel')}
                </button>
              </div>
              <h2 className={`text-base font-black ${t.text}`}>
                {isEditing ? tr('battles.editTitle') : tr('battles.newTitle')}
              </h2>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={handleSaveBattle}
                  disabled={isSaving}
                  className={`${t.accent} font-bold flex items-center gap-1 disabled:opacity-60`}
                >
                  {isSaving
                    ? <Loader2 size={16} className="animate-spin" />
                    : (isEditing ? tr('common.save') : tr('common.validate'))}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
              {/* Format - Segmented control */}
              <div>
                <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                  {tr('battles.format')}
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

              {/* Overlays fermeture dropdowns */}
              {openPlayerDropdown && <div className="fixed inset-0 z-40" onClick={() => setOpenPlayerDropdown(null)} />}
              {openWinnerDropdown && <div className="fixed inset-0 z-40" onClick={() => setOpenWinnerDropdown(false)} />}

              {/* Sections joueurs */}
              {['player1', 'player2'].map((slot, idx) => {
                const playerId = newBattleData[slot];
                const slotPokemon = battleSelectedPokemon[slot] || [];
                const otherSlot = slot === 'player1' ? 'player2' : 'player1';
                const selectablePlayers = players.filter((p) => p._id !== newBattleData[otherSlot]);
                // Player1 verrouillé pour les non-admins en mode création
                const isLocked = slot === 'player1' && !isSuperAdmin && !isEditing;
                return (
                  <div key={slot} className="space-y-2">
                    <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} ml-1 block`}>
                      {idx === 0 ? tr('battles.player1') : tr('battles.player2')}
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={isLocked ? undefined : () => setOpenPlayerDropdown(openPlayerDropdown === slot ? null : slot)}
                        disabled={isLocked}
                        className={`w-full ${t.inputSoft} rounded-xl px-4 py-3 flex items-center gap-3 text-left${isLocked ? ' opacity-70 cursor-default' : ''}`}
                      >
                        {playerId ? (
                          <>
                            <PlayerAvatar player={players.find((p) => p._id === playerId)} size={32} textSize="text-xs" className="flex-shrink-0" />
                            <span className={`flex-1 font-medium ${t.text}`}>{players.find((p) => p._id === playerId)?.name}</span>
                          </>
                        ) : (
                          <span className={`flex-1 ${t.textSecondary}`}>{tr('battles.selectPlayer')}</span>
                        )}
                        {!isLocked && <ChevronDown size={16} className={t.textSecondary} />}
                      </button>
                      {!isLocked && openPlayerDropdown === slot && (
                        <div className={`absolute top-full left-0 right-0 mt-1 ${t.surface} rounded-xl shadow-lg z-50 overflow-hidden border ${t.divider}`}>
                          {selectablePlayers.map((p) => (
                            <button
                              key={p._id}
                              type="button"
                              onClick={() => { handleChangePlayer(slot, p._id); setOpenPlayerDropdown(null); }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left ${t.surfaceMuted} hover:opacity-80`}
                            >
                              <PlayerAvatar player={p} size={32} textSize="text-xs" className="flex-shrink-0" />
                              <span className={`font-medium ${t.text}`}>{p.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

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
                    {tr('battles.score')}
                  </label>
                  <div className={`${t.surfaceInset} rounded-2xl p-4 space-y-3`}>
                    <div className="flex items-center gap-3">
                      <p className={`flex-1 min-w-0 truncate text-left font-black text-base ${newBattleData.winner === 'player1' ? t.success : t.text}`}>
                        {players.find((p) => p._id === newBattleData.player1)?.name || tr('battles.player1')}
                      </p>
                      <p className={`font-black text-3xl ${t.text} whitespace-nowrap`}>
                        {p1Score}–{p2Score}
                      </p>
                      <p className={`flex-1 min-w-0 truncate text-right font-black text-base ${newBattleData.winner === 'player2' ? t.success : t.text}`}>
                        {players.find((p) => p._id === newBattleData.player2)?.name || tr('battles.player2')}
                      </p>
                    </div>
                    <div className={`pt-2 border-t ${t.divider}`}>
                      <label className={`block text-xs font-semibold ${t.textSecondary} mb-1`}>
                        {tr('battles.selectWinner')}
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenWinnerDropdown(!openWinnerDropdown)}
                          className={`w-full ${t.inputSoft} rounded-lg px-3 py-2 flex items-center gap-3 text-left`}
                        >
                          {newBattleData.winner ? (
                            <>
                              <PlayerAvatar player={players.find((p) => p._id === newBattleData[newBattleData.winner])} size={28} textSize="text-xs" className="flex-shrink-0" />
                              <span className={`flex-1 font-medium ${t.text}`}>
                                {players.find((p) => p._id === newBattleData[newBattleData.winner])?.name}
                              </span>
                            </>
                          ) : (
                            <span className={`flex-1 ${t.textSecondary}`}>{tr('battles.noWinner')}</span>
                          )}
                          <ChevronDown size={16} className={t.textSecondary} />
                        </button>
                        {openWinnerDropdown && (
                          <div className={`absolute top-full left-0 right-0 mt-1 ${t.surface} rounded-xl shadow-lg z-50 overflow-hidden border ${t.divider}`}>
                            <button
                              type="button"
                              onClick={() => { handleWinnerChange(''); setOpenWinnerDropdown(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left ${t.surfaceMuted} hover:opacity-80`}
                            >
                              <span className={`font-medium ${t.textSecondary}`}>{tr('battles.noWinner')}</span>
                            </button>
                            {newBattleData.player1 && (
                              <button
                                type="button"
                                onClick={() => { handleWinnerChange('player1'); setOpenWinnerDropdown(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left ${t.surfaceMuted} hover:opacity-80`}
                              >
                                <PlayerAvatar player={players.find((p) => p._id === newBattleData.player1)} size={28} textSize="text-xs" className="flex-shrink-0" />
                                <span className={`font-medium ${t.text}`}>{players.find((p) => p._id === newBattleData.player1)?.name}</span>
                              </button>
                            )}
                            {newBattleData.player2 && (
                              <button
                                type="button"
                                onClick={() => { handleWinnerChange('player2'); setOpenWinnerDropdown(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left ${t.surfaceMuted} hover:opacity-80`}
                              >
                                <PlayerAvatar player={players.find((p) => p._id === newBattleData.player2)} size={28} textSize="text-xs" className="flex-shrink-0" />
                                <span className={`font-medium ${t.text}`}>{players.find((p) => p._id === newBattleData.player2)?.name}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
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
          defaultLabel={`Pokémon de ${players.find((p) => p._id === newBattleData[pickerState.slot])?.name || 'joueur'}`}
          onSelect={handleAddPokemonToSlot}
          onClose={closePicker}
        />
      )}
    </>
  );
};
