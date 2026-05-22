import React from 'react';
import { X, Shield } from 'lucide-react';
import { usePokemon } from '../hooks/usePokemon';
import { useAnimatedClose } from '../hooks/useAnimatedClose';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export const TeamSelectorModal = ({
  t,
  isDark,
  teams = [],
  playerId,
  format,
  onSelect,
  onClose,
}) => {
  const { getPokemonImageUrl } = usePokemon();
  const { isClosing, handleClose } = useAnimatedClose(onClose, 240);
  useBodyScrollLock();
  const filtered = teams.filter(
    (team) => team.ownerId === playerId && team.format === format
  );

  return (
    <div className={`fixed inset-0 ${t.overlay} ${isClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex flex-col`}>
      <div className={`${t.surfaceModal} flex-1 overflow-hidden flex flex-col rounded-t-3xl ${isClosing ? 'anim-slide-down' : 'anim-slide-up'}`} style={{ marginTop: 'calc(env(safe-area-inset-top) + 3rem)' }}>
        {/* Grip + Header */}
        <div className={`${t.surface} px-5 pt-3 pb-4 border-b ${t.divider}`}>
          <div className={`w-10 h-1 ${t.surfaceMuted} rounded-full mx-auto mb-3`} aria-hidden="true" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-lg font-black ${t.text}`}>Sélectionner une équipe</h2>
              <p className={`${t.textSecondary} text-xs mt-0.5`}>Format {format}</p>
            </div>
            <button
              onClick={handleClose}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${t.surfaceMuted} ${t.text}`}
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Liste */}
        <div
          className="flex-1 overflow-y-auto px-5 pt-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        >
          {filtered.length === 0 ? (
            <div className={`${t.surface} rounded-2xl p-8 text-center mt-8`}>
              <div className={`w-12 h-12 mx-auto rounded-2xl ${t.iconTileIndigo} flex items-center justify-center mb-3`}>
                <Shield size={22} />
              </div>
              <p className={`${t.text} font-semibold mb-1`}>Aucune équipe en {format}</p>
              <p className={`${t.textSecondary} text-sm`}>
                Crée d'abord une équipe depuis l'onglet Équipes.
              </p>
            </div>
          ) : (
            <div className={`${t.surfaceMuted} rounded-2xl overflow-hidden`}>
              {filtered.map((team, idx) => {
                const thumbSlots = (team.pokemon || []).slice(0, 4);
                const isLast = idx === filtered.length - 1;
                return (
                  <button
                    key={team._id}
                    onClick={() => onSelect(team)}
                    className={`w-full flex items-center gap-3 p-3 text-left active:bg-black/5 dark:active:bg-white/5 ${
                      !isLast ? `border-b ${t.divider}` : ''
                    }`}
                  >
                    {/* Mini miniature 2x2 */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${t.surface} p-1 grid grid-cols-2 grid-rows-2 gap-0.5`}>
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
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${t.text} truncate`}>{team.name}</p>
                      <p className={`${t.textSecondary} text-xs mt-0.5`}>
                        {(team.pokemon || []).length} Pokémon
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
