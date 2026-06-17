import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ChevronUp, Pencil, Calendar, Trash2, FileText, Trophy, Swords, HelpCircle, BookmarkPlus, Loader2, Target, Search, Plus } from 'lucide-react';
import { formatDate } from '../utils/dates';
import { usePokemon } from '../hooks/usePokemon';
import { useAnimatedClose } from '../hooks/useAnimatedClose';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { PlayerAvatar } from './PlayerAvatar';
import { usePokemonTypes, TYPE_FR, TYPE_HEX } from '../hooks/usePokemonTypes';

import { TYPE_SUPER_EFFECTIVE } from '../utils/mvp';

// +1 pour chaque type de myTeam super-efficace contre un type d'oppTeam
// -1 pour chaque type d'oppTeam super-efficace contre un type de myTeam
// Retourne un enregistrement par point : { myType, myPokName, oppType, oppPokName }
// advantages = +1 chacun, weaknesses = -1 chacun — total = calcTypeAdvantage
const getTypeMatchups = (myTeam, oppTeam, pokemonTypes) => {
  const advantages = [];
  const weaknesses = [];
  for (const myPok of myTeam) {
    const myTypes = pokemonTypes[myPok.pokeId] || [];
    for (const oppPok of oppTeam) {
      const oppTypes = pokemonTypes[oppPok.pokeId] || [];
      for (const myType of myTypes) {
        const mySE = TYPE_SUPER_EFFECTIVE[myType] || [];
        for (const oppType of oppTypes) {
          if (mySE.includes(oppType))
            advantages.push({ myType, myPokName: myPok.name, oppType, oppPokName: oppPok.name });
          if ((TYPE_SUPER_EFFECTIVE[oppType] || []).includes(myType))
            weaknesses.push({ oppType, oppPokName: oppPok.name, myType, myPokName: myPok.name });
        }
      }
    }
  }
  return { advantages, weaknesses };
};

const calcTypeAdvantage = (myTeam, oppTeam, pokemonTypes) => {
  let score = 0;
  for (const myPok of myTeam) {
    const myTypes = pokemonTypes[myPok.pokeId] || [];
    for (const oppPok of oppTeam) {
      const oppTypes = pokemonTypes[oppPok.pokeId] || [];
      for (const myType of myTypes) {
        const mySE = TYPE_SUPER_EFFECTIVE[myType] || [];
        for (const oppType of oppTypes) {
          if (mySE.includes(oppType)) score += 1;
          const oppSE = TYPE_SUPER_EFFECTIVE[oppType] || [];
          if (oppSE.includes(myType)) score -= 1;
        }
      }
    }
  }
  return score;
};

