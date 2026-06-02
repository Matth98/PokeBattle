import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { TYPE_FR, TYPE_HEX, TYPE_COLORS } from '../hooks/usePokemonTypes';
import { useSmogonSet } from '../hooks/useSmogonSet';

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATS = [
  { key: 'hp',  fr: 'PV'   },
  { key: 'atk', fr: 'ATT'  },
  { key: 'def', fr: 'DEF'  },
  { key: 'spa', fr: 'SATT' },
  { key: 'spd', fr: 'SDEF' },
  { key: 'spe', fr: 'VIT'  },
];

const NATURES_FR = {
  Hardy: 'Hardi',   Lonely: 'Solo',    Brave: 'Brave',    Adamant: 'Rigide',  Naughty: 'Malin',
  Bold: 'Assuré',   Docile: 'Docile',  Relaxed: 'Relax',  Impish: 'Mauvais',  Lax: 'Lâche',
  Timid: 'Timide',  Hasty: 'Pressé',   Serious: 'Sérieux',Jolly: 'Jovial',    Naive: 'Naïf',
  Modest: 'Modeste',Mild: 'Doux',      Quiet: 'Calme',    Bashful: 'Pudique', Rash: 'Foufou',
  Calm: 'Sage',     Gentle: 'Gentil',  Sassy: 'Malpoli',  Careful: 'Prudent', Quirky: 'Bizarre',
};

// nature → [boosted stat key, lowered stat key]
const NATURE_EFFECTS = {
  Lonely:   ['atk', 'def'],  Brave:   ['atk', 'spe'],  Adamant: ['atk', 'spa'],  Naughty: ['atk', 'spd'],
  Bold:     ['def', 'atk'],  Relaxed: ['def', 'spe'],  Impish:  ['def', 'spa'],  Lax:     ['def', 'spd'],
  Timid:    ['spe', 'atk'],  Hasty:   ['spe', 'def'],  Jolly:   ['spe', 'spa'],  Naive:   ['spe', 'spd'],
  Modest:   ['spa', 'atk'],  Mild:    ['spa', 'def'],  Quiet:   ['spa', 'spe'],  Rash:    ['spa', 'spd'],
  Calm:     ['spd', 'atk'],  Gentle:  ['spd', 'def'],  Sassy:   ['spd', 'spe'],  Careful: ['spd', 'spa'],
};

// ─── Couleur de valeur ────────────────────────────────────────────────────────

const evColor = (v) =>
  v >= 150 ? '#22c55e' : v >= 100 ? '#84cc16' : v >= 70 ? '#eab308' : v >= 50 ? '#f97316' : '#ef4444';

// ─── Badge de type ────────────────────────────────────────────────────────────

function TypePictogram({ typeName }) {
  const hex   = TYPE_HEX[typeName]    || '#A8A77A';
  const c     = TYPE_COLORS[typeName] || { text: 'text-white' };
  const label = TYPE_FR[typeName]     || typeName;
  return (
    <div className="relative w-7 h-7 flex-shrink-0" title={label}>
      <img
        src={`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${typeName}.svg`}
        alt={label}
        className="w-7 h-7 object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextSibling.style.display = 'flex';
        }}
      />
      <div
        className="hidden w-7 h-7 rounded-full items-center justify-center absolute inset-0"
        style={{ backgroundColor: hex }}
      >
        <span className={`text-[8px] font-black ${c.text} uppercase tracking-wide`}>
          {label.slice(0, 3)}
        </span>
      </div>
    </div>
  );
}

// ─── Catégorie d'attaque ──────────────────────────────────────────────────────

const DAMAGE_CLASS_ICONS = {
  physical: '/damage-categories/physical.svg',
  special:  '/damage-categories/special.svg',
  status:   '/damage-categories/status.svg',
};

function DamageClassIcon({ damageClass }) {
  return (
    <img
      src={DAMAGE_CLASS_ICONS[damageClass] || DAMAGE_CLASS_ICONS.status}
      alt={damageClass}
      title={damageClass}
      className="w-6 h-6 object-contain flex-shrink-0"
      onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />
  );
}

// ─── Objet ────────────────────────────────────────────────────────────────────

function ItemRow({ item, itemSprite, itemPsSlug, isDark, accentHex }) {
  const psFallback = itemPsSlug
    ? `https://play.pokemonshowdown.com/sprites/itemicons/${itemPsSlug}.png`
    : null;
  const initial = itemSprite || psFallback;
  const [src, setSrc] = useState(initial);
  const [failed, setFailed] = useState(false);

  const handleError = () => {
    if (src === itemSprite && psFallback) setSrc(psFallback);
    else setFailed(true);
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`}>
        {!failed && src
          ? <img src={src} alt={item} className="w-7 h-7 object-contain" style={{ imageRendering: 'pixelated' }} onError={handleError} />
          : <span className="text-base">🎒</span>
        }
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Objet</p>
        <p className={`text-base font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{item}</p>
      </div>
    </div>
  );
}

// ─── Talent ───────────────────────────────────────────────────────────────────

function AbilityRow({ ability, isDark, accentHex }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
        style={{ backgroundColor: `${accentHex}22` }}
      >
        ⭐️
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Talent</p>
        <p className={`text-base font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{ability}</p>
      </div>
    </div>
  );
}

// ─── Titre de section ─────────────────────────────────────────────────────────

function SectionTitle({ title, isDark }) {
  return (
    <h2 className={`text-xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      {title}
    </h2>
  );
}

