import React, { useState, useLayoutEffect, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { usePokemonDetail } from '../hooks/usePokemonDetail';
import { TYPE_FR, TYPE_COLORS, TYPE_HEX, TYPE_HEX_DARK } from '../hooks/usePokemonTypes';
import { useTranslation } from '../hooks/useTranslation';
import { TabBar, StrategyTab } from './PokemonStrategyTab';

const ALL_TYPES = Object.keys(TYPE_HEX);

const statColor = (v) =>
  v >= 150 ? '#22c55e' : v >= 100 ? '#84cc16' : v >= 70 ? '#eab308' : v >= 50 ? '#f97316' : '#ef4444';

function TypeBadge({ typeName }) {
  return (
    <span
      className="pl-1 inline-flex items-stretch rounded-full overflow-hidden"
      style={{ backgroundColor: TYPE_HEX[typeName] || '#828282' }}
    >
      <img
        src={`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${typeName}.svg`}
        alt=""
        className="w-6 h-6 object-contain flex-shrink-0"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
      <span className="self-center pr-3 text-xs font-bold text-white uppercase leading-none">
        {TYPE_FR[typeName] || typeName}
      </span>
    </span>
  );
}

function TypePictogram({ typeName }) {
  const hex = TYPE_HEX[typeName] || '#A8A77A';
  const c = TYPE_COLORS[typeName] || { text: 'text-white' };
  const label = TYPE_FR[typeName] || typeName;
  return (
    <div className="relative w-8 h-8 flex-shrink-0" title={label}>
      <img
        src={`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${typeName}.svg`}
        alt={label}
        className="w-8 h-8 object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextSibling.style.display = 'flex';
        }}
      />
      <div
        className="hidden w-8 h-8 rounded-full items-center justify-center absolute inset-0"
        style={{ backgroundColor: hex }}
      >
        <span className={`text-[9px] font-black ${c.text} uppercase tracking-wide`}>
          {label.slice(0, 3)}
        </span>
      </div>
    </div>
  );
}

function MultBadge({ mult, isDark }) {
  const isWeak = typeof mult === 'number' && mult >= 2;
  return (
    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
      <span className={`text-[11px] font-black ${isWeak ? 'text-red-500' : 'text-green-600'}`}>×{mult}</span>
    </div>
  );
}

