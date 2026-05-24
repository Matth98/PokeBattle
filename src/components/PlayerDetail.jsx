import React, { useState, useRef, useCallback } from 'react';
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
  Trophy,
  Zap,
} from 'lucide-react';
import { usePokemon } from '../hooks/usePokemon';
import { usePokemonTypes, TYPE_FR, TYPE_COLORS, TYPE_HEX } from '../hooks/usePokemonTypes';
import { PokemonPicker } from './PokemonPicker';
import { PokemonDetailModal } from './PokemonDetailModal';
import { SwipeableRow } from './SwipeableRow';
import { PlayerAvatar } from './PlayerAvatar';
import { resizeImageToDataUrl } from '../utils/imageResize';
import { useAuth } from '../hooks/useAuth';

const TYPE_SUPER_EFFECTIVE = {
  normal:[], fire:['grass','ice','bug','steel'], water:['fire','ground','rock'],
  electric:['water','flying'], grass:['water','ground','rock'], ice:['grass','ground','flying','dragon'],
  fighting:['normal','ice','rock','dark','steel'], poison:['grass','fairy'],
  ground:['fire','electric','poison','rock','steel'], flying:['grass','fighting','bug'],
  psychic:['fighting','poison'], bug:['grass','psychic','dark'], rock:['fire','ice','flying','bug'],
  ghost:['psychic','ghost'], dragon:['dragon'], dark:['psychic','ghost'],
  steel:['ice','rock','fairy'], fairy:['fighting','dragon','dark'],
};

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
}) => {
  const { dbUser, isSuperAdmin } = useAuth();
  const canEdit = isSuperAdmin ||
    !player?.userId ||
    (dbUser?._id && player?.userId && String(player.userId) === String(dbUser._id));

  const [addingPokemon, setAddingPokemon] = useState(false);
  const [viewingPokemon, setViewingPokemon] = useState(null); // { pokeId, name }
  const [activeTab, setActiveTab] = useState(initialActiveTab);
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
  const [deletingTeam, setDeletingTeam] = useState(null);
  const { isClosing: isDeletingTeamClosing, handleClose: cancelDeletingTeam } = useAnimatedClose(
    () => setDeletingTeam(null), 180,
  );
  const { isClosing: isDeletingPokemonClosing, handleClose: cancelDeletingPokemon } = useAnimatedClose(
    () => setDeletingPokemon(null), 180,
  );

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

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      await onUpdate(player._id, { ...player, avatar: dataUrl });
    } catch (err) {
      alert('Image invalide : ' + err.message);
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
      alert('Image invalide : ' + err.message);
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

  const handleSelectTeamPokemon = (pokemon) => {
    setNewTeamData((prev) => {
      if (prev.pokemon.length >= requiredPokemonForFormat(prev.format)) return prev;
      return {
        ...prev,
        pokemon: [
          ...prev.pokemon,
          {
            id: `${Date.now()}-${pokemon.pokeId}`,
            pokeId: pokemon.pokeId,
            name: pokemon.name,
          },
        ],
      };
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
    const errors = {
      name: !newTeamData.name.trim(),
      pokemon: newTeamData.pokemon.length !== required,
    };
    setTeamFormErrors(errors);
    if (errors.name || errors.pokemon || !onAddTeam) return;

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

  const handleAddPokemon = async (pokemon) => {
    const updated = {
      ...player,
      pokemon: [
        ...(player.pokemon || []),
        { id: Date.now().toString(), pokeId: pokemon.pokeId, name: pokemon.name, level: 50 },
      ],
    };
    await onUpdate(player._id, updated);
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
      tile: t.iconTileAmber,
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
    { id: 'teams', label: 'Équipes' },
    { id: 'facts', label: 'Fun facts' },
  ];

  return (
    <div className="min-h-screen">
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 130% 75% at 0% 0%, rgba(0,203,255,0.06) 0%, rgba(0,203,255,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(199,255,231,0.05) 0%, rgba(199,255,231,0) 100%), #09090b'
            : 'radial-gradient(ellipse 130% 75% at 0% 0%, rgba(0,203,255,0.35) 0%, rgba(0,203,255,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(199,255,231,0.28) 0%, rgba(199,255,231,0) 100%), #EFF6F9',
        }}
      />
      {/* ── En-tête sticky ── */}
      <div
        className="sticky top-0 z-10 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)', paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm ${isDark ? 'bg-white/15 text-white' : 'bg-white/80 text-gray-900'}`}
            aria-label="Retour"
          >
            <ChevronLeft size={22} />
          </button>
          {canEdit && (
            <button
              onClick={openEditPlayer}
              className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm ${isDark ? 'bg-white/15 text-white' : 'bg-white/80 text-gray-900'}`}
              aria-label="Modifier"
            >
              <Pencil size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="px-5 mt-1 pb-32 space-y-6">
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
              <Trophy size={16} />
            </div>
            <p className={`text-2xl font-black ${t.text} leading-none`}>
              {winRate !== null ? `${winRate}%` : '—'}
            </p>
            <p className={`${t.textSecondary} text-xs font-medium`}>Winrate</p>
          </div>
        </div>

        <div className={`grid grid-cols-3 gap-1 p-1 rounded-2xl ${t.surfaceMuted}`}>
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
                onClick={() => setAddingPokemon(true)}
                className={`${t.accent} text-sm font-semibold flex items-center gap-1`}
              >
                <Plus size={16} />
                Ajouter
              </button>
            </div>

            {!player.pokemon || player.pokemon.length === 0 ? (
              <div className={`${t.surface} rounded-2xl p-8 text-center`}>
                <p className={`${t.textSecondary} text-sm`}>Aucun Pokémon</p>
              </div>
            ) : (
              <div className={`${t.surface} rounded-2xl overflow-hidden`}>
                {[...player.pokemon].sort((a, b) => a.pokeId - b.pokeId).map((p, idx) => {
                  const isLast = idx === player.pokemon.length - 1;
                  return (
                    <SwipeableRow
                      key={p.id}
                      onDelete={() => setDeletingPokemon(p.id)}
                      surfaceClass={t.surface}
                      className={[
                        !isLast ? `border-b ${t.divider}` : '',
                        idx === 0 ? 'rounded-t-2xl' : '',
                        isLast ? 'rounded-b-2xl' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <button
                        onClick={() => setViewingPokemon({ pokeId: p.pokeId, name: p.name })}
                        className={`w-full flex items-center gap-3 px-4 py-3 ${t.surface} text-left`}
                      >
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
                        <span className={`${t.textTertiary} text-xs font-mono`}>#{p.pokeId}</span>
                      </button>
                    </SwipeableRow>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'teams' && (
          <section>
            <div className="flex justify-between items-baseline mb-3 px-1">
              <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary}`}>
                Équipes ({playerTeams.length})
              </h2>
              {onAddTeam && (
                <button
                  onClick={openCreateTeam}
                  className={`${t.accent} text-sm font-semibold flex items-center gap-1`}
                >
                  <Plus size={16} />
                  Créer
                </button>
              )}
            </div>
            {playerTeams.length === 0 ? (
              <div className={`${t.surface} rounded-2xl p-8 text-center`}>
                <div className={`w-12 h-12 mx-auto rounded-2xl ${t.iconTileIndigo} flex items-center justify-center mb-3`}>
                  <Shield size={22} />
                </div>
                <p className={`${t.textSecondary} text-sm`}>Aucune équipe</p>
              </div>
            ) : (
              <div className={`${t.surface} rounded-2xl overflow-hidden`}>
                {playerTeams.map((team, idx) => {
                  const isLast = idx === playerTeams.length - 1;
                  const rowContent = (
                    <>
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
                      <span className={`inline-flex flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${team.format === '1v1' ? (isDark ? 'bg-pink-300/10 text-pink-300' : 'bg-pink-600/10 text-pink-600') : (isDark ? 'bg-indigo-300/10 text-indigo-300' : 'bg-indigo-600/10 text-indigo-600')}`}>
                        {team.format}
                      </span>
                      {onSelectTeam ? <ChevronRight size={18} className={t.textTertiary} /> : null}
                    </>
                  );

                  const inner = onSelectTeam ? (
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
                      onDelete={onDeleteTeam ? () => setDeletingTeam(team._id) : undefined}
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
            )}
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
                <div className={`col-span-2 ${t.surface} rounded-2xl p-4 flex items-center gap-4 overflow-hidden`}>
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <img
                      src={getPokemonImageUrl(mvpPrincipal.pokeId)}
                      alt={mvpPrincipal.name}
                      className="w-14 h-14 object-contain"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`${t.textSecondary} text-[11px] font-bold uppercase tracking-wide`}>MVP principal</p>
                    <p className={`font-black ${t.text} truncate mt-0.5`}>{mvpPrincipal.name}</p>
                    <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                      ★ MVP {mvpPrincipal.count} fois
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                    ★ MVP
                  </span>
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
      {addingPokemon && (
        <PokemonPicker
          t={t}
          isDark={isDark}
          title="Ajouter un Pokémon"
          alreadyPickedIds={(player.pokemon || []).map((p) => p.pokeId)}
          onSelect={handleAddPokemon}
          onClose={() => setAddingPokemon(false)}
        />
      )}

      {/* ── Modal Modifier joueur ── */}
      {editingPlayer && (
        <div className={`fixed inset-0 ${t.overlay} ${isEditPlayerClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex flex-col`}>
          <div className={`${t.surfaceModal} flex-1 overflow-hidden flex flex-col rounded-t-3xl ${isEditPlayerClosing ? 'anim-slide-down' : 'anim-slide-up'}`} style={{ marginTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}>
            <div className={`${t.surface} px-5 pt-3 pb-3 border-b ${t.divider} flex items-center`}>
              <div className="flex-1">
                <button
                  onClick={cancelEditPlayer}
                  className={`${t.accent} font-semibold`}
                >
                  Annuler
                </button>
              </div>
              <h2 className={`text-base font-black ${t.text}`}>Modifier le joueur</h2>
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

            <div className="flex-1 overflow-y-auto px-5 py-8 space-y-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
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
                  Nom du joueur
                </label>
                <input
                  type="text"
                  placeholder="Ex: Matthias"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full ${t.inputSoft} rounded-xl px-4 py-3 outline-none focus:ring-2 ${t.accentRing}`}
                  autoFocus
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Créer équipe ── */}
      {creatingTeam && (() => {
        const required = requiredPokemonForFormat(newTeamData.format);
        const currentCount = newTeamData.pokemon.length;
        const isAtMax = currentCount >= required;

        return (
          <div className={`fixed inset-0 ${t.overlay} ${isCreateTeamClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex flex-col`}>
            <div className={`${t.surfaceModal} flex-1 overflow-hidden flex flex-col rounded-t-3xl ${isCreateTeamClosing ? 'anim-slide-down' : 'anim-slide-up'}`} style={{ marginTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}>
              <div className={`${t.surface} px-5 pt-3 pb-3 border-b ${t.divider} flex items-center`}>
                <div className="flex-1">
                  <button
                    onClick={cancelCreateTeam}
                    className={`${t.accent} font-semibold`}
                  >
                    Annuler
                  </button>
                </div>
                <h2 className={`text-base font-black ${t.text}`}>Nouvelle équipe</h2>
                <div className="flex-1 flex justify-end">
                  <button
                    onClick={handleSaveTeam}
                    className={`${t.accent} font-bold`}
                  >
                    Créer
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
                <div>
                  <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                    Nom de l'équipe
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Équipe de feu"
                    value={newTeamData.name}
                    onChange={(e) => setNewTeamData({ ...newTeamData, name: e.target.value })}
                    className={`w-full ${t.inputSoft} ${teamFormErrors.name ? 'ring-2 ring-red-500/50' : ''} rounded-xl px-4 py-3 outline-none focus:ring-2 ${t.accentRing}`}
                    autoFocus
                  />
                  {teamFormErrors.name && <p className={`${t.danger} text-xs mt-1.5 ml-1`}>Ce champ est requis</p>}
                </div>

                <div>
                  <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                    Propriétaire
                  </label>
                  <div className={`${t.inputSoft} rounded-xl px-4 py-3 flex items-center gap-3`}>
                    <PlayerAvatar player={player} size={32} textSize="text-xs" className="flex-shrink-0" />
                    <span className={`font-semibold ${t.text}`}>{player.name}</span>
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                    Format
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
                      disabled={isAtMax}
                      className={`${t.accent} text-sm font-semibold flex items-center gap-1 ${isAtMax ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <Plus size={16} />
                      Ajouter
                    </button>
                  </div>

                  {newTeamData.pokemon.length === 0 ? (
                    <div className={`${t.surfaceInset} rounded-2xl p-6 text-center ${t.textSecondary} text-sm`}>
                      Aucun Pokémon sélectionné
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

                  {teamFormErrors.pokemon && currentCount !== required && (
                    <p className={`${t.danger} text-xs mt-2 ml-1`}>
                      {currentCount < required
                        ? `Il manque ${required - currentCount} Pokémon (${currentCount}/${required}) pour le format ${newTeamData.format}`
                        : `Trop de Pokémon (${currentCount}/${required}) pour le format ${newTeamData.format}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {pickingTeamPokemon && (
        <PokemonPicker
          t={t}
          isDark={isDark}
          title="Choisir un Pokémon"
          alreadyPickedIds={newTeamData.pokemon.map((p) => p.pokeId)}
          defaultResults={(player.pokemon || []).map((p) => ({ pokeId: p.pokeId, name: p.name }))}
          defaultLabel={`Pokémon de ${player.name}`}
          onSelect={handleSelectTeamPokemon}
          onClose={() => setPickingTeamPokemon(false)}
        />
      )}

      {/* ── Modal Confirmation suppression équipe ── */}
      {deletingTeam && (
        <div className={`fixed inset-0 ${t.overlay} ${isDeletingTeamClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isDeletingTeamClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
            <p className={`font-black text-lg ${t.text} mb-1`}>
              Supprimer {playerTeams.find((tm) => tm._id === deletingTeam)?.name} ?
            </p>
            <p className={`${t.textSecondary} text-sm mb-5`}>Cette action est définitive.</p>
            <div className="flex gap-2">
              <button
                onClick={cancelDeletingTeam}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteTeam}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white`}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmation suppression ── */}
      {deletingPokemon && (
        <div className={`fixed inset-0 ${t.overlay} ${isDeletingPokemonClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isDeletingPokemonClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
            <p className={`font-black text-lg ${t.text} mb-1`}>
              Supprimer {deletingPokemonObj?.name} ?
            </p>

            {teamsContainingDeleted.length > 0 && (
              <div className={`mt-3 mb-4 p-3 rounded-xl ${t.warningSoftBg}`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className={`${t.warningSoftText} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className={`text-sm font-semibold ${t.warningSoftText} mb-1`}>
                      Présent dans {teamsContainingDeleted.length === 1 ? 'une équipe' : `${teamsContainingDeleted.length} équipes`}
                    </p>
                    <ul className={`text-sm ${t.text} space-y-0.5`}>
                      {teamsContainingDeleted.map((team) => (
                        <li key={team._id} className="flex items-center gap-1.5">
                          <span className="font-semibold">{team.name}</span>
                          <span className={`inline-flex flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${team.format === '1v1' ? (isDark ? 'bg-pink-300/10 text-pink-300' : 'bg-pink-600/10 text-pink-600') : (isDark ? 'bg-indigo-300/10 text-indigo-300' : 'bg-indigo-600/10 text-indigo-600')}`}>
                            {team.format}
                          </span>
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

            <p className={`${t.textSecondary} text-sm mb-5`}>Cette action est définitive.</p>

            <div className="flex gap-2">
              <button
                onClick={cancelDeletingPokemon}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
              >
                Annuler
              </button>
              <button
                onClick={handleDeletePokemon}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white`}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};
