import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, Pencil, Calendar, Trash2, FileText, Trophy, Swords, HelpCircle } from 'lucide-react';
import { formatDate } from '../utils/dates';
import { usePokemon } from '../hooks/usePokemon';
import { useAnimatedClose } from '../hooks/useAnimatedClose';
import { PokemonDetailModal } from './PokemonDetailModal';
import { useAuth } from '../hooks/useAuth';
import { PlayerAvatar } from './PlayerAvatar';
import { usePokemonTypes, TYPE_FR, TYPE_COLORS, TYPE_HEX } from '../hooks/usePokemonTypes';

// Table des super-efficacités (type attaquant → types défensifs faibles)
const TYPE_SUPER_EFFECTIVE = {
  normal:   [],
  fire:     ['grass', 'ice', 'bug', 'steel'],
  water:    ['fire', 'ground', 'rock'],
  electric: ['water', 'flying'],
  grass:    ['water', 'ground', 'rock'],
  ice:      ['grass', 'ground', 'flying', 'dragon'],
  fighting: ['normal', 'ice', 'rock', 'dark', 'steel'],
  poison:   ['grass', 'fairy'],
  ground:   ['fire', 'electric', 'poison', 'rock', 'steel'],
  flying:   ['grass', 'fighting', 'bug'],
  psychic:  ['fighting', 'poison'],
  bug:      ['grass', 'psychic', 'dark'],
  rock:     ['fire', 'ice', 'flying', 'bug'],
  ghost:    ['psychic', 'ghost'],
  dragon:   ['dragon'],
  dark:     ['psychic', 'ghost'],
  steel:    ['ice', 'rock', 'fairy'],
  fairy:    ['fighting', 'dragon', 'dark'],
};

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

