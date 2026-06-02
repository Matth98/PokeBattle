import React from 'react';
import { Loader2 } from 'lucide-react';
import { TYPE_FR, TYPE_HEX } from '../hooks/usePokemonTypes';
import { useSmogonSet } from '../hooks/useSmogonSet';

// ─── Constantes ───────────────────────────────────────────────────────────────

const DAMAGE_CLASS_FR = { physical: 'Physique', special: 'Spécial', status: 'Statut' };

const STATS = [
  { key: 'hp',  fr: 'PV'    },
  { key: 'atk', fr: 'Att'   },
  { key: 'def', fr: 'Déf'   },
  { key: 'spa', fr: 'Att.S' },
  { key: 'spd', fr: 'Déf.S' },
  { key: 'spe', fr: 'Vit'   },
];

const NATURES_FR = {
  Hardy: 'Hardi',   Lonely: 'Solo',    Brave: 'Brave',    Adamant: 'Rigide',  Naughty: 'Malin',
  Bold: 'Assuré',   Docile: 'Docile',  Relaxed: 'Relax',  Impish: 'Mauvais',  Lax: 'Lâche',
  Timid: 'Timide',  Hasty: 'Pressé',   Serious: 'Sérieux',Jolly: 'Jovial',    Naive: 'Naïf',
  Modest: 'Modeste',Mild: 'Doux',      Quiet: 'Calme',    Bashful: 'Pudique', Rash: 'Foufou',
  Calm: 'Sage',     Gentle: 'Gentil',  Sassy: 'Malpoli',  Careful: 'Prudent', Quirky: 'Bizarre',
};

// nature → [boosted stat key, lowered stat key] (null for neutral)
const NATURE_EFFECTS = {
  Lonely:   ['atk', 'def'],  Brave:   ['atk', 'spe'],  Adamant: ['atk', 'spa'],  Naughty: ['atk', 'spd'],
  Bold:     ['def', 'atk'],  Relaxed: ['def', 'spe'],  Impish:  ['def', 'spa'],  Lax:     ['def', 'spd'],
  Timid:    ['spe', 'atk'],  Hasty:   ['spe', 'def'],  Jolly:   ['spe', 'spa'],  Naive:   ['spe', 'spd'],
  Modest:   ['spa', 'atk'],  Mild:    ['spa', 'def'],  Quiet:   ['spa', 'spe'],  Rash:    ['spa', 'spd'],
  Calm:     ['spd', 'atk'],  Gentle:  ['spd', 'def'],  Sassy:   ['spd', 'spe'],  Careful: ['spd', 'spa'],
};

// ─── Petits composants UI ─────────────────────────────────────────────────────

function TypeBadgeMini({ typeName }) {
  return (
    <span
      className="pl-1 inline-flex items-stretch rounded-full overflow-hidden"
      style={{ backgroundColor: TYPE_HEX[typeName] || '#828282' }}
    >
      <img
        src={`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${typeName}.svg`}
        alt=""
        className="w-5 h-5 object-contain flex-shrink-0"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
      <span className="self-center pr-2 text-[10px] font-bold text-white uppercase leading-none">
        {TYPE_FR[typeName] || typeName}
      </span>
    </span>
  );
}

function DamageClassBadge({ damageClass, isDark }) {
  const colors = {
    physical: isDark ? 'bg-orange-900/40 text-orange-300' : 'bg-orange-100 text-orange-700',
    special:  isDark ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-100 text-indigo-700',
    status:   isDark ? 'bg-gray-700 text-gray-400'        : 'bg-gray-200 text-gray-500',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[damageClass] || colors.status}`}>
      {DAMAGE_CLASS_FR[damageClass] || damageClass}
    </span>
  );
}

function StatPill({ label, value, isDark }) {
  return (
    <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl ${isDark ? 'bg-gray-700/60' : 'bg-gray-100'}`}>
      <span className={`text-[9px] font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        {label}
      </span>
      <span className={`text-sm font-black tabular-nums ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  );
}

function SectionTitle({ title, isDark }) {
  return (
    <p className={`text-xs font-black uppercase tracking-widest mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
      {title}
    </p>
  );
}

// ─── MoveCard ─────────────────────────────────────────────────────────────────

function MoveCard({ move, isDark }) {
  return (
    <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-gray-800/60' : 'bg-gray-50'}`}>
      <p className={`text-base font-bold mb-2 leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {move.nameFr}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <TypeBadgeMini typeName={move.type} />
        <DamageClassBadge damageClass={move.damageClass} isDark={isDark} />
        {move.damageClass !== 'status' && (
          <>
            <StatPill label="Puissance" value={move.power ?? '—'} isDark={isDark} />
            <StatPill label="Précision" value={move.accuracy != null ? `${move.accuracy}%` : '—'} isDark={isDark} />
          </>
        )}
      </div>
    </div>
  );
}

// ─── ItemCard ─────────────────────────────────────────────────────────────────

function ItemCard({ item, itemSlug, isDark, accentHex }) {
  return (
    <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${isDark ? 'bg-gray-800/60' : 'bg-gray-50'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <img
          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${itemSlug}.png`}
          alt=""
          className="w-8 h-8 object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextSibling.style.display = 'block';
          }}
        />
        <span className="hidden text-lg">🎒</span>
      </div>
      <p className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item}</p>
    </div>
  );
}

