import React from 'react';
import { Loader2 } from 'lucide-react';
import { TYPE_FR, TYPE_HEX } from '../hooks/usePokemonTypes';
import { usePokemonMoves } from '../hooks/usePokemonMoves';

const DAMAGE_CLASS_FR = { physical: 'Physique', special: 'Spécial', status: 'Statut' };

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

function MoveCard({ move, isDark, accentHex }) {
  const levelLabel = move.level === 0 ? 'Évo.' : `Niv. ${move.level}`;
  return (
    <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-gray-800/60' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className={`text-base font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {move.nameFr}
        </p>
        <span
          className="flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${accentHex}22`, color: accentHex }}
        >
          {levelLabel}
        </span>
      </div>
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

export function StrategyTab({ pokeId, isDark, accentHex }) {
  const { moves, loading, error } = usePokemonMoves(pokeId);

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
          Impossible de charger les attaques : {error}
        </p>
      </div>
    );
  }
  if (!moves.length) {
    return (
      <div className="py-16 px-8 text-center">
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Aucune attaque disponible.
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-2 pb-4 space-y-2">
      {moves.map((move, i) => (
        <MoveCard key={i} move={move} isDark={isDark} accentHex={accentHex} />
      ))}
    </div>
  );
}

export function TabBar({ activeTab, onTabChange, accentHex, isDark }) {
  const tabs = [
    { key: 'presentation', label: 'Présentation' },
    { key: 'strategie',    label: 'Stratégie' },
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
                isActive
                  ? 'text-white shadow-sm'
                  : isDark ? 'text-gray-400' : 'text-gray-500'
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
