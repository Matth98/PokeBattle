import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Pencil, Shield, BookmarkPlus, Target, Search, Plus } from 'lucide-react';
import { PlayerAvatar } from './PlayerAvatar';
import { ClearButton } from './ClearButton';
import { usePokemon } from '../hooks/usePokemon';
import { usePokemonTypes, TYPE_FR, TYPE_COLORS, TYPE_HEX } from '../hooks/usePokemonTypes';
import { useAuth } from '../hooks/useAuth';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useTranslation } from '../hooks/useTranslation';

export const TeamDetail = ({
  team,
  t,
  isDark,
  onBack,
  onEdit,
  onViewPokemon,
  onAddTeam,
  onUpdatePlayer,
  players = [],
  teams = [],
  backLabel = 'Équipes',
  initialScrollY = 0,
  isBackground = false,
}) => {
  const tr = useTranslation();
  const { dbUser, isSuperAdmin } = useAuth();
  const canEdit = isSuperAdmin ||
    (dbUser?._id && team?.userId && String(team.userId) === String(dbUser._id));

  // Bouton "Enregistrer" : visible si l'équipe n'appartient pas au joueur courant, ou toujours pour SA
  const canSave = onAddTeam && (
    isSuperAdmin || (dbUser?.playerId && String(team?.ownerId) !== String(dbUser?.playerId))
  );

  const [playerPickerOpen, setPlayerPickerOpen] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');
  const [pendingCopy, setPendingCopy] = useState(null); // { targetPlayer, missingPokemon, payload }
  const [isSavingCopy, setIsSavingCopy] = useState(false);
  useBodyScrollLock(playerPickerOpen || !!pendingCopy);

  const startSave = () => {
    if (isSuperAdmin) {
      setPlayerPickerOpen(true);
    } else {
      const myPlayer = players.find((p) => String(p._id) === String(dbUser?.playerId));
      if (myPlayer) prepareOrSaveCopy(myPlayer);
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

  const prepareOrSaveCopy = (targetPlayer) => {
    setPlayerPickerOpen(false);
    setPlayerSearch('');
    const existingIds = new Set((targetPlayer.pokemon || []).map((p) => p.pokeId));
    const missingPokemon = (team.pokemon || []).filter((p) => !existingIds.has(p.pokeId));
    const payload = {
      name: uniqueTeamName(team.name, targetPlayer),
      format: team.format,
      ownerId: targetPlayer._id,
      owner: targetPlayer.name,
      pokemon: (team.pokemon || []).map((p) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${p.pokeId}`,
        pokeId: p.pokeId,
        name: p.name,
      })),
    };
    if (missingPokemon.length > 0) {
      setPendingCopy({ targetPlayer, missingPokemon, payload });
    } else {
      saveCopy(payload, targetPlayer, []);
    }
  };

  const saveCopy = async (payload, targetPlayer, pokemonToAdd, asConcept = false) => {
    if (!onAddTeam) return;
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

  const { getPokemonImageUrl } = usePokemon();
  const rosterPokeIds = (team?.pokemon || []).map((p) => p.pokeId);
  const pokemonTypes = usePokemonTypes(rosterPokeIds);
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

  if (!team) return null;

  const thumbSlots = (team.pokemon || []).slice(0, 4);

  return (
    <>
    <div className="min-h-screen">
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10"
        data-scroll-gradient
        style={{
          background: isDark
            ? 'radial-gradient(130% 75% at 0% 0%, rgba(72,0,255,0.06) 0%, rgba(72,0,255,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(125,252,116,0.05) 0%, rgba(125,252,116,0) 100%), #09090b'
            : 'radial-gradient(130% 100% at 0% 0%, rgba(72,0,255,0.35) 0%, rgba(72,0,255,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(125,252,116,0.28) 0%, rgba(125,252,116,0) 100%), #EFF6F9',
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
          <div className="flex items-center gap-2">
            {canSave && (
              <button
                onClick={startSave}
                disabled={isSavingCopy}
                className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'}`}
                style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
                aria-label="Enregistrer cette équipe"
              >
                <BookmarkPlus size={20} />
              </button>
            )}
            {canEdit && onEdit && (
              <button
                onClick={() => onEdit(team)}
                className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'}`}
                style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
                aria-label={tr('common.edit')}
              >
                <Pencil size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 mt-1 space-y-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)' }}>
        {/* ── Hero ── */}
        <div className="flex flex-col items-center text-center">
          {/* Grosse miniature 2x2 */}
          <div className={`w-28 h-28 rounded-3xl ${isDark ? 'bg-white/[0.05]' : 'bg-white/30'} p-2 grid grid-cols-2 grid-rows-2 gap-1 mb-4`}>
            {[0, 1, 2, 3].map((i) => {
              const p = thumbSlots[i];
              return (
                <div key={i} className="flex items-center justify-center overflow-hidden">
                  {p ? (
                    <img
                      src={getPokemonImageUrl(p.pokeId)}
                      alt={p.name}
                      className="w-full h-full object-contain"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
          <h1 className={`text-2xl font-black tracking-tight ${t.text}`}>{team.name}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
            <PlayerAvatar player={players.find(p => String(p._id) === String(team.ownerId))} size={20} textSize="text-[8px]" />
            <p className={`${t.textSecondary} text-sm`}>{team.owner}</p>
            <span className={`${t.textSecondary} text-sm`}>·</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${team.format === '1v1' ? (isDark ? 'bg-purple-300/10 text-purple-300' : 'bg-purple-600/10 text-purple-600') : (isDark ? 'bg-teal-300/10 text-teal-300' : 'bg-teal-600/10 text-teal-600')}`}>
              {team.format}
            </span>
            {team.isConcept && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${isDark ? 'bg-yellow-400/20 text-yellow-300' : 'bg-yellow-400/20 text-yellow-700'}`}>
                Concept
              </span>
            )}
          </div>
        </div>

        {/* ── Pokémon ── */}
        <section>
          <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} mb-3 px-1`}>
            Pokémon ({team.pokemon?.length || 0})
          </h2>
          {!team.pokemon || team.pokemon.length === 0 ? (
            <div className={`${t.surface} rounded-2xl p-8 text-center`}>
              <div className={`w-12 h-12 mx-auto rounded-2xl ${t.iconTileIndigo} flex items-center justify-center mb-3`}>
                <Shield size={22} />
              </div>
              <p className={`${t.textSecondary} text-sm`}>{tr('teams.noTeamPokemon')}</p>
            </div>
          ) : (
            <div className={`${t.surface} rounded-2xl overflow-hidden shadow-sm`}>
              {team.pokemon.map((p, idx) => {
                const isLast = idx === team.pokemon.length - 1;
                const types = pokemonTypes[p.pokeId] || [];
                return (
                  <button
                    key={p.id}
                    onClick={() => onViewPokemon?.({ pokeId: p.pokeId, name: p.name })}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left ${!isLast ? `border-b ${t.divider}` : ''}`}
                  >
                    <img
                      src={getPokemonImageUrl(p.pokeId)}
                      alt={p.name}
                      className="w-11 h-11 object-contain flex-shrink-0"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${t.text} truncate`}>{p.name}</p>
                      {types.length > 0 && (
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
                      )}
                    </div>
                    {p.isConcept ? (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${isDark ? 'bg-yellow-400/20 text-yellow-300' : 'bg-yellow-400/20 text-yellow-700'}`}>
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="flex-shrink-0">
                          <circle cx="6" cy="6" r="5.4" stroke="currentColor" strokeWidth="1.2"/>
                          <line x1="0.6" y1="6" x2="4.5" y2="6" stroke="currentColor" strokeWidth="1.2"/>
                          <line x1="7.5" y1="6" x2="11.4" y2="6" stroke="currentColor" strokeWidth="1.2"/>
                          <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                        </svg>
                        À capturer
                      </span>
                    ) : (
                      <span className={`${t.textTertiary} text-xs font-mono`}>#{p.pokeId}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>

    {/* ── Picker joueur (Super Admin) ── */}
    {playerPickerOpen && createPortal(
      <div className={`fixed inset-0 ${t.overlay} anim-fade-in z-[9999] flex items-center justify-center p-4`}>
        <div className={`${t.surface} rounded-2xl p-6 w-full max-w-sm anim-scale-in`}>
          <div className="flex items-center gap-2 mb-1">
            <BookmarkPlus size={20} className={t.accent} />
            <p className={`font-black text-lg ${t.text}`}>Copier l'équipe pour…</p>
          </div>
          <p className={`${t.textSecondary} text-base mb-3`}>Choisis le joueur qui recevra cette équipe.</p>
          <div className={`flex items-center gap-2 ${t.surfaceMuted} rounded-xl px-3 py-2 mb-3`}>
            <Search size={15} className={t.textTertiary} aria-hidden="true" />
            <input
              type="text"
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              placeholder="Rechercher…"
              className={`flex-1 bg-transparent outline-none ${t.text} text-sm`}
              style={{ fontSize: '16px' }}
            />
            {playerSearch && (
              <ClearButton
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setPlayerSearch('')}
                color={t.clearIcon}
                strokeColor={t.clearStroke}
              />
            )}
          </div>
          <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
            {(() => {
              const filtered = players.filter((p) => p.name.toLowerCase().includes(playerSearch.toLowerCase()));
              return filtered.length === 0
                ? <p className={`${t.textSecondary} text-sm text-center py-4`}>Aucun résultat</p>
                : filtered.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => prepareOrSaveCopy(p)}
                    className={`w-full text-left py-2.5 rounded-xl font-semibold ${t.text} flex items-center gap-3 transition-colors`}
                  >
                    <PlayerAvatar player={p} size={32} textSize="text-[11px]" className="flex-shrink-0" />
                    {p.name}
                  </button>
                ));
            })()}
          </div>
          <button
            onClick={() => { setPlayerPickerOpen(false); setPlayerSearch(''); }}
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
        <div className={`${t.surface} rounded-2xl p-6 w-full max-w-sm anim-scale-in`}>
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
              onClick={() => saveCopy(pendingCopy.payload, pendingCopy.targetPlayer, pendingCopy.missingPokemon, true)}
              disabled={isSavingCopy}
              className={`relative w-full py-3 px-4 rounded-xl font-bold border flex items-center justify-center ${isDark ? 'bg-yellow-400/30 text-yellow-300 border-yellow-400/50' : 'bg-yellow-400/25 text-yellow-700 border-yellow-400/60'}`}
            >
              <Plus size={16} className="absolute left-4" />
              Créer une équipe Concept
            </button>
            <button
              onClick={() => saveCopy(pendingCopy.payload, pendingCopy.targetPlayer, pendingCopy.missingPokemon, false)}
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
    </>
  );
};
