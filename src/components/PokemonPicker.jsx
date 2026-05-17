import React, { useState } from 'react';
import { usePokemon } from '../hooks/usePokemon';

/**
 * Modal de recherche/sélection d'un Pokémon.
 * Réutilisable depuis PlayerDetail (ajout 1 par 1) et Teams (multi-sélection).
 *
 * Props :
 * - t, isDark : thème
 * - title : titre du modal (par défaut "Ajouter un Pokémon")
 * - onSelect(pokemon) : appelé quand l'utilisateur choisit un Pokémon ({pokeId, name})
 * - onClose() : fermeture
 * - alreadyPickedIds : tableau de pokeId déjà sélectionnés (grisés / non cliquables)
 * - defaultResults : liste affichée quand la recherche est vide (ex: roster du joueur).
 *                    Si non fourni, rien n'est affiché tant que l'utilisateur ne tape pas.
 * - defaultLabel : libellé au-dessus de defaultResults (ex: "Pokémon du joueur")
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex flex-col">
      <div className={`${t.bgPrimary} flex-1 overflow-y-auto flex flex-col`}>
        <div className="p-6 flex-1 overflow-y-auto">
          <h2 className={`text-2xl font-black ${t.text} mb-4`}>{title}</h2>
          <input
            type="text"
            placeholder="Rechercher (ex: Pikachu, Dracaufeu...)"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              searchPokemon(e.target.value);
            }}
            className={`w-full border ${t.input} rounded-xl px-4 py-3 mb-4`}
            autoFocus
          />

          {error && (
            <p className="text-red-500 text-sm mb-2">Erreur de chargement: {error}</p>
          )}
          {searchLoading && <p className={t.textSecondary}>Recherche...</p>}
          {!searchLoading && hasQuery && searchResults.length === 0 && !error && (
            <p className={t.textSecondary}>Aucun résultat</p>
          )}
          {showDefaultLabel && (
            <p className={`${t.textSecondary} text-xs font-bold uppercase mb-2`}>
              {defaultLabel}
            </p>
          )}
          {!hasQuery && (!defaultResults || defaultResults.length === 0) && (
            <p className={t.textSecondary}>Tape pour rechercher un Pokémon</p>
          )}

          <div className="space-y-2">
            {displayed.map((p) => {
              const isPicked = alreadyPickedIds.includes(p.pokeId);
              return (
                <button
                  key={p.pokeId}
                  onClick={() => !isPicked && onSelect(p)}
                  disabled={isPicked}
                  className={`w-full ${t.bgPrimary} rounded-lg p-3 border ${t.border} text-left transition flex items-center gap-3 ${
                    isPicked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
                  }`}
                >
                  <img
                    src={getPokemonImageUrl(p.pokeId)}
                    alt={p.name}
                    className="w-10 h-10 object-contain flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                  />
                  <span className={`font-bold ${t.text} flex-1`}>{p.name}</span>
                  <span className={`${t.textSecondary} text-xs`}>#{p.pokeId}</span>
                  {isPicked && <span className="text-orange-500 text-xs font-bold">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className={`border-t ${t.headerBorder} p-6`}>
          <button
            onClick={onClose}
            className={`w-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} ${t.text} py-3 rounded-xl font-bold`}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
