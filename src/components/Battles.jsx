import React, { useState, useEffect, useLayoutEffect, useCallback, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Check, CheckSquare, Zap, Calendar, ChevronUp, ChevronDown, Shield, GripVertical, Loader2, Trophy, Dices } from 'lucide-react';
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
import { AlertModal } from './AlertModal';

function PokeBallIcon({ id }) {
  const clipId = `pb-${id}`;
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g clipPath={`url(#${clipId})`}>
        <path d="M5.99994 1.19995C3.55794 1.19995 1.54194 3.03595 1.24194 5.39995H3.68994C3.95394 4.36795 4.88994 3.59995 5.99994 3.59995C7.10994 3.59995 8.04594 4.36795 8.31594 5.39995H10.7579C10.4639 3.03595 8.44794 1.19995 5.99994 1.19995Z" fill="black"/>
        <path d="M6 0C2.694 0 0 2.694 0 6C0 9.306 2.694 12 6 12C9.306 12 12 9.306 12 6C12 2.694 9.312 0 6 0ZM6 1.2C8.448 1.2 10.464 3.036 10.758 5.4H8.316C8.046 4.368 7.116 3.6 6 3.6C4.884 3.6 3.954 4.368 3.69 5.4H1.242C1.542 3.036 3.558 1.2 6 1.2Z" fill="black"/>
        <path d="M10.7579 5.39995H8.31594C8.04594 4.36795 7.11594 3.59995 5.99994 3.59995C4.88394 3.59995 3.95394 4.36795 3.68994 5.39995H1.24194C1.54194 3.03595 3.55794 1.19995 5.99994 1.19995C8.44194 1.19995 10.4639 3.03595 10.7579 5.39995Z" fill="#FF1C1C"/>
        <path d="M10.7579 6.59998C10.4639 8.96398 8.44794 10.8 5.99994 10.8C3.55194 10.8 1.54194 8.96398 1.24194 6.59998H3.68994C3.95394 7.63198 4.88994 8.39998 5.99994 8.39998C7.10994 8.39998 8.04594 7.63198 8.31594 6.59998H10.7579Z" fill="white"/>
        <path d="M6.00005 7.20005C6.66279 7.20005 7.20005 6.66279 7.20005 6.00005C7.20005 5.33731 6.66279 4.80005 6.00005 4.80005C5.33731 4.80005 4.80005 5.33731 4.80005 6.00005C4.80005 6.66279 5.33731 7.20005 6.00005 7.20005Z" fill="white"/>
      </g>
      <defs>
        <clipPath id={clipId}><rect width="12" height="12" fill="white"/></clipPath>
      </defs>
    </svg>
  );
}

