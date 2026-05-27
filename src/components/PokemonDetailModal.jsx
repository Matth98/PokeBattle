import React, { useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { usePokemonDetail } from '../hooks/usePokemonDetail';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { TYPE_FR, TYPE_COLORS, TYPE_HEX } from '../hooks/usePokemonTypes';
import { useTranslation } from '../hooks/useTranslation';

const ALL_TYPES = Object.keys(TYPE_HEX);

const statColor = (value) => {
  if (value >= 150) return '#22c55e';
  if (value >= 100) return '#84cc16';
  if (value >= 70)  return '#eab308';
  if (value >= 50)  return '#f97316';
  return '#ef4444';
};

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
          <div key={mult} className="flex items-start gap-4">
            <MultBadge mult={mult} isDark={isDark} />
            <div className="flex flex-wrap gap-4">
              {types.map(typeName => <TypePictogram key={typeName} typeName={typeName} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const INFO_ICONS = {
  'pokemon.weight':       '⚖️',
  'pokemon.height':       '📏',
  'pokemon.captureRate':  '🎯',
  'pokemon.generation':   '📅',
  'pokemon.eggGroup':     '🥚',
  'pokemon.gender':       '⚧️',
  'pokemon.growthRate':   '📈',
  'pokemon.species':      '🔬',
  'pokemon.effortPoints': '💪',
  'pokemon.baseExp':      '⭐',
};

function InfoRow({ labelKey, label, value, accentColor, isDark }) {
  const icon = INFO_ICONS[labelKey];
  return (
    <div className={`py-3 flex items-center gap-3`}>
      {icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: accentColor }}>{label}</p>
        <p className={`text-base mt-0.5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{value}</p>
      </div>
    </div>
  );
}

export const PokemonDetailModal = ({ pokeId, pokeName, t, isDark, onClose }) => {
  const tr = useTranslation();
  const { data, loading, error } = usePokemonDetail(pokeId, pokeName);

  // Prevent background scroll on iOS (position: fixed is the only reliable fix)
  useBodyScrollLock();

  // ── Framer-motion spring bottom sheet ──
  const H = typeof window !== 'undefined' ? window.innerHeight : 800;
  // Start off-screen so the enter animation slides up from below
  const y = useMotionValue(H);
  // Overlay fades proportionally to sheet position
  const overlayOpacity = useTransform(y, [0, H * 0.45], [1, 0]);
  const sheetRef = useRef(null);
  const scrollRef = useRef(null);

  // Dismiss: spring-accelerate off-screen then call onClose
  const dismiss = useCallback((velocityY = 800) => {
    animate(y, H, {
      type: 'spring',
      damping: 18,
      stiffness: 200,
      velocity: velocityY,
      restDelta: 1,
    });
    setTimeout(() => onClose(), 320);
  }, [y, H, onClose]);

  const handleClose = useCallback(() => dismiss(400), [dismiss]);

  const snapBack = useCallback(() => {
    animate(y, 0, { type: 'spring', damping: 30, stiffness: 400 });
  }, [y]);

  // ── Native touch listeners (non-passive) on the sheet container ──
  // This is the only reliable way on iOS to:
  //   1. Respond to touch anywhere on the sheet (not just the grip handle)
  //   2. Call e.preventDefault() to stop background scroll during the swipe
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    let startY = 0;
    let startScrollTop = 0;
    let lastY = 0;
    let lastTime = 0;
    let tracking = false;

    const onTouchStart = (e) => {
      startY = e.touches[0].clientY;
      lastY  = startY;
      lastTime = Date.now();
      startScrollTop = scrollRef.current?.scrollTop ?? 0;
      tracking = false;
    };

    const onTouchMove = (e) => {
      const currentY = e.touches[0].clientY;
      const deltaY   = currentY - startY;
      lastY  = currentY;
      lastTime = Date.now();

      // Activate tracking only when: scrolled to top AND moving downward
      if (!tracking) {
        if (deltaY > 8 && startScrollTop <= 0) {
          tracking = true;
        } else {
          return;
        }
      }

      // Prevent the inner scroll container from scrolling while we drag the sheet
      e.preventDefault();

      if (deltaY > 0) y.set(deltaY);
    };

    const onTouchEnd = (e) => {
      if (!tracking) return;
      tracking = false;

      const deltaY   = lastY - startY;
      const elapsed  = Math.max(1, Date.now() - lastTime);
      // Velocity in px/ms (use last segment for accuracy)
      const velocity = (e.changedTouches[0].clientY - startY) /
                       Math.max(1, Date.now() - (lastTime - 50));

      if (velocity > 0.5 || deltaY > 120) {
        dismiss(velocity * 1000); // framer wants px/s
      } else {
        snapBack();
      }
    };

    sheet.addEventListener('touchstart', onTouchStart, { passive: true  });
    sheet.addEventListener('touchmove',  onTouchMove,  { passive: false });
    sheet.addEventListener('touchend',   onTouchEnd,   { passive: true  });

    return () => {
      sheet.removeEventListener('touchstart', onTouchStart);
      sheet.removeEventListener('touchmove',  onTouchMove);
      sheet.removeEventListener('touchend',   onTouchEnd);
    };
  }, [y, dismiss, snapBack]);

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
    { multVal: 2, label: 2 },
    { multVal: 4, label: 4 },
  ]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col backdrop-blur-md"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', opacity: overlayOpacity }}
    >
      <motion.div
        ref={sheetRef}
        className={`relative ${isDark ? 'bg-[#1c1c1e]' : 'bg-white'} flex-1 overflow-hidden flex flex-col rounded-t-3xl`}
        style={{ y, marginTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
      >
        {/* ── Grip handle — visuel seulement, le drag est capté sur toute la sheet ── */}
        <div className="absolute top-0 left-0 right-0 flex justify-center pt-3 z-10 pointer-events-none">
          <div className="w-10 h-1 rounded-full bg-white/40" />
        </div>

        {/* Bouton fermeture — absolu dans le div animé, ne scroll pas */}
        <button
          onClick={handleClose}
          className={`absolute top-2 right-4 w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} shadow-sm z-10 ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'}`}
          style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
          aria-label="Fermer"
        >
          <X size={22} />
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
            data-scroll-lock-ignore
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}
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
              <h1 className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{data?.name || pokeName}</h1>

              <div className="flex gap-2 mb-3">
                {data.types.map(tn => <TypeBadge key={tn} typeName={tn} />)}
              </div>

              {data.flavorText && (
                <p className={`text-base leading-relaxed mb-10 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{data.flavorText}</p>
              )}

              {/* ── Stats ── */}
              <h2 className={`text-xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{tr('pokemon.stats')}</h2>
              <div className="space-y-2 mb-10">
                {data.stats.map(({ name, value }) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-12 text-base font-semibold" style={{ color: accentHex }}>{name}</span>
                    <span className={`w-8 text-base font-semibold text-left tabular-nums ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{value}</span>
                    <div className={`flex-1 h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, (value / 255) * 100)}%`, backgroundColor: statColor(value) }}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <span className="w-12 text-base font-semibold" style={{ color: accentHex }}>{tr('pokemon.base')}</span>
                  <span className={`w-8 text-base font-black text-left tabular-nums ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{data.total}</span>
                  <div className={`flex-1 h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (data.total / 780) * 100)}%`, backgroundColor: accentHex }} />
                  </div>
                </div>
              </div>

              {/* ── Résistances / Faiblesses ── */}
              <div className="space-y-6 mb-10">
                <EffectivenessSection label={tr('pokemon.resistances')} grouped={resistanceGroups} isDark={isDark} />
                <EffectivenessSection label={tr('pokemon.weaknesses')}  grouped={weaknessGroups}  isDark={isDark} />
              </div>

              {/* ── Talents ── */}
              {data.abilities.length > 0 && (
                <div className="mb-10">
                  <h2 className={`text-xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{tr('pokemon.abilities')}</h2>
                  <div className="space-y-3">
                    {data.abilities.map(({ nameFr, descFr, isHidden }, i) => (
                      <div key={i}>
                        <p className="text-base font-bold mb-0.5" style={{ color: accentHex }}>
                          {nameFr}
                          {isHidden && <span className={`ml-2 text-[10px] font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>({tr('pokemon.hidden')})</span>}
                        </p>
                        {descFr && <p className={`text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{descFr}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Caractéristiques ── */}
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
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