const TeamSection = ({ player, isWinner, pokemon, getPokemonImageUrl, t, onPokemonClick }) => (
  <section>
    <div className="flex items-center gap-3 mb-3 px-1">
      <PlayerAvatar player={player} size={32} textSize="text-xs" className="flex-shrink-0" />
      <div className="flex items-center gap-2 min-w-0">
        <h2 className={`font-black truncate ${t.text}`}>{player?.name || '—'}</h2>
        {isWinner && (
          <span className={`inline-flex flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${t.successSoftBg} ${t.successSoftText}`}>
            Vainqueur
          </span>
        )}
      </div>
    </div>
    {!pokemon || pokemon.length === 0 ? (
      <div className={`${t.surface} rounded-2xl p-6 text-center ${t.textSecondary} text-sm`}>
        Aucun Pokémon
      </div>
    ) : (
      <div className={`${t.surface} rounded-2xl overflow-hidden`}>
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
                  Éliminé
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
  t,
  isDark,
  onBack,
  onEdit,
  onDelete,
  backLabel = 'Combats',
}) => {
  const { dbUser, isSuperAdmin } = useAuth();
  const canEdit = isSuperAdmin || !battle?.createdBy || (battle && dbUser?.playerId && (
    String(battle.player1?._id ?? battle.player1) === String(dbUser.playerId) ||
    String(battle.player2?._id ?? battle.player2) === String(dbUser.playerId)
  ));
  const canDelete = isSuperAdmin ||
    !battle?.createdBy ||
    (battle && dbUser?._id && String(battle.createdBy) === String(dbUser._id));

  const { getPokemonImageUrl } = usePokemon();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [viewingPokemon, setViewingPokemon] = useState(null);
  const [showTypeDetail, setShowTypeDetail] = useState(false);
  const [mvpStats, setMvpStats] = useState(null);
  const [mvpArtwork, setMvpArtwork] = useState(null);
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
  }, [mvpPokemon?.pokeId]);

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
        className="w-5 h-5 object-contain block"
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
    <div
      className="min-h-screen"
      style={{
        background: isDark
          ? 'radial-gradient(ellipse 130% 75% at 0% 0%, rgba(0,255,150,0.06) 0%, rgba(0,255,150,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(239,186,37,0.05) 0%, rgba(239,186,37,0) 100%), #09090b'
          : 'radial-gradient(ellipse 130% 75% at 0% 0%, rgba(0,255,150,0.35) 0%, rgba(0,255,150,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(239,186,37,0.28) 0%, rgba(239,186,37,0) 100%), #EFF6F9',
      }}
    >
      {/* ── En-tête sticky ── */}
      <div
        className={`${t.surfaceBlur} sticky top-0 z-10 px-4 border-b ${t.divider}`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)', paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className={`flex items-center gap-1 -ml-1 ${t.accent} font-semibold`}
            aria-label="Retour"
          >
            <ChevronLeft size={22} />
            <span className="text-base">{backLabel}</span>
          </button>
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(battle)}
              className={`flex items-center gap-1 ${t.accent} font-semibold`}
            >
              <Pencil size={16} />
              <span className="text-base">Modifier</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-5 mt-6 pb-32 space-y-6">
        {/* ── Hero score ── */}
        <div className="flex items-center gap-3 w-full max-w-md mx-auto pb-4">
          {/* Joueur 1 */}
          <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5">
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
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${battle.format === '1v1' ? (isDark ? 'bg-pink-500/15 text-pink-300' : 'bg-pink-50 text-pink-600') : `${t.accentSoftBg} ${t.accentSoftText}`}`}>
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
          <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5">
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
          onPokemonClick={(p) => setViewingPokemon(p)}
        />
        <TeamSection
          player={p2}
          isWinner={battle.winner === 'player2'}
          pokemon={battle.team2}
          getPokemonImageUrl={getPokemonImageUrl}
          t={t}
          onPokemonClick={(p) => setViewingPokemon(p)}
        />

        {/* ── Statistiques ── */}
        <section>
          <div className={`${t.surface} rounded-2xl overflow-hidden`}>
            {/* Titre */}
            <div className="px-4 pt-4 pb-1 text-center">
              <h2 className={`font-black text-xl ${t.text}`}>Statistiques</h2>
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
                  <span className={`text-sm font-semibold ${t.textSecondary}`}>Avantage type</span>
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
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${t.textTertiary} mb-2`}>{p1?.name || '—'}</p>
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
                      {p1Matchups.weaknesses.map(({ oppType, oppPokName, myType, myPokName }, i) => (
                        <div key={`weak-${i}`} className="flex items-center gap-1.5 text-xs">
                          <TypeBadge type={oppType} />
                          <span className={`font-semibold ${t.text}`}>{oppPokName}</span>
                          <span className={t.textTertiary}>›</span>
                          <TypeBadge type={myType} />
                          <span className={t.textSecondary}>{myPokName}</span>
                          <span className="ml-auto font-bold text-red-500">−1</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Détail P2 */}
                  {(p2Matchups.advantages.length > 0 || p2Matchups.weaknesses.length > 0) && (
                    <div className={`rounded-xl p-3 space-y-1.5 ${t.surfaceMuted}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${t.textTertiary} mb-2`}>{p2?.name || '—'}</p>
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
                      {p2Matchups.weaknesses.map(({ oppType, oppPokName, myType, myPokName }, i) => (
                        <div key={`weak-${i}`} className="flex items-center gap-1.5 text-xs">
                          <TypeBadge type={oppType} />
                          <span className={`font-semibold ${t.text}`}>{oppPokName}</span>
                          <span className={t.textTertiary}>›</span>
                          <TypeBadge type={myType} />
                          <span className={t.textSecondary}>{myPokName}</span>
                          <span className="ml-auto font-bold text-red-500">−1</span>
                        </div>
                      ))}
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
          return (
            <section>
              <div className={`${t.surface} rounded-2xl p-4`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`font-black text-base ${t.text}`}>Pokémon du match</h2>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                    ★ MVP
                  </span>
                </div>

                {/* Hero — cliquable pour ouvrir la fiche */}
                <button
                  onClick={() => setViewingPokemon({ pokeId: mvpPokemon.pokeId, name: mvpPokemon.name })}
                  className="flex items-center gap-4 w-full text-left"
                >
                  {/* Image circulaire */}
                  <div
                    className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: bgColor, boxShadow: isDark ? '0 0 0 3px rgba(255,255,255,0.12)' : '0 0 0 3px rgba(0,0,0,0.07)' }}
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
            className={`w-full ${t.surface} ${t.danger} rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2`}
          >
            <Trash2 size={18} />
            Supprimer ce combat
          </button>
        )}
      </div>

      {/* ── Modale confirmation ── */}
      {confirmingDelete && (
        <div className={`fixed inset-0 ${t.overlay} ${isConfirmClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isConfirmClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
            <p className={`font-black text-lg ${t.text} mb-1`}>Supprimer ce combat ?</p>
            <p className={`${t.textSecondary} text-sm mb-5`}>Cette action est définitive.</p>
            <div className="flex gap-2">
              <button
                onClick={handleCancelDelete}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDelete}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white`}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    {viewingPokemon && (
      <PokemonDetailModal
        pokeId={viewingPokemon.pokeId}
        pokeName={viewingPokemon.name}
        t={t}
        isDark={isDark}
        onClose={() => setViewingPokemon(null)}
      />
    )}
    </>
  );
};
