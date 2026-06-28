import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { TYPE_FR, TYPE_HEX, TYPE_HEX_DARK, TYPE_COLORS } from '../hooks/usePokemonTypes';
import { useSmogonSet } from '../hooks/useSmogonSet';
import { usePokemonMoves } from '../hooks/usePokemonMoves';
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

function TypePictogram({ typeName, size = 'w-7 h-7' }) {
  const hex   = TYPE_HEX[typeName]    || '#A8A77A';
  const c     = TYPE_COLORS[typeName] || { text: 'text-white' };
  const label = TYPE_FR[typeName]     || typeName;
  return (
    <div className={`relative ${size} flex-shrink-0`} title={label}>
      <img
        src={`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${typeName}.svg`}
        alt={label}
        className={`${size} object-contain`}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextSibling.style.display = 'flex';
        }}
      />
      <div
        className={`hidden ${size} rounded-full items-center justify-center absolute inset-0`}
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

function ItemRow({ item, itemSprite, itemPsSlug, isDark, accentHex = '#888', onPress }) {
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
    <button onClick={onPress} className="w-full text-left flex items-center gap-3">
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
    </button>
  );
}

// ─── Talent ───────────────────────────────────────────────────────────────────

function AbilityRow({ ability, isDark, accentHex, pokeId, onPress }) {
  return (
    <button onClick={onPress} className="w-full text-left flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
        <img
          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokeId}.png`}
          alt=""
          className="w-9 h-9 object-contain"
          onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
        />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: accentHex }}>Talent</p>
        <p className={`text-base font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{ability}</p>
      </div>
    </button>
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
    <span className={`${width} text-sm font-semibold tabular-nums text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`} style={{ letterSpacing: '-0.5px' }}>
      {value}
    </span>
  );
}

// ─── Ligne d'attaque (sans fond) ─────────────────────────────────────────────

