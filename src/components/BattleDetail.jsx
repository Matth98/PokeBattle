import React, { useState } from 'react';
import { ChevronLeft, Pencil, Calendar, Trash2, FileText } from 'lucide-react';
import { formatDate } from '../utils/dates';
import { usePokemon } from '../hooks/usePokemon';

const TeamSection = ({ title, isWinner, pokemon, getPokemonImageUrl, t }) => (
  <section>
    <div className="flex items-center gap-2 mb-2 px-1">
      <h2 className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary}`}>{title}</h2>
      {isWinner && (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${t.successSoftBg} ${t.successSoftText}`}>
          Vainqueur
        </span>
      )}
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
            <div
              key={pk.id || idx}
              className={`flex items-center gap-3 px-4 py-3 ${!isLast ? `border-b ${t.divider}` : ''}`}
            >
              <img
                src={getPokemonImageUrl(pk.pokeId)}
                alt={pk.name}
                className={`w-10 h-10 object-contain flex-shrink-0 ${pk.eliminated ? 'grayscale opacity-50' : ''}`}
                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
              />
              <p className={`flex-1 font-semibold truncate ${pk.eliminated ? `${t.textTertiary} line-through` : t.text}`}>
                {pk.name}
              </p>
              {pk.eliminated && (
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${t.dangerSoftBg} ${t.dangerSoftText}`}>
                  Éliminé
                </span>
              )}
            </div>
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
  const { getPokemonImageUrl } = usePokemon();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
          {onEdit && (
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
        <div className="flex flex-col items-center text-center">
          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${t.accentSoftBg} ${t.accentSoftText} mb-4`}>
            {battle.format}
          </span>

          <div className="flex items-center gap-3 w-full max-w-md">
            <p className={`flex-1 min-w-0 truncate text-left font-black text-lg ${battle.winner === 'player1' ? t.accent : t.text}`}>
              {p1?.name || '—'}
            </p>
            <p className={`font-black text-4xl ${t.text} whitespace-nowrap`}>
              {p2Elim}–{p1Elim}
            </p>
            <p className={`flex-1 min-w-0 truncate text-right font-black text-lg ${battle.winner === 'player2' ? t.accent : t.text}`}>
              {p2?.name || '—'}
            </p>
          </div>

          <div className={`flex items-center gap-1.5 mt-3 ${t.textSecondary} text-sm`}>
            <Calendar size={13} />
            <span>{formatDate(battle.date)}</span>
          </div>
        </div>

        {/* ── Équipes ── */}
        <TeamSection
          title={p1?.name || 'Joueur 1'}
          isWinner={battle.winner === 'player1'}
          pokemon={battle.team1}
          getPokemonImageUrl={getPokemonImageUrl}
          t={t}
        />
        <TeamSection
          title={p2?.name || 'Joueur 2'}
          isWinner={battle.winner === 'player2'}
          pokemon={battle.team2}
          getPokemonImageUrl={getPokemonImageUrl}
          t={t}
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
        <button
          onClick={() => setConfirmingDelete(true)}
          className={`w-full ${t.surface} ${t.danger} rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2`}
        >
          <Trash2 size={18} />
          Supprimer ce combat
        </button>
      </div>

      {/* ── Modale confirmation ── */}
      {confirmingDelete && (
        <div className={`fixed inset-0 ${t.overlay} anim-fade-in z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full anim-scale-in`}>
            <p className={`font-black text-lg ${t.text} mb-1`}>Supprimer ce combat ?</p>
            <p className={`${t.textSecondary} text-sm mb-5`}>Cette action est définitive.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
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
  );
};
