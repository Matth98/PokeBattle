import React, { useState } from 'react';
import { Plus, ChevronRight, Trash2, X, Check, CheckSquare, Square, Users } from 'lucide-react';
import { SwipeableRow } from './SwipeableRow';

const AVATAR_PALETTE = [
  'bg-indigo-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-teal-500',
];
const avatarColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
};
const initials = (name = '?') => name.trim().charAt(0).toUpperCase() || '?';

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
  setShowForm,
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [deletingSelected, setDeletingSelected] = useState(false);

  const inSelection = selectionMode === 'players';

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
    <div className={`min-h-screen ${t.pageBg}`}>
      {/* ── En-tête sticky ── */}
      <div
        className={`${t.surfaceBlur} sticky top-0 z-10 px-5 pt-12 pb-3 border-b ${t.divider}`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2.5rem)' }}
      >
        <div className="flex justify-between items-center">
          <h1 className={`text-3xl font-black tracking-tight ${t.text}`}>Joueurs</h1>
          <div className="flex items-center gap-2">
            {inSelection ? (
              <>
                <button
                  onClick={() => setSelectedItems(players.map((p) => p._id))}
                  className={`px-3 h-9 rounded-full ${t.surfaceMuted} ${t.text} text-sm font-semibold`}
                >
                  Tout
                </button>
                <button
                  onClick={() => setDeletingSelected(true)}
                  disabled={selectedItems.length === 0}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${t.dangerBg} text-white ${selectedItems.length === 0 ? 'opacity-40' : ''}`}
                  aria-label="Supprimer la sélection"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => {
                    setSelectionMode(null);
                    setSelectedItems([]);
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${t.surfaceMuted} ${t.text}`}
                  aria-label="Annuler"
                >
                  <X size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setSelectionMode('players')}
                  disabled={players.length === 0}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${t.surfaceMuted} ${t.text} ${players.length === 0 ? 'opacity-40' : ''}`}
                  aria-label="Sélectionner"
                >
                  <CheckSquare size={18} />
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${t.accentBg} text-white`}
                  aria-label="Nouveau joueur"
                >
                  <Plus size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 pb-32">
        {players.length === 0 ? (
          <div className={`${t.surface} rounded-2xl p-10 text-center mt-12`}>
            <div className={`w-14 h-14 mx-auto rounded-2xl ${t.iconTileIndigo} flex items-center justify-center mb-4`}>
              <Users size={26} />
            </div>
            <p className={`${t.text} font-bold text-lg mb-1`}>Aucun joueur</p>
            <p className={`${t.textSecondary} text-sm mb-6`}>Crée un joueur pour commencer.</p>
            <button
              onClick={() => setShowForm(true)}
              className={`${t.accentBg} text-white px-5 py-2.5 rounded-full font-semibold inline-flex items-center gap-2`}
            >
              <Plus size={16} />
              Créer un joueur
            </button>
          </div>
        ) : (
          <div className={`${t.surface} rounded-2xl overflow-hidden`}>
            {players.map((p, idx) => {
              const isLast = idx === players.length - 1;
              const isSelected = selectedItems.includes(p._id);
              const battles = (p.stats?.wins || 0) + (p.stats?.losses || 0);
              return (
                <SwipeableRow
                  key={p._id}
                  onDelete={() => onDeletePlayer(p._id)}
                  disabled={inSelection}
                  className={!isLast ? `border-b ${t.divider}` : ''}
                >
                  <button
                    onClick={() =>
                      inSelection
                        ? setSelectedItems(
                            isSelected
                              ? selectedItems.filter((id) => id !== p._id)
                              : [...selectedItems, p._id]
                          )
                        : onSelectPlayer(p)
                    }
                    className={`w-full flex items-center gap-3 px-4 py-3 ${t.surface} active:bg-black/5 dark:active:bg-white/5 text-left`}
                  >
                    {inSelection && (
                      <span
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? `${t.accentBg} border-transparent` : `${t.textTertiary} border-current`}`}
                      >
                        {isSelected && <Check size={14} className="text-white" />}
                      </span>
                    )}

                    {/* Avatar coloré avec initiale */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-base ${avatarColor(p.name)} flex-shrink-0`}>
                      {initials(p.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${t.text} truncate`}>{p.name}</p>
                      <p className={`${t.textSecondary} text-xs mt-0.5`}>
                        {battles} combat{battles > 1 ? 's' : ''} · {p.stats?.wins || 0}V – {p.stats?.losses || 0}D
                      </p>
                    </div>

                    {!inSelection && <ChevronRight size={18} className={t.textTertiary} />}
                  </button>
                </SwipeableRow>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modale confirmation suppression multiple ── */}
      {deletingSelected && (
        <div className={`fixed inset-0 ${t.overlay} z-[9999] flex items-end sm:items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full`}>
            <p className={`font-black text-lg ${t.text} mb-1`}>
              Supprimer {selectedItems.length} joueur{selectedItems.length > 1 ? 's' : ''} ?
            </p>
            <p className={`${t.textSecondary} text-sm mb-5`}>Cette action est définitive.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingSelected(false)}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteMultiple}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white`}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale Nouveau joueur (form sheet iOS-like) ── */}
      {showForm && (
        <div className={`fixed inset-0 ${t.overlay} z-[9999] flex items-end justify-center`}>
          <div
            className={`${t.surface} w-full max-w-md rounded-t-3xl sm:rounded-3xl sm:mb-12 p-6`}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
          >
            <div className={`w-10 h-1 ${t.surfaceMuted} rounded-full mx-auto mb-5`} aria-hidden="true" />
            <h2 className={`text-xl font-black ${t.text} mb-4`}>Nouveau joueur</h2>
            <input
              type="text"
              placeholder="Nom du joueur"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              className={`w-full ${t.inputSoft} rounded-xl px-4 py-3 mb-5 outline-none focus:ring-2 ${t.accentRing}`}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowForm(false);
                  setNewPlayerName('');
                }}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
              >
                Annuler
              </button>
              <button
                onClick={handleAddPlayer}
                disabled={!newPlayerName.trim()}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.accentBg} text-white ${!newPlayerName.trim() ? 'opacity-40' : ''}`}
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
