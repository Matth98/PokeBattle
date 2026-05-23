import React, { useState } from 'react';
import { ChevronLeft, Pencil, Calendar, Trash2, FileText, Trophy } from 'lucide-react';
import { formatDate } from '../utils/dates';
import { usePokemon } from '../hooks/usePokemon';
import { useAnimatedClose } from '../hooks/useAnimatedClose';
import { PokemonDetailModal } from './PokemonDetailModal';
import { useAuth } from '../hooks/useAuth';
import { PlayerAvatar } from './PlayerAvatar';

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
  const { isClosing: isConfirmClosing, handleClose: handleCancelDelete } = useAnimatedClose(
    () => setConfirmingDelete(false),
    180,
  );

  if (!battle) return null;

  const p1 = players.find((p) => p._id === battle.player1);
  const p2 = players.find((p) => p._id === battle.player2);
  const p1Elim = (battle.team1 || []).filter((p) => p.eliminated).length;
  const p2Elim = (battle.team2 || []).filter((p) => p.eliminated).length;

  const handleConfirmDelete = async () => {
    await onDelete(battle._id);
    setConfirmingDelete(false);
    onBack();
  };

  return (
    <>
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
