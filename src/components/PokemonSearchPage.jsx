import React, { useState, useRef, useImperativeHandle, useLayoutEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { ClearButton } from './ClearButton';
import { PlayerAvatar } from './PlayerAvatar';
import { usePokemon, POKEMON_BY_GENERATION } from '../hooks/usePokemon';
import { useTranslation } from '../hooks/useTranslation';


export const PokemonSearchPage = React.forwardRef(({ t, isDark, onBack, backLabel = 'Accueil', onSelectPokemon, onSelectTeam, teams = [], players = [], isBackground = false, initialSearchTerm = '', onSearchChange, initialScrollY = 0, initialActiveTab = 'pokemon', onActiveTabChange, initialTeamFormatFilter = 'all', onTeamFormatFilterChange }, ref) => {
  const tr = useTranslation();
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const { searchResults, searchLoading, searchPokemon, getPokemonImageUrl } = usePokemon(initialSearchTerm);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  // Mémorisation du scroll par onglet pour les rendre indépendants
  const scrollPositions = useRef({ pokemon: 0, teams: 0 });
  // Empêche le blur sur les scrolls programmatiques (restauration de position)
  const isProgrammaticScroll = useRef(false);
  // Détecte le scroll initié par l'utilisateur (touch)
  const isTouchScrolling = useRef(false);

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
    getSearchTerm: () => searchTerm,
    getActiveTab: () => activeTab,
    getTeamFormatFilter: () => teamFormatFilter,
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
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [teamFormatFilter, setTeamFormatFilter] = useState(initialTeamFormatFilter);
  const handleTeamFormatFilterChange = (id) => { setTeamFormatFilter(id); onTeamFormatFilterChange?.(id); };

  const programmaticScroll = (fn) => {
    isProgrammaticScroll.current = true;
    fn();
    requestAnimationFrame(() => { isProgrammaticScroll.current = false; });
  };

  const handleTabChange = (id) => {
    if (id === activeTab) {
      // Clic sur l'onglet déjà actif → scroll animé vers le haut
      programmaticScroll(() => {
        if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        scrollPositions.current[id] = 0;
      });
      return;
    }
    // Sauvegarder le scroll de l'onglet courant, restaurer celui du nouvel onglet
    if (scrollRef.current) scrollPositions.current[activeTab] = scrollRef.current.scrollTop;
    setActiveTab(id);
    onActiveTabChange?.(id);
    // Restauration après le paint (programmatique → pas de blur)
    requestAnimationFrame(() => {
      programmaticScroll(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollPositions.current[id] ?? 0;
      });
    });
  };

  const teamResults = useMemo(() => {
    if (!hasQuery) return [];
    const q = searchTerm.trim().toLowerCase();
    return teams.filter(team => (team.name || '').toLowerCase().includes(q));
  }, [searchTerm, hasQuery, teams]);

  return (
    <div className={`flex flex-col ${t.pageBg}`} style={{ height: '100dvh' }}>
      {/* Fond fixe anti-overscroll iOS */}
      <div className={`fixed inset-0 -z-10 ${t.pageBg}`} />
      {/* ── Header ── */}
      <div
        className={`${t.surfaceBlur} flex-shrink-0 px-4 border-b ${t.divider} z-10`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)', paddingBottom: '0.5rem' }}
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

        <div className={`grid grid-cols-2 gap-1 p-1 rounded-2xl mt-3 ${t.surfaceMuted}`}>
            {[
              { id: 'pokemon', label: 'Pokémon' },
              { id: 'teams', label: 'Équipes' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`py-2.5 rounded-xl text-sm font-bold transition ${
                  activeTab === id
                    ? isDark
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                      : `${t.surface} ${t.text} shadow-sm`
                    : t.textSecondary
                }`}
              >
                {label}
              </button>
            ))}
        </div>

      </div>

      {/* ── Résultats ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 pt-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        onTouchStart={() => { isTouchScrolling.current = true; }}
        onTouchEnd={() => {
          // Délai pour couvrir les derniers scroll events de l'inertie iOS
          setTimeout(() => { isTouchScrolling.current = false; }, 300);
        }}
        onScroll={() => {
          // Blur uniquement sur scroll tactile (mobile) et non programmatique
          if (!isProgrammaticScroll.current && isTouchScrolling.current) {
            inputRef.current?.blur();
          }
        }}
      >
        {!hasQuery && activeTab === 'pokemon' && (
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
                          loading="lazy"
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

        {activeTab === 'teams' && (
          <div className="flex gap-2 mb-4">
            {[
              { id: 'all', label: 'Tous' },
              { id: '1v1', label: '1v1' },
              { id: '2v2', label: '2v2' },
            ].map(({ id, label }) => {
              const active = teamFormatFilter === id;
              return (
                <button
                  key={id}
                  onClick={() => handleTeamFormatFilterChange(id)}
                  className={`inline-flex items-center ${id === 'all' ? 'gap-1' : 'gap-1.5'} rounded-full text-sm font-bold transition-all px-4 h-9 ${
                    active
                      ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                      : isDark
                        ? 'bg-zinc-800 text-gray-300'
                        : 'bg-white text-gray-600 shadow-sm'
                  }`}
                >
                  {id === 'all' && <img src="/pokeball-owned.svg" width={12} height={12} alt="" aria-hidden="true" style={{ display: 'block' }} />}
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {!hasQuery && activeTab === 'teams' && (() => {
          const filteredTeams = teamFormatFilter === 'all' ? teams : teams.filter(t2 => (t2.format || '1v1') === teamFormatFilter);
          return filteredTeams.length === 0
            ? <p className={`${t.textSecondary} text-sm text-center mt-8`}>{tr('common.noResults')}</p>
            : <div className={`${t.surfaceMuted} rounded-2xl overflow-hidden`}>
                {filteredTeams.map((team, idx) => {
                  const isLast = idx === filteredTeams.length - 1;
                  return (
                    <button
                      key={team._id}
                      onClick={() => onSelectTeam?.(team)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-black/5 dark:active:bg-white/5 ${!isLast ? `border-b ${t.divider}` : ''}`}
                    >
                      <div className={`flex-shrink-0 w-14 h-14 rounded-xl ${isDark ? t.surfaceMuted : 'bg-black/[0.06]'} p-1 grid grid-cols-2 grid-rows-2 gap-0.5`}>
                        {[0, 1, 2, 3].map((i) => {
                          const p = (team.pokemon || [])[i];
                          return (
                            <div key={i} className="flex items-center justify-center overflow-hidden">
                              {p ? <img src={getPokemonImageUrl(p.pokeId)} alt={p.name} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : null}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${t.text} truncate`}>{team.name}</p>
                        <div className={`${t.textSecondary} text-xs mt-0.5 flex items-center gap-1.5`}>
                          {(() => { const op = players.find(p => p._id === team.ownerId); return op ? <PlayerAvatar player={op} size={16} textSize="text-[8px]" className="flex-shrink-0" /> : null; })()}
                          <span className="truncate">{team.owner} · {(team.pokemon || []).length} Pokémon</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {team.isConcept && (
                          <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isDark ? 'bg-yellow-400/20 text-yellow-300' : 'bg-yellow-400/20 text-yellow-700'}`}>
                            Concept
                          </span>
                        )}
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold ${team.format === '1v1' ? (isDark ? 'bg-purple-300/10 text-purple-300' : 'bg-purple-600/10 text-purple-600') : (isDark ? 'bg-teal-300/10 text-teal-300' : 'bg-teal-600/10 text-teal-600')}`}>
                          {team.format || '1v1'}
                        </span>
                      </div>
                      <ChevronRight size={16} className={t.textTertiary} />
                    </button>
                  );
                })}
              </div>;
        })()}

        {hasQuery && searchLoading && activeTab === 'pokemon' && (
          <p className={`${t.textSecondary} text-sm text-center mt-8`}>{tr('common.searching')}</p>
        )}

        {hasQuery && !searchLoading && activeTab === 'pokemon' && searchResults.length === 0 && (
          <p className={`${t.textSecondary} text-sm text-center mt-8`}>{tr('common.noResults')}</p>
        )}

        {hasQuery && activeTab === 'teams' && (() => {
          const filteredResults = teamFormatFilter === 'all' ? teamResults : teamResults.filter(t2 => (t2.format || '1v1') === teamFormatFilter);
          if (filteredResults.length === 0) return <p className={`${t.textSecondary} text-sm text-center mt-8`}>{tr('common.noResults')}</p>;
          return (
          <div className={`${t.surfaceMuted} rounded-2xl overflow-hidden`}>
            {filteredResults.map((team, idx) => {
              const isLast = idx === filteredResults.length - 1;
              return (
                <button
                  key={team._id}
                  onClick={() => onSelectTeam?.(team)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-black/5 dark:active:bg-white/5 ${
                    !isLast ? `border-b ${t.divider}` : ''
                  }`}
                >
                  <div className={`flex-shrink-0 w-14 h-14 rounded-xl ${isDark ? t.surfaceMuted : 'bg-black/[0.06]'} p-1 grid grid-cols-2 grid-rows-2 gap-0.5`}>
                    {[0, 1, 2, 3].map((i) => {
                      const p = (team.pokemon || [])[i];
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
                    <div className={`${t.textSecondary} text-xs mt-0.5 flex items-center gap-1.5`}>
                      {(() => {
                        const ownerPlayer = players.find(p => p._id === team.ownerId);
                        return ownerPlayer ? <PlayerAvatar player={ownerPlayer} size={16} textSize="text-[8px]" className="flex-shrink-0" /> : null;
                      })()}
                      <span className="truncate">{team.owner} · {(team.pokemon || []).length} Pokémon</span>
                    </div>
                  </div>
                  <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${team.format === '1v1' ? (isDark ? 'bg-purple-300/10 text-purple-300' : 'bg-purple-600/10 text-purple-600') : (isDark ? 'bg-teal-300/10 text-teal-300' : 'bg-teal-600/10 text-teal-600')}`}>
                    {team.format || '1v1'}
                  </span>
                  <ChevronRight size={16} className={t.textTertiary} />
                </button>
              );
            })}
          </div>
          );
        })()}

        {activeTab === 'pokemon' && searchResults.length > 0 && (
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
