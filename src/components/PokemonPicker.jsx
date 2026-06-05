import React, { useState, useRef } from 'react';
import { Search, X, Check, Plus } from 'lucide-react';
import { usePokemon, POKEMON_BY_GENERATION } from '../hooks/usePokemon';
import { useAnimatedClose } from '../hooks/useAnimatedClose';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

/**
 * Modal de recherche/sélection d'un Pokémon. Full-screen sheet iOS.
 *
 * Props :
 * - t, isDark : thème
 * - title : titre de la sheet
 * - onSelect(pokemon | pokemon[]) : appelé avec un tableau si multiSelect, sinon un seul Pokémon
 * - onClose() : fermeture
 * - alreadyPickedIds : tableau de pokeId déjà sélectionnés (grisés)
 * - defaultResults : liste affichée quand la recherche est vide (ex: roster du joueur)
 * - defaultLabel : libellé au-dessus de defaultResults
 * - multiSelect : active la sélection multiple (défaut: false)
 * - maxSelect : nombre max de Pokémon sélectionnables (multiSelect uniquement)
 *
 * Quand defaultResults est absent et la recherche est vide, affiche tous les
 * Pokémon groupés par génération.
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
  multiSelect = false,
  maxSelect = Infinity,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState([]);
  const inputRef = useRef(null);
  const { searchResults, searchLoading, error, searchPokemon, getPokemonImageUrl } = usePokemon();
  const { isClosing, handleClose } = useAnimatedClose(onClose, 240);
  useBodyScrollLock();

  const hasQuery = searchTerm.trim().length > 0;
  // Groupé par génération si : pas de recherche ET pas de liste perso (null ou vide)
  const hasPersonalList = defaultResults !== null && defaultResults?.length > 0;
  const useGrouped = !hasQuery && !hasPersonalList;

  // Affichage plat (recherche ou defaultResults)
  const flatDisplayed = hasQuery
    ? searchResults
    : (defaultResults ? [...defaultResults].sort((a, b) => a.pokeId - b.pokeId) : []);

  const handleRowClick = (p) => {
    if (!multiSelect) {
      onSelect(p);
      return;
    }
    setSelectedPokemon((prev) => {
      if (prev.some((sp) => sp.pokeId === p.pokeId)) return prev.filter((sp) => sp.pokeId !== p.pokeId);
      if (prev.length >= maxSelect) return prev;
      return [...prev, p];
    });
  };

  const handleConfirm = () => {
    if (selectedPokemon.length === 0) return;
    onSelect(selectedPokemon);
  };

  const PokemonRow = ({ p, idx, total }) => {
    const isPicked = alreadyPickedIds.includes(p.pokeId);
    const isSelected = multiSelect && selectedPokemon.some((sp) => sp.pokeId === p.pokeId);
    const isAtMax = multiSelect && selectedPokemon.length >= maxSelect && !isSelected;
    const isLast = idx === total - 1;
    const disabled = isPicked || isAtMax;
    return (
      <button
        key={p.pokeId}
        onClick={() => !disabled && handleRowClick(p)}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
          !isLast ? `border-b ${t.divider}` : ''
        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:bg-black/5 dark:active:bg-white/5'}`}
      >
        {multiSelect && (
          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? `${t.accentBg} border-transparent` : `${t.textTertiary} border-current`}`}>
            {isSelected && <Check size={14} className="text-white" />}
          </span>
        )}
        <img
          src={getPokemonImageUrl(p.pokeId)}
          alt={p.name}
          className="w-10 h-10 object-contain flex-shrink-0"
          onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
        />
        <span className={`flex-1 font-semibold ${t.text} truncate`}>{p.name}</span>
        <span className={`${t.textTertiary} text-xs font-mono`}>#{p.pokeId}</span>
        {!multiSelect && isPicked && <span className={t.accent}><Check size={16} /></span>}
      </button>
    );
  };

  return (
    <div className={`fixed inset-0 ${t.overlay} ${!isClosing ? 'anim-fade-in' : ''} z-[9999] flex flex-col`}>
      <div className={`${t.surfaceModal} flex-1 overflow-hidden flex flex-col rounded-t-3xl ${isClosing ? 'anim-slide-down' : 'anim-slide-up'}`} style={{ marginTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}>
        {/* Grip + Header */}
        <div className={`${t.surface} px-5 pt-3 pb-3 border-b ${t.divider}`}>
          <div className={`w-10 h-1 ${t.surfaceMuted} rounded-full mx-auto mb-3`} aria-hidden="true" />
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-black ${t.text}`}>{title}</h2>
            <button
              onClick={handleClose}
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
              ref={inputRef}
              className={`flex-1 bg-transparent outline-none ${t.text} placeholder:${t.textTertiary} text-base`}
            />
            {hasQuery && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  searchPokemon('');
                  inputRef.current?.focus({ preventScroll: true });
                }}
                className={`w-5 h-5 rounded-full grid place-items-center flex-shrink-0 p-0 ${t.clearBg}`}
                aria-label="Effacer"
              >
                <X size={11} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto px-5 pt-4" style={{ paddingBottom: multiSelect ? '5rem' : 'calc(env(safe-area-inset-bottom) + 1.5rem)' }} data-scroll-lock-ignore>
          {error && <p className={`${t.danger} text-sm text-center mb-2`}>Erreur : {error}</p>}
          {searchLoading && <p className={`${t.textSecondary} text-sm text-center`}>Recherche...</p>}
          {!searchLoading && hasQuery && searchResults.length === 0 && !error && (
            <p className={`${t.textSecondary} text-sm text-center mt-8`}>Aucun résultat</p>
          )}

          {/* Résultats de recherche ou defaultResults — affichage plat */}
          {!useGrouped && flatDisplayed.length > 0 && (
            <>
              {!hasQuery && defaultLabel && (
                <p className={`${t.textSecondary} text-xs font-bold uppercase tracking-wide mb-2 px-1`}>
                  {defaultLabel}
                </p>
              )}
              <div className={`${t.surfaceMuted} rounded-2xl overflow-hidden`}>
                {flatDisplayed.map((p, idx) => (
                  <PokemonRow key={p.pokeId} p={p} idx={idx} total={flatDisplayed.length} />
                ))}
              </div>
            </>
          )}

          {/* Toutes les générations — affichage groupé */}
          {useGrouped && (
            <div className="space-y-5">
              {POKEMON_BY_GENERATION.map(({ label, pokemon }) => (
                <div key={label}>
                  <p className={`${t.textSecondary} text-xs font-bold uppercase tracking-wide mb-2 px-1`}>
                    {label}
                  </p>
                  <div className={`${t.surfaceMuted} rounded-2xl overflow-hidden`}>
                    {pokemon.map((p, idx) => (
                      <PokemonRow key={p.pokeId} p={p} idx={idx} total={pokemon.length} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bouton de confirmation multi-sélection */}
        {multiSelect && (
          <div
            className={`flex-shrink-0 px-5 pb-safe ${t.surface} border-t ${t.divider}`}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)', paddingTop: '0.75rem' }}
          >
            <button
              onClick={handleConfirm}
              disabled={selectedPokemon.length === 0}
              className={`w-full py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition ${t.accentBg} text-white ${selectedPokemon.length === 0 ? 'opacity-30' : ''}`}
            >
              <Plus size={18} />
              {`Ajouter${selectedPokemon.length > 0 ? ` (${selectedPokemon.length})` : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
