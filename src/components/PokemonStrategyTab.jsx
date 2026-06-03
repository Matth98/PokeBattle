import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { TYPE_FR, TYPE_HEX, TYPE_HEX_DARK, TYPE_COLORS } from '../hooks/usePokemonTypes';
import { useSmogonSet } from '../hooks/useSmogonSet';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

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

function ItemRow({ item, itemSprite, itemPsSlug, isDark, accentHex = '#888' }) {
  const psFallback = itemPsSlug
    ? `https://play.pokemonshowdown.com/sprites/itemicons/${itemPsSlug}.png`
    : null;

  // Chaîne de sources dans l'ordre de priorité, sans doublons ni null
  const sources = [...new Set([itemSprite, psFallback].filter(Boolean))];
  const [srcIndex, setSrcIndex] = useState(0);
  const src = sources[srcIndex] ?? null;
  const failed = srcIndex >= sources.length;

  const handleError = () => setSrcIndex(i => i + 1);

  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
        {src && !failed
          ? <img src={src} alt={item} className="w-7 h-7 object-contain" style={{ imageRendering: 'pixelated' }} onError={handleError} />
          : <span className="text-base">🎒</span>
        }
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: accentHex }}>Objet</p>
        <p className={`text-base font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{item}</p>
      </div>
    </div>
  );
}

// ─── Talent ───────────────────────────────────────────────────────────────────

function AbilityRow({ ability, isDark, accentHex }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
        ⭐️
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: accentHex }}>Talent</p>
        <p className={`text-base font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{ability}</p>
      </div>
    </div>
  );
}

// ─── Titre de section ─────────────────────────────────────────────────────────

function SectionTitle({ title, isDark, mb = 'mb-3' }) {
  return (
    <h2 className={`text-xl font-black ${mb} ${isDark ? 'text-white' : 'text-gray-900'}`}>
      {title}
    </h2>
  );
}

// ─── Colonnes de stats pour les attaques ──────────────────────────────────────