const TeamSection = ({ player, isWinner, pokemon, getPokemonImageUrl, t, tr, onPokemonClick, saveButton }) => (
  <section>
    <div className="flex items-center gap-3 mb-3 px-1">
      <PlayerAvatar player={player} size={32} textSize="text-xs" className="flex-shrink-0" />
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <h2 className={`font-black truncate ${t.text}`}>{player?.name || '—'}</h2>
        {isWinner && (
          <span className="inline-flex flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
            {tr('battles.winner')}
          </span>
        )}
      </div>
      {saveButton}
    </div>
    {!pokemon || pokemon.length === 0 ? (
      <div className={`${t.surface} rounded-2xl p-6 text-center ${t.textSecondary} text-sm`}>
        Aucun Pokémon
      </div>
    ) : (
      <div className={`${t.surface} rounded-2xl overflow-hidden shadow-sm`}>
        {pokemon.map((pk, idx) => {
          const isLast = idx === pokemon.length - 1;
          return (
            <button
              key={pk.id || idx}
              onClick={() => onPokemonClick({ pokeId: pk.pokeId, name: pk.name })}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left ${!isLast ? `border-b ${t.divider}` : ''}`}
            >
              <img
                src={getPokemonImageUrl(pk.pokeId)}
                alt={pk.name}
                className={`w-10 h-10 object-contain flex-shrink-0 ${pk.eliminated ? 'grayscale opacity-50' : ''}`}
                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
              />
              <p className={`flex-1 font-semibold truncate text-left ${pk.eliminated ? `${t.textTertiary} line-through` : t.text}`}>
                {pk.name}
              </p>
              {pk.eliminated && (
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${t.dangerSoftBg} ${t.dangerSoftText}`}>
                  {tr('battles.eliminated')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    )}
  </section>
);

export const BattleDetail = ({
  battle,
  players,
  teams = [],
  t,
  isDark,
  onBack,
  onEdit,
  onDelete,
  onAddTeam,
  onUpdatePlayer,
  onViewPokemon,
  onPlayerClick,
  backLabel = 'Combats',
  initialScrollY = 0,
  isBackground = false,
}) => {
  const tr = useTranslation();
  const { dbUser, isSuperAdmin } = useAuth();
  const canEdit = isSuperAdmin || (battle && dbUser?.playerId && (
    String(battle.player1?._id ?? battle.player1) === String(dbUser.playerId) ||
    String(battle.player2?._id ?? battle.player2) === String(dbUser.playerId)
  ));
  const canDelete = isSuperAdmin || canEdit;

  const { getPokemonImageUrl } = usePokemon();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [savingTeamSlot, setSavingTeamSlot] = useState(null); // 'player1' | 'player2'
  const [namingTeamSlot, setNamingTeamSlot] = useState(null); // slot en cours de nommage
  const [teamNameInput, setTeamNameInput] = useState('');
  const [playerPickerSlot, setPlayerPickerSlot] = useState(null); // { name, battleTeam, format }
  const [playerSearch, setPlayerSearch] = useState('');
  const [pendingCopy, setPendingCopy] = useState(null); // { payload, targetPlayer, missingPokemon }
  const [isSavingCopy, setIsSavingCopy] = useState(false);
  const [showTypeDetail, setShowTypeDetail] = useState(false);
  const [mvpStats, setMvpStats] = useState(null);
  const [mvpArtwork, setMvpArtwork] = useState(null);
  const [scrolled, setScrolled] = useState(() => initialScrollY > 20);
  useEffect(() => {
    if (isBackground) return;
    const onScroll = () => {
      if (document.documentElement.style.overflow === 'hidden') return;
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isBackground]);
  const { isClosing: isConfirmClosing, handleClose: handleCancelDelete } = useAnimatedClose(
    () => setConfirmingDelete(false),
    180,
  );

  // Types des Pokémon des deux équipes (hook appelé avant le early return)
  const allPokeIds = useMemo(() => {
    if (!battle) return [];
    return [...new Set([
      ...(battle.team1 || []).map((p) => p.pokeId),
      ...(battle.team2 || []).map((p) => p.pokeId),
    ])];
  }, [battle]);
  const pokemonTypes = usePokemonTypes(allPokeIds);

  // MVP : survivant avec le plus d'avantages types contre l'équipe adverse
  const mvpPokemon = useMemo(() => {
    if (!battle) return null;
    const survivors = [
      ...(battle.team1 || []).filter((p) => !p.eliminated).map((p) => ({ ...p, _opp: battle.team2 || [] })),
      ...(battle.team2 || []).filter((p) => !p.eliminated).map((p) => ({ ...p, _opp: battle.team1 || [] })),
    ];
    if (survivors.length === 0) return null;
    const calcAdv = (pok) => {
      let score = 0;
      const myTypes = pokemonTypes[pok.pokeId] || [];
      for (const opp of pok._opp) {
        for (const mt of myTypes) {
          for (const ot of (pokemonTypes[opp.pokeId] || [])) {
            if ((TYPE_SUPER_EFFECTIVE[mt] || []).includes(ot)) score++;
          }
        }
      }
      return score;
    };
    return survivors.reduce((best, cur) => (calcAdv(cur) > calcAdv(best) ? cur : best));
  }, [battle, pokemonTypes]);

  useEffect(() => {
    if (!mvpPokemon) { setMvpStats(null); setMvpArtwork(null); return; }
    fetch(`https://pokeapi.co/api/v2/pokemon/${mvpPokemon.pokeId}`)
      .then((r) => r.json())
      .then((data) => {
        const s = {};
        (data.stats || []).forEach((st) => { s[st.stat.name] = st.base_stat; });
        setMvpStats(s);
        setMvpArtwork(
          data.sprites?.other?.['official-artwork']?.front_default || null
        );
      })
      .catch(() => { setMvpStats(null); setMvpArtwork(null); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mvpPokemon?.pokeId]);

  // Vérifie si une équipe identique (mêmes pokeIds) existe déjà pour un joueur
  const teamAlreadyExists = (playerId, battleTeam) => {
    const battlePokeIds = new Set((battleTeam || []).map((p) => p.pokeId));
    if (battlePokeIds.size === 0) return true;
    return teams.some((team) => {
      if (team.ownerId !== playerId) return false;
      const teamPokeIds = new Set((team.pokemon || []).map((p) => p.pokeId));
      if (teamPokeIds.size !== battlePokeIds.size) return false;
      return [...battlePokeIds].every((id) => teamPokeIds.has(id));
    });
  };

  // Peut sauvegarder l'équipe d'un slot donné
  // Regular user : peut sauvegarder n'importe quelle équipe (pour lui-même)
  // Super admin : peut toujours sauvegarder pour n'importe quel joueur
  const canSaveTeam = (slot) => {
    if (!onAddTeam) return false;
    const battleTeam = slot === 'player1' ? battle.team1 : battle.team2;
    if (!battleTeam?.length) return false;
    if (isSuperAdmin) return true;
    return !!dbUser?.playerId;
  };

  const openNamingModal = (slot) => {
    setTeamNameInput('');
    setNamingTeamSlot(slot);
  };

  const handleSaveTeam = () => {
    const slot = namingTeamSlot;
    const name = teamNameInput.trim();
    if (!name || !slot) return;
    const battleTeam = slot === 'player1' ? battle.team1 : battle.team2;
    if (!battleTeam?.length) return;
    setNamingTeamSlot(null);
    if (isSuperAdmin) {
      setPlayerPickerSlot({ name, battleTeam, format: battle.format });
    } else {
      const myPlayer = players.find((p) => String(p._id) === String(dbUser?.playerId));
      if (myPlayer) prepareOrSaveCopy({ name, battleTeam, format: battle.format }, myPlayer);
    }
  };

  const uniqueTeamName = (name, targetPlayer) => {
    const existing = new Set(
      teams.filter((t) => String(t.ownerId) === String(targetPlayer._id)).map((t) => t.name.toLowerCase())
    );
    if (!existing.has(name.toLowerCase())) return name;
    let i = 2;
    while (existing.has(`${name}-${i}`.toLowerCase())) i++;
    return `${name}-${i}`;
  };

  const prepareOrSaveCopy = ({ name, battleTeam, format }, targetPlayer) => {
    setPlayerPickerSlot(null);
    setPlayerSearch('');
    const existingIds = new Set((targetPlayer.pokemon || []).map((p) => p.pokeId));
    const missingPokemon = battleTeam.filter((p) => !existingIds.has(p.pokeId));
    const payload = {
      name: uniqueTeamName(name, targetPlayer),
      format,
      ownerId: targetPlayer._id,
      owner: targetPlayer.name,
      pokemon: battleTeam.map((p) => ({
        id: `${Date.now()}-${p.pokeId}-${Math.random().toString(36).slice(2, 7)}`,
        pokeId: p.pokeId,
        name: p.name,
      })),
    };
    if (missingPokemon.length > 0) {
      setPendingCopy({ payload, targetPlayer, missingPokemon });
    } else {
      execSaveCopy(payload, targetPlayer, [], false);
    }
  };

  const execSaveCopy = async (payload, targetPlayer, pokemonToAdd, asConcept) => {
    setIsSavingCopy(true);
    try {
      const finalPayload = asConcept
        ? {
            ...payload,
            isConcept: true,
            pokemon: payload.pokemon.map((p) => ({
              ...p,
              isConcept: pokemonToAdd.some((mp) => mp.pokeId === p.pokeId) ? true : undefined,
            })),
          }
        : payload;
      await onAddTeam(finalPayload);
      if (!asConcept && pokemonToAdd.length > 0 && onUpdatePlayer) {
        const toAdd = pokemonToAdd.map((p) => ({
          id: `${Date.now()}-${p.pokeId}-${Math.random().toString(36).slice(2, 7)}`,
          pokeId: p.pokeId,
          name: p.name,
          level: 50,
        }));
        await onUpdatePlayer(targetPlayer._id, {
          ...targetPlayer,
          pokemon: [...(targetPlayer.pokemon || []), ...toAdd],
        });
      }
    } finally {
      setIsSavingCopy(false);
    }
    setPendingCopy(null);
  };

  if (!battle) return null;

  const p1 = players.find((p) => p._id === battle.player1);
  const p2 = players.find((p) => p._id === battle.player2);
  const p1Elim = (battle.team1 || []).filter((p) => p.eliminated).length;
  const p2Elim = (battle.team2 || []).filter((p) => p.eliminated).length;
  const p1Alive = (battle.team1 || []).filter((p) => !p.eliminated).length;
  const p2Alive = (battle.team2 || []).filter((p) => !p.eliminated).length;
  const p1TypeAdv   = calcTypeAdvantage(battle.team1 || [], battle.team2 || [], pokemonTypes);
  const p2TypeAdv   = calcTypeAdvantage(battle.team2 || [], battle.team1 || [], pokemonTypes);
  const p1Matchups  = getTypeMatchups(battle.team1 || [], battle.team2 || [], pokemonTypes);
  const p2Matchups  = getTypeMatchups(battle.team2 || [], battle.team1 || [], pokemonTypes);
  const fmtAdv  = (n) => n > 0 ? `+${n}` : String(n);
  const advColor = (n) => n > 0 ? 'text-emerald-500' : n < 0 ? 'text-red-500' : '';
  const TypeBadge = ({ type }) => (
    <span
      className="inline-block rounded-full overflow-hidden flex-shrink-0"
      style={{ backgroundColor: TYPE_HEX[type] || '#828282' }}
    >
      <img
        src={`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${type}.svg`}
        alt={TYPE_FR[type] || type}
        className="w-4 h-4 object-contain block"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    </span>
  );

  const handleConfirmDelete = async () => {
    await onDelete(battle._id);
    setConfirmingDelete(false);
    onBack();
  };

  return (
    <>
    <div className="min-h-screen">
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10"
        data-scroll-gradient
        style={{
          background: isDark
            ? 'radial-gradient(130% 75% at 0% 0%, rgba(255,191,0,0.06) 0%, rgba(255,191,0,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(255,0,229,0.05) 0%, rgba(255,0,229,0) 100%), #09090b'
            : 'radial-gradient(130% 100% at 0% 0%, rgba(255,191,0,0.35) 0%, rgba(255,191,0,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(255,0,229,0.28) 0%, rgba(255,0,229,0) 100%), #EFF6F9',
        }}
      />
      {/* ── En-tête sticky ── */}
      <div
        className={`sticky top-0 ${isBackground ? 'z-[10000]' : 'z-10'} px-4 relative`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)', paddingBottom: '0.75rem' }}
      >
        <div className={`absolute inset-x-0 top-0 -bottom-12 pointer-events-none transition-opacity duration-300`} style={{
          opacity: scrolled ? 1 : 0,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
        }} />
        <div className={`absolute inset-x-0 top-0 -bottom-12 pointer-events-none transition-opacity duration-300`} style={{
          opacity: scrolled ? 1 : 0,
          background: isDark
            ? 'linear-gradient(to bottom, rgba(9,9,11,0.85) 0%, transparent 100%)'
            : 'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, transparent 100%)',
        }} />
        <div className="flex items-center justify-between relative">
          <button
            onClick={onBack}
            className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'}`}
            style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
            aria-label={tr('common.back')}
          >
            <ChevronLeft size={24} className="-translate-x-px" />
          </button>
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(battle)}
              className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'}`}
              style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
              aria-label={tr('common.edit')}
            >
              <Pencil size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="px-5 mt-1 pb-40 space-y-6">
        {/* ── Hero score ── */}
        <div className="flex items-center gap-3 w-full max-w-md mx-auto pb-4">
          {/* Joueur 1 */}
          <div
            className={`flex-1 min-w-0 flex flex-col items-center gap-1.5 ${onPlayerClick && p1 ? 'cursor-pointer active:scale-95 transition-transform duration-100' : ''}`}
            onClick={() => onPlayerClick && p1 && onPlayerClick(p1)}
          >
            <div className="relative flex-shrink-0">
              <PlayerAvatar player={p1} size={60} textSize="text-xl" />
              {battle.winner === 'player1' && (
                <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                  <Trophy size={10} strokeWidth={2.5} className="text-white" />
                </span>
              )}
            </div>
            <p className={`w-full truncate text-center font-black text-lg ${battle.winner === 'player1' ? t.success : t.text}`}>
              {p1?.name || '—'}
            </p>
          </div>
          {/* Format + Score + Date */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${battle.format === '1v1' ? (isDark ? 'bg-purple-300/10 text-purple-300' : 'bg-purple-600/10 text-purple-600') : (isDark ? 'bg-teal-300/10 text-teal-300' : 'bg-teal-600/10 text-teal-600')}`}>
              {battle.format}
            </span>
            <p className={`font-black text-4xl ${t.text} whitespace-nowrap leading-none`}>
              {p2Elim}–{p1Elim}
            </p>
            <div className={`flex items-center gap-1.5 ${t.textSecondary} text-sm`}>
              <Calendar size={13} />
              <span>{formatDate(battle.date)}</span>
            </div>
          </div>
          {/* Joueur 2 */}
          <div
            className={`flex-1 min-w-0 flex flex-col items-center gap-1.5 ${onPlayerClick && p2 ? 'cursor-pointer active:scale-95 transition-transform duration-100' : ''}`}
            onClick={() => onPlayerClick && p2 && onPlayerClick(p2)}
          >
            <div className="relative flex-shrink-0">
              <PlayerAvatar player={p2} size={60} textSize="text-xl" />
              {battle.winner === 'player2' && (
                <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                  <Trophy size={10} strokeWidth={2.5} className="text-white" />
                </span>
              )}
            </div>
            <p className={`w-full truncate text-center font-black text-lg ${battle.winner === 'player2' ? t.success : t.text}`}>
              {p2?.name || '—'}
            </p>
          </div>
        </div>

        {/* ── Équipes ── */}
        <TeamSection
          player={p1}
          isWinner={battle.winner === 'player1'}
          pokemon={battle.team1}
          getPokemonImageUrl={getPokemonImageUrl}
          t={t}
          tr={tr}
          onPokemonClick={(p) => onViewPokemon?.(p)}
          saveButton={canSaveTeam('player1') && (
            <button
              onClick={() => openNamingModal('player1')}
              disabled={savingTeamSlot === 'player1'}
              className={`flex items-center gap-1.5 text-xs font-semibold ${t.accent} disabled:opacity-50 flex-shrink-0`}
            >
              {savingTeamSlot === 'player1' ? <Loader2 size={14} className="animate-spin" /> : <BookmarkPlus size={14} />}
              Copier l'équipe
            </button>
          )}
        />
        <TeamSection
          player={p2}
          isWinner={battle.winner === 'player2'}
          pokemon={battle.team2}
          getPokemonImageUrl={getPokemonImageUrl}
          t={t}
          tr={tr}
          onPokemonClick={(p) => onViewPokemon?.(p)}
          saveButton={canSaveTeam('player2') && (
            <button
              onClick={() => openNamingModal('player2')}
              disabled={savingTeamSlot === 'player2'}
              className={`flex items-center gap-1.5 text-xs font-semibold ${t.accent} disabled:opacity-50 flex-shrink-0`}
            >
              {savingTeamSlot === 'player2' ? <Loader2 size={14} className="animate-spin" /> : <BookmarkPlus size={14} />}
              Copier l'équipe
            </button>
          )}
        />

        {/* ── Statistiques ── */}
        <section>
          <div className={`${t.surface} rounded-2xl overflow-hidden`}>
            {/* Titre */}
            <div className="px-4 pt-4 pb-1 text-center">
              <h2 className={`font-black text-xl ${t.text}`}>{tr('battles.stats')}</h2>
            </div>
            {/* En-têtes joueurs */}
            <div className={`flex items-center px-4 py-3 border-b ${t.divider}`}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <PlayerAvatar player={p1} size={28} textSize="text-xs" className="flex-shrink-0" />
                <span className={`font-black text-sm truncate ${t.text}`}>{p1?.name || '—'}</span>
              </div>
              <Swords size={15} className={`flex-shrink-0 mx-2 ${t.textTertiary}`} />
              <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
                <span className={`font-black text-sm truncate text-right ${t.text}`}>{p2?.name || '—'}</span>
                <PlayerAvatar player={p2} size={28} textSize="text-xs" className="flex-shrink-0" />
              </div>
            </div>
            {/* Lignes simples */}
            {[
              { label: 'Pokémon en vie', left: p1Alive, right: p2Alive },
              { label: 'KO infligés',    left: p2Elim,  right: p1Elim  },
              { label: 'KO subis',       left: p1Elim,  right: p2Elim  },
            ].map(({ label, left, right }) => (
              <div key={label} className={`flex items-center px-4 py-3 border-b ${t.divider}`}>
                <span className={`font-black text-xl w-12 ${t.text}`}>{left}</span>
                <span className={`flex-1 text-center text-sm font-semibold ${t.textSecondary}`}>{label}</span>
                <span className={`font-black text-xl w-12 text-right ${t.text}`}>{right}</span>
              </div>
            ))}

            {/* Ligne Avantage type — détaillée */}
            <div className="px-4 py-3">
              {/* Scores + bouton "?" */}
              <div className="flex items-center mb-3">
                <span className={`font-black text-xl w-12 ${advColor(p1TypeAdv) || t.text}`}>{fmtAdv(p1TypeAdv)}</span>
                <div className="flex-1 flex items-center justify-center gap-1.5">
                  <span className={`text-sm font-semibold ${t.textSecondary}`}>{tr('battles.typeAdvantage')}</span>
                  <button
                    onClick={() => setShowTypeDetail((v) => !v)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${showTypeDetail ? `${t.accentSoftBg} ${t.accent}` : `${t.surfaceMuted} ${t.textTertiary}`}`}
                    aria-label={showTypeDetail ? 'Masquer le détail' : 'Voir le détail'}
                  >
                    <HelpCircle size={12} strokeWidth={2.5} />
                  </button>
                </div>
                <span className={`font-black text-xl w-12 text-right ${advColor(p2TypeAdv) || t.text}`}>{fmtAdv(p2TypeAdv)}</span>
              </div>
              {/* Détails — animés, masqués par défaut (grid pour hauteur réelle) */}
              <div className={`grid transition-all duration-300 ${showTypeDetail ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden min-h-0">
                  {/* Détail P1 */}
                  {(p1Matchups.advantages.length > 0 || p1Matchups.weaknesses.length > 0) && (
                    <div className={`rounded-xl p-3 mb-2 space-y-1.5 ${t.surfaceMuted}`}>
                      {/* Header : avatar + nom */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <PlayerAvatar player={p1} size={28} textSize="text-xs" className="flex-shrink-0" />
                        <p className={`font-black text-sm ${t.text}`}>{p1?.name || '—'}</p>
                      </div>
                      {p1Matchups.advantages.length > 0 && (
                        <>
                          {p1Matchups.advantages.map(({ myType, myPokName, oppType, oppPokName }, i) => (
                            <div key={`adv-${i}`} className="flex items-center gap-1.5 text-xs">
                              <TypeBadge type={myType} />
                              <span className={`font-semibold ${t.text}`}>{myPokName}</span>
                              <span className={t.textTertiary}>›</span>
                              <TypeBadge type={oppType} />
                              <span className={t.textSecondary}>{oppPokName}</span>
                              <span className="ml-auto font-bold text-emerald-500">+1</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-500">Points gagnés</span>
                            <span className="text-sm font-black text-emerald-500">+{p1Matchups.advantages.length}</span>
                          </div>
                        </>
                      )}
                      {p1Matchups.weaknesses.length > 0 && (
                        <>
                          {p1Matchups.advantages.length > 0 && <div className={`border-t ${t.border} my-1.5`} />}
                          {p1Matchups.weaknesses.map(({ oppType, oppPokName, myType, myPokName }, i) => (
                            <div key={`weak-${i}`} className="flex items-center gap-1.5 text-xs">
                              <TypeBadge type={oppType} />
                              <span className={t.textSecondary}>{oppPokName}</span>
                              <span className={t.textTertiary}>›</span>
                              <TypeBadge type={myType} />
                              <span className={`font-semibold ${t.text}`}>{myPokName}</span>
                              <span className="ml-auto font-bold text-red-500">−1</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-[9px] font-bold uppercase tracking-wide text-red-500">Points perdus</span>
                            <span className="text-sm font-black text-red-500">−{p1Matchups.weaknesses.length}</span>
                          </div>
                        </>
                      )}
                      {/* Total global P1 */}
                      <div className={`flex items-center justify-between border-t ${t.border} pt-2 mt-1`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${t.textTertiary}`}>Total</span>
                        <span className={`text-base font-black ${advColor(p1TypeAdv) || t.text}`}>{fmtAdv(p1TypeAdv)}</span>
                      </div>
                    </div>
                  )}
                  {/* Détail P2 */}
                  {(p2Matchups.advantages.length > 0 || p2Matchups.weaknesses.length > 0) && (
                    <div className={`rounded-xl p-3 space-y-1.5 ${t.surfaceMuted}`}>
                      {/* Header : avatar + nom */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <PlayerAvatar player={p2} size={28} textSize="text-xs" className="flex-shrink-0" />
                        <p className={`font-black text-sm ${t.text}`}>{p2?.name || '—'}</p>
                      </div>
                      {p2Matchups.advantages.length > 0 && (
                        <>
                          {p2Matchups.advantages.map(({ myType, myPokName, oppType, oppPokName }, i) => (
                            <div key={`adv-${i}`} className="flex items-center gap-1.5 text-xs">
                              <TypeBadge type={myType} />
                              <span className={`font-semibold ${t.text}`}>{myPokName}</span>
                              <span className={t.textTertiary}>›</span>
                              <TypeBadge type={oppType} />
                              <span className={t.textSecondary}>{oppPokName}</span>
                              <span className="ml-auto font-bold text-emerald-500">+1</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-500">Points gagnés</span>
                            <span className="text-sm font-black text-emerald-500">+{p2Matchups.advantages.length}</span>
                          </div>
                        </>
                      )}
                      {p2Matchups.weaknesses.length > 0 && (
                        <>
                          {p2Matchups.advantages.length > 0 && <div className={`border-t ${t.border} my-1.5`} />}
                          {p2Matchups.weaknesses.map(({ oppType, oppPokName, myType, myPokName }, i) => (
                            <div key={`weak-${i}`} className="flex items-center gap-1.5 text-xs">
                              <TypeBadge type={oppType} />
                              <span className={t.textSecondary}>{oppPokName}</span>
                              <span className={t.textTertiary}>›</span>
                              <TypeBadge type={myType} />
                              <span className={`font-semibold ${t.text}`}>{myPokName}</span>
                              <span className="ml-auto font-bold text-red-500">−1</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-[9px] font-bold uppercase tracking-wide text-red-500">Points perdus</span>
                            <span className="text-sm font-black text-red-500">−{p2Matchups.weaknesses.length}</span>
                          </div>
                        </>
                      )}
                      {/* Total global P2 */}
                      <div className={`flex items-center justify-between border-t ${t.border} pt-2 mt-1`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${t.textTertiary}`}>Total</span>
                        <span className={`text-base font-black ${advColor(p2TypeAdv) || t.text}`}>{fmtAdv(p2TypeAdv)}</span>
                      </div>
                    </div>
                  )}
                  {/* Bouton masquer */}
                  <button
                    onClick={() => setShowTypeDetail(false)}
                    className={`w-full mt-2 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 ${t.textTertiary}`}
                  >
                    <ChevronUp size={13} strokeWidth={2.5} />
                    Masquer les détails
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pokémon du match ── */}
        {mvpPokemon && (() => {
          const primaryType = (pokemonTypes[mvpPokemon.pokeId] || [])[0];
          const bgColor = TYPE_HEX[primaryType] || '#828282';
          const bgColorAlpha = (() => {
            if (!bgColor.startsWith('#') || bgColor.length < 7) return bgColor;
            const r = parseInt(bgColor.slice(1, 3), 16);
            const g = parseInt(bgColor.slice(3, 5), 16);
            const b = parseInt(bgColor.slice(5, 7), 16);
            return `rgba(${r},${g},${b},0.28)`;
          })();
          return (
            <section>
              <div className={`${t.surface} rounded-2xl p-4`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`font-black text-base ${t.text}`}>{tr('battles.matchPokemon')}</h2>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                    ★ MVP
                  </span>
                </div>

                {/* Hero — cliquable pour ouvrir la fiche */}
                <button
                  onClick={() => onViewPokemon?.({ pokeId: mvpPokemon.pokeId, name: mvpPokemon.name })}
                  className="flex items-center gap-4 w-full text-left"
                >
                  {/* Image circulaire */}
                  <div
                    className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: bgColorAlpha, boxShadow: isDark ? '0 0 0 3px rgba(255,255,255,0.12)' : '0 0 0 3px rgba(0,0,0,0.07)' }}
                  >
                    <img
                      src={mvpArtwork || getPokemonImageUrl(mvpPokemon.pokeId)}
                      alt={mvpPokemon.name}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-mono font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      #{String(mvpPokemon.pokeId).padStart(4, '0')}
                    </p>
                    <p className={`font-black text-2xl leading-tight ${t.text} truncate`}>{mvpPokemon.name}</p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      {(pokemonTypes[mvpPokemon.pokeId] || []).map((type) => (
                        <span
                          key={type}
                          className="pl-1 inline-flex items-stretch rounded-full overflow-hidden"
                          style={{ backgroundColor: TYPE_HEX[type] || '#828282' }}
                        >
                          <img
                            src={`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${type}.svg`}
                            alt=""
                            className="w-6 h-6 object-contain flex-shrink-0"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <span className="self-center pr-3 text-xs font-bold text-white uppercase leading-none">
                            {TYPE_FR[type] || type}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight size={18} className={`flex-shrink-0 ${t.textTertiary}`} />
                </button>

                {/* Séparateur */}
                <div className={`my-4 border-t ${t.divider}`} />

                {/* Stats de base */}
                <p className={`text-[10px] font-bold uppercase tracking-widest ${t.textTertiary} mb-3`}>
                  Statistiques de base
                </p>
                {mvpStats ? (
                  <div className="grid grid-cols-6 gap-1">
                    {[
                      { key: 'hp',              label: 'PV',   color: 'bg-[#FF6B6B] text-white' },
                      { key: 'attack',          label: 'ATT',  color: 'bg-[#EE8130] text-white' },
                      { key: 'defense',         label: 'DEF',  color: 'bg-[#F7D02C] text-gray-900' },
                      { key: 'special-attack',  label: 'SATT', color: 'bg-[#6390F0] text-white' },
                      { key: 'special-defense', label: 'SDEF', color: 'bg-[#7AC74C] text-white' },
                      { key: 'speed',           label: 'VIT',  color: 'bg-[#A33EA1] text-white' },
                    ].map(({ key, label, color }) => (
                      <div key={key} className="flex flex-col items-center gap-1.5">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black ${color}`}>
                          {label}
                        </div>
                        <p className={`font-black text-sm ${t.text}`}>{mvpStats[key] ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`h-14 flex items-center justify-center ${t.textTertiary} text-sm`}>
                    Chargement…
                  </div>
                )}
              </div>
            </section>
          );
        })()}

        {/* ── Notes ── */}
        {battle.notes && (
          <section>
            <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} mb-3 px-1`}>
              Notes
            </h2>
            <div className={`${t.surface} rounded-2xl p-4 flex items-start gap-3`}>
              <FileText size={18} className={`${t.textTertiary} flex-shrink-0 mt-0.5`} />
              <p className={`${t.text} text-sm whitespace-pre-wrap`}>{battle.notes}</p>
            </div>
          </section>
        )}

        {/* ── Supprimer ── */}
        {canDelete && (
          <button
            onClick={() => setConfirmingDelete(true)}
            className={`w-full ${t.surface} ${t.danger} rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2 shadow-sm`}
          >
            <Trash2 size={18} />
            {tr('common.delete')}
          </button>
        )}
      </div>

      {/* ── Picker joueur (Super Admin) ── */}
      {playerPickerSlot && createPortal(
        <div className={`fixed inset-0 ${t.overlay} anim-fade-in z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full anim-scale-in`}>
            <div className="flex items-center gap-2 mb-1">
              <BookmarkPlus size={20} className={t.accent} />
              <p className={`font-black text-lg ${t.text}`}>Copier l'équipe pour…</p>
            </div>
            <p className={`${t.textSecondary} text-base mb-3`}>Choisis le joueur qui recevra cette équipe.</p>
            <div className={`flex items-center gap-2 ${t.surfaceMuted} rounded-xl px-3 py-2 mb-3`}>
              <Search size={15} className={t.textTertiary} />
              <input
                type="text"
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                placeholder="Rechercher…"
                className={`flex-1 bg-transparent outline-none ${t.text} text-sm`}
                style={{ fontSize: '16px' }}
              />
            </div>
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {(() => {
                const filtered = players.filter((p) => p.name.toLowerCase().includes(playerSearch.toLowerCase()));
                return filtered.length === 0
                  ? <p className={`${t.textSecondary} text-sm text-center py-4`}>Aucun résultat</p>
                  : filtered.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => prepareOrSaveCopy(playerPickerSlot, p)}
                      className={`w-full text-left py-2.5 rounded-xl font-semibold ${t.text} flex items-center gap-3`}
                    >
                      <PlayerAvatar player={p} size={32} textSize="text-[11px]" className="flex-shrink-0" />
                      {p.name}
                    </button>
                  ));
              })()}
            </div>
            <button
              onClick={() => { setPlayerPickerSlot(null); setPlayerSearch(''); }}
              className={`w-full mt-3 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
            >
              Annuler
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── Concept / roster choice ── */}
      {pendingCopy && createPortal(
        <div className={`fixed inset-0 ${t.overlay} anim-fade-in z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full anim-scale-in`}>
            <div className="flex items-center gap-2 mb-1">
              <Target size={20} className={t.accent} />
              <p className={`font-black text-lg ${t.text}`}>Pokémon non possédés</p>
            </div>
            <p className={`${t.textSecondary} text-base mb-3`}>
              {(() => {
                const isMe = String(pendingCopy.targetPlayer._id) === String(dbUser?.playerId);
                const collection = isMe ? 'ta collection' : `la collection de ${pendingCopy.targetPlayer.name}`;
                const names = pendingCopy.missingPokemon.map((p) => p.name).join(', ');
                return `${names} ${pendingCopy.missingPokemon.length === 1 ? "n'est pas" : "ne sont pas"} dans ${collection}. Que veux-tu faire ?`;
              })()}
            </p>
            <div className="grid grid-cols-6 gap-1 mb-5">
              {pendingCopy.missingPokemon.map((p) => (
                <img
                  key={p.pokeId}
                  src={getPokemonImageUrl(p.pokeId)}
                  alt={p.name}
                  className="w-full aspect-square object-contain"
                />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => execSaveCopy(pendingCopy.payload, pendingCopy.targetPlayer, pendingCopy.missingPokemon, true)}
                disabled={isSavingCopy}
                className={`relative w-full py-3 px-4 rounded-xl font-bold border flex items-center justify-center ${isDark ? 'bg-yellow-400/30 text-yellow-300 border-yellow-400/50' : 'bg-yellow-400/25 text-yellow-700 border-yellow-400/60'}`}
              >
                <Plus size={16} className="absolute left-4" />
                Créer une équipe Concept
              </button>
              <button
                onClick={() => execSaveCopy(pendingCopy.payload, pendingCopy.targetPlayer, pendingCopy.missingPokemon, false)}
                disabled={isSavingCopy}
                className={`w-full py-3 px-4 rounded-xl font-semibold ${t.accentSoftBg} ${t.accentSoftText}`}
              >
                Ajouter à la collection
              </button>
              <button
                onClick={() => setPendingCopy(null)}
                disabled={isSavingCopy}
                className={`w-full py-3 rounded-xl font-semibold ${t.textSecondary}`}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modale nommage équipe ── */}
      {namingTeamSlot && createPortal(
        <div className={`fixed inset-0 ${t.overlay} anim-fade-in z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full anim-scale-in`}>
            <p className={`font-black text-lg ${t.text} mb-4`}>
              Copier l'équipe de {namingTeamSlot === 'player1' ? p1?.name : p2?.name}
            </p>
            <input
              type="text"
              value={teamNameInput}
              onChange={(e) => setTeamNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && teamNameInput.trim()) handleSaveTeam(); }}
              autoFocus
              className={`w-full ${t.inputSoft} rounded-xl px-4 py-3 outline-none focus:ring-2 ${t.accentRing} mb-5`}
              placeholder="Nom de l'équipe"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setNamingTeamSlot(null)}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
              >
                {tr('common.cancel')}
              </button>
              <button
                onClick={handleSaveTeam}
                disabled={!teamNameInput.trim()}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.accentBg} text-white disabled:opacity-40`}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Modale confirmation ── */}
      {confirmingDelete && createPortal(
        <div className={`fixed inset-0 ${t.overlay} ${isConfirmClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isConfirmClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
            <p className={`font-black text-lg ${t.text} mb-1`}>{tr('battles.deleteTitle')}</p>
            <p className={`${t.textSecondary} text-sm mb-5`}>{tr('common.irreversible')}</p>
            <div className="flex gap-2">
              <button
                onClick={handleCancelDelete}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
              >
                {tr('common.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white`}
              >
                {tr('common.delete')}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>

    </>
  );
};