const emptyBattle = () => {
  const now = new Date();
  return {
    format: '1v1',
    player1: null,
    player2: null,
    date: now.toISOString().split('T')[0],
    time: now.toTimeString().slice(0, 5),
    notes: '',
    winner: null,
  };
};

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
  isBackground = false,
  initialScrollY = 0,
  isActive = true,
  formatFilter = 'all',
  setFormatFilter = () => {},
  collapsedGroups = null,
  setCollapsedGroups = () => {},
  onSelectionModeChange = null,
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
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);
  // Quel modal est ouvert et pour quel slot ('player1' | 'player2')
  const [pickerState, setPickerState] = useState({ slot: null, mode: null }); // mode: 'team' | 'pokemon'
  // Tirage aléatoire
  const [randomizePickerSlot, setRandomizePickerSlot] = useState(null); // slot qui a déclenché la modale dé
  const [isRandomizing, setIsRandomizing] = useState(false);
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
        time: editingBattle.time || '00:00',
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
    setRandomizePickerSlot(null);
    if (clearEditingBattle) clearEditingBattle();
  };

  const [footerMounted, setFooterMounted] = useState(false);
  const { isClosing: isFooterClosing, handleClose: closeFooter } = useAnimatedClose(() => setFooterMounted(false), 280);
  useEffect(() => {
    if (selectionMode === 'battles') setFooterMounted(true);
    else closeFooter();
  }, [selectionMode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onSelectionModeChange?.(selectionMode === 'battles'); }, [selectionMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fermeture animée du formulaire (Cancel ou après sauvegarde)
  const [isFormClosing, setIsFormClosing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
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

  // Ajout d'un ou plusieurs Pokémon au slot
  const handleAddPokemonToSlot = (pokemonOrArray) => {
    const slot = pickerState.slot;
    const toAdd = Array.isArray(pokemonOrArray) ? pokemonOrArray : [pokemonOrArray];
    setBattleSelectedPokemon((prev) => {
      const entries = toAdd.map((p, i) => ({
        id: `${Date.now()}-${i}-${p.pokeId}`,
        pokeId: p.pokeId,
        name: p.name,
        eliminated: false,
      }));
      return { ...prev, [slot]: [...(prev[slot] || []), ...entries] };
    });
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

  // Génère une équipe aléatoire pour un slot :
  // – pioche d'abord dans le roster du joueur (shuffle) ;
  // – complète avec des Pokémon aléatoires (1-1025) si nécessaire.
  const randomizeSlot = async (slot) => {
    const playerId = newBattleData[slot];
    if (!playerId) return;
    const roster = getPlayerRoster(playerId);
    const needed = requiredPokemonForFormat(newBattleData.format);
    let picks = [];

    if (roster.length >= needed) {
      picks = [...roster].sort(() => Math.random() - 0.5).slice(0, needed);
    } else {
      const used = new Set(roster.map((p) => p.pokeId));
      picks = [...roster];
      const toFetch = [];
      while (toFetch.length < needed - roster.length) {
        const id = Math.floor(Math.random() * 1025) + 1;
        if (!used.has(id)) { used.add(id); toFetch.push(id); }
      }
      const fetched = await Promise.all(
        toFetch.map(async (id) => {
          try {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
            const data = await res.json();
            const frName = data.names?.find((n) => n.language.name === 'fr')?.name;
            return { pokeId: id, name: frName || data.name || `Pokémon #${id}` };
          } catch {
            return { pokeId: id, name: `Pokémon #${id}` };
          }
        })
      );
      picks = [...picks, ...fetched];
    }

    setBattleSelectedPokemon((prev) => ({
      ...prev,
      [slot]: picks.map((p) => ({
        id: `${Date.now()}-${p.pokeId}-${Math.random().toString(36).slice(2, 7)}`,
        pokeId: p.pokeId,
        name: p.name,
        eliminated: false,
      })),
    }));
  };

  const handleRandomize = async (target) => {
    setRandomizePickerSlot(null);
    setIsRandomizing(true);
    try {
      const slots = target === 'both'
        ? ['player1', 'player2'].filter((s) => newBattleData[s])
        : [target];
      await Promise.all(slots.map(randomizeSlot));
    } finally {
      setIsRandomizing(false);
    }
  };

  const required = requiredPokemonForFormat(newBattleData.format);

  const handleSaveBattle = async () => {
    if (!newBattleData.player1 || !newBattleData.player2) {
      setAlertMessage({ title: 'Joueurs manquants', message: 'Sélectionne les deux joueurs avant d\'enregistrer le combat.' });
      return;
    }
    if (battleSelectedPokemon.player1.length !== required || battleSelectedPokemon.player2.length !== required) {
      setAlertMessage({ title: 'Équipe incomplète', message: `Chaque joueur doit avoir exactement ${required} Pokémon pour le format ${newBattleData.format}.` });
      return;
    }
    if (!newBattleData.winner) {
      setAlertMessage({ title: 'Gagnant non déterminé', message: 'Coche les Pokémon éliminés ou choisis le gagnant manuellement.' });
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
    setIsDeletingMultiple(true);
    await onDeleteMultiple(selectedItems);
    setIsDeletingMultiple(false);
    setSelectionMode(null);
    setSelectedItems([]);
    setDeletingSelected(false);
  };

  // formatFilter et collapsedGroups sont pilotés depuis App.jsx pour que la couche
  // de fond (swipe-back) reflète toujours l'état courant sans re-render.
  // collapsedGroups peut être null si le parent ne gère pas encore l'état (fallback sessionStorage).
  const [collapsedGroupsFallback, setCollapsedGroupsFallback] = useState(() => {
    try {
      const saved = sessionStorage.getItem('battlesCollapsedGroups');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const activeCollapsedGroups = collapsedGroups ?? collapsedGroupsFallback;
  const activeSetCollapsedGroups = collapsedGroups !== null ? setCollapsedGroups : setCollapsedGroupsFallback;

  const uid = useId();

  const sortedBattles = sortBattlesDesc(battles);
  const filteredBattles = formatFilter === 'all' ? sortedBattles : sortedBattles.filter(b => b.format === formatFilter);
  const groupedBattles = groupBattlesByDate(filteredBattles);

  const toggleGroup = (date) => {
    activeSetCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      // Écriture sessionStorage seulement dans le fallback (App.jsx gère lui-même quand il pilote l'état)
      if (collapsedGroups === null) {
        try { sessionStorage.setItem('battlesCollapsedGroups', JSON.stringify([...next])); } catch {}
      }
      return next;
    });
  };
  const inSelection = selectionMode === 'battles';
  const [scrolled, setScrolled] = useState(() => initialScrollY > 20);
  // isActiveRef mis à jour synchroniquement (useLayoutEffect) avant le paint,
  // pour que le listener window.scroll ne déclenche pas de mise à jour d'état
  // quand le composant est caché (hidden div). Sans ça, scroller dans BattleDetail
  // pollue le state scrolled de Battles → flash de la topbar au retour.
  const isActiveRef = useRef(isActive);
  useLayoutEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => {
    if (isBackground) return;
    const onScroll = () => {
      if (!isActiveRef.current) return;
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isBackground]);

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
        className={`sticky top-0 z-10 px-4 transition-all duration-200 relative ${
          scrolled ? '' : ''
        }`}
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
        <div className="flex justify-between items-center relative">
          <h1 className={`${scrolled ? 'text-xl' : 'text-3xl'} font-black tracking-tight transition-all duration-300 ${t.text}`}>{tr('battles.title')}</h1>
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => { setSelectionMode(null); setSelectedItems([]); }}
              className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} transition-all duration-200 ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'} ${inSelection ? 'relative opacity-100 scale-100' : 'absolute opacity-0 scale-0 pointer-events-none'}`}
              style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
              aria-label="Quitter la sélection"
            >
              <Check size={20} />
            </button>
            {myBattles.length > 0 && (
              <button
                onClick={() => setSelectionMode('battles')}
                className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} transition-all duration-200 ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'} ${inSelection ? 'absolute opacity-0 scale-0 pointer-events-none' : 'relative opacity-100 scale-100'}`}
                style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
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
              className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} ${t.accentBg} text-white ${inSelection ? 'absolute opacity-0 scale-0 pointer-events-none' : 'relative opacity-100 scale-100'}`}
              style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
              data-tour="add-battle"
              aria-label="Nouveau combat"
            >
              <Plus size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Filtres format ── */}
      {battles.length > 0 && (
        <div className="relative z-[1] px-5 mt-4 flex gap-2">
          {[
            { id: 'all', label: 'Tous' },
            { id: '1v1', label: '1v1' },
            { id: '2v2', label: '2v2' },
          ].map(({ id, label }) => {
            const active = formatFilter === id;
            return (
              <button
                key={id}
                onClick={() => setFormatFilter(id)}
                className={`inline-flex items-center ${id === 'all' ? 'gap-1' : 'gap-1.5'} rounded-full text-sm font-bold transition-all ${
                  'px-4 h-9'
                } ${
                  active
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                    : isDark
                      ? 'bg-zinc-800 text-gray-300'
                      : 'bg-white text-gray-600 shadow-sm'
                }`}
              >
                {id === 'all' && <PokeBallIcon id={`${uid}-all`} />}
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="relative z-[1] px-5 mt-4 pb-40">
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
        ) : groupedBattles.length === 0 ? (
          <div className={`${t.surface} rounded-2xl p-10 text-center mt-2 shadow-sm`}>
            <p className={`${t.textSecondary} text-sm`}>Aucun combat pour ce format.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedBattles.map((group) => {
              const isCollapsed = activeCollapsedGroups.has(group.date);
              return (
                <div key={group.date} className={`${t.surface} rounded-2xl overflow-hidden shadow-sm`}>
                  <button
                    onClick={() => toggleGroup(group.date)}
                    className={`no-press-fx w-full flex items-center justify-between gap-2 px-4 py-3 ${t.surfaceMuted} active:opacity-80`}
                  >
                    <span className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${t.textSecondary}`}>
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

                  {!isCollapsed && (() => {
                    const summary = {};
                    for (const b of group.battles) {
                      const p1id = String(b.player1?._id ?? b.player1 ?? '');
                      const p2id = String(b.player2?._id ?? b.player2 ?? '');
                      if (p1id) summary[p1id] ??= { wins: 0, losses: 0 };
                      if (p2id) summary[p2id] ??= { wins: 0, losses: 0 };
                      if (b.winner === 'player1') { if (p1id) summary[p1id].wins++; if (p2id) summary[p2id].losses++; }
                      else if (b.winner === 'player2') { if (p2id) summary[p2id].wins++; if (p1id) summary[p1id].losses++; }
                    }
                    const summaryRows = Object.entries(summary)
                      .map(([id, s]) => ({ ...s, player: players.find(p => String(p._id) === id) }))
                      .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
                    return summaryRows.length > 0 && (
                      <div className={`px-4 py-2.5 flex flex-wrap gap-x-5 gap-y-1.5 border-b ${t.divider}`}>
                        {summaryRows.map(({ wins, losses, player }, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <PlayerAvatar player={player} size={20} textSize="text-[9px]" />
                            <span className={`text-xs font-bold ${t.text}`}>{player?.name || '—'}</span>
                            <span className={`text-[11px] font-semibold ${t.success}`}>{wins}V</span>
                            <span className={`text-[11px] ${t.textTertiary}`}>·</span>
                            <span className={`text-[11px] font-semibold ${isDark ? 'text-red-400' : 'text-red-500'}`}>{losses}D</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

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
                          <span
                            className={`rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 overflow-hidden ${isSelected ? `${t.accentBg} border-transparent` : `${t.textTertiary} border-current`} ${inSelection && canSelectBattle(b) ? 'w-6 h-6 opacity-100 scale-100' : 'w-0 h-0 border-0 opacity-0 scale-75 -mr-3'}`}
                          >
                            {isSelected && <Check size={14} className="text-white" />}
                          </span>

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
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${b.format === '1v1' ? (isDark ? 'bg-purple-300/10 text-purple-300' : 'bg-purple-600/10 text-purple-600') : (isDark ? 'bg-teal-300/10 text-teal-300' : 'bg-teal-600/10 text-teal-600')}`}>
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
        return createPortal(
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
                  disabled={isDeletingSingle}
                  className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text} disabled:opacity-50`}
                >
                  {tr('common.cancel')}
                </button>
                <button
                  onClick={async () => {
                    setIsDeletingSingle(true);
                    await onDeleteBattle(confirmingDeleteId);
                    setIsDeletingSingle(false);
                    setConfirmingDeleteId(null);
                  }}
                  disabled={isDeletingSingle}
                  className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {isDeletingSingle ? <Loader2 size={16} className="animate-spin" /> : tr('common.delete')}
                </button>
              </div>
            </div>
          </div>
        , document.body);
      })()}

      {/* ── Modale confirmation suppression multiple ── */}
      {deletingSelected && createPortal(
        <div className={`fixed inset-0 ${t.overlay} ${isDeletingSelectedClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isDeletingSelectedClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
            <p className={`font-black text-lg ${t.text} mb-1`}>
              {tr('battles.deleteMultipleTitle', selectedItems.length)}
            </p>
            <p className={`${t.textSecondary} text-sm mb-5`}>{tr('common.irreversible')}</p>
            <div className="flex gap-2">
              <button
                onClick={cancelDeletingSelected}
                disabled={isDeletingMultiple}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text} disabled:opacity-50`}
              >
                {tr('common.cancel')}
              </button>
              <button
                onClick={handleDeleteMultiple}
                disabled={isDeletingMultiple}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {isDeletingMultiple ? <Loader2 size={16} className="animate-spin" /> : tr('common.delete')}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Formulaire Nouveau / Modifier combat (full-screen sheet iOS) ── */}
      {showForm && createPortal(
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
                <label className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
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
                    <label className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} ml-1 block`}>
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

                        <div className="flex gap-2">
                          <button
                            onClick={() => setPickerState({ slot, mode: 'team' })}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm ${t.accentSoftBg} ${t.accentSoftText}`}
                          >
                            <Shield size={15} />
                            Équipe
                          </button>
                          <button
                            onClick={() => setPickerState({ slot, mode: 'pokemon' })}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm ${t.accentBg} text-white`}
                          >
                            <Plus size={15} />
                            Ajouter
                          </button>
                          <button
                            onClick={() => setRandomizePickerSlot(slot)}
                            disabled={isRandomizing}
                            aria-label="Tirage aléatoire"
                            className={`w-10 py-2.5 rounded-xl flex items-center justify-center disabled:opacity-40 ${isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-500/15 text-violet-600'}`}
                          >
                            {isRandomizing
                              ? <Loader2 size={17} className="animate-spin" />
                              : <Dices size={17} />}
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
                                    <div className="flex items-center">
                                      {/* Poignée de drag & drop — isolée du toggle */}
                                      <span
                                        {...dragHandleProps}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`${t.textTertiary} active:${t.text} flex-shrink-0 px-2 py-2.5 select-none`}
                                        aria-label="Réorganiser"
                                        title="Glisse pour réordonner"
                                      >
                                        <GripVertical size={18} />
                                      </span>
                                      {/* Ligne cliquable pour cocher/décocher */}
                                      <button
                                        onClick={() => handleToggleEliminated(slot, p.id)}
                                        className="flex-1 flex items-center gap-3 pr-4 py-2.5 text-left active:bg-black/5 dark:active:bg-white/5 transition touch-manipulation"
                                        aria-label={p.eliminated ? 'Marquer non éliminé' : 'Marquer éliminé'}
                                      >
                                        {/* Pastille d'élimination */}
                                        <span
                                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                                            p.eliminated
                                              ? 'bg-red-500 border-transparent'
                                              : `${t.textTertiary} border-current`
                                          }`}
                                        >
                                          {p.eliminated && <Check size={12} className="text-white" />}
                                        </span>
                                        <img
                                          src={getPokemonImageUrl(p.pokeId)}
                                          alt={p.name}
                                          className={`w-10 h-10 object-contain flex-shrink-0 ${p.eliminated ? 'grayscale opacity-50' : ''}`}
                                          onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                                        />
                                        <span className={`flex-1 font-semibold text-sm truncate ${p.eliminated ? `${t.textTertiary} line-through` : t.text}`}>
                                          {p.name}
                                        </span>
                                      </button>
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
                  <label className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
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
                <label className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                  Date
                </label>
                <div className="flex gap-2">
                  <div className={`${t.inputSoft} rounded-xl px-3 py-2 flex items-center gap-2 flex-1`}>
                    <Calendar size={16} className={t.textTertiary} />
                    <input
                      type="date"
                      value={newBattleData.date}
                      onChange={(e) => setNewBattleData({ ...newBattleData, date: e.target.value })}
                      className={`flex-1 bg-transparent outline-none ${t.text}`}
                    />
                  </div>
                  <input type="hidden" value={newBattleData.time} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
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
      , document.body)}

      {/* Modal sélection d'équipe */}
      {pickerState.mode === 'team' && pickerState.slot && createPortal(
        <TeamSelectorModal
          t={t}
          isDark={isDark}
          teams={teams}
          playerId={newBattleData[pickerState.slot]}
          format={newBattleData.format}
          onSelect={handleSelectTeam}
          onClose={closePicker}
        />
      , document.body)}

      {/* Modal recherche/ajout d'un Pokémon */}
      {pickerState.mode === 'pokemon' && pickerState.slot && createPortal(
        <PokemonPicker
          t={t}
          isDark={isDark}
          title="Ajouter un Pokémon"
          alreadyPickedIds={(battleSelectedPokemon[pickerState.slot] || []).map((p) => p.pokeId)}
          defaultResults={getPlayerRoster(newBattleData[pickerState.slot])}
          defaultLabel={`Pokémon de ${players.find((p) => p._id === newBattleData[pickerState.slot])?.name || 'joueur'}`}
          onSelect={handleAddPokemonToSlot}
          onClose={closePicker}
          multiSelect
        />
      , document.body)}

      {/* Modale tirage aléatoire */}
      {randomizePickerSlot && createPortal(
        <div className={`fixed inset-0 ${t.overlay} anim-fade-in z-[10000] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full anim-scale-in`}>
            <div className="flex items-center gap-2 mb-1">
              <Dices size={20} className={t.accent} />
              <p className={`font-black text-lg ${t.text}`}>Tirage aléatoire</p>
            </div>
            <p className={`${t.textSecondary} text-base mb-5`}>
              Génère une équipe aléatoire à partir du roster du joueur.
            </p>
            <div className="flex flex-col gap-2">
              {newBattleData.player1 && newBattleData.player2 && (() => {
                const p1 = players.find((p) => p._id === newBattleData.player1);
                const p2 = players.find((p) => p._id === newBattleData.player2);
                return (
                  <button
                    onClick={() => handleRandomize('both')}
                    className={`w-full py-3 px-4 rounded-xl font-semibold ${t.accentBg} text-white relative flex items-center justify-center`}
                  >
                    <div className="absolute left-4 flex items-center">
                      <PlayerAvatar player={p1} size={22} textSize="text-[9px]" />
                      <div className="-ml-1"><PlayerAvatar player={p2} size={22} textSize="text-[9px]" className="ring-2 ring-indigo-500" /></div>
                    </div>
                    <span>Les 2 joueurs</span>
                  </button>
                );
              })()}
              {(() => {
                const solo = players.find((p) => p._id === newBattleData[randomizePickerSlot]);
                return (
                  <button
                    onClick={() => handleRandomize(randomizePickerSlot)}
                    className={`w-full py-3 px-4 rounded-xl font-semibold ${t.accentSoftBg} ${t.accentSoftText} relative flex items-center justify-center`}
                  >
                    {solo && <div className="absolute left-4"><PlayerAvatar player={solo} size={22} textSize="text-[9px]" /></div>}
                    <span>Seulement {solo?.name || 'ce joueur'}</span>
                  </button>
                );
              })()}
              <button
                onClick={() => setRandomizePickerSlot(null)}
                className={`w-full py-3 rounded-xl font-semibold ${t.textSecondary}`}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Footer sélection multiple (portal animé) ── */}
      {footerMounted && createPortal(
        <div
          className={`fixed bottom-0 left-0 right-0 z-30 pointer-events-none ${isFooterClosing ? 'anim-slide-down' : 'anim-slide-up'}`}
          style={{
            paddingTop: '48px',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="absolute inset-0" style={{
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            maskImage: 'linear-gradient(to top, black 0%, transparent 85%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 85%)',
          }} />
          <div className="absolute inset-0" style={{
            background: isDark
              ? 'linear-gradient(to top, rgba(9,9,11,0.7) 0%, transparent 80%)'
              : 'linear-gradient(to top, rgba(255,255,255,0.7) 0%, transparent 80%)',
          }} />
          <div className="pointer-events-auto grid grid-cols-2 items-center px-4 gap-2 relative" style={{ height: '76px' }}>
            {(() => {
              const visibleBattles = groupedBattles
                .filter((group) => !activeCollapsedGroups.has(group.date))
                .flatMap((group) => group.battles);
              const allIds = visibleBattles.filter((b) => canDeleteBattle(b)).map((b) => b._id);
              const allSelected = allIds.length > 0 && allIds.every((id) => selectedItems.includes(id));
              return (
                <button
                  onClick={() => setSelectedItems(allSelected
                    ? selectedItems.filter((id) => !allIds.includes(id))
                    : [...new Set([...selectedItems, ...allIds])]
                  )}
                  className={`justify-self-start h-11 px-4 rounded-full backdrop-blur-xl text-sm font-semibold flex items-center justify-center transition-all duration-200 ${isDark ? 'bg-white/10 text-white' : 'bg-white text-gray-900 shadow-[0_4px_24px_rgba(0,0,0,0.12)]'}`}
                  style={isDark ? { borderTop: '1px solid #ffffff36' } : undefined}
                >
                  {allSelected ? 'Tout déselectionner' : 'Tout sélectionner'}
                </button>
              );
            })()}
            <button
              onClick={() => setDeletingSelected(true)}
              className={`justify-self-end h-11 px-4 rounded-full backdrop-blur-xl text-sm font-semibold flex items-center justify-center transition-all duration-200 bg-red-500/90 text-white border border-red-400/60 ${!isDark ? 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]' : ''} ${selectedItems.length === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              style={isDark ? { borderTop: '1px solid #ffffff36' } : undefined}
            >
              {`Supprimer (${selectedItems.length})`}
            </button>
          </div>
        </div>
      , document.body)}
      <AlertModal title={alertMessage?.title} message={alertMessage?.message} onClose={() => setAlertMessage(null)} t={t} />
    </>
  );
};
