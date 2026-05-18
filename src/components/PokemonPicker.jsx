import React, { useState } from 'react';
import { Search, X, Check } from 'lucide-react';
import { usePokemon } from '../hooks/usePokemon';

/**
 * Modal de recherche/sélection d'un Pokémon. Full-screen sheet iOS.
 *
 * Props :
 * - t, isDark : thème
 * - title : titre de la sheet
 * - onSelect(pokemon) : appelé quand l'utilisateur choisit un Pokémon
 * - onClose() : fermeture
 * - alreadyPickedIds : tableau de pokeId déjà sélectionnés (grisés)
 * - defaultResults : liste affichée quand la recherche est vide (ex: roster du joueur)
 * - defaultLabel : libellé au-dessus de defaultResults
 */
export const PokemonPicker = ({
  t,
  isDark,
  title = 'Ajouter un Pokémon',
  onSelect,
  onClose,
  alreadyPickedIds = [],
  defaultResults = null,
  defaultLabel = null,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { searchResults, searchLoading, error, searchPokemon, getPokemonImageUrl } = usePokemon();

  const hasQuery = searchTerm.trim().length > 0;
  const displayed = hasQuery ? searchResults : (defaultResults || []);
  const showDefaultLabel = !hasQuery && defaultLabel && (defaultResults?.length ?? 0) > 0;

  return (
    <div className={`fixed inset-0 ${t.overlay} anim-fade-in z-[9999] flex flex-col`}>
      <div className={`${t.surface} flex-1 overflow-hidden flex flex-col mt-12 sm:mt-20 rounded-t-3xl anim-slide-up`}>
        {/* Grip + Header */}
        <div
          className={`${t.surfaceBlur} px-5 pt-3 pb-3 border-b ${t.divider}`}
        >
          <div className={`w-10 h-1 ${t.surfaceMuted} rounded-full mx-auto mb-3`} aria-hidden="true" />
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-black ${t.text}`}>{title}</h2>
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${t.surfaceMuted} ${t.text}`}
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search bar iOS-like */}
          <div className={`mt-3 flex items-center gap-2 ${t.surfaceMuted} rounded-xl px-3 py-2`}>
            <Search size={16} className={t.textTertiary} />
            <input
              type="text"
              placeholder="Rechercher (ex: Pikachu, Dracaufeu...)"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                searchPokemon(e.target.value);
              }}
              className={`flex-1 bg-transparent outline-none ${t.text} placeholder:${t.textTertiary} text-base`}
              autoFocus
            />
            {hasQuery && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  searchPokemon('');
                }}
                className={`${t.textTertiary} flex-shrink-0`}
                aria-label="Effacer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
          {error && (
            <p className={`${t.danger} text-sm text-center mb-2`}>Erreur : {error}</p>
          )}
          {searchLoading && (
            <p className={`${t.textSecondary} text-sm text-center`}>Recherche...</p>
          )}
          {!searchLoading && hasQuery && searchResults.length === 0 && !error && (
            <p className={`${t.textSecondary} text-sm text-center mt-8`}>Aucun résultat</p>
          )}
          {!hasQuery && (!defaultResults || defaultResults.length === 0) && (
            <p className={`${t.textSecondary} text-sm text-center mt-8`}>Tape pour rechercher un Pokémon</p>
          )}

          {showDefaultLabel && (
            <p className={`${t.textSecondary} text-xs font-bold uppercase tracking-wide mb-2 px-1`}>
              {defaultLabel}
            </p>
          )}

          {displayed.length > 0 && (
            <div className={`${t.surfaceMuted} rounded-2xl overflow-hidden`}>
              {displayed.map((p, idx) => {
                const isPicked = alreadyPickedIds.includes(p.pokeId);
                const isLast = idx === displayed.length - 1;
                return (
                  <button
                    key={p.pokeId}
                    onClick={() => !isPicked && onSelect(p)}
                    disabled={isPicked}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                      !isLast ? `border-b ${t.divider}` : ''
                    } ${isPicked ? 'opacity-40 cursor-not-allowed' : 'active:bg-black/5 dark:active:bg-white/5'}`}
                  >
                    <img
                      src={getPokemonImageUrl(p.pokeId)}
                      alt={p.name}
                      className="w-10 h-10 object-contain flex-shrink-0"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                    <span className={`flex-1 font-semibold ${t.text} truncate`}>{p.name}</span>
                    <span className={`${t.textTertiary} text-xs font-mono`}>#{p.pokeId}</span>
                    {isPicked && (
                      <span className={`${t.accent}`}>
                        <Check size={16} />
                      </span>
                    )}
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