function EffectivenessSection({ label, grouped, isDark }) {
  if (grouped.length === 0) return null;
  return (
    <div>
      <h3 className={`text-xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{label}</h3>
      <div className="space-y-3">
        {grouped.map(({ mult, types }) => (
          <div key={mult} className="flex items-start gap-4">
            <MultBadge mult={mult} isDark={isDark} />
            <div className="flex flex-wrap gap-4">
              {types.map(tn => <TypePictogram key={tn} typeName={tn} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const INFO_ICONS = {
  'pokemon.weight': '⚖️', 'pokemon.height': '📏', 'pokemon.captureRate': '🎯',
  'pokemon.generation': '📅', 'pokemon.eggGroup': '🥚',
  'pokemon.gender': '⚧️', 'pokemon.growthRate': '📈', 'pokemon.species': '🔬',
  'pokemon.effortPoints': '💪', 'pokemon.baseExp': '⭐',
};

function InfoRow({ labelKey, label, value, accentColor, isDark }) {
  const icon = INFO_ICONS[labelKey];
  return (
    <div className="py-3 flex items-center gap-3">
      {icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: accentColor }}>{label}</p>
        <p className={`text-base mt-0.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{value}</p>
      </div>
    </div>
  );
}

export const PokemonDetailPage = ({ pokeId, pokeName, t, isDark, onBack, backLabel = 'Recherche' }) => {
  const tr = useTranslation();
  const { data, loading, error } = usePokemonDetail(pokeId, pokeName);
  const [activeTab, setActiveTab] = useState('presentation');

  useEffect(() => {
    const bg = isDark ? '#18181b' : '#ffffff';
    document.body.style.backgroundColor = bg;
    return () => { document.body.style.backgroundColor = ''; };
  }, [isDark]);

  const scrollPositions = useRef({ presentation: 0, strategie: 0 });

  const handleTabChange = useCallback((tab) => {
    if (tab === activeTab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    scrollPositions.current[activeTab] = window.scrollY;
    window.scrollTo({ top: 0, behavior: 'instant' });
    setActiveTab(tab);
  }, [activeTab]);

  useLayoutEffect(() => {
    window.scrollTo({ top: scrollPositions.current[activeTab] ?? 0, behavior: 'instant' });
  }, [activeTab]);

  const primaryType = data?.types?.[0] || 'normal';
  const accentHex = (isDark ? TYPE_HEX_DARK : TYPE_HEX)[primaryType] || '#6390F0';

  const groupByMult = (multValues) =>
    multValues
      .map(({ multVal, label }) => ({
        mult: label,
        types: ALL_TYPES.filter(tn => (data?.effectiveness?.[tn] ?? 1) === multVal),
      }))
      .filter(g => g.types.length > 0);

  const resistanceGroups = groupByMult([
    { multVal: 0, label: '0' }, { multVal: 0.25, label: '¼' }, { multVal: 0.5, label: '½' },
  ]);
  const weaknessGroups = groupByMult([
    { multVal: 2, label: 2 }, { multVal: 4, label: 4 },
  ]);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
      {/* ── Bouton retour — flotte par-dessus le hero ── */}
      <div className="sticky top-0 z-10" style={{ height: 0, overflow: 'visible' }}>
        <div className="px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
          <button
            onClick={onBack}
            className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'}`}
            style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
            aria-label={tr('common.back')}
          >
            <ChevronLeft size={24} className="-translate-x-px" />
          </button>
        </div>
      </div>

      {/* ── États de chargement ── */}
      {loading && (
        <div className="flex items-center justify-center pt-48">
          <Loader2 size={32} className="animate-spin" style={{ color: accentHex }} />
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center px-8 text-center pt-48">
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm`}>
            Impossible de charger les données : {error}
          </p>
        </div>
      )}

      {/* ── Contenu ── */}
      {!loading && !error && data && (
        <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 7rem)' }}>
          {/* Hero */}
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{
              paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)',
              paddingBottom: '1.5rem',
              background: `linear-gradient(160deg, ${accentHex}ee 0%, ${accentHex}77 60%, ${isDark ? '#1c1c1e' : 'white'} 100%)`,
            }}
          >
            <img
              src={data.officialArtwork || data.sprite}
              alt={pokeName}
              className="w-56 h-56 object-contain object-center drop-shadow-xl"
              onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
            />
          </div>

          {/* Numéro + nom + types — toujours visibles */}
          <div className="px-5 pt-4 pb-0">
            <p className={`text-sm font-mono font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              #{String(data.id).padStart(4, '0')}
            </p>
            <h1 className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{data?.name || pokeName}</h1>
            <div className="flex gap-2 mb-3">
              {data.types.map(tn => <TypeBadge key={tn} typeName={tn} />)}
            </div>
          </div>

          <div className="px-5 pt-2 pb-2" style={{ display: activeTab === 'presentation' ? 'block' : 'none' }}>
              {data.flavorText && (
                <p className={`text-base leading-relaxed mb-10 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {data.flavorText}
                </p>
              )}

              {/* Stats */}
              <h2 className={`text-xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{tr('pokemon.stats')}</h2>
              <div className="space-y-2 mb-10">
                {data.stats.map(({ name, value }) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-12 text-base font-semibold" style={{ color: accentHex }}>{name}</span>
                    <span className={`w-8 text-base font-semibold text-left tabular-nums ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{value}</span>
                    <div className={`flex-1 h-2 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-gray-200'} overflow-hidden`}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, (value / 255) * 100)}%`, backgroundColor: statColor(value) }}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <span className="w-12 text-base font-semibold" style={{ color: accentHex }}>{tr('pokemon.base')}</span>
                  <span className={`w-8 text-base font-black text-left tabular-nums ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{data.total}</span>
                  <div className={`flex-1 h-2 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-gray-200'} overflow-hidden`}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (data.total / 780) * 100)}%`, backgroundColor: accentHex }} />
                  </div>
                </div>
              </div>

              {/* Résistances / Faiblesses */}
              <div className="space-y-6 mb-10">
                <EffectivenessSection label={tr('pokemon.resistances')} grouped={resistanceGroups} isDark={isDark} />
                <EffectivenessSection label={tr('pokemon.weaknesses')}  grouped={weaknessGroups}  isDark={isDark} />
              </div>

              {/* Talents */}
              {data.abilities.length > 0 && (
                <div className="mb-10">
                  <h2 className={`text-xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{tr('pokemon.abilities')}</h2>
                  <div className="space-y-3">
                    {data.abilities.map(({ nameFr, descFr, isHidden }, i) => (
                      <div key={i}>
                        <p className="text-base font-bold mb-0.5" style={{ color: accentHex }}>
                          {nameFr}{isHidden && ` (${tr('pokemon.hidden')})`}
                        </p>
                        {descFr && <p className={`text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{descFr}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Caractéristiques */}
              <h2 className={`text-xl font-black mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{tr('pokemon.characteristics')}</h2>
              <div>
                <InfoRow labelKey="pokemon.weight"       label={tr('pokemon.weight')}       value={`${data.weight} kg  —  ${(data.weight * 2.205).toFixed(1)} lbs.`} accentColor={accentHex} isDark={isDark} />
                <InfoRow labelKey="pokemon.height"       label={tr('pokemon.height')}       value={`${data.height} m  —  ${Math.floor(data.height * 3.281)}'${String(Math.round((data.height * 3.281 % 1) * 12)).padStart(2, '0')}'`} accentColor={accentHex} isDark={isDark} />
                <InfoRow labelKey="pokemon.captureRate"  label={tr('pokemon.captureRate')}  value={String(data.captureRate)}  accentColor={accentHex} isDark={isDark} />
                <InfoRow labelKey="pokemon.generation"   label={tr('pokemon.generation')}   value={data.generation}           accentColor={accentHex} isDark={isDark} />
                <InfoRow labelKey="pokemon.eggGroup"     label={tr('pokemon.eggGroup')}     value={data.eggGroups}            accentColor={accentHex} isDark={isDark} />
                <InfoRow labelKey="pokemon.gender"       label={tr('pokemon.gender')}       value={data.genderText}           accentColor={accentHex} isDark={isDark} />
                <InfoRow labelKey="pokemon.growthRate"   label={tr('pokemon.growthRate')}   value={data.growthRate}           accentColor={accentHex} isDark={isDark} />
                {data.genus && <InfoRow labelKey="pokemon.species" label={tr('pokemon.species')} value={data.genus} accentColor={accentHex} isDark={isDark} />}
                {data.evYield !== '—' && <InfoRow labelKey="pokemon.effortPoints" label={tr('pokemon.effortPoints')} value={data.evYield} accentColor={accentHex} isDark={isDark} />}
                <InfoRow labelKey="pokemon.baseExp"      label={tr('pokemon.baseExp')}      value={String(data.baseExperience)} accentColor={accentHex} isDark={isDark} />
              </div>
            </div>

          <div style={{ display: activeTab === 'strategie' ? 'block' : 'none' }}>
            <StrategyTab pokeId={pokeId} isDark={isDark} accentHex={accentHex} />
          </div>
        </div>
      )}

      {/* ── Onglets — fixe en bas d'écran ── */}
      {!loading && !error && data && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-20 border-t ${isDark ? 'bg-zinc-900 border-zinc-800/80' : 'bg-white border-gray-200/80'}`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <TabBar activeTab={activeTab} onTabChange={handleTabChange} accentHex={accentHex} isDark={isDark} />
        </div>
      )}
    </div>
  );
};
