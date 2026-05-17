import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { SwipeableRow } from './SwipeableRow';

export const Players = ({
  players,
  t,
  isDark,
  onSelectPlayer,
  onAddPlayer,
  onDeletePlayer,
  onDeleteMultiple,
  selectionMode,
  setSelectionMode,
  selectedItems,
  setSelectedItems,
  showForm,
  setShowForm
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [deletingSelected, setDeletingSelected] = useState(false);

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;
    await onAddPlayer(newPlayerName);
    setNewPlayerName('');
    setShowForm(false);
  };

  const handleDeleteMultiple = async () => {
    await onDeleteMultiple(selectedItems);
    setSelectionMode(null);
    setSelectedItems([]);
    setDeletingSelected(false);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${t.bg}`}>
      <div className={`${t.headerBg} pt-8 pb-6 px-6 border-b ${t.headerBorder}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className={`text-2xl font-black ${t.text}`}>👥 Joueurs</h1>
          <div className="flex gap-2">
            {selectionMode === 'players' ? (
              <>
                <button
                  onClick={() => {
                    setSelectionMode(null);
                    setSelectedItems([]);
                  }}
                  className={`border-2 px-3 py-1 rounded-full font-bold text-sm ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-600'}`}
                >
                  Annuler
                </button>
                <button
                  onClick={() => setSelectedItems(players.map(p => p._id))}
                  className="bg-blue-500 text-white px-3 py-1 rounded-full font-bold text-sm"
                >
                  Tout sélectionner
                </button>
                <button
                  onClick={() => setDeletingSelected(true)}
                  disabled={selectedItems.length === 0}
                  className={`bg-red-500 text-white px-3 py-1 rounded-full font-bold text-sm ${selectedItems.length === 0 ? 'opacity-50' : ''}`}
                >
                  🗑️ Supprimer
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm"
                >
                  + Nouveau
                </button>
                <button
                  onClick={() => setSelectionMode('players')}
                  className="bg-gray-500 text-white px-4 py-2 rounded-full font-bold text-sm"
                >
                  ✓ Sélectionner
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 mt-6 pb-32 space-y-3">
        {players.length === 0 ? (
          <div className="h-screen flex items-center justify-center -mt-20">
            <div className="text-center">
              <p className="text-6xl mb-4">👥</p>
              <h2 className={`text-2xl font-black ${t.text} mb-2`}>Aucun joueur</h2>
              <p className={`${t.textSecondary} mb-6`}>Crée un joueur pour commencer!</p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-orange-500 text-white px-6 py-3 rounded-full font-black"
              >
                + Créer un joueur
              </button>
            </div>
          </div>
        ) : (
          players.map(p => (
            <SwipeableRow
              key={p._id}
              onDelete={() => onDeletePlayer(p._id)}
              disabled={selectionMode === 'players'}
              className="rounded-2xl"
            >
              <div
                className={`${t.bgPrimary} rounded-2xl p-4 border ${selectedItems.includes(p._id) ? 'border-orange-500' : t.border} flex items-center gap-4`}
              >
                {selectionMode === 'players' && (
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(p._id)}
                    onChange={() =>
                      setSelectedItems(
                        selectedItems.includes(p._id)
                          ? selectedItems.filter(id => id !== p._id)
                          : [...selectedItems, p._id]
                      )
                    }
                    className="w-5 h-5"
                  />
                )}
                <button
                  onClick={() => !selectionMode && onSelectPlayer(p)}
                  disabled={selectionMode === 'players'}
                  className="flex-1 text-left disabled:opacity-50"
                >
                  <h3 className={`font-black ${t.text}`}>{p.name}</h3>
                  <p className={`${t.textSecondary} text-sm`}>
                    ⚔️ {(p.stats?.wins || 0) + (p.stats?.losses || 0)} combats · 🏆 {p.stats?.wins || 0}V
                  </p>
                </button>
                {selectionMode !== 'players' && <ChevronRight size={20} className={`flex-shrink-0 ${t.textSecondary}`} />}
              </div>
            </SwipeableRow>
          ))
        )}
      </div>

      {/* Modal confirmation suppression */}
      {deletingSelected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
          <div className={`${t.bgPrimary} rounded-2xl p-6 max-w-sm mx-4 border ${t.border}`}>
            <p className={`font-black ${t.text} mb-4`}>
              Supprimer {selectedItems.length} joueur{selectedItems.length > 1 ? 's' : ''} ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingSelected(false)}
                className={`flex-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} ${t.text} py-2 rounded-lg font-bold`}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteMultiple}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nouveau joueur */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex flex-col">
          <div className={`${t.bgPrimary} flex-1 overflow-y-auto flex flex-col`}>
            <div className="p-6 flex-1">
              <h2 className={`text-2xl font-black ${t.text} mb-4`}>Nouveau joueur</h2>
              <input
                type="text"
                placeholder="Nom"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className={`w-full border ${t.input} rounded-xl px-4 py-3`}
                autoFocus
              />
            </div>
            <div className={`border-t ${t.headerBorder} p-6`}>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setNewPlayerName('');
                  }}
                  className={`flex-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} ${t.text} py-3 rounded-xl font-bold`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddPlayer}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-black"
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