// ─── EVs / IVs / Nature ───────────────────────────────────────────────────────

function EVsSection({ evs, ivs, nature, isDark, accentHex }) {
  const effects   = nature ? NATURE_EFFECTS[nature] : null;
  const boosted   = effects?.[0];
  const lowered   = effects?.[1];
  const hasIVs    = Object.values(ivs).some(v => v < 31);
  const activeEVs = STATS.filter(s => (evs[s.key] ?? 0) > 0);

  return (
    <div className="space-y-4">
      {/* Nature */}
      {nature && (
        <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${isDark ? 'bg-gray-800/60' : 'bg-gray-50'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            🌿
          </div>
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Nature</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {NATURES_FR[nature] || nature}
              </p>
              {boosted && (
                <span className="text-xs font-black text-green-500">
                  +{STATS.find(s => s.key === boosted)?.fr}
                </span>
              )}
              {lowered && (
                <span className="text-xs font-black text-red-400">
                  −{STATS.find(s => s.key === lowered)?.fr}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EV bars */}
      {activeEVs.length > 0 && (
        <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-gray-800/60' : 'bg-gray-50'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>EVs</p>
          <div className="space-y-2">
            {activeEVs.map(({ key, fr }) => {
              const ev = evs[key] ?? 0;
              const isBoosted = key === boosted;
              const isLowered = key === lowered;
              return (
                <div key={key} className="flex items-center gap-2">
                  <span
                    className="w-10 text-xs font-black"
                    style={{ color: isBoosted ? '#22c55e' : isLowered ? '#f87171' : accentHex }}
                  >
                    {fr}
                  </span>
                  <span className={`w-8 text-xs font-semibold tabular-nums text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {ev}
                  </span>
                  <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(ev / 252) * 100}%`,
                        backgroundColor: isBoosted ? '#22c55e' : isLowered ? '#f87171' : accentHex,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* IVs réduits (seulement si ≠ 31) */}
      {hasIVs && (
        <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-gray-800/60' : 'bg-gray-50'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>IVs réduits</p>
          <div className="flex flex-wrap gap-1.5">
            {STATS.map(({ key, fr }) => {
              const iv = ivs[key];
              if (iv === undefined || iv >= 31) return null;
              return (
                <span
                  key={key}
                  className={`text-xs font-bold px-2 py-1 rounded-full ${isDark ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700'}`}
                >
                  {iv} {fr}
                </span>
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
  if (!result) return null; // still loading (undefined)

  return (
    <div className="px-5 pt-3 pb-4 space-y-5">
      {/* Format + nom du set */}
      <div className="flex items-center gap-2 pt-1">
        <span
          className="text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide"
          style={{ backgroundColor: `${accentHex}22`, color: accentHex }}
        >
          {result.formatLabel}
        </span>
        <span className={`text-sm font-medium truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {result.setName}
        </span>
      </div>

      {/* Attaques */}
      <div>
        <SectionTitle title="Attaques" isDark={isDark} />
        <div className="space-y-2">
          {result.moves.map((move, i) => (
            <MoveCard key={i} move={move} isDark={isDark} />
          ))}
        </div>
      </div>

      {/* Objet */}
      {result.item && (
        <div>
          <SectionTitle title="Objet conseillé" isDark={isDark} />
          <ItemCard item={result.item} itemSlug={result.itemSlug} isDark={isDark} accentHex={accentHex} />
        </div>
      )}

      {/* EVs / IVs / Nature */}
      {(Object.keys(result.evs).length > 0 || result.nature) && (
        <div>
          <SectionTitle title="Répartition" isDark={isDark} />
          <EVsSection
            evs={result.evs}
            ivs={result.ivs}
            nature={result.nature}
            isDark={isDark}
            accentHex={accentHex}
          />
        </div>
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
    <div className={`sticky top-0 z-10 px-5 py-3 ${isDark ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
      <div className={`flex rounded-xl p-1 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
        {tabs.map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                isActive ? 'text-white shadow-sm' : isDark ? 'text-gray-400' : 'text-gray-500'
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
