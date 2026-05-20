import React, { useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate, useDragControls } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { usePokemonDetail } from '../hooks/usePokemonDetail';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { TYPE_FR, TYPE_COLORS } from '../hooks/usePokemonTypes';

const TYPE_HEX = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', grass: '#7AC74C',
  electric: '#F7D02C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
  ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
  rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
  steel: '#B7B7CE', fairy: '#D685AD',
};

const ALL_TYPES = Object.keys(TYPE_HEX);

const statColor = (value) => {
  if (value >= 150) return '#22c55e';
  if (value >= 100) return '#84cc16';
  if (value >= 70)  return '#eab308';
  if (value >= 50)  return '#f97316';
  return '#ef4444';
};

function TypeBadge({ typeName }) {
  const c = TYPE_COLORS[typeName] || { bg: 'bg-gray-400', text: 'text-white' };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
      {TYPE_FR[typeName] || typeName}
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
    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
      <span className={`text-[11px] font-black ${isWeak ? 'text-red-500' : 'text-green-600'}`}>
        ×{mult}
      </span>
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
          <div key={mult} className="flex items-center gap-3">
            <MultBadge mult={mult} isDark={isDark} />
            <div className="flex flex-wrap gap-3">
              {types.map(typeName => <TypePictogram key={typeName} typeName={typeName} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const INFO_ICONS = {
  'Poids':                   '⚖️',
  'Taille':                  '📏',
  'Taux de capture':         '🎯',
  "Génération d'apparition": '📅',
  "Groupe d'œufs":           '🥚',
  'Répartition':             '⚧️',
  'Gain de niveau':          '📈',
  'Espèce':                  '🔬',
  "Points d'efforts donnés": '💪',
  'Base exp. donnée':        '⭐',
};

function InfoRow({ label, value, accentColor, isDark }) {
  const icon = INFO_ICONS[label];
  return (
    <div className={`py-3 flex items-center gap-3`}>
      {icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: accentColor }}>{label}</p>
        <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{value}</p>
      </div>
    </div>
  );
}

export const PokemonDetailModal = ({ pokeId, pokeName, t, isDark, onClose }) => {
  const { data, loading, error } = usePokemonDetail(pokeId);

  // Prevent background scroll on iOS (position: fixed is the only reliable fix)
  useBodyScrollLock();

  // ── Framer-motion spring bottom sheet ──
  // Start y at full screen height so sheet begins off-screen (no conflict with initial prop)
  const y = useMotionValue(typeof window !== 'undefined' ? window.innerHeight : 800);
  // Overlay fades as sheet moves down: y=0 → opacity 1, y=45%H → opacity 0
  const overlayOpacity = useTransform(
    y,
    [0, (typeof window !== 'undefined' ? window.innerHeight : 800) * 0.45],
    [1, 0],
  );
  const dragControls = useDragControls();
  const scrollRef = useRef(null);

  // Dismiss: spring-accelerate to bottom then close
  const dismiss = useCallback((velocityY = 800) => {
    animate(y, typeof window !== 'undefined' ? window.innerHeight : 800, {
      type: 'spring',
      damping: 18,
      stiffness: 200,
      velocity: velocityY,
      restDelta: 1,
    });
    setTimeout(() => onClose(), 320);
  }, [y, onClose]);

  // Close button
  const handleClose = useCallback(() => dismiss(400), [dismiss]);

  // Snap back to 0 with overshoot spring
  const snapBack = useCallback(() => {
    animate(y, 0, { type: 'spring', damping: 30, stiffness: 400 });
  }, [y]);

  const handleDragEnd = useCallback((_, info) => {
    const shouldDismiss = info.velocity.y > 500 || info.offset.y > 150;
    if (shouldDismiss) {
      dismiss(info.velocity.y);
    } else {
      snapBack();
    }
  }, [dismiss, snapBack]);

  // Start drag from content when scroll is at top
  const handleContentPointerDown = useCallback((e) => {
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    if (scrollTop <= 0) {
      dragControls.start(e);
    }
  }, [dragControls]);

  const primaryType = data?.types?.[0] || 'normal';
  const accentHex = TYPE_HEX[primaryType] || '#6390F0';

  const groupByMult = (multValues) => {
    return multValues
      .map(({ multVal, label }) => ({
        mult: label,
        types: ALL_TYPES.filter(tn => (data?.effectiveness?.[tn] ?? 1) === multVal),
      }))
      .filter(g => g.types.length > 0);
  };

  const resistanceGroups = groupByMult([
    { multVal: 0,    label: '0'  },
    { multVal: 0.25, label: '¼'  },
    { multVal: 0.5,  label: '½'  },
  ]);
  const weaknessGroups = groupByMult([
    { multVal: 4, label: 4 },
    { multVal: 2, label: 2 },
  ]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', opacity: overlayOpacity }}
    >
      <motion.div
        className={`relative ${isDark ? 'bg-[#1c1c1e]' : 'bg-white'} flex-1 overflow-hidden flex flex-col mt-12 sm:mt-20 rounded-t-3xl`}
        style={{ y }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.4 }}
        onDragEnd={handleDragEnd}
      >
        {/* ── Grip handle — absolu, flotte au-dessus de la cover ── */}
        <div
          className="absolute top-0 left-0 right-0 flex justify-center pt-3 z-10 cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="w-10 h-1 rounded-full bg-white/40" />
        </div>

        {/* Bouton fermeture — absolu dans le div animé, ne scroll pas */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-black/20 text-white backdrop-blur-sm z-10"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>

        {/* ── Contenu scrollable ── */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin" style={{ color: accentHex }} />
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center px-8 text-center">
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Impossible de charger les données : {error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}
            onPointerDown={handleContentPointerDown}
          >
            {/* ── Hero ── */}
            <div
              className="relative flex flex-col items-center pt-4 pb-0 overflow-hidden"
              style={{ background: `linear-gradient(160deg, ${accentHex}ee 0%, ${accentHex}77 60%, ${isDark ? '#1c1c1e' : 'white'} 100%)` }}
            >
              <img
                src={data.officialArtwork || data.sprite}
                alt={pokeName}
                className="w-52 h-52 object-contain drop-shadow-xl"
                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
              />
            </div>

            <div className="px-5 pt-4 pb-2">
              {/* Numéro + nom */}
              <p className={`text-sm font-mono font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>#{String(data.id).padStart(4, '0')}</p>
              <h1 className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{pokeName}</h1>

              <div className="flex gap-2 mb-3">
                {data.types.map(tn => <TypeBadge key={tn} typeName={tn} />)}
              </div>

              {data.flavorText && (
                <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{data.flavorText}</p>
              )}

              {/* ── Stats ── */}
              <h2 className={`text-xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Stats</h2>
              <div className="space-y-2 mb-6">
                {data.stats.map(({ name, value }) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-10 text-xs font-black" style={{ color: accentHex }}>{name}</span>
                    <span className={`w-8 text-sm font-semibold text-right tabular-nums ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{value}</span>
                    <div className={`flex-1 h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, (value / 255) * 100)}%`, backgroundColor: statColor(value) }}
                      />
                    </div>
                  </div>
                ))}
                <div className={`flex items-center gap-3 pt-1 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                  <span className="w-10 text-xs font-black" style={{ color: accentHex }}>BASE</span>
                  <span className={`w-8 text-sm font-black text-right tabular-nums ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{data.total}</span>
                  <div className={`flex-1 h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (data.total / 780) * 100)}%`, backgroundColor: accentHex }} />
                  </div>
                </div>
              </div>

              {/* ── Résistances / Faiblesses ── */}
              <div className="space-y-6 mb-6">
                <EffectivenessSection label="Résistances" grouped={resistanceGroups} isDark={isDark} />
                <EffectivenessSection label="Faiblesses"  grouped={weaknessGroups}  isDark={isDark} />
              </div>

              {/* ── Talents ── */}
              {data.abilities.length > 0 && (
                <div className="mb-6">
                  <h2 className={`text-xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Talents</h2>
                  <div className="space-y-3">
                    {data.abilities.map(({ nameFr, descFr, isHidden }, i) => (
                      <div key={i}>
                        <p className="text-sm font-bold mb-0.5" style={{ color: accentHex }}>
                          {nameFr}
                          {isHidden && <span className={`ml-2 text-[10px] font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>(Caché)</span>}
                        </p>
                        {descFr && <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{descFr}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Caractéristiques ── */}
              <h2 className={`text-xl font-black mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Caractéristiques</h2>
              <div className={`divide-y ${isDark ? 'divide-gray-800' : 'divide-gray-100'}`}>
                <InfoRow label="Poids"                    value={`${data.weight} kg  —  ${(data.weight * 2.205).toFixed(1)} lbs.`} accentColor={accentHex} isDark={isDark} />
                <InfoRow label="Taille"                   value={`${data.height} m  —  ${Math.floor(data.height * 3.281)}'${String(Math.round((data.height * 3.281 % 1) * 12)).padStart(2, '0')}'`} accentColor={accentHex} isDark={isDark} />
                <InfoRow label="Taux de capture"          value={String(data.captureRate)}  accentColor={accentHex} isDark={isDark} />
                <InfoRow label="Génération d'apparition"  value={data.generation}           accentColor={accentHex} isDark={isDark} />
                <InfoRow label="Groupe d'œufs"            value={data.eggGroups}            accentColor={accentHex} isDark={isDark} />
                <InfoRow label="Répartition"              value={data.genderText}           accentColor={accentHex} isDark={isDark} />
                <InfoRow label="Gain de niveau"           value={data.growthRate}           accentColor={accentHex} isDark={isDark} />
                {data.genus && <InfoRow label="Espèce"    value={data.genus}                accentColor={accentHex} isDark={isDark} />}
                {data.evYield !== '—' && <InfoRow label="Points d'efforts donnés" value={data.evYield} accentColor={accentHex} isDark={isDark} />}
                <InfoRow label="Base exp. donnée"         value={String(data.baseExperience)} accentColor={accentHex} isDark={isDark} />
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
