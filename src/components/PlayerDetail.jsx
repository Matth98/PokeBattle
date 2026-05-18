import React, { useState, useRef } from 'react';
import { ChevronLeft, Plus, Trophy, Zap, AlertTriangle, Camera } from 'lucide-react';
import { usePokemon } from '../hooks/usePokemon';
import { PokemonPicker } from './PokemonPicker';
import { SwipeableRow } from './SwipeableRow';
import { PlayerAvatar } from './PlayerAvatar';
import { resizeImageToDataUrl } from '../utils/imageResize';

export const PlayerDetail = ({
  player,
  teams = [],
  t,
  onBack,
  onUpdate,
  onUpdateTeam,
  isDark,
}) => {
  const [addingPokemon, setAddingPokemon] = useState(false);
  const { getPokemonImageUrl } = usePokemon();
  const [deletingPokemon, setDeletingPokemon] = useState(null);
  const fileInputRef = useRef(null);

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

  if (!player) return null;

  const wins = player.stats?.wins || 0;
  const losses = player.stats?.losses || 0;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : null;

  return (
    <div className={`min-h-screen ${t.pageBg}`}>
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
            <span className="text-base">Joueurs</span>
          </button>
        </div>
      </div>

      <div className="px-5 mt-6 pb-32 space-y-6">
        {/* ── Hero ── */}
        <div className="flex flex-col items-center text-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative mb-3"
            aria-label="Changer la photo"
          >
            <PlayerAvatar player={player} size={96} textSize="text-4xl" />
            <div className={`absolute bottom-0 right-0 w-8 h-8 rounded-full ${t.accentBg} text-white flex items-center justify-center border-4 ${isDark ? 'border-black' : 'border-gray-50'}`}>
              <Camera size={14} />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarPick}
            className="hidden"
          />
          <h1 className={`text-2xl font-black tracking-tight ${t.text}`}>{player.name}</h1>
          <p className={`${t.textSecondary} text-sm mt-1`}>
            {total} combat{total > 1 ? 's' : ''}
            {winRate !== null && ` · ${winRate}% de victoires`}
          </p>
          {player.avatar && (
            <button
              onClick={() => onUpdate(player._id, { ...player, avatar: null })}
              className={`mt-2 ${t.danger} text-xs font-semibold`}
            >
              Retirer la photo
            </button>
          )}
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

        {/* ── Pokémon ── */}
        <section>
          <div className="flex justify-between items-baseline mb-3 px-1">
            <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary}`}>
              Pokémon ({player.pokemon?.length || 0})
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
              {player.pokemon.map((p, idx) => {
                const isLast = idx === player.pokemon.length - 1;
                return (
                  <SwipeableRow
                    key={p.id}
                    onDelete={() => setDeletingPokemon(p.id)}
                    surfaceClass={t.surface}
                    className={!isLast ? `border-b ${t.divider}` : ''}
                  >
                    <div className={`flex items-center gap-3 px-4 py-3 ${t.surface}`}>
                      <img
                        src={getPokemonImageUrl(p.pokeId)}
                        alt={p.name}
                        className="w-11 h-11 object-contain flex-shrink-0"
                        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${t.text} truncate`}>{p.name}</p>
                        <p className={`${t.textSecondary} text-xs mt-0.5`}>Niveau {p.level}</p>
                      </div>
                      <span className={`${t.textTertiary} text-xs font-mono`}>#{p.pokeId}</span>
                    </div>
                  </SwipeableRow>
                );
              })}
            </div>
          )}
        </section>
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

      {/* ── Modal Confirmation suppression ── */}
      {deletingPokemon && (
        <div className={`fixed inset-0 ${t.overlay} z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full`}>
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
                          <span className={`inline-flex flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${t.accentSoftBg} ${t.accentSoftText}`}>
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
                onClick={() => setDeletingPokemon(null)}
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
    </div>
  );
};