function MoveRow({ move, isDark, isLast, onPress }) {
  return (
    <button
      onClick={onPress}
      className={`w-full flex items-center gap-2 py-2.5 text-left ${!isLast ? `border-b ${isDark ? 'border-zinc-800' : 'border-gray-100'}` : ''}`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <TypePictogram typeName={move.type} size="w-6 h-6" />
        <p className={`text-[15px] font-bold leading-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {move.nameFr}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
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

// ─── BaseSheet (shared animation logic) ──────────────────────────────────────

function BaseSheet({ isDark, onClose, children }) {
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

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', opacity: overlayOpacity }}
      onClick={() => dismiss()}
      onTouchStart={(e) => e.stopPropagation()}
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
        {children}
      </motion.div>
    </motion.div>
  );
}

function MoveSheet({ move, isDark, onClose }) {
  const hex      = (isDark ? TYPE_HEX_DARK : TYPE_HEX)[move.type] || '#A8A77A';
  const badgeHex = TYPE_HEX[move.type] || '#A8A77A';

  return (
    <BaseSheet isDark={isDark} onClose={onClose}>
      <div className="px-6 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)' }}>
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
    </BaseSheet>
  );
}

// ─── Nature / Item / Ability sheets ──────────────────────────────────────────

// name = nom complet pour la phrase (accord avec article)
// display = étiquette dans les encarts
const STAT_FR = {
  hp:  { name: 'PV',               art: 'les ', display: 'PV'        },
  atk: { name: 'Attaque',          art: "l'",   display: 'Attaque'   },
  def: { name: 'Défense',          art: 'la ',  display: 'Défense'   },
  spa: { name: 'Attaque Spéciale', art: "l'",   display: 'Att. Spé.' },
  spd: { name: 'Défense Spéciale', art: 'la ',  display: 'Déf. Spé.' },
  spe: { name: 'Vitesse',          art: 'la ',  display: 'Vitesse'   },
};

function NatureSheet({ nature, isDark, accentHex, onClose, pokeId }) {
  const effects = nature ? NATURE_EFFECTS[nature] : null;
  const boosted = effects?.[0];
  const lowered = effects?.[1];
  const natureFR = NATURES_FR[nature] || nature;
  const bStat = STAT_FR[boosted];
  const lStat = STAT_FR[lowered];

  return (
    <BaseSheet isDark={isDark} onClose={onClose}>
      <div className="px-6 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)' }}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
            🌿
          </div>
          <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{natureFR}</h2>
        </div>
        {effects ? (
          <>
            <p className={`text-base leading-relaxed mb-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Augmente {bStat.art}{bStat.name} de 10% et réduit {lStat.art}{lStat.name} de 10%.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: isDark ? '#16a34a22' : '#16a34a11' }}>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: isDark ? '#4ade80' : '#16a34a' }}>BONUS</p>
                <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{bStat.display}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: isDark ? '#4ade80' : '#16a34a' }}>+10%</p>
              </div>
              <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: isDark ? '#dc262622' : '#dc262611' }}>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: isDark ? '#f87171' : '#dc2626' }}>MALUS</p>
                <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{lStat.display}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: isDark ? '#f87171' : '#dc2626' }}>−10%</p>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: isDark ? '#ffffff11' : '#00000008' }}>
            <p className={`text-base font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Nature neutre — aucune statistique n&apos;est modifiée.
            </p>
          </div>
        )}
      </div>
    </BaseSheet>
  );
}

function ItemSheet({ item, itemSprite, itemPsSlug, itemDesc, isDark, accentHex, onClose }) {
  const psFallback = itemPsSlug
    ? `https://play.pokemonshowdown.com/sprites/itemicons/${itemPsSlug}.png`
    : null;
  const sources = [...new Set([itemSprite, psFallback].filter(Boolean))];
  const [srcIndex, setSrcIndex] = useState(0);
  const src = sources[srcIndex] ?? null;
  const failed = srcIndex >= sources.length;

  return (
    <BaseSheet isDark={isDark} onClose={onClose}>
      <div className="px-6 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)' }}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
            {src && !failed
              ? <img src={src} alt={item} className="w-10 h-10 object-contain" style={{ imageRendering: 'pixelated' }} onError={() => setSrcIndex(i => i + 1)} />
              : <span className="text-2xl">🎒</span>
            }
          </div>
          <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{item}</h2>
        </div>
        <p className={`text-base leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {itemDesc || 'Aucune description disponible.'}
        </p>
      </div>
    </BaseSheet>
  );
}

function AbilitySheet({ ability, abilityDesc, isDark, accentHex, onClose, pokeId }) {
  return (
    <BaseSheet isDark={isDark} onClose={onClose}>
      <div className="px-6 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)' }}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
            <img
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokeId}.png`}
              alt=""
              className="w-12 h-12 object-contain"
              onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
            />
          </div>
          <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{ability}</h2>
        </div>
        <p className={`text-base leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {abilityDesc || 'Aucune description disponible.'}
        </p>
      </div>
    </BaseSheet>
  );
}

// ─── EVs / IVs / Nature ───────────────────────────────────────────────────────

function EVsSection({ evs, ivs, nature, item, itemSprite, itemPsSlug, itemDesc, ability, abilityDesc, isDark, accentHex, pokeId, natureDesc }) {
  const effects   = nature ? NATURE_EFFECTS[nature] : null;
  const boosted   = effects?.[0];
  const lowered   = effects?.[1];
  const activeEVs = STATS.filter(s => (evs[s.key] ?? 0) > 0);

  const [showNatureSheet,  setShowNatureSheet]  = useState(false);
  const [showItemSheet,    setShowItemSheet]    = useState(false);
  const [showAbilitySheet, setShowAbilitySheet] = useState(false);

  return (
    <div>
      {/* Set : Nature + Objet + Talent */}
      {(nature || item || ability) && (
        <div className="mb-12">
          <SectionTitle title="Set complet" isDark={isDark} mb="mb-4" />
          <div className="space-y-4">
            {nature && (
              <button onClick={() => setShowNatureSheet(true)} className="w-full text-left flex items-center gap-3">
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
              </button>
            )}
            {item && (
              <ItemRow item={item} itemSprite={itemSprite} itemPsSlug={itemPsSlug} isDark={isDark} accentHex={accentHex} onPress={() => setShowItemSheet(true)} />
            )}
            {ability && (
              <AbilityRow ability={ability} isDark={isDark} accentHex={accentHex} pokeId={pokeId} onPress={() => setShowAbilitySheet(true)} />
            )}
          </div>
        </div>
      )}

      {showNatureSheet && (
        <NatureSheet nature={nature} isDark={isDark} accentHex={accentHex} onClose={() => setShowNatureSheet(false)} pokeId={pokeId} />
      )}
      {showItemSheet && (
        <ItemSheet item={item} itemSprite={itemSprite} itemPsSlug={itemPsSlug} itemDesc={itemDesc} isDark={isDark} accentHex={accentHex} onClose={() => setShowItemSheet(false)} />
      )}
      {showAbilitySheet && (
        <AbilitySheet ability={ability} abilityDesc={abilityDesc} isDark={isDark} accentHex={accentHex} onClose={() => setShowAbilitySheet(false)} pokeId={pokeId} />
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

export function StrategyTab({ pokeId, isDark, accentHex, onEmpty }) {
  const { result, loading, error, retry } = useSmogonSet(pokeId);
  const [selectedMove, setSelectedMove] = useState(null);

  useEffect(() => {
    if (!loading) onEmpty?.(result === null);
  }, [loading, result, onEmpty]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 9rem)' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: accentHex }} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-16 px-8 text-center flex flex-col items-center gap-3">
        <p className={`text-base font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Impossible de charger le set
        </p>
        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Une erreur est survenue. Vérifie ta connexion et réessaie.
        </p>
        <button
          onClick={retry}
          className="mt-1 px-4 py-2 rounded-full text-sm font-semibold text-white"
          style={{ background: accentHex }}
        >
          Réessayer
        </button>
      </div>
    );
  }
  if (result === null) {
    return (
      <div className="flex flex-col items-center justify-center px-8 text-center" style={{ height: 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 9rem)' }}>
        <p className={`text-base font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Aucun set PokéScores disponible
        </p>
        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Ce Pokémon n'a pas encore de set référencé.
        </p>
      </div>
    );
  }
  if (!result) return null;

  return (
    <div className="px-5 pt-4 pb-4">

      {/* Attaques */}
      <div className="mb-10">
        <div className="flex items-center mb-1">
          <h2 className={`flex-1 text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Attaques</h2>
          <div className="flex items-center gap-3 pr-0.5">
            <span className={`w-10 text-center text-[9px] font-bold uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Puiss.</span>
            <span className={`w-10 text-center text-[9px] font-bold uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Préc.</span>
            <span className={`w-6 text-center text-[9px] font-bold uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Cat.</span>
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
          itemDesc={result.itemDesc}
          ability={result.ability}
          abilityDesc={result.abilityDesc}
          isDark={isDark}
          accentHex={accentHex}
          pokeId={pokeId}
          natureDesc={result.natureDesc}
        />
      )}

      {/* Bottom sheet attaque */}
      {selectedMove && (
        <MoveSheet move={selectedMove} isDark={isDark} onClose={() => setSelectedMove(null)} />
      )}
    </div>
  );
}

// ─── Ligne d'attaque avec niveau ─────────────────────────────────────────────

function LevelMoveRow({ move, isDark, isLast, onPress, accentHex }) {
  return (
    <button
      onClick={onPress}
      className={`w-full flex items-center gap-2 py-2.5 text-left ${!isLast ? `border-b ${isDark ? 'border-zinc-800' : 'border-gray-100'}` : ''}`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <TypePictogram typeName={move.type} size="w-6 h-6" />
        <p className={`text-[15px] font-bold leading-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {move.nameFr}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Niveau */}
        <span className="w-10 flex items-baseline justify-center gap-0 flex-shrink-0" style={{ color: accentHex }}>
          {move.level === 0
            ? <span className="text-[10px] font-bold">Évo.</span>
            : <>
                <span className="text-[9px] font-bold leading-none">Niv</span>
                <span className="text-sm font-semibold tabular-nums leading-none" style={{ letterSpacing: '-0.5px' }}>{move.level}</span>
              </>
          }
        </span>
        <StatCol value={move.power ?? '—'} isDark={isDark} width="w-10" />
        <StatCol value={move.accuracy != null ? `${move.accuracy}%` : '—'} isDark={isDark} width="w-10" />
        <div className="w-6 flex justify-center"><DamageClassIcon damageClass={move.damageClass} /></div>
      </div>
    </button>
  );
}

// ─── En-tête de colonnes (réutilisable) ──────────────────────────────────────

function MoveColHeaders({ isDark, title, showLevel = false, showMachine = false }) {
  const label4 = showLevel ? 'Niv.' : showMachine ? 'CT' : null;
  return (
    <div className="flex items-center mb-1">
      <h2 className={`flex-1 text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
      <div className="flex items-center gap-3 pr-0.5">
        {label4 && <span className={`w-10 text-center text-[9px] font-bold uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{label4}</span>}
        <span className={`w-10 text-center text-[9px] font-bold uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Puiss.</span>
        <span className={`w-10 text-center text-[9px] font-bold uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Préc.</span>
        <span className={`w-6 text-center text-[9px] font-bold uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Cat.</span>
      </div>
    </div>
  );
}

// ─── Ligne CT / CS ───────────────────────────────────────────────────────────

function MachineMoveRow({ move, isDark, isLast, onPress, accentHex }) {
  const mn = move.machineNum;
  return (
    <button
      onClick={onPress}
      className={`w-full flex items-center gap-2 py-2.5 text-left ${!isLast ? `border-b ${isDark ? 'border-zinc-800' : 'border-gray-100'}` : ''}`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <TypePictogram typeName={move.type} size="w-6 h-6" />
        <p className={`text-[15px] font-bold leading-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {move.nameFr}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="w-10 flex items-baseline justify-center gap-0 flex-shrink-0" style={{ color: accentHex }}>
          {mn
            ? <>
                <span className="text-[9px] font-bold leading-none">{mn.prefix}</span>
                <span className="text-sm font-semibold tabular-nums leading-none" style={{ letterSpacing: '-0.5px' }}>{mn.number}</span>
              </>
            : <span className={`text-sm font-semibold tabular-nums ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>—</span>
          }
        </span>
        <StatCol value={move.power ?? '—'} isDark={isDark} width="w-10" />
        <StatCol value={move.accuracy != null ? `${move.accuracy}%` : '—'} isDark={isDark} width="w-10" />
        <div className="w-6 flex justify-center"><DamageClassIcon damageClass={move.damageClass} /></div>
      </div>
    </button>
  );
}

// ─── MovesTab ────────────────────────────────────────────────────────────────

export function MovesTab({ pokeId, isDark, accentHex }) {
  const { moves, loading, error } = usePokemonMoves(pokeId);
  const [selectedMove, setSelectedMove] = useState(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 9rem)' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: accentHex }} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-8 text-center" style={{ height: 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 9rem)' }}>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Impossible de charger les attaques : {error}
        </p>
      </div>
    );
  }
  if (!moves) return null;

  const hasLevelUp = moves.levelUp.length > 0;
  const hasMachine = moves.machine.length > 0;
  const hasEgg = moves.egg.length > 0;

  if (!hasLevelUp && !hasMachine && !hasEgg) {
    return (
      <div className="flex flex-col items-center justify-center px-8 text-center" style={{ height: 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 9rem)' }}>
        <p className={`text-base font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Aucune attaque disponible
        </p>
        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Cette forme ne possède pas d'attaques propres.
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 pb-4">

      {/* ── Par niveau ── */}
      {hasLevelUp && (
        <div className={hasMachine || hasEgg ? 'mb-12' : ''}>
          <MoveColHeaders title="Par niveau" isDark={isDark} showLevel />
          {moves.levelUp.map((move, i) => (
            <LevelMoveRow
              key={move.name}
              move={move}
              isDark={isDark}
              accentHex={accentHex}
              isLast={i === moves.levelUp.length - 1}
              onPress={() => setSelectedMove(move)}
            />
          ))}
        </div>
      )}

      {/* ── CT / CS ── */}
      {hasMachine && (
        <div className={hasEgg ? 'mb-12' : ''}>
          <MoveColHeaders title="CT / CS" isDark={isDark} showMachine />
          {moves.machine.map((move, i) => (
            <MachineMoveRow
              key={move.name}
              move={move}
              isDark={isDark}
              accentHex={accentHex}
              isLast={i === moves.machine.length - 1}
              onPress={() => setSelectedMove(move)}
            />
          ))}
        </div>
      )}

      {/* ── Reproduction ── */}
      {hasEgg && (
        <div>
          <MoveColHeaders title="Reproduction" isDark={isDark} />
          {moves.egg.map((move, i) => (
            <MoveRow
              key={move.name}
              move={move}
              isDark={isDark}
              isLast={i === moves.egg.length - 1}
              onPress={() => setSelectedMove(move)}
            />
          ))}
        </div>
      )}

      {/* Bottom sheet */}
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
    { key: 'attaques',     label: 'Attaques'     },
  ];
  return (
    <div className={`px-5 py-3 ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
      <div className={`grid grid-cols-3 gap-1 p-1 rounded-2xl ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
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