// ─── Colonnes de stats pour les attaques ──────────────────────────────────────

function StatCol({ value, isDark }) {
  return (
    <span className={`w-8 text-sm font-semibold tabular-nums text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
      {value}
    </span>
  );
}

// ─── Ligne d'attaque (sans fond) ─────────────────────────────────────────────

function MoveRow({ move, isDark, isLast }) {
  return (
    <div className={`flex items-center gap-3 py-2.5 ${!isLast ? `border-b ${isDark ? 'border-zinc-800' : 'border-gray-100'}` : ''}`}>
      <TypePictogram typeName={move.type} />
      <p className={`flex-1 text-base font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {move.nameFr}
      </p>
      <div className="flex items-center gap-6 flex-shrink-0">
        <StatCol value={move.power ?? '—'} isDark={isDark} />
        <StatCol value={move.accuracy != null ? `${move.accuracy}%` : '—'} isDark={isDark} />
        <div className="w-6 flex justify-center"><DamageClassIcon damageClass={move.damageClass} /></div>
      </div>
    </div>
  );
}

// ─── EVs / IVs / Nature ───────────────────────────────────────────────────────

function EVsSection({ evs, ivs, nature, isDark, accentHex }) {
  const effects   = nature ? NATURE_EFFECTS[nature] : null;
  const boosted   = effects?.[0];
  const lowered   = effects?.[1];
  const activeEVs = STATS.filter(s => (evs[s.key] ?? 0) > 0);

  return (
    <div className="space-y-10">
      {/* Nature */}
      {nature && (
        <div>
          <SectionTitle title="Nature" isDark={isDark} />
          <div className="flex items-center gap-3">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`}>
              🌿
            </span>
            <p className={`flex-1 text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {NATURES_FR[nature] || nature}
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {boosted && (
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${isDark ? 'bg-green-400/10 text-green-400' : 'bg-green-600/10 text-green-600'}`}>
                  +{STATS.find(s => s.key === boosted)?.fr}
                </span>
              )}
              {lowered && (
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${isDark ? 'bg-red-400/10 text-red-400' : 'bg-red-600/10 text-red-600'}`}>
                  −{STATS.find(s => s.key === lowered)?.fr}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EVs */}
      {activeEVs.length > 0 && (
        <div>
          <SectionTitle title="EVs" isDark={isDark} />
          <div className="space-y-2">
            {activeEVs.map(({ key, fr }) => {
              const ev       = evs[key] ?? 0;
              const barColor = evColor(ev);
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-12 text-base font-semibold" style={{ color: accentHex }}>{fr}</span>
                  <span className={`w-8 text-base font-semibold text-left tabular-nums ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {ev}
                  </span>
                  <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(ev / 252) * 100}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── StrategyTab ──────────────────────────────────────────────────────────────

export function StrategyTab({ pokeId, isDark, accentHex }) {
  const { result, loading, error } = useSmogonSet(pokeId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="animate-spin" style={{ color: accentHex }} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-16 px-8 text-center">
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Impossible de charger les données stratégiques : {error}
        </p>
      </div>
    );
  }
  if (result === null) {
    return (
      <div className="py-16 px-8 text-center">
        <p className={`text-base font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Aucun set Smogon disponible
        </p>
        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Ce Pokémon n'a pas encore de set référencé.
        </p>
      </div>
    );
  }
  if (!result) return null;

  return (
    <div className="px-5 pt-3 pb-4">

      {/* Objet + Talent */}
      {(result.item || result.ability) && (
        <div className="flex gap-6 mb-10">
          {result.item && (
            <ItemRow item={result.item} itemSprite={result.itemSprite} itemPsSlug={result.itemPsSlug} isDark={isDark} accentHex={accentHex} />
          )}
          {result.ability && (
            <AbilityRow ability={result.ability} isDark={isDark} accentHex={accentHex} />
          )}
        </div>
      )}

      {/* Attaques */}
      <div className="mb-10">
        <div className="flex items-center mb-1">
          <h2 className={`flex-1 text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Attaques</h2>
          <div className="flex items-center gap-6 pr-0.5">
            <span className={`w-8 text-center text-[9px] font-bold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Puiss</span>
            <span className={`w-8 text-center text-[9px] font-bold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Préc.</span>
            <span className={`w-6 text-center text-[9px] font-bold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Cat.</span>
          </div>
        </div>
        {result.moves.map((move, i) => (
          <MoveRow key={i} move={move} isDark={isDark} isLast={i === result.moves.length - 1} />
        ))}
      </div>

      {/* Nature + EVs + IVs */}
      {(Object.keys(result.evs).length > 0 || result.nature) && (
        <EVsSection
          evs={result.evs}
          ivs={result.ivs}
          nature={result.nature}
          isDark={isDark}
          accentHex={accentHex}
        />
      )}
    </div>
  );
}

// ─── TabBar ───────────────────────────────────────────────────────────────────

export function TabBar({ activeTab, onTabChange, accentHex, isDark }) {
  const tabs = [
    { key: 'presentation', label: 'Présentation' },
    { key: 'strategie',    label: 'Stratégie'    },
  ];
  return (
    <div className={`px-5 py-3 ${isDark ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
      <div className={`grid grid-cols-2 gap-1 p-1 rounded-2xl ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
        {tabs.map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                isActive ? 'text-white shadow-sm' : isDark ? 'text-zinc-400' : 'text-gray-500'
              }`}
              style={isActive ? { backgroundColor: accentHex } : {}}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
