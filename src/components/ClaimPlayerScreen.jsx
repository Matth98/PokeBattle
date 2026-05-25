// src/components/ClaimPlayerScreen.jsx
import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Shown on first login when dbUser.playerId === null.
 * Lets the user claim an existing player or create a new profile.
 *
 * Props:
 *   availablePlayers  — list of Players with userId: null
 *   onClaim(playerId) — calls PATCH /api/users/me/claim-player
 *   onCreatePlayer({ name, avatar }) — calls POST /api/users/me/create-player
 *   loading           — spinner during request
 */
export function ClaimPlayerScreen({ availablePlayers, onClaim, onCreatePlayer, loading }) {
  const tr = useTranslation();
  const [creating, setCreating] = useState(false);
  const [name, setName]         = useState('');
  const [error, setError]       = useState('');

  const handleCreate = async () => {
    if (!name.trim()) { setError(tr('claim.nameError')); return; }
    setError('');
    await onCreatePlayer({ name: name.trim(), avatar: null });
    setName('');
    setCreating(false);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-start pt-16 px-6 pb-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-black text-white">{tr('claim.title')}</h1>
        <p className="text-gray-400 mt-2 text-sm">
          {tr('claim.subtitle')}
        </p>
      </div>

      {/* Available players list */}
      <div className="w-full max-w-sm space-y-2 mb-4">
        {availablePlayers.map((player) => (
          <button
            key={player._id}
            onClick={() => onClaim(player._id)}
            disabled={loading}
            className="w-full flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800
                       text-white font-medium py-3.5 px-4 rounded-xl transition-colors
                       disabled:opacity-50"
          >
            {player.avatar ? (
              <img
                src={player.avatar}
                alt={player.name}
                onError={(e) => { e.target.style.display='none'; }}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-purple-700 flex items-center justify-center
                              text-white font-bold flex-shrink-0">
                {player.name[0]?.toUpperCase()}
              </div>
            )}
            <span>{player.name}</span>
          </button>
        ))}

        {availablePlayers.length === 0 && !creating && (
          <p className="text-center text-gray-500 text-sm py-4">
            Aucune fiche disponible — crée ton profil ci-dessous.
          </p>
        )}
      </div>

      {/* Separator */}
      {!creating && (
        <div className="w-full max-w-sm flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-xs text-gray-500">ou</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>
      )}

      {/* Create form */}
      {creating ? (
        <div className="w-full max-w-sm space-y-3">
          <label htmlFor="playerName" className="sr-only">Nom du joueur</label>
          <input
            id="playerName"
            type="text"
            placeholder={tr('claim.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-900 text-white placeholder-gray-500 rounded-xl
                       px-4 py-3.5 outline-none focus:ring-2 focus:ring-purple-500"
            maxLength={30}
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold
                       py-3.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? tr('common.loading') : tr('claim.createBtn')}
          </button>
          <button
            onClick={() => { setCreating(false); setError(''); }}
            className="w-full text-gray-400 text-sm py-2"
          >
            {tr('common.cancel')}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full max-w-sm bg-purple-600 hover:bg-purple-500 text-white
                     font-semibold py-3.5 rounded-xl transition-colors"
        >
          {tr('claim.create')}
        </button>
      )}

      {loading && !creating && (
        <div className="mt-6 flex items-center gap-2 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          Liaison en cours…
        </div>
      )}
    </div>
  );
}
