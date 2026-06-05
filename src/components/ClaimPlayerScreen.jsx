import React, { useState } from 'react';
import { Swords, ArrowRight, Loader2 } from 'lucide-react';
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCreate();
  };

  // ── Écran d'onboarding (aucun profil à revendiquer) ──────────────────────
  if (availablePlayers.length === 0) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 pb-10 overflow-hidden"
        style={{
          background:
            'radial-gradient(130% 75% at 0% 0%, rgba(0,203,255,0.08) 0%, rgba(0,203,255,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(199,255,231,0.06) 0%, rgba(199,255,231,0) 100%), #09090b',
          paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)',
        }}
      >
        {/* App icon */}
        <div className="relative mb-10 select-none" aria-hidden="true">
          <img
            src="/Match-button.svg"
            alt=""
            className="w-28 h-28"
            style={{
              borderRadius: '100%',
              boxShadow: '0 0 40px rgba(139,92,246,0.60), 0 0 80px rgba(99,102,241,0.30)',
            }}
          />
        </div>

        {/* Titre + intro */}
        <div className="text-center mb-10 max-w-xs">
          <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
            Bienvenue dans<br />l'arène !
          </h1>
          <p className="text-zinc-400 mt-3 text-sm leading-relaxed">
            Crée ton profil de dresseur pour suivre tes combats, gérer tes équipes et affronter les autres joueurs.
          </p>
        </div>

        {/* Formulaire */}
        <div className="w-full max-w-sm space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Ton pseudo de dresseur"
              value={name}
              onChange={(e) => { setName(e.target.value); if (error) setError(''); }}
              onKeyDown={handleKeyDown}
              className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 rounded-2xl px-4 py-4 text-base outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all"
              maxLength={30}
              autoFocus
            />
            {name.trim().length > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-600 font-mono select-none">
                {name.trim().length}/30
              </span>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm pl-1">{error}</p>
          )}

          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Swords size={18} />
                Créer mon profil
                <ArrowRight size={16} className="ml-1 opacity-70" />
              </>
            )}
          </button>
        </div>

        {/* Baseline discrète */}
        <p className="text-zinc-700 text-xs mt-10 text-center">
          PokéScores ©{new Date().getFullYear()}
        </p>
      </div>
    );
  }

  // ── Écran de revendication (profils disponibles à choisir) ───────────────
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
            onKeyDown={handleKeyDown}
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
