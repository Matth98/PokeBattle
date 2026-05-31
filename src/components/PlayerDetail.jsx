import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAnimatedClose } from '../hooks/useAnimatedClose';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import {
  AlertTriangle,
  Camera,
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
  Palette,
  Pencil,
  Plus,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  Search,
  Trash2,
  Check,
  CheckSquare,
  X,
  Zap,
} from 'lucide-react';
import { AlertModal } from './AlertModal';
import { usePokemon } from '../hooks/usePokemon';
import { usePokemonTypes, TYPE_FR, TYPE_COLORS, TYPE_HEX } from '../hooks/usePokemonTypes';
import { PokemonPicker } from './PokemonPicker';
import { PokemonDetailModal } from './PokemonDetailModal';
import { SwipeableRow } from './SwipeableRow';
import { PlayerAvatar } from './PlayerAvatar';
import { resizeImageToDataUrl } from '../utils/imageResize';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';

import { TYPE_SUPER_EFFECTIVE } from '../utils/mvp';

export const PlayerDetail = ({
  player,
  teams = [],
  battles = [],
  t,
  onBack,
  backLabel = 'Joueurs',
  onUpdate,
  onAddTeam,
  onUpdateTeam,
  onDeleteTeam,
  onSelectTeam,
  initialActiveTab = 'pokemon',
  isDark,
  onViewingPokemonChange = null,
  onSelectionModeChange = null,
}) => {
  const tr = useTranslation();
  const { dbUser, isSuperAdmin } = useAuth();
  const canEdit = isSuperAdmin ||
    (dbUser?._id && player?.userId && String(player.userId) === String(dbUser._id));

  const [addingPokemon, setAddingPokemon] = useState(false);
  const [viewingPokemon, setViewingPokemon] = useState(null); // { pokeId, name }
  useEffect(() => {
    onViewingPokemonChange?.(viewingPokemon !== null);
  }, [viewingPokemon, onViewingPokemonChange]);
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  useEffect(() => { setPokemonSearch(''); setTeamsSearch(''); exitSelection(); }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps
  const [editingPlayer, setEditingPlayer] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState(null);
  const [isSavingPlayer, setIsSavingPlayer] = useState(false);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [pickingTeamPokemon, setPickingTeamPokemon] = useState(false);
  // Prevent background scroll on iOS when any sheet is open
  useBodyScrollLock(editingPlayer || creatingTeam);
  const [teamFormErrors, setTeamFormErrors] = useState({ name: false, pokemon: false });
  const [newTeamData, setNewTeamData] = useState({ name: '', format: '1v1', pokemon: [] });
  const { getPokemonImageUrl } = usePokemon();
  // PokeIds à récupérer en types : roster du joueur + Pokémon utilisés dans ses combats
  const allPokeIdsForTypes = React.useMemo(() => {
    if (!player) return [];
    const ids = new Set((player.pokemon || []).map((p) => p.pokeId));
    (battles || []).forEach((b) => {
      if (b.player1 !== player._id && b.player2 !== player._id) return;
      [...(b.team1 || []), ...(b.team2 || [])].forEach((p) => { if (p?.pokeId) ids.add(p.pokeId); });
    });
    return [...ids];
  }, [player, battles]);
  const pokemonTypes = usePokemonTypes(allPokeIdsForTypes);
  const [deletingPokemon, setDeletingPokemon] = useState(null);
  const [pokemonSearch, setPokemonSearch] = useState('');
  const pokemonSearchRef = useRef(null);
  const [teamsSearch, setTeamsSearch] = useState('');
  const teamsSearchRef = useRef(null);
  const [selectionMode, setSelectionMode] = useState(null); // 'pokemon' | 'teams'
  const [selectedItems, setSelectedItems] = useState([]);
  const [footerMounted, setFooterMounted] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const { isClosing: isFooterClosing, handleClose: closeFooter } = useAnimatedClose(() => setFooterMounted(false), 280);
  useEffect(() => {
    if (selectionMode) setFooterMounted(true);
    else closeFooter();
  }, [selectionMode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onSelectionModeChange?.(!!selectionMode); }, [selectionMode]); // eslint-disable-line react-hooks/exhaustive-deps
  const [deletingSelectedPokemon, setDeletingSelectedPokemon] = useState(false);
  const [deletingSelectedTeams, setDeletingSelectedTeams] = useState(false);
  const [isDeletingSelectedPokemon, setIsDeletingSelectedPokemon] = useState(false);
  const [isDeletingSelectedTeams, setIsDeletingSelectedTeams] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState(null);
  const { isClosing: isDeletingTeamClosing, handleClose: cancelDeletingTeam } = useAnimatedClose(
    () => setDeletingTeam(null), 180,
  );
  const { isClosing: isDeletingPokemonClosing, handleClose: cancelDeletingPokemon } = useAnimatedClose(
    () => setDeletingPokemon(null), 180,
  );
  const { isClosing: isDeletingSelectedPokemonClosing, handleClose: cancelDeletingSelectedPokemon } = useAnimatedClose(
    () => setDeletingSelectedPokemon(false), 180,
  );
  const { isClosing: isDeletingSelectedTeamsClosing, handleClose: cancelDeletingSelectedTeams } = useAnimatedClose(
    () => setDeletingSelectedTeams(false), 180,
  );
  const [showAllPokemonSheet, setShowAllPokemonSheet] = useState(false);
  const { isClosing: isAllPokemonSheetClosing, handleClose: closeAllPokemonSheet } = useAnimatedClose(() => setShowAllPokemonSheet(false), 280);
  const [showAllTeamsSheet, setShowAllTeamsSheet] = useState(false);
  const { isClosing: isAllTeamsSheetClosing, handleClose: closeAllTeamsSheet } = useAnimatedClose(() => setShowAllTeamsSheet(false), 280);
  useBodyScrollLock(showAllPokemonSheet || showAllTeamsSheet);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fermeture animée "Modifier joueur"
  const [isEditPlayerClosing, setIsEditPlayerClosing] = useState(false);
  const cancelEditPlayer = useCallback(() => {
    setIsEditPlayerClosing(true);
    setTimeout(() => {
      setIsEditPlayerClosing(false);
      setEditingPlayer(false);
    }, 240);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fermeture animée "Nouvelle équipe" (dans PlayerDetail)
  const [isCreateTeamClosing, setIsCreateTeamClosing] = useState(false);
  const cancelCreateTeam = useCallback(() => {
    setIsCreateTeamClosing(true);
    setTimeout(() => {
      setIsCreateTeamClosing(false);
      setCreatingTeam(false);
      resetTeamForm();
    }, 240);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
  const editNameInputRef = useRef(null);
  const newTeamNameInputRef = useRef(null);


  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      await onUpdate(player._id, { ...player, avatar: dataUrl });
    } catch (err) {
      setAlertMessage({ title: 'Image invalide', message: err.message });
    } finally {
      e.target.value = '';
    }
  };

  const openEditPlayer = () => {
    setEditName(player.name || '');
    setEditAvatar(player.avatar || null);
    setEditingPlayer(true);
  };

  const handleEditAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setEditAvatar(dataUrl);
    } catch (err) {
      setAlertMessage({ title: 'Image invalide', message: err.message });
    } finally {
      e.target.value = '';
    }
  };

  const handleSavePlayer = async () => {
    const name = editName.trim();
    if (!name) return;
    setIsSavingPlayer(true);
    try {
      await onUpdate(player._id, { ...player, name, avatar: editAvatar });
    } finally {
      setIsSavingPlayer(false);
    }
    cancelEditPlayer();
  };

  const requiredPokemonForFormat = (format) => (format === '1v1' ? 3 : 4);

  const resetTeamForm = () => {
    setNewTeamData({ name: '', format: '1v1', pokemon: [] });
    setTeamFormErrors({ name: false, pokemon: false });
  };

  const openCreateTeam = () => {
    resetTeamForm();
    setCreatingTeam(true);
  };

  const handleSelectTeamPokemon = (pokemonOrArray) => {
    const toAdd = Array.isArray(pokemonOrArray) ? pokemonOrArray : [pokemonOrArray];
    setNewTeamData((prev) => {
      const entries = toAdd.map((p, i) => ({
        id: `${Date.now()}-${i}-${p.pokeId}`,
        pokeId: p.pokeId,
        name: p.name,
      }));
      return { ...prev, pokemon: [...prev.pokemon, ...entries] };
    });
    setPickingTeamPokemon(false);
  };

  const handleRemoveTeamPokemon = (id) => {
    setNewTeamData((prev) => ({
      ...prev,
      pokemon: prev.pokemon.filter((p) => p.id !== id),
    }));
  };

  const handleSaveTeam = async () => {
    const required = requiredPokemonForFormat(newTeamData.format);
    const errors = { name: !newTeamData.name.trim() };
    setTeamFormErrors(errors);
    if (errors.name || !onAddTeam) return;
    if (newTeamData.pokemon.length !== required) {
      setAlertMessage({ title: 'Format invalide', message: newTeamData.pokemon.length < required
        ? tr('teams.missingPokemon', required - newTeamData.pokemon.length, newTeamData.pokemon.length, required, newTeamData.format)
        : tr('teams.tooManyPokemon', newTeamData.pokemon.length, required, newTeamData.format) });
      return;
    }

    const payload = {
      ...newTeamData,
      name: newTeamData.name.trim(),
      ownerId: player._id,
      owner: player.name,
    };
    const existingIds = new Set((player.pokemon || []).map((p) => p.pokeId));
    const pokemonToAdd = newTeamData.pokemon
      .filter((p) => !existingIds.has(p.pokeId))
      .map((p) => ({
        id: `${Date.now()}-${p.pokeId}-${Math.random().toString(36).slice(2, 7)}`,
        pokeId: p.pokeId,
        name: p.name,
        level: 50,
      }));

    await onAddTeam(payload);
    if (pokemonToAdd.length > 0) {
      await onUpdate(player._id, {
        ...player,
        pokemon: [...(player.pokemon || []), ...pokemonToAdd],
      });
    }
    resetTeamForm();
    setCreatingTeam(false);
    setActiveTab('teams');
  };

  const handleAddPokemon = async (pokemonOrArray) => {
    const toAdd = Array.isArray(pokemonOrArray) ? pokemonOrArray : [pokemonOrArray];
    const existingIds = new Set((player.pokemon || []).map((p) => p.pokeId));
    const newEntries = toAdd
      .filter((p) => !existingIds.has(p.pokeId))
      .map((p, i) => ({ id: `${Date.now()}-${i}-${p.pokeId}`, pokeId: p.pokeId, name: p.name, level: 50 }));
    if (newEntries.length === 0) { setAddingPokemon(false); return; }
    await onUpdate(player._id, { ...player, pokemon: [...(player.pokemon || []), ...newEntries] });
    setAddingPokemon(false);
  };

  const deletingPokemonObj = deletingPokemon
    ? player.pokemon.find((p) => p.id === deletingPokemon)
    : null;

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
    if (onUpdateTeam) {
      for (const team of teamsContainingDeleted) {
        await onUpdateTeam(team._id, {
          ...team,
          pokemon: (team.pokemon || []).filter((p) => p.pokeId !== pokeIdToRemove),
        });
      }
    }
    await onUpdate(player._id, {
      ...player,
      pokemon: player.pokemon.filter((p) => p.id !== deletingPokemon),
    });
    setDeletingPokemon(null);
  };

  const handleDeleteTeam = async () => {
    if (!deletingTeam || !onDeleteTeam) return;
    await onDeleteTeam(deletingTeam);
    setDeletingTeam(null);
  };

  const exitSelection = () => { setSelectionMode(null); setSelectedItems([]); };

  const handleDeleteSelectedPokemon = async () => {
    setIsDeletingSelectedPokemon(true);
    const removedPokeIds = new Set(
      (player.pokemon || []).filter((p) => selectedItems.includes(p.id)).map((p) => p.pokeId)
    );
    if (onUpdateTeam) {
      const affectedTeams = playerTeams.filter((team) =>
        (team.pokemon || []).some((p) => removedPokeIds.has(p.pokeId))
      );
      for (const team of affectedTeams) {
        await onUpdateTeam(team._id, {
          ...team,
          pokemon: (team.pokemon || []).filter((p) => !removedPokeIds.has(p.pokeId)),
        });
      }
    }
    await onUpdate(player._id, {
      ...player,
      pokemon: player.pokemon.filter((p) => !selectedItems.includes(p.id)),
    });
    setIsDeletingSelectedPokemon(false);
    setDeletingSelectedPokemon(false);
    exitSelection();
  };

  const handleDeleteSelectedTeams = async () => {
    if (!onDeleteTeam) return;
    setIsDeletingSelectedTeams(true);
    for (const id of selectedItems) await onDeleteTeam(id);
    setIsDeletingSelectedTeams(false);
    setDeletingSelectedTeams(false);
    exitSelection();
  };

  if (!player) return null;

  const wins = player.stats?.wins || 0;
  const losses = player.stats?.losses || 0;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : null;
  const playerTeams = teams.filter((team) => team.ownerId === player._id);
  const playerBattles = battles.filter((battle) => battle.player1 === player._id || battle.player2 === player._id);

  const countPokemon = (items) =>
    items.reduce((acc, pokemon) => {
      if (!pokemon?.pokeId) return acc;
      const current = acc.get(pokemon.pokeId) || { pokeId: pokemon.pokeId, name: pokemon.name, count: 0 };
      acc.set(pokemon.pokeId, { ...current, name: pokemon.name || current.name, count: current.count + 1 });
      return acc;
    }, new Map());

  const topPokemon = (items) => {
    const ranked = [...countPokemon(items).values()].sort((a, b) => b.count - a.count);
    return ranked[0] || null;
  };

  // MVP principal : Pokémon du joueur ayant remporté le plus souvent le titre de MVP
  const mvpPrincipal = (() => {
    const counts = new Map();
    playerBattles.forEach((battle) => {
      const isP1 = battle.player1 === player._id;
      const myTeam  = (isP1 ? battle.team1 : battle.team2) || [];
      const oppTeam = (isP1 ? battle.team2 : battle.team1) || [];
      const survivors = myTeam.filter((p) => !p.eliminated);
      if (survivors.length === 0) return;
      const calcAdv = (pok) => {
        let score = 0;
        for (const mt of (pokemonTypes[pok.pokeId] || [])) {
          for (const opp of oppTeam) {
            for (const ot of (pokemonTypes[opp.pokeId] || [])) {
              if ((TYPE_SUPER_EFFECTIVE[mt] || []).includes(ot)) score++;
            }
          }
        }
        return score;
      };
      const mvp = survivors.reduce((best, cur) => calcAdv(cur) > calcAdv(best) ? cur : best);
      const key = `${mvp.pokeId}:${mvp.name}`;
      const prev = counts.get(key) || { pokeId: mvp.pokeId, name: mvp.name, count: 0 };
      counts.set(key, { ...prev, count: prev.count + 1 });
    });
    if (counts.size === 0) return null;
    return [...counts.values()].reduce((best, cur) => cur.count > best.count ? cur : best);
  })();

  const playerBattlePokemon = playerBattles.flatMap((battle) =>
    battle.player1 === player._id ? battle.team1 || [] : battle.team2 || []
  );
  const opponentBattlePokemon = playerBattles.flatMap((battle) =>
    battle.player1 === player._id ? battle.team2 || [] : battle.team1 || []
  );
  const mostUsedPokemon = topPokemon(playerBattlePokemon);
  const mostFacedPokemon = topPokemon(opponentBattlePokemon);

  // Pokémon adverse le plus redoutable : présent dans le plus de défaites du joueur
  const mostDangerousOpponent = (() => {
    const counts = new Map();
    playerBattles.forEach((battle) => {
      const isP1 = battle.player1 === player._id;
      const playerWon = (isP1 && battle.winner === 'player1') || (!isP1 && battle.winner === 'player2');
      if (playerWon) return;
      const oppTeam = (isP1 ? battle.team2 : battle.team1) || [];
      oppTeam.forEach((p) => {
        if (!p?.pokeId) return;
        const prev = counts.get(p.pokeId) || { pokeId: p.pokeId, name: p.name, count: 0 };
        counts.set(p.pokeId, { ...prev, name: p.name || prev.name, count: prev.count + 1 });
      });
    });
    if (counts.size === 0) return null;
    return [...counts.values()].reduce((best, cur) => cur.count > best.count ? cur : best);
  })();
  const teamPlayCounts = new Map();
  playerBattles.forEach((battle) => {
    const battlePokeIds = new Set(
      (battle.player1 === player._id ? battle.team1 || [] : battle.team2 || []).map((p) => p.pokeId)
    );
    playerTeams.forEach((team) => {
      const teamPokeIds = new Set((team.pokemon || []).map((p) => p.pokeId));
      if (
        teamPokeIds.size === battlePokeIds.size &&
        [...teamPokeIds].every((id) => battlePokeIds.has(id))
      ) {
        teamPlayCounts.set(team._id, (teamPlayCounts.get(team._id) || 0) + 1);
      }
    });
  });
  const biggestTeam = playerTeams.length
    ? [...playerTeams].sort((a, b) => (teamPlayCounts.get(b._id) || 0) - (teamPlayCounts.get(a._id) || 0))[0]
    : undefined;
  const rosterSize = player.pokemon?.length || 0;
  const filteredPokemon = pokemonSearch
    ? (player.pokemon || []).filter((p) => p.name.toLowerCase().includes(pokemonSearch.toLowerCase()) || String(p.pokeId).includes(pokemonSearch.trim()))
    : (player.pokemon || []);
  const filteredTeams = teamsSearch
    ? playerTeams.filter((team) => {
        const q = teamsSearch.toLowerCase();
        if (team.name.toLowerCase().includes(q)) return true;
        return (team.pokemon || []).some((p) => p.name.toLowerCase().includes(q) || String(p.pokeId).includes(teamsSearch.trim()));
      })
    : playerTeams;
  const teamPokemonCount = playerTeams.reduce((sum, team) => sum + (team.pokemon?.length || 0), 0);
  const uniqueBattlePokemonCount = countPokemon(playerBattlePokemon).size;
  const opponentEliminatedCount = playerBattles.reduce((sum, battle) => {
    const opponentTeam = battle.player1 === player._id ? battle.team2 || [] : battle.team1 || [];
    return sum + opponentTeam.filter((p) => p.eliminated).length;
  }, 0);
  const playerEliminatedCount = playerBattles.reduce((sum, battle) => {
    const playerTeam = battle.player1 === player._id ? battle.team1 || [] : battle.team2 || [];
    return sum + playerTeam.filter((p) => p.eliminated).length;
  }, 0);
  const perfectWins = playerBattles.filter((battle) => {
    const isWinner = (battle.player1 === player._id && battle.winner === 'player1') || (battle.player2 === player._id && battle.winner === 'player2');
    if (!isWinner) return false;
    const playerTeam = battle.player1 === player._id ? battle.team1 || [] : battle.team2 || [];
    return playerTeam.length > 0 && playerTeam.every((p) => !p.eliminated);
  }).length;
  const formatCounts = playerBattles.reduce((acc, battle) => {
    const format = battle.format || 'Format ?';
    acc.set(format, (acc.get(format) || 0) + 1);
    return acc;
  }, new Map());
  const favoriteFormat = [...formatCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  // Type Pokémon le plus utilisé en combat (agrégé sur toutes les apparitions)
  const typeCounts = new Map();
  playerBattlePokemon.forEach((p) => {
    const ts = pokemonTypes[p?.pokeId] || [];
    ts.forEach((typeName) => {
      typeCounts.set(typeName, (typeCounts.get(typeName) || 0) + 1);
    });
  });
  const mostUsedType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const mostUsedTypeName = mostUsedType ? mostUsedType[0] : null;
  const mostUsedTypeColors = mostUsedTypeName ? TYPE_COLORS[mostUsedTypeName] : null;

  const funFacts = [
    {
      Icon: Flame,
      label: 'Plus utilisé',
      value: mostUsedPokemon ? mostUsedPokemon.name : 'Pas encore',
      detail: mostUsedPokemon ? `${mostUsedPokemon.count} combat${mostUsedPokemon.count > 1 ? 's' : ''}` : 'Ajoute un combat pour le révéler',
      tile: t.iconTileEmerald,
      visual: mostUsedPokemon ? { type: 'pokemon', pokemon: mostUsedPokemon } : null,
    },
    {
      Icon: Target,
      label: 'Plus combattu',
      value: mostFacedPokemon ? mostFacedPokemon.name : 'Pas encore',
      detail: mostFacedPokemon ? `${mostFacedPokemon.count} face-à-face` : 'Aucun adversaire enregistré',
      tile: t.iconTileRed,
      visual: mostFacedPokemon ? { type: 'pokemon', pokemon: mostFacedPokemon } : null,
    },
    {
      Icon: Sparkles,
      label: 'Équipe signature',
      value: biggestTeam ? biggestTeam.name : 'Pas encore',
      detail: biggestTeam ? `${biggestTeam.format} · ${biggestTeam.pokemon?.length || 0} Pokémon` : 'Crée une équipe pour compléter la fiche',
      tile: t.iconTilePurple,
      visual: biggestTeam ? { type: 'team', team: biggestTeam } : null,
    },
    {
      Icon: Palette,
      label: 'Type le plus utilisé',
      value: mostUsedType ? TYPE_FR[mostUsedTypeName] || mostUsedTypeName : 'Pas encore',
      detail: mostUsedType
        ? `${mostUsedType[1]} apparition${mostUsedType[1] > 1 ? 's' : ''} en combat`
        : 'Ajoute un combat pour le révéler',
      tile: mostUsedTypeColors
        ? `${mostUsedTypeColors.softBg} ${mostUsedTypeColors.softText}`
        : t.iconTileEmerald,
      visual: mostUsedTypeName ? { type: 'typeIcon', typeName: mostUsedTypeName } : null,
    },
    {
      Icon: Swords,
      label: 'Combats joués',
      value: `${playerBattles.length}`,
      detail: `${wins}V · ${losses}D`,
      tile: t.iconTileBlue,
    },
    {
      Icon: Shield,
      label: 'Équipes créées',
      value: `${playerTeams.length}`,
      detail: `${teamPokemonCount} Pokémon alignés`,
      tile: t.iconTileIndigo,
    },
    {
      Icon: Zap,
      label: 'KO infligés',
      value: `${opponentEliminatedCount}`,
      detail: `${playerEliminatedCount} Pokémon perdus`,
      tile: isDark ? 'bg-pink-500/15 text-pink-300' : 'bg-pink-50 text-pink-600',
    },
    {
      Icon: Trophy,
      label: 'Victoires parfaites',
      value: `${perfectWins}`,
      detail: 'Sans Pokémon éliminé',
      tile: t.iconTileEmerald,
    },
    {
      Icon: Target,
      label: 'Pokémon joués',
      value: `${uniqueBattlePokemonCount}`,
      detail: 'Espèces vues en combat',
      tile: isDark ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-50 text-cyan-700',
    },
    {
      Icon: SlidersHorizontal,
      label: 'Format favori',
      value: favoriteFormat ? favoriteFormat[0] : 'Pas encore',
      detail: favoriteFormat ? `${favoriteFormat[1]} combat${favoriteFormat[1] > 1 ? 's' : ''}` : 'Aucun combat enregistré',
      tile: isDark ? 'bg-fuchsia-500/15 text-fuchsia-300' : 'bg-fuchsia-50 text-fuchsia-700',
    },
  ];
  const tabs = [
    { id: 'pokemon', label: 'Pokémon' },
    { id: 'teams', label: tr('teams.title') },
    { id: 'facts', label: 'Fun facts' },
  ];

  return (
    <div className="min-h-screen">
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10"
        data-scroll-gradient
        style={{
          background: isDark
            ? 'radial-gradient(130% 75% at 0% 0%, rgba(0,203,255,0.06) 0%, rgba(0,203,255,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(199,255,231,0.05) 0%, rgba(199,255,231,0) 100%), #09090b'
            : 'radial-gradient(130% 100% at 0% 0%, rgba(0,203,255,0.35) 0%, rgba(0,203,255,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(199,255,231,0.28) 0%, rgba(199,255,231,0) 100%), #EFF6F9',
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
            className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'} transition-all duration-200 ${selectionMode ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
            style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
            aria-label="Retour"
          >
            <ChevronLeft size={24} className="-translate-x-px" />
          </button>
          <div className="relative flex items-center gap-2">
            {canEdit && (activeTab === 'pokemon' || activeTab === 'teams') && (
              <button
                onClick={() => setSelectionMode(activeTab)}
                disabled={(activeTab === 'pokemon' ? (player.pokemon?.length || 0) : playerTeams.length) === 0}
                className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} transition-all duration-200 ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'} disabled:opacity-40 ${selectionMode ? 'absolute opacity-0 scale-0 pointer-events-none' : 'relative opacity-100 scale-100'}`}
                style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
                aria-label="Sélectionner"
              >
                <CheckSquare size={20} />
              </button>
            )}
            {canEdit && (
              <button
                onClick={openEditPlayer}
                className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} transition-all duration-200 ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'} ${selectionMode ? 'absolute opacity-0 scale-0 pointer-events-none' : 'relative opacity-100 scale-100'}`}
                style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
                aria-label="Modifier"
              >
                <Pencil size={20} />
              </button>
            )}
            {canEdit && (activeTab === 'pokemon' || activeTab === 'teams') && (
              <button
                onClick={exitSelection}
                className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} transition-all duration-200 ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'} ${selectionMode ? 'relative opacity-100 scale-100' : 'absolute opacity-0 scale-0 pointer-events-none'}`}
                style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
                aria-label="Terminer la sélection"
              >
                <Check size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 mt-1 pb-40 space-y-6">
        {/* ── Hero ── */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-3">
            <PlayerAvatar player={player} size={96} textSize="text-4xl" />
          </div>
          <h1 className={`text-2xl font-black tracking-tight ${t.text}`}>{player.name}</h1>
          <p className={`${t.textSecondary} text-sm mt-1`}>
            {total} combat{total > 1 ? 's' : ''}
            {winRate !== null && ` · ${winRate}% de victoires`}
          </p>
        </div>

        {/* ── Tuiles stats ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`${t.surface} rounded-2xl p-4 flex flex-col gap-1.5`}>
            <div className={`w-8 h-8 rounded-lg ${t.iconTileEmerald} flex items-center justify-center`}>
              <Trophy size={16} />
            </div>
            <p className={`text-2xl font-black ${t.text} leading-none`}>{wins}</p>
            <p className={`${t.textSecondary} text-xs font-medium`}>Victoires</p>
          </div>
          <div className={`${t.surface} rounded-2xl p-4 flex flex-col gap-1.5`}>
            <div className={`w-8 h-8 rounded-lg ${t.iconTileRed} flex items-center justify-center`}>
              <Zap size={16} />
            </div>
            <p className={`text-2xl font-black ${t.text} leading-none`}>{losses}</p>
            <p className={`${t.textSecondary} text-xs font-medium`}>Défaites</p>
          </div>
          <div className={`${t.surface} rounded-2xl p-4 flex flex-col gap-1.5`}>
            <div className={`w-8 h-8 rounded-lg ${t.iconTileIndigo} flex items-center justify-center`}>
              <TrendingUp size={16} />
            </div>
            <p className={`text-2xl font-black ${t.text} leading-none`}>
              {winRate !== null ? `${winRate}%` : '—'}
            </p>
            <p className={`${t.textSecondary} text-xs font-medium`}>Winrate</p>
          </div>
        </div>

        <div className={`grid grid-cols-3 gap-1 p-1 rounded-2xl ${isDark ? t.surfaceMuted : 'bg-white/40 backdrop-blur-sm'}`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 rounded-xl text-sm font-bold transition ${
                activeTab === tab.id
                  ? isDark
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                    : `${t.surface} ${t.text} shadow-sm`
                  : t.textSecondary
              }`}
            >
              <span className="block truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'pokemon' && (
          <section>
            <div className="flex justify-between items-baseline mb-3 px-1">
              <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary}`}>
                Pokémon ({rosterSize})
              </h2>
              <button
                onClick={canEdit ? () => setAddingPokemon(true) : undefined}
                className={`${t.accent} text-sm font-semibold flex items-center gap-1${canEdit ? '' : ' invisible pointer-events-none select-none'}`}
                aria-hidden={!canEdit}
              >
                <Plus size={16} />
                {tr('common.add')}
              </button>
            </div>

            {player.pokemon && player.pokemon.length > 0 && (
              <div className={`flex items-center gap-2 ${t.surface} rounded-xl px-3 py-2 mb-3`}>
                <Search size={15} className={t.textTertiary} aria-hidden="true" />
                <input
                  ref={pokemonSearchRef}
                  type="text"
                  value={pokemonSearch}
                  onChange={(e) => setPokemonSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className={`flex-1 bg-transparent outline-none ${t.text} text-base`}
                />
                {pokemonSearch && (
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setPokemonSearch(''); pokemonSearchRef.current?.focus(); }}
                    className={t.textTertiary}
                    aria-label="Effacer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {!player.pokemon || player.pokemon.length === 0 ? (
              <div className={`${t.surface} rounded-2xl p-8 text-center`}>
                <p className={`${t.textSecondary} text-sm`}>{tr('teams.noPokemon')}</p>
              </div>
            ) : (() => {
              const filtered = [...filteredPokemon].sort((a, b) => a.pokeId - b.pokeId);
              if (filtered.length === 0) return (
                <div className={`${t.surface} rounded-2xl p-8 text-center`}>
                  <p className={`${t.textSecondary} text-sm`}>Aucun résultat</p>
                </div>
              );
              return (
              <div className={`${t.surface} rounded-2xl overflow-hidden shadow-sm`}>
                {filtered.map((p, idx) => {
                  const isLast = idx === filtered.length - 1;
                  const isSelected = selectedItems.includes(p.id);
                  const inPokemonSelection = selectionMode === 'pokemon';
                  return (
                    <SwipeableRow
                      key={p.id}
                      onDelete={canEdit && !inPokemonSelection ? () => setDeletingPokemon(p.id) : undefined}
                      disabled={inPokemonSelection}
                      surfaceClass={t.surface}
                      className={[
                        !isLast ? `border-b ${t.divider}` : '',
                        idx === 0 ? 'rounded-t-2xl' : '',
                        isLast ? 'rounded-b-2xl' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <button
                        onClick={() => inPokemonSelection
                          ? setSelectedItems(isSelected ? selectedItems.filter((id) => id !== p.id) : [...selectedItems, p.id])
                          : setViewingPokemon({ pokeId: p.pokeId, name: p.name })
                        }
                        className={`w-full flex items-center gap-3 pr-4 py-3 ${t.surface} text-left relative`}
                        style={{ paddingLeft: inPokemonSelection ? '52px' : '16px', transition: 'padding-left 200ms' }}
                      >
                        <span className={`absolute top-1/2 -translate-y-1/2 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isSelected ? `${t.accentBg} border-transparent` : `${t.textTertiary} border-current`} ${inPokemonSelection ? 'w-6 h-6 opacity-100 scale-100' : 'w-0 h-0 border-0 opacity-0 scale-75'}`}
                          style={{ left: '16px' }}
                        >
                          {isSelected && <Check size={14} className="text-white" />}
                        </span>
                        <img
                          src={getPokemonImageUrl(p.pokeId)}
                          alt={p.name}
                          className="w-11 h-11 object-contain flex-shrink-0"
                          onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold ${t.text} truncate`}>{p.name}</p>
                          {(() => {
                            const types = pokemonTypes[p.pokeId] || [];
                            if (types.length === 0) return null;
                            return (
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
                            );
                          })()}
                        </div>
                        <span className={`${t.textTertiary} text-xs font-mono flex-shrink-0`}>#{p.pokeId}</span>
                        <span className={`transition-all duration-200 overflow-hidden flex items-center flex-shrink-0 ${inPokemonSelection ? 'w-0 opacity-0' : 'w-[18px] opacity-100'}`}>
                          <ChevronRight size={18} className={t.textTertiary} />
                        </span>
                      </button>
                    </SwipeableRow>
                  );
                })}
              </div>
              );
            })()}
          </section>
        )}

        {activeTab === 'teams' && (
          <section>
            <div className="flex justify-between items-baseline mb-3 px-1">
              <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary}`}>
                {tr('teams.title')} ({playerTeams.length})
              </h2>
              <button
                onClick={canEdit && onAddTeam ? openCreateTeam : undefined}
                className={`${t.accent} text-sm font-semibold flex items-center gap-1${canEdit && onAddTeam ? '' : ' invisible pointer-events-none select-none'}`}
                aria-hidden={!(canEdit && onAddTeam)}
              >
                <Plus size={16} />
                {tr('common.create')}
              </button>
            </div>
            {playerTeams.length > 0 && (
              <div className={`flex items-center gap-2 ${t.surface} rounded-xl px-3 py-2 mb-3`}>
                <Search size={15} className={t.textTertiary} aria-hidden="true" />
                <input
                  ref={teamsSearchRef}
                  type="text"
                  value={teamsSearch}
                  onChange={(e) => setTeamsSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className={`flex-1 bg-transparent outline-none ${t.text} text-base`}
                />
                {teamsSearch && (
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setTeamsSearch(''); teamsSearchRef.current?.focus(); }}
                    className={t.textTertiary}
                    aria-label="Effacer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {(() => {
              const filtered = filteredTeams;
              if (playerTeams.length === 0) return (
              <div className={`${t.surface} rounded-2xl p-8 text-center`}>
                <div className={`w-12 h-12 mx-auto rounded-2xl ${t.iconTileIndigo} flex items-center justify-center mb-3`}>
                  <Shield size={22} />
                </div>
                <p className={`${t.textSecondary} text-sm`}>{tr('teams.none')}</p>
              </div>
            );
              if (filtered.length === 0) return (
              <div className={`${t.surface} rounded-2xl p-8 text-center`}>
                <p className={`${t.textSecondary} text-sm`}>Aucun résultat</p>
              </div>
            );
              return (
              <div className={`${t.surface} rounded-2xl overflow-hidden shadow-sm`}>
                {filtered.map((team, idx) => {
                  const isLast = idx === filtered.length - 1;
                  const isSelected = selectedItems.includes(team._id);
                  const inTeamsSelection = selectionMode === 'teams';
                  const rowContent = (
                    <>
                      <span className={`rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 overflow-hidden ${isSelected ? `${t.accentBg} border-transparent` : `${t.textTertiary} border-current`} ${inTeamsSelection ? 'w-6 h-6 opacity-100 scale-100' : 'w-0 h-0 border-0 opacity-0 scale-75 -mr-3'}`}>
                        {isSelected && <Check size={14} className="text-white" />}
                      </span>
                      <div className={`w-12 h-12 rounded-2xl ${t.surfaceMuted} p-1 grid grid-cols-2 grid-rows-2 gap-0.5 flex-shrink-0`}>
                        {[0, 1, 2, 3].map((slot) => {
                          const pokemon = (team.pokemon || [])[slot];
                          return (
                            <div key={slot} className="flex items-center justify-center overflow-hidden">
                              {pokemon && (
                                <img
                                  src={getPokemonImageUrl(pokemon.pokeId)}
                                  alt={pokemon.name}
                                  className="w-full h-full object-contain"
                                  onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${t.text} truncate`}>{team.name}</p>
                        <p className={`${t.textSecondary} text-xs mt-0.5`}>
                          {(team.pokemon || []).length} Pokémon
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {(team.pokemon || []).length < (team.format === '2v2' ? 4 : 3) && (
                          <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-500'}`}>
                            À compléter
                          </span>
                        )}
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold ${team.format === '1v1' ? (isDark ? 'bg-purple-300/10 text-purple-300' : 'bg-purple-600/10 text-purple-600') : (isDark ? 'bg-teal-300/10 text-teal-300' : 'bg-teal-600/10 text-teal-600')}`}>
                          {team.format}
                        </span>
                      </div>
                      <span className={`transition-all duration-200 overflow-hidden flex items-center flex-shrink-0 ${inTeamsSelection ? 'w-0 opacity-0' : 'w-[18px] opacity-100'}`}>
                        <ChevronRight size={18} className={t.textTertiary} />
                      </span>
                    </>
                  );

                  const inner = inTeamsSelection ? (
                    <button
                      onClick={() => setSelectedItems(isSelected ? selectedItems.filter((id) => id !== team._id) : [...selectedItems, team._id])}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left ${t.surface}`}
                    >
                      {rowContent}
                    </button>
                  ) : onSelectTeam ? (
                    <button
                      onClick={() => onSelectTeam(team, activeTab)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left ${t.surface}`}
                    >
                      {rowContent}
                    </button>
                  ) : (
                    <div className={`flex items-center gap-3 px-4 py-3 ${t.surface}`}>
                      {rowContent}
                    </div>
                  );

                  return (
                    <SwipeableRow
                      key={team._id}
                      onDelete={canEdit && onDeleteTeam && !inTeamsSelection ? () => setDeletingTeam(team._id) : undefined}
                      disabled={inTeamsSelection}
                      surfaceClass={t.surface}
                      className={[
                        !isLast ? `border-b ${t.divider}` : '',
                        idx === 0 ? 'rounded-t-2xl' : '',
                        isLast ? 'rounded-b-2xl' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      {inner}
                    </SwipeableRow>
                  );
                })}
              </div>
              );
            })()}
          </section>
        )}

        {activeTab === 'facts' && (
          <section>
            <div className="flex justify-between items-baseline mb-3 px-1">
              <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary}`}>
                Fun facts
              </h2>
              <span
                className={`${t.accent} text-sm font-semibold flex items-center gap-1 invisible pointer-events-none select-none`}
                aria-hidden="true"
              >
                <Plus size={16} />
                Créer
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* ── MVP principal ── */}
              {mvpPrincipal && (
                <div className={`${t.surface} rounded-2xl p-4 min-h-[146px] flex flex-col overflow-hidden`}>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center mb-3">
                    <img
                      src={getPokemonImageUrl(mvpPrincipal.pokeId)}
                      alt={mvpPrincipal.name}
                      className="w-11 h-11 object-contain"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                  </div>
                  <p className={`${t.textSecondary} text-[11px] font-bold uppercase tracking-wide leading-tight`}>POKÉMON STAR</p>
                  <p className={`font-black truncate mt-1 ${t.text}`}>{mvpPrincipal.name}</p>
                  <p className={`${t.textSecondary} text-xs font-semibold mt-auto pt-2 leading-snug`}>
                    Titré {mvpPrincipal.count} fois
                  </p>
                </div>
              )}

              {/* ── Pokémon adverse le plus redoutable ── */}
              {mostDangerousOpponent && (
                <div className={`${t.surface} rounded-2xl p-4 min-h-[146px] flex flex-col overflow-hidden`}>
                  <div className={`w-12 h-12 rounded-2xl ${isDark ? 'bg-indigo-500/15' : 'bg-indigo-50'} flex items-center justify-center mb-3`}>
                    <img
                      src={getPokemonImageUrl(mostDangerousOpponent.pokeId)}
                      alt={mostDangerousOpponent.name}
                      className="w-11 h-11 object-contain"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                  </div>
                  <p className={`${t.textSecondary} text-[11px] font-bold uppercase tracking-wide leading-tight`}>PIRE ENNEMI</p>
                  <p className={`font-black truncate mt-1 ${t.text}`}>{mostDangerousOpponent.name}</p>
                  <p className={`${t.textSecondary} text-xs font-semibold mt-auto pt-2 leading-snug`}>
                    Vainqueur {mostDangerousOpponent.count} fois
                  </p>
                </div>
              )}
              {funFacts.map(({ Icon, label, value, detail, tile, visual, valueClass }) => (
                <div key={label} className={`${t.surface} rounded-2xl p-4 min-h-[146px] flex flex-col overflow-hidden`}>
                  {visual?.type === 'pokemon' ? (
                    <div className={`w-12 h-12 rounded-2xl ${tile} flex items-center justify-center mb-3`}>
                      <img
                        src={getPokemonImageUrl(visual.pokemon.pokeId)}
                        alt={visual.pokemon.name}
                        className="w-11 h-11 object-contain"
                        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                      />
                    </div>
                  ) : visual?.type === 'team' ? (
                    <div className={`w-14 h-14 rounded-2xl ${t.surfaceMuted} p-1 grid grid-cols-2 grid-rows-2 gap-0.5 mb-3`}>
                      {[0, 1, 2, 3].map((slot) => {
                        const pokemon = (visual.team.pokemon || [])[slot];
                        return (
                          <div key={slot} className="flex items-center justify-center overflow-hidden">
                            {pokemon && (
                              <img
                                src={getPokemonImageUrl(pokemon.pokeId)}
                                alt={pokemon.name}
                                className="w-full h-full object-contain"
                                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : visual?.type === 'typeIcon' ? (
                    <div className={`w-12 h-12 rounded-2xl ${tile} flex items-center justify-center mb-3`}>
                      <img
                        src={`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${visual.typeName}.svg`}
                        alt={visual.typeName}
                        className="w-8 h-8 object-contain"
                        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                      />
                    </div>
                  ) : (
                    <div className={`w-9 h-9 rounded-xl ${tile} flex items-center justify-center mb-3`}>
                      <Icon size={17} />
                    </div>
                  )}
                  <p className={`${t.textSecondary} text-[11px] font-bold uppercase tracking-wide leading-tight`}>{label}</p>
                  <p className={`font-black truncate mt-1 ${valueClass || t.text}`}>{value}</p>
                  <p className={`${t.textSecondary} text-xs font-semibold mt-auto pt-2 leading-snug`}>
                    {detail}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Modal Ajouter Pokémon ── */}
      {addingPokemon && createPortal(
        <PokemonPicker
          t={t}
          isDark={isDark}
          title={tr('common.add') + ' Pokémon'}
          alreadyPickedIds={(player.pokemon || []).map((p) => p.pokeId)}
          onSelect={handleAddPokemon}
          onClose={() => setAddingPokemon(false)}
          multiSelect
        />,
        document.body
      )}

      {/* ── Modal Modifier joueur ── */}
      {editingPlayer && createPortal(
        <div className={`fixed inset-0 ${t.overlay} ${isEditPlayerClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex flex-col`}>
          <div className={`${t.surfaceModal} flex-1 overflow-hidden flex flex-col rounded-t-3xl ${isEditPlayerClosing ? 'anim-slide-down' : 'anim-slide-up'}`} style={{ marginTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}>
            <div className={`${t.surface} px-5 pt-3 pb-3 border-b ${t.divider} flex items-center`}>
              <div className="flex-1">
                <button
                  onClick={cancelEditPlayer}
                  className={`${t.accent} font-semibold`}
                >
                  {tr('common.cancel')}
                </button>
              </div>
              <h2 className={`text-base font-black ${t.text}`}>{tr('common.edit')}</h2>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={handleSavePlayer}
                  disabled={!editName.trim() || isSavingPlayer}
                  className={`${t.accent} font-bold ${!editName.trim() ? 'opacity-40' : ''}`}
                >
                  {isSavingPlayer ? <Loader2 size={18} className="animate-spin" /> : 'OK'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-8 space-y-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }} data-scroll-lock-ignore>
              <div className="flex flex-col items-center">
                <button
                  onClick={() => editFileInputRef.current?.click()}
                  className="relative"
                  aria-label="Changer la photo"
                >
                  <PlayerAvatar
                    player={{ name: editName, avatar: editAvatar }}
                    size={104}
                    textSize="text-4xl"
                  />
                  <div className={`absolute bottom-0 right-0 w-9 h-9 rounded-full ${t.accentBg} text-white flex items-center justify-center border-4 ${isDark ? 'border-zinc-900' : 'border-gray-50'}`}>
                    <Camera size={16} />
                  </div>
                </button>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEditAvatarPick}
                  className="hidden"
                />
                {editAvatar && (
                  <button
                    onClick={() => setEditAvatar(null)}
                    className={`mt-2 ${t.danger} text-xs font-semibold`}
                  >
                    Retirer la photo
                  </button>
                )}
              </div>

              <div>
                <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                  {tr('players.nameLabel')}
                </label>
                <input
                  ref={editNameInputRef}
                  type="text"
                  placeholder={tr('players.namePlaceholder')}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full ${t.inputSoft} rounded-xl px-4 py-3 outline-none focus:ring-2 ${t.accentRing}`}
                />
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Modal Créer équipe ── */}
      {creatingTeam && (() => {
        const required = requiredPokemonForFormat(newTeamData.format);
        const currentCount = newTeamData.pokemon.length;
        const isAtMax = currentCount >= required;

        return createPortal(
          <div className={`fixed inset-0 ${t.overlay} ${isCreateTeamClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex flex-col`}>
            <div className={`${t.surfaceModal} flex-1 overflow-hidden flex flex-col rounded-t-3xl ${isCreateTeamClosing ? 'anim-slide-down' : 'anim-slide-up'}`} style={{ marginTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}>
              <div className={`${t.surface} px-5 pt-3 pb-3 border-b ${t.divider} flex items-center`}>
                <div className="flex-1">
                  <button
                    onClick={cancelCreateTeam}
                    className={`${t.accent} font-semibold`}
                  >
                    {tr('common.cancel')}
                  </button>
                </div>
                <h2 className={`text-base font-black ${t.text}`}>{tr('teams.newTitle')}</h2>
                <div className="flex-1 flex justify-end">
                  <button
                    onClick={handleSaveTeam}
                    className={`${t.accent} font-bold`}
                  >
                    {tr('common.create')}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }} data-scroll-lock-ignore>
                <div>
                  <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                    {tr('teams.nameLabel')}
                  </label>
                  <input
                    ref={newTeamNameInputRef}
                    type="text"
                    placeholder={tr('teams.namePlaceholder')}
                    value={newTeamData.name}
                    onChange={(e) => setNewTeamData({ ...newTeamData, name: e.target.value })}
                    className={`w-full ${t.inputSoft} ${teamFormErrors.name ? 'ring-2 ring-red-500/50' : ''} rounded-xl px-4 py-3 outline-none focus:ring-2 ${t.accentRing}`}
                  />
                  {teamFormErrors.name && <p className={`${t.danger} text-xs mt-1.5 ml-1`}>{tr('common.required')}</p>}
                </div>

                <div>
                  <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                    {tr('teams.owner')}
                  </label>
                  <div className={`${t.inputSoft} rounded-xl px-4 py-3 flex items-center gap-3`}>
                    <PlayerAvatar player={player} size={32} textSize="text-xs" className="flex-shrink-0" />
                    <span className={`font-semibold ${t.text}`}>{player.name}</span>
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                    {tr('teams.format')}
                  </label>
                  <div className={`flex gap-1 p-1 rounded-xl ${t.surfaceMuted}`}>
                    {['1v1', '2v2'].map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => {
                          const max = requiredPokemonForFormat(fmt);
                          setNewTeamData({
                            ...newTeamData,
                            format: fmt,
                            pokemon: newTeamData.pokemon.slice(0, max),
                          });
                        }}
                        className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
                          newTeamData.format === fmt
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

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} ml-1`}>
                      Pokémon (
                      <span className={currentCount === required ? t.success : t.warning}>
                        {currentCount}/{required}
                      </span>
                      )
                    </label>
                    <button
                      onClick={() => setPickingTeamPokemon(true)}
                      
                      className={`${t.accent} text-sm font-semibold flex items-center gap-1`}
                    >
                      <Plus size={16} />
                      {tr('common.add')}
                    </button>
                  </div>

                  {newTeamData.pokemon.length === 0 ? (
                    <div className={`${t.surfaceInset} rounded-2xl p-6 text-center ${t.textSecondary} text-sm`}>
                      {tr('teams.noPokemon')}
                    </div>
                  ) : (
                    <div className={`${t.surfaceInset} rounded-2xl overflow-hidden`}>
                      {newTeamData.pokemon.map((p, idx) => {
                        const isLast = idx === newTeamData.pokemon.length - 1;
                        return (
                          <SwipeableRow
                            key={p.id}
                            onDelete={() => handleRemoveTeamPokemon(p.id)}
                            surfaceClass={t.surfaceInset}
                            className={!isLast ? `border-b ${t.divider}` : ''}
                          >
                            <div className="flex items-center gap-3 px-4 py-2.5">
                              <img
                                src={getPokemonImageUrl(p.pokeId)}
                                alt={p.name}
                                className="w-10 h-10 object-contain flex-shrink-0"
                                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                              />
                              <span className={`flex-1 font-semibold ${t.text} truncate`}>{p.name}</span>
                              <span className={`${t.textTertiary} text-xs font-mono`}>#{p.pokeId}</span>
                            </div>
                          </SwipeableRow>
                        );
                      })}
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        , document.body);
      })()}

      {pickingTeamPokemon && createPortal(
        <PokemonPicker
          t={t}
          isDark={isDark}
          title={tr('teams.choosePokemon')}
          alreadyPickedIds={newTeamData.pokemon.map((p) => p.pokeId)}
          defaultResults={(player.pokemon || []).map((p) => ({ pokeId: p.pokeId, name: p.name }))}
          defaultLabel={`Pokémon de ${player.name}`}
          onSelect={handleSelectTeamPokemon}
          onClose={() => setPickingTeamPokemon(false)}
          multiSelect
        />
      , document.body)}

      {/* ── Modal Confirmation suppression multiple Pokémon ── */}
      {deletingSelectedPokemon && (() => {
        const selectedPokeIds = new Set(
          (player.pokemon || []).filter((p) => selectedItems.includes(p.id)).map((p) => p.pokeId)
        );
        const affectedTeams = playerTeams.filter((team) =>
          (team.pokemon || []).some((p) => selectedPokeIds.has(p.pokeId))
        );
        return createPortal(
        <div className={`fixed inset-0 ${t.overlay} ${isDeletingSelectedPokemonClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isDeletingSelectedPokemonClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
            <p className={`font-black text-lg ${t.text} mb-3`}>
              Supprimer {selectedItems.length} Pokémon ?
            </p>
            {(() => {
              const selectedPokemon = (player.pokemon || []).filter((p) => selectedItems.includes(p.id));
              if (selectedPokemon.length === 0) return null;
              const MAX = 12;
              const visible = selectedPokemon.slice(0, MAX);
              const overflow = selectedPokemon.length - MAX;
              return (
                <div className="mb-4">
                  <div className="grid grid-cols-6 gap-1">
                    {visible.map((p) => (
                      <img
                        key={p.id}
                        src={getPokemonImageUrl(p.pokeId)}
                        alt={p.name}
                        className="w-full aspect-square object-contain"
                      />
                    ))}
                  </div>
                  {overflow > 0 && (
                    <button
                      onClick={() => setShowAllPokemonSheet(true)}
                      className={`mt-2 text-sm font-semibold ${t.accent}`}
                    >+ {overflow} Pokémon</button>
                  )}
                </div>
              );
            })()}
            {affectedTeams.length > 0 && (
              <div className={`mt-3 mb-4 p-3 rounded-xl ${t.warningSoftBg}`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className={`${t.warningSoftText} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className={`text-sm font-semibold ${t.warningSoftText} mb-1`}>
                      Présent dans {affectedTeams.length === 1 ? 'une équipe' : `${affectedTeams.length} ${tr('teams.title').toLowerCase()}`}
                    </p>
                    <ul className={`text-sm ${t.text} space-y-0.5`}>
                      {affectedTeams.slice(0, 4).map((team) => (
                        <li key={team._id} className="flex items-center gap-1.5">
                          <span className={`inline-flex flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${team.format === '1v1' ? (isDark ? 'bg-purple-300/10 text-purple-300' : 'bg-purple-600/10 text-purple-600') : (isDark ? 'bg-teal-300/10 text-teal-300' : 'bg-teal-600/10 text-teal-600')}`}>
                            {team.format}
                          </span>
                          <span className="font-semibold">{team.name}</span>
                        </li>
                      ))}
                      {affectedTeams.length > 4 && (
                        <li>
                          <button
                            onClick={() => setShowAllTeamsSheet(true)}
                            className={`text-sm font-semibold ${t.accent}`}
                          >+ {affectedTeams.length - 4} autres</button>
                        </li>
                      )}
                    </ul>
                    <p className={`text-xs ${t.textSecondary} mt-2`}>
                      Ils seront également retirés de {affectedTeams.length === 1 ? 'cette équipe' : 'ces équipes'}.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <p className={`${t.textSecondary} text-sm mb-5`}>{tr('common.irreversible')}</p>
            <div className="flex gap-2">
              <button
                onClick={cancelDeletingSelectedPokemon}
                disabled={isDeletingSelectedPokemon}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text} disabled:opacity-50`}
              >
                {tr('common.cancel')}
              </button>
              <button
                onClick={handleDeleteSelectedPokemon}
                disabled={isDeletingSelectedPokemon}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {isDeletingSelectedPokemon ? <Loader2 size={16} className="animate-spin" /> : tr('common.delete')}
              </button>
            </div>
          </div>
        </div>
        , document.body);
      })()}

      {/* ── Bottom sheet : tous les Pokémon sélectionnés ── */}
      {showAllPokemonSheet && createPortal(
        <div className={`fixed inset-0 z-[10000] flex flex-col justify-end ${isAllPokemonSheetClosing ? 'anim-fade-out' : 'anim-fade-in'}`}>
          <div className="absolute inset-0 bg-black/40" onClick={closeAllPokemonSheet} />
          <div className={`relative ${t.surfaceModal} rounded-t-3xl flex flex-col ${isAllPokemonSheetClosing ? 'anim-slide-down' : 'anim-slide-up'}`} style={{ paddingBottom: 'env(safe-area-inset-bottom)', maxHeight: 'calc(100dvh - env(safe-area-inset-top) - 1.5rem)' }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <p className={`font-black text-base ${t.text}`}>Pokémon sélectionnés ({selectedItems.length})</p>
              <button onClick={closeAllPokemonSheet} className={`w-8 h-8 rounded-full ${t.surfaceMuted} flex items-center justify-center`}><X size={16} /></button>
            </div>
            <div className="overflow-y-auto px-5 pb-5 flex-1">
              <div className="grid grid-cols-6 gap-1">
                {(player.pokemon || []).filter((p) => selectedItems.includes(p.id)).map((p) => (
                  <div key={p.id} className="flex flex-col items-center gap-0.5">
                    <img src={getPokemonImageUrl(p.pokeId)} alt={p.name} className="w-full aspect-square object-contain" />
                    <span className={`text-[10px] ${t.textSecondary} text-center w-full truncate text-center`}>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Bottom sheet : toutes les équipes affectées ── */}
      {showAllTeamsSheet && createPortal(
        <div className={`fixed inset-0 z-[10000] flex flex-col justify-end ${isAllTeamsSheetClosing ? 'anim-fade-out' : 'anim-fade-in'}`}>
          <div className="absolute inset-0 bg-black/40" onClick={closeAllTeamsSheet} />
          <div className={`relative ${t.surfaceModal} rounded-t-3xl flex flex-col ${isAllTeamsSheetClosing ? 'anim-slide-down' : 'anim-slide-up'}`} style={{ paddingBottom: 'env(safe-area-inset-bottom)', maxHeight: 'calc(100dvh - env(safe-area-inset-top) - 1.5rem)' }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <p className={`font-black text-base ${t.text}`}>Équipes affectées</p>
              <button onClick={closeAllTeamsSheet} className={`w-8 h-8 rounded-full ${t.surfaceMuted} flex items-center justify-center`}><X size={16} /></button>
            </div>
            <div className="overflow-y-auto px-5 pb-5 flex-1">
              <ul className={`space-y-2 text-sm ${t.text}`}>
                {(() => {
                  const selectedPokeIds = new Set(
                    (player.pokemon || []).filter((p) => selectedItems.includes(p.id)).map((p) => p.pokeId)
                  );
                  return playerTeams
                    .filter((team) => (team.pokemon || []).some((p) => selectedPokeIds.has(p.pokeId)))
                    .map((team) => (
                      <li key={team._id} className="flex items-center gap-1.5">
                        <span className={`inline-flex flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${team.format === '1v1' ? (isDark ? 'bg-purple-300/10 text-purple-300' : 'bg-purple-600/10 text-purple-600') : (isDark ? 'bg-teal-300/10 text-teal-300' : 'bg-teal-600/10 text-teal-600')}`}>
                          {team.format}
                        </span>
                        <span className="font-semibold">{team.name}</span>
                      </li>
                    ));
                })()}
              </ul>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Modal Confirmation suppression multiple Équipes ── */}
      {deletingSelectedTeams && createPortal(
        <div className={`fixed inset-0 ${t.overlay} ${isDeletingSelectedTeamsClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isDeletingSelectedTeamsClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
            <p className={`font-black text-lg ${t.text} mb-1`}>
              {tr('teams.deleteMultipleTitle', selectedItems.length)}
            </p>
            <p className={`${t.textSecondary} text-sm mb-5`}>{tr('common.irreversible')}</p>
            <div className="flex gap-2">
              <button
                onClick={cancelDeletingSelectedTeams}
                disabled={isDeletingSelectedTeams}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text} disabled:opacity-50`}
              >
                {tr('common.cancel')}
              </button>
              <button
                onClick={handleDeleteSelectedTeams}
                disabled={isDeletingSelectedTeams}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {isDeletingSelectedTeams ? <Loader2 size={16} className="animate-spin" /> : tr('common.delete')}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Modal Confirmation suppression équipe ── */}
      {deletingTeam && createPortal(
        <div className={`fixed inset-0 ${t.overlay} ${isDeletingTeamClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isDeletingTeamClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
            <p className={`font-black text-lg ${t.text} mb-1`}>
              {tr('teams.deleteTitle')}
            </p>
            <p className={`${t.textSecondary} text-sm mb-5`}>{tr('common.irreversible')}</p>
            <div className="flex gap-2">
              <button
                onClick={cancelDeletingTeam}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
              >
                {tr('common.cancel')}
              </button>
              <button
                onClick={handleDeleteTeam}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white`}
              >
                {tr('common.delete')}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Modal Confirmation suppression ── */}
      {deletingPokemon && createPortal(
        <div className={`fixed inset-0 ${t.overlay} ${isDeletingPokemonClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isDeletingPokemonClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
            <p className={`font-black text-lg ${t.text} mb-1`}>
              {tr('common.delete')} {deletingPokemonObj?.name} ?
            </p>

            {teamsContainingDeleted.length > 0 && (
              <div className={`mt-3 mb-4 p-3 rounded-xl ${t.warningSoftBg}`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className={`${t.warningSoftText} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className={`text-sm font-semibold ${t.warningSoftText} mb-1`}>
                      Présent dans {teamsContainingDeleted.length === 1 ? 'une équipe' : `${teamsContainingDeleted.length} ${tr('teams.title').toLowerCase()}`}
                    </p>
                    <ul className={`text-sm ${t.text} space-y-0.5`}>
                      {teamsContainingDeleted.map((team) => (
                        <li key={team._id} className="flex items-center gap-1.5">
                          <span className={`inline-flex flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${team.format === '1v1' ? (isDark ? 'bg-purple-300/10 text-purple-300' : 'bg-purple-600/10 text-purple-600') : (isDark ? 'bg-teal-300/10 text-teal-300' : 'bg-teal-600/10 text-teal-600')}`}>
                            {team.format}
                          </span>
                          <span className="font-semibold">{team.name}</span>
                        </li>
                      ))}
                    </ul>
                    <p className={`text-xs ${t.textSecondary} mt-2`}>
                      Il sera également retiré de {teamsContainingDeleted.length === 1 ? 'cette équipe' : 'ces équipes'}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <p className={`${t.textSecondary} text-sm mb-5`}>{tr('common.irreversible')}</p>

            <div className="flex gap-2">
              <button
                onClick={cancelDeletingPokemon}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
              >
                {tr('common.cancel')}
              </button>
              <button
                onClick={handleDeletePokemon}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white`}
              >
                {tr('common.delete')}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Footer multi-sélection ── */}
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
              const allIds = selectionMode === 'pokemon'
                ? filteredPokemon.map((p) => p.id)
                : filteredTeams.map((t) => t._id);
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
              onClick={() => selectionMode === 'pokemon' ? setDeletingSelectedPokemon(true) : setDeletingSelectedTeams(true)}
              className={`justify-self-end h-11 px-4 rounded-full backdrop-blur-xl text-sm font-semibold flex items-center justify-center transition-all duration-200 bg-red-500/90 text-white border border-red-400/60 ${selectedItems.length === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              style={isDark ? { borderTop: '1px solid #ffffff36' } : undefined}
            >
              {`Supprimer (${selectedItems.length})`}
            </button>
          </div>
        </div>
      , document.body)}

      {/* ── Modal détail Pokémon ── */}
      {viewingPokemon && (
        <PokemonDetailModal
          pokeId={viewingPokemon.pokeId}
          pokeName={viewingPokemon.name}
          t={t}
          isDark={isDark}
          onClose={() => setViewingPokemon(null)}
        />
      )}
      <AlertModal title={alertMessage?.title} message={alertMessage?.message} onClose={() => setAlertMessage(null)} t={t} />
    </div>
  );
};
