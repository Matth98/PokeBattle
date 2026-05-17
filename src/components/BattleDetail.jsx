import React, { useState } from 'react';
import { formatDate } from '../utils/dates';
import { usePokemon } from '../hooks/usePokemon';

export const BattleDetail = ({
  battle,
  players,
  t,
  isDark,
  onBack,
  onEdit,
  onDelete
}) => {
  const { getPokemonImageUrl } = usePokemon();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!battle) return null;

  const handleConfirmDelete = async () => {
    await onDelete(battle._id);
    setConfirmingDelete(false);
    onBack(); // retour à la page précédente
  };

  const p1 = players.find(p => p._id === battle.player1);
  const p2 = players.find(p => p._id === battle.player2);
  const p1Elim = (battle.team1 || []).filter(p => p.eliminated).length;
  const p2Elim = (battle.team2 || []).filter(p => p.eliminated).length;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${t.bg}`}>
      <div className={`${t.headerBg} pt-8 pb-6 px-6 border-b ${t.headerBorder}`}>
        <div className="flex justify-between items-start mb-6">
          <button onClick={onBack} className="text-orange-500 font-bold">
            ← Retour
          </button>
          <button
            onClick={() => onEdit(battle)}
            className="bg-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm"
          >
            ✏️ Modifier
          </button>
        </div>

        <div className="text-center space-y-4">
          <span className="inline-block bg-orange-500 bg-opacity-20 text-orange-500 px-3 py-1 rounded-full font-bold text-sm">
            {battle.format}
          </span>
          <div className="flex items-center gap-3">
            <p className={`flex-1 min-w-0 truncate text-left font-black text-lg ${battle.winner === 'player1' ? 'text-orange-500' : t.text}`}>
              {p1?.name}
            </p>
            <p className="font-black text-3xl text-orange-500 whitespace-nowrap">{p2Elim} - {p1Elim}</p>
            <p className={`flex-1 min-w-0 truncate text-right font-black text-lg ${battle.winner === 'player2' ? 'text-orange-500' : t.text}`}>
              {p2?.name}
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className={`${t.textSecondary} text-sm flex items-center justify-center gap-2`}>
            <span>📅</span>
            <span>{formatDate(battle.date)}</span>
          </p>
        </div>
      </div>

      <div className="px-6 mt-6 pb-32 space-y-4">
        {/* Pokémon Joueur 1 */}
        <div className={`${t.bgPrimary} rounded-2xl p-6 border border-orange-500`}>
          <h3 className={`font-black ${t.text} mb-4`}>Pokémon de {p1?.name}</h3>
          {battle.team1 && battle.team1.length > 0 ? (
            <div className="space-y-2">
              {battle.team1.map(pk => (
                <div
                  key={pk.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    pk.eliminated ? 'opacity-50 line-through border-red-500' : t.border
                  }`}
                >
                  <img src={getPokemonImageUrl(pk.pokeId)} alt={pk.name} className="w-8 h-8" />
                  <p className={`font-bold ${t.text}`}>{pk.name}</p>
                  {pk.eliminated && <span className="ml-auto text-red-500 font-bold text-xs">Éliminé</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className={t.textSecondary}>Aucun pokémon</p>
          )}
        </div>

        {/* Pokémon Joueur 2 */}
        <div className={`${t.bgPrimary} rounded-2xl p-6 border border-red-500`}>
          <h3 className={`font-black ${t.text} mb-4`}>Pokémon de {p2?.name}</h3>
          {battle.team2 && battle.team2.length > 0 ? (
            <div className="space-y-2">
              {battle.team2.map(pk => (
                <div
                  key={pk.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    pk.eliminated ? 'opacity-50 line-through border-red-500' : t.border
                  }`}
                >
                  <img src={getPokemonImageUrl(pk.pokeId)} alt={pk.name} className="w-8 h-8" />
                  <p className={`font-bold ${t.text}`}>{pk.name}</p>
                  {pk.eliminated && <span className="ml-auto text-red-500 font-bold text-xs">Éliminé</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className={t.textSecondary}>Aucun pokémon</p>
          )}
        </div>

        {/* Notes */}
        {battle.notes && (
          <div className={`${t.bgPrimary} rounded-2xl p-6 border ${t.border}`}>
            <p className={`font-bold ${t.text} mb-2`}>Notes</p>
            <p className={`${t.textSecondary}`}>{battle.notes}</p>
          </div>
        )}

        {/* Supprimer */}
        <button
          onClick={() => setConfirmingDelete(true)}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-black mt-6"
        >
          🗑️ Supprimer ce combat
        </button>
      </div>

      {/* Modale de confirmation suppression */}
      {confirmingDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center px-4">
          <div className={`${t.bgPrimary} rounded-2xl p-6 max-w-sm w-full border ${t.border}`}>
            <p className={`font-black text-lg ${t.text} mb-2`}>Supprimer ce combat ?</p>
            <p className={`${t.textSecondary} text-sm mb-5`}>
              Cette action est définitive.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmingDelete(false)}
                className={`flex-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} ${t.text} py-3 rounded-lg font-bold`}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg font-bold"
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