function StatCol({ value, isDark, width = 'w-8' }) {
  return (
    <span className={`${width} text-sm font-semibold tabular-nums text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
      {value}
    </span>
  );
}

// ─── Ligne d'attaque (sans fond) ─────────────────────────────────────────────

function MoveRow({ move, isDark, isLast, onPress }) {
  return (
    <button
      onClick={onPress}
      className={`w-full flex items-center gap-3 py-2.5 text-left ${!isLast ? `border-b ${isDark ? 'border-zinc-800' : 'border-gray-100'}` : ''}`}
    >
      <TypePictogram typeName={move.type} />
      <p className={`flex-1 text-base font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {move.nameFr}
      </p>
      <div className="flex items-center gap-6 flex-shrink-0">
        <StatCol value={move.power ?? '—'} isDark={isDark} width="w-10" />
        <StatCol value={move.accuracy != null ? `${move.accuracy}%` : '—'} isDark={isDark} width="w-10" />
        <div className="w-6 flex justify-center"><DamageClassIcon damageClass={move.damageClass} /></div>
      </div>
    </button>
  );
}

// ─── Bottom sheet détail d'une attaque ───────────────────────────────────────

const DAMAGE_CLASS_FR  = { physical: 'Physique', special: 'Spéciale', status: 'Statut' };
const DAMAGE_CLASS_HEX = { physical: '#ff4400', special: '#2266cc', status: '#999999' };

function MoveSheet({ move, isDark, onClose }) {
  useBodyScrollLock();
  const H  = typeof window !== 'undefined' ? window.innerHeight : 800;
  const y  = useMotionValue(H);
  const overlayOpacity = useTransform(y, [0, H * 0.5], [1, 0]);
  const sheetRef = useRef(null);

  const dismiss = useCallback((vel = 600) => {
    animate(y, H, { type: 'spring', damping: 18, stiffness: 200, velocity: vel, restDelta: 1 });
    setTimeout(onClose, 300);
  }, [y, H, onClose]);

  const snapBack = useCallback(() => {
    animate(y, 0, { type: 'spring', damping: 30, stiffness: 400 });
  }, [y]);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    let startY = 0, lastY = 0, lastTime = 0, tracking = false;

    const onTouchStart = (e) => {
      startY = e.touches[0].clientY; lastY = startY; lastTime = Date.now(); tracking = false;
    };
    const onTouchMove = (e) => {
      const cur = e.touches[0].clientY;
      const delta = cur - startY;
      lastY = cur; lastTime = Date.now();
      if (!tracking) { if (delta > 8) tracking = true; else return; }
      e.preventDefault();
      if (delta > 0) y.set(delta);
    };
    const onTouchEnd = (e) => {
      if (!tracking) return;
      tracking = false;
      const delta = lastY - startY;
      const vel   = (e.changedTouches[0].clientY - startY) / Math.max(1, Date.now() - (lastTime - 50));
      if (vel > 0.5 || delta > 100) dismiss(vel * 1000); else snapBack();
    };

    sheet.addEventListener('touchstart', onTouchStart, { passive: true });
    sheet.addEventListener('touchmove',  onTouchMove,  { passive: false });
    sheet.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      sheet.removeEventListener('touchstart', onTouchStart);
      sheet.removeEventListener('touchmove',  onTouchMove);
      sheet.removeEventListener('touchend',   onTouchEnd);
    };
  }, [y, dismiss, snapBack]);

  const hex      = (isDark ? TYPE_HEX_DARK : TYPE_HEX)[move.type] || '#A8A77A';
  const badgeHex = TYPE_HEX[move.type] || '#A8A77A';

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', opacity: overlayOpacity }}
      onClick={() => dismiss()}
    >
      <motion.div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative rounded-t-3xl overflow-hidden ${isDark ? 'bg-zinc-900' : 'bg-white'}`}
        style={{ y }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`} />
        </div>

        <div className="px-6 pt-3 pb-10">
          {/* Nom */}
          <h2 className={`text-2xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {move.nameFr}
          </h2>

          {/* Type + Catégorie */}
          <div className="flex gap-2 mb-5">
            {/* Badge type */}
            <span className="pl-1 inline-flex items-stretch rounded-full overflow-hidden" style={{ backgroundColor: badgeHex }}>
              <img
                src={`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${move.type}.svg`}
                alt=""
                className="w-6 h-6 object-contain flex-shrink-0"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span className="self-center pr-3 text-xs font-bold text-white uppercase leading-none">
                {TYPE_FR[move.type] || move.type}
              </span>
            </span>
            {/* Badge catégorie */}
            <span
              className="pl-1 inline-flex items-center rounded-full overflow-hidden pr-3"
              style={{ backgroundColor: DAMAGE_CLASS_HEX[move.damageClass] || '#A8A77A' }}
            >
              <img
                src={DAMAGE_CLASS_ICONS[move.damageClass] || DAMAGE_CLASS_ICONS.status}
                alt={move.damageClass}
                className="w-5 h-5 object-contain flex-shrink-0"
              />
              <span className="text-xs font-bold text-white uppercase leading-none">
                {DAMAGE_CLASS_FR[move.damageClass] || move.damageClass}
              </span>
            </span>
          </div>

          {/* Description */}
          {move.desc && (
            <p className={`text-base leading-relaxed mb-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {move.desc}
            </p>
          )}

          {/* 4 cartes stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: `${hex}18` }}>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: hex }}>Puissance</p>
              <p className={`text-xl font-black tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {move.power ?? '—'}
              </p>
            </div>
            <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: `${hex}18` }}>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: hex }}>Précision</p>
              <p className={`text-xl font-black tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {move.accuracy != null ? `${move.accuracy}%` : '—'}
              </p>
            </div>
            <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: `${hex}18` }}>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: hex }}>PP</p>
              <p className={`text-xl font-black tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {move.pp ?? '—'}
              </p>
            </div>
            <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: `${hex}18` }}>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: hex }}>Priorité</p>
              <p className={`text-xl font-black tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {move.priority > 0 ? `+${move.priority}` : (move.priority ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── EVs / IVs / Nature ───────────────────────────────────────────────────────

function EVsSection({ evs, ivs, nature, item, itemSprite, itemPsSlug, ability, isDark, accentHex }) {
  const effects   = nature ? NATURE_EFFECTS[nature] : null;
  const boosted   = effects?.[0];
  const lowered   = effects?.[1];
  const activeEVs = STATS.filter(s => (evs[s.key] ?? 0) > 0);

  return (
    <div className="space-y-10">
      {/* Set : Nature + Objet + Talent */}
      {(nature || item || ability) && (
        <div>
          <SectionTitle title="Set complet" isDark={isDark} mb="mb-4" />
          <div className="space-y-4">
            {nature && (
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                  🌿
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: accentHex }}>Nature</p>
                  <p className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {NATURES_FR[nature] || nature}
                  </p>
                </div>
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
            )}
            {item && (
              <ItemRow item={item} itemSprite={itemSprite} itemPsSlug={itemPsSlug} isDark={isDark} accentHex={accentHex} />
            )}
            {ability && (
              <AbilityRow ability={ability} isDark={isDark} accentHex={accentHex} />
            )}
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
                <div key={key} className="flex items-center gap-3">
                  <span className="w-12 text-base font-semibold" style={{ color: accentHex }}>{fr}</span>
                  <span className={`w-8 text-base font-semibold text-left tabular-nums ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {ev}
                  </span>
                  <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-gray-200'}`}>
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
  const [selectedMove, setSelectedMove] = useState(null);

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
    <div className="px-5 pt-10 pb-4">

      {/* Attaques */}
      <div className="mb-10">
        <div className="flex items-center mb-1">
          <h2 className={`flex-1 text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Attaques</h2>
          <div className="flex items-center gap-6 pr-0.5">
            <span className={`w-10 text-center text-[9px] font-bold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Puiss.</span>
            <span className={`w-10 text-center text-[9px] font-bold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Préc.</span>
            <span className={`w-6 text-center text-[9px] font-bold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Cat.</span>
          </div>
        </div>
        {result.moves.map((move, i) => (
          <MoveRow key={i} move={move} isDark={isDark} isLast={i === result.moves.length - 1} onPress={() => setSelectedMove(move)} />
        ))}
      </div>

      {/* Nature + EVs + IVs */}
      {(Object.keys(result.evs).length > 0 || result.nature || result.item || result.ability) && (
        <EVsSection
          evs={result.evs}
          ivs={result.ivs}
          nature={result.nature}
          item={result.item}
          itemSprite={result.itemSprite}
          itemPsSlug={result.itemPsSlug}
          ability={result.ability}
          isDark={isDark}
          accentHex={accentHex}
        />
      )}

      {/* Bottom sheet attaque */}
      {selectedMove && (
        <MoveSheet move={selectedMove} isDark={isDark} onClose={() => setSelectedMove(null)} />
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
