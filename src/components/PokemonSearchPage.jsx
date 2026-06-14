import React, { useState, useRef, useImperativeHandle, useLayoutEffect } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { ClearButton } from './ClearButton';
import { usePokemon, POKEMON_BY_GENERATION } from '../hooks/usePokemon';
import { useTranslation } from '../hooks/useTranslation';

export const PokemonSearchPage = React.forwardRef(({ t, isDark, onBack, backLabel = 'Accueil', onSelectPokemon, isBackground = false, initialSearchTerm = '', onSearchChange, initialScrollY = 0 }, ref) => {
  const tr = useTranslation();
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const { searchResults, searchLoading, searchPokemon, getPokemonImageUrl } = usePokemon(initialSearchTerm);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  useLayoutEffect(() => {
    if (initialScrollY && scrollRef.current) {
      scrollRef.current.scrollTop = initialScrollY;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus({ preventScroll: true }),
    getScrollTop: () => scrollRef.current?.scrollTop ?? 0,
    setScrollTop: (v) => { if (scrollRef.current) scrollRef.current.scrollTop = v; },
  }));

  const handleChange = (e) => {
    setSearchTerm(e.target.value);
    searchPokemon(e.target.value);
    onSearchChange?.(e.target.value);
  };

  const clear = () => {
    setSearchTerm('');
    searchPokemon('');
    onSearchChange?.('');
    inputRef.current?.focus({ preventScroll: true });
  };

  const hasQuery = searchTerm.trim().length > 0;

  return (
    <div className={`flex flex-col ${t.pageBg}`} style={{ height: '100dvh' }}>
      {/* ── Header ── */}
      <div
        className={`${t.surfaceBlur} flex-shrink-0 px-4 border-b ${t.divider} z-10`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)', paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`-ml-1 ${t.accent} flex-shrink-0`}
            aria-label={tr('common.back')}
          >
            <ChevronLeft size={26} />
          </button>

          <div className={`flex-1 flex items-center gap-2 ${t.surfaceMuted} rounded-xl px-3 py-2`}>
            <Search size={15} className={t.textTertiary} aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={handleChange}
              placeholder={tr('pokemon.searchPlaceholder')}
              autoFocus={!isBackground}
              className={`flex-1 bg-transparent outline-none ${t.text} text-sm`}
              style={{ fontSize: '16px' }}
            />
            {searchTerm && <ClearButton onClick={clear} color={t.clearIcon} strokeColor={t.clearStroke} />}
          </div>
        </div>
      </div>

      {/* ── Résultats ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 pt-4"
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
          <p className={`${t.textSecondary} text-sm text-center mt-8`}>{tr('common.searching')}</p>
        )}

        {hasQuery && !searchLoading && searchResults.length === 0 && (
          <p className={`${t.textSecondary} text-sm text-center mt-8`}>{tr('common.noResults')}</p>
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
});
