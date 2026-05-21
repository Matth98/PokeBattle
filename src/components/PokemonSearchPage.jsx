import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { usePokemon, POKEMON_BY_GENERATION } from '../hooks/usePokemon';

export const PokemonSearchPage = ({ t, isDark, onBack, backLabel = 'Accueil', onSelectPokemon }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { searchResults, searchLoading, searchPokemon, getPokemonImageUrl } = usePokemon();

  const handleChange = (e) => {
    setSearchTerm(e.target.value);
    searchPokemon(e.target.value);
  };

  const clear = () => {
    setSearchTerm('');
    searchPokemon('');
  };

  const hasQuery = searchTerm.trim().length > 0;

  return (
    <div className={`min-h-screen ${t.pageBg}`}>
      {/* ── Header ── */}
      <div
        className={`${t.surfaceBlur} sticky top-0 z-10 px-4 border-b ${t.divider}`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)', paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`-ml-1 ${t.accent} flex-shrink-0`}
            aria-label="Retour"
          >
            <ChevronLeft size={26} />
          </button>

          <div className={`flex-1 flex items-center gap-2 ${t.surfaceMuted} rounded-xl px-3 py-2`}>
            <Search size={15} className={t.textTertiary} aria-hidden="true" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleChange}
              placeholder="Nom du Pokémon…"
              autoFocus
              className={`flex-1 bg-transparent outline-none ${t.text} text-sm`}
              style={{ fontSize: '16px' }}
            />
            {searchTerm && (
              <button onClick={clear} className={t.textTertiary} aria-label="Effacer">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Résultats ── */}
      <div
        className="px-5 pt-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
      >
        {!hasQuery && (
          <div className="space-y-6">
            {POKEMON_BY_GENERATION.map((gen) => (
              <div key={gen.label}>
                <h2 className={`text-3xl font-black tracking-tight ${t.text} mb-3 px-1`}>
                  {gen.label}
                </h2>
                <div className={`${t.surfaceMuted} rounded-2xl overflow-hidden`}>
                  {gen.pokemon.map((p, idx) => {
                    const isLast = idx === gen.pokemon.length - 1;
                    return (
                      <button
                        key={p.pokeId}
                        onClick={() => onSelectPokemon(p)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left active:bg-black/5 dark:active:bg-white/5 ${
                          !isLast ? `border-b ${t.divider}` : ''
                        }`}
                      >
                        <img
                          src={getPokemonImageUrl(p.pokeId)}
                          alt={p.name}
                          className="w-10 h-10 object-contain flex-shrink-0"
                          onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                        />
                        <span className={`flex-1 font-semibold ${t.text} truncate`}>{p.name}</span>
                        <span className={`${t.textTertiary} text-xs font-mono`}>#{p.pokeId}</span>
                        <ChevronRight size={16} className={t.textTertiary} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {hasQuery && searchLoading && (
          <p className={`${t.textSecondary} text-sm text-center mt-8`}>Recherche…</p>
        )}

        {hasQuery && !searchLoading && searchResults.length === 0 && (
          <p className={`${t.textSecondary} text-sm text-center mt-8`}>Aucun résultat</p>
        )}

        {searchResults.length > 0 && (
          <div className={`${t.surfaceMuted} rounded-2xl overflow-hidden`}>
            {searchResults.map((p, idx) => {
              const isLast = idx === searchResults.length - 1;
              return (
                <button
                  key={p.pokeId}
                  onClick={() => onSelectPokemon(p)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left active:bg-black/5 dark:active:bg-white/5 ${
                    !isLast ? `border-b ${t.divider}` : ''
                  }`}
                >
                  <img
                    src={getPokemonImageUrl(p.pokeId)}
                    alt={p.name}
                    className="w-10 h-10 object-contain flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                  />
                  <span className={`flex-1 font-semibold ${t.text} truncate`}>{p.name}</span>
                  <span className={`${t.textTertiary} text-xs font-mono`}>#{p.pokeId}</span>
                  <ChevronRight size={16} className={t.textTertiary} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
