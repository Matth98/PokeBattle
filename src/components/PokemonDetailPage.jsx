import React, { useState, useLayoutEffect, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { usePokemonDetail } from '../hooks/usePokemonDetail';
import { TYPE_FR, TYPE_COLORS, TYPE_HEX, TYPE_HEX_DARK } from '../hooks/usePokemonTypes';
import { useTranslation } from '../hooks/useTranslation';
import { TabBar, StrategyTab, MovesTab } from './PokemonStrategyTab';

const ALL_TYPES = Object.keys(TYPE_HEX);

/* ── Formes géométriques par type pour le Hero ── */
const HERO_SHAPES = {
  normal: [
    { el:'circle', cx:350, cy:40,  r:110, opacity:0.17 },
    { el:'circle', cx:55,  cy:225, r:85,  opacity:0.11 },
    { el:'circle', cx:385, cy:250, r:55,  opacity:0.07 },
  ],
  fire: [
    { el:'polygon', points:'200,-10 400,260 0,260',     opacity:0.16 },
    { el:'polygon', points:'330,-30 430,120 230,120',   opacity:0.12 },
    { el:'polygon', points:'-30,70 80,280 -140,280',    opacity:0.09 },
  ],
  water: [
    { el:'circle', cx:335, cy:50,  r:125, opacity:0.15 },
    { el:'circle', cx:60,  cy:215, r:90,  opacity:0.10 },
    { el:'circle', cx:365, cy:240, r:58,  opacity:0.07 },
  ],
  electric: [
    { el:'polygon', points:'230,-10 280,-10 160,290 110,290', opacity:0.17 },
    { el:'polygon', points:'330,-10 380,-10 260,290 210,290', opacity:0.12 },
    { el:'polygon', points:'80,-10 130,-10 10,290 -40,290',  opacity:0.08 },
  ],
  grass: [
    { el:'polygon', points:'450,40 400,127 300,127 250,40 300,-47 400,-47',   opacity:0.16 },
    { el:'polygon', points:'130,220 90,289 10,289 -30,220 10,151 90,151',     opacity:0.11 },
    { el:'polygon', points:'375,220 348,268 293,268 265,220 293,172 348,172', opacity:0.08 },
  ],
  ice: [
    { el:'polygon', points:'460,-20 415,68 325,68 280,-20 325,-108 415,-108',   opacity:0.17 },
    { el:'polygon', points:'140,225 98,302 14,302 -28,225 14,148 98,148',       opacity:0.12 },
    { el:'polygon', points:'370,215 344,261 292,261 266,215 292,169 344,169',   opacity:0.08 },
  ],
  fighting: [
    { el:'polygon', points:'300,0 380,80 300,160 220,80',      opacity:0.17 },
    { el:'polygon', points:'80,140 160,220 80,300 0,220',      opacity:0.12 },
    { el:'polygon', points:'360,180 410,230 360,280 310,230',  opacity:0.08 },
  ],
  poison: [
    { el:'polygon', points:'400,50 355,137 265,137 220,50 265,-37 355,-37',   opacity:0.16 },
    { el:'polygon', points:'100,200 60,270 -20,270 -60,200 -20,130 60,130',   opacity:0.11 },
    { el:'polygon', points:'330,210 304,256 252,256 226,210 252,164 304,164', opacity:0.08 },
  ],
  ground: [
    { el:'polygon', points:'-20,70 420,70 420,140 -20,140',    opacity:0.16 },
    { el:'polygon', points:'-40,155 440,155 420,220 -20,220',  opacity:0.12 },
    { el:'polygon', points:'-60,235 460,235 430,290 -30,290',  opacity:0.08 },
  ],
  flying: [
    { el:'ellipse', cx:100, cy:30,  rx:190, ry:100, opacity:0.13 },
    { el:'ellipse', cx:360, cy:230, rx:150, ry:90,  opacity:0.10 },
    { el:'ellipse', cx:200, cy:150, rx:110, ry:65,  opacity:0.07 },
  ],
  psychic: [
    { el:'circle', cx:200, cy:80, r:150, fill:'none', stroke:'white', strokeWidth:25, opacity:0.13 },
    { el:'circle', cx:200, cy:80, r:95,  fill:'none', stroke:'white', strokeWidth:18, opacity:0.16 },
    { el:'circle', cx:200, cy:80, r:48,  opacity:0.18 },
    { el:'circle', cx:350, cy:235, r:65, opacity:0.08 },
  ],
  bug: [
    { el:'polygon', points:'380,10 360,44 320,44 300,10 320,-24 360,-24',  opacity:0.15 },
    { el:'polygon', points:'420,78 400,112 360,112 340,78 360,44 400,44',  opacity:0.11 },
    { el:'polygon', points:'60,210 40,244 0,244 -20,210 0,176 40,176',     opacity:0.13 },
    { el:'polygon', points:'100,278 80,312 40,312 20,278 40,244 80,244',   opacity:0.09 },
  ],
  rock: [
    { el:'polygon', points:'80,260 0,150 60,40 200,70 210,260',       opacity:0.15 },
    { el:'polygon', points:'240,10 380,-10 430,120 360,210 220,160',  opacity:0.12 },
    { el:'polygon', points:'0,10 90,0 100,100 30,150',               opacity:0.09 },
  ],
  ghost: [
    { el:'path', d:'M320,0 Q420,50 400,160 Q380,270 260,210 Q140,150 200,40 Q240,-10 320,0 Z',          opacity:0.14 },
    { el:'path', d:'M60,140 Q-20,190 10,270 Q40,350 120,290 Q200,230 160,150 Q130,110 60,140 Z',         opacity:0.10 },
    { el:'path', d:'M350,180 Q400,210 390,260 Q380,310 330,280 Q280,250 300,200 Q320,170 350,180 Z',     opacity:0.08 },
  ],
  dragon: [
    { el:'polygon', points:'0,-10 200,-10 400,290 200,290', opacity:0.15 },
    { el:'polygon', points:'280,-10 370,-10 400,60 310,60', opacity:0.12 },
    { el:'polygon', points:'-20,220 60,220 100,290 20,290', opacity:0.09 },
  ],
  dark: [
    { el:'polygon', points:'400,0 400,280 180,280',          opacity:0.17 },
    { el:'polygon', points:'0,0 170,0 0,200',               opacity:0.13 },
    { el:'polygon', points:'150,0 290,0 400,140 400,0',     opacity:0.09 },
  ],
  steel: [
    { el:'circle', cx:200, cy:60, r:150, fill:'none', stroke:'white', strokeWidth:30, opacity:0.12 },
    { el:'circle', cx:200, cy:60, r:90,  fill:'none', stroke:'white', strokeWidth:20, opacity:0.15 },
    { el:'circle', cx:370, cy:240, r:60, opacity:0.09 },
  ],
  fairy: [
    { el:'polygon', points:'300,0 315,44 360,60 315,76 300,120 285,76 240,60 285,44',    opacity:0.17 },
    { el:'polygon', points:'75,158 87,198 130,210 87,222 75,262 63,222 20,210 63,198',   opacity:0.13 },
    { el:'polygon', points:'368,178 376,204 404,214 376,224 368,250 360,224 332,214 360,204', opacity:0.09 },
  ],
};

/* ── Formes de transition bas du Hero — 1 forme unique par type ── */
const BOTTOM_SHAPE_PATH = {
  // Vague douce — neutre
  normal:   'M0,80 L0,52 Q200,38 400,52 L400,80 Z',
  // 3 flammes triangulaires
  fire:     'M0,80 L0,62 L60,18 L120,60 L200,8 L280,60 L340,18 L400,62 L400,80 Z',
  // Vague S (deux arcs opposés)
  water:    'M0,80 L0,48 Q100,5 200,48 Q300,90 400,48 L400,80 Z',
  // Éclair irrégulier
  electric: 'M0,80 L0,55 L80,22 L130,48 L220,6 L270,36 L400,20 L400,80 Z',
  // Lames d'herbe (créneaux larges)
  grass:    'M0,80 L0,58 L33,24 L67,58 L100,24 L133,58 L167,24 L200,58 L233,24 L267,58 L300,24 L333,58 L367,24 L400,58 L400,80 Z',
  // Cristaux de glace (pics irréguliers)
  ice:      'M0,80 L0,54 L55,16 L90,46 L160,4 L205,36 L295,10 L355,46 L400,26 L400,80 Z',
  // Coupe diagonale franche
  fighting: 'M0,80 L0,65 L400,18 L400,80 Z',
  // Gouttes de venin (ondulations asymétriques)
  poison:   'M0,80 L0,45 L30,70 L60,40 L90,75 L120,42 L150,72 L180,38 L210,68 L240,44 L270,72 L300,40 L330,70 L360,42 L390,68 L400,45 L400,80 Z',
  // Terrain en paliers (mesas)
  ground:   'M0,80 L0,55 L100,55 L100,38 L220,38 L220,55 L320,55 L320,42 L400,42 L400,80 Z',
  // Deux ailes arrondies depuis le centre
  flying:   'M0,80 L0,40 Q80,0 165,44 L200,50 L235,44 Q320,0 400,40 L400,80 Z',
  // Arc profond (onde mentale)
  psychic:  'M0,80 L0,38 Q200,-25 400,38 L400,80 Z',
  // Alvéoles hexagonales (petites dents régulières)
  bug:      'M0,80 L0,56 L17,30 L33,56 L50,30 L67,56 L83,30 L100,56 L117,30 L133,56 L150,30 L167,56 L183,30 L200,56 L217,30 L233,56 L250,30 L267,56 L283,30 L300,56 L317,30 L333,56 L350,30 L367,56 L383,30 L400,56 L400,80 Z',
  // Rocs irréguliers
  rock:     'M0,80 L0,58 L45,20 L88,52 L135,12 L188,54 L238,26 L295,58 L338,16 L388,50 L400,46 L400,80 Z',
  // Ondulation organique fantomatique
  ghost:    'M0,80 L0,52 Q50,18 100,48 Q150,76 200,36 Q250,4 300,42 Q350,74 400,48 L400,80 Z',
  // Parallélogramme puissant (coin haut-droit)
  dragon:   'M0,80 L0,72 L320,8 L400,8 L400,80 Z',
  // Deux griffes depuis les bords (V inversé)
  dark:     'M0,80 L0,32 L165,80 L235,80 L400,32 L400,80 Z',
  // Arc lisse et régulier (mécanique)
  steel:    'M0,80 L0,50 Q200,18 400,50 L400,80 Z',
  // Feston de pétales (arcs alternés)
  fairy:    'M0,80 L0,58 Q25,26 50,58 Q75,80 100,58 Q125,26 150,58 Q175,80 200,58 Q225,26 250,58 Q275,80 300,58 Q325,26 350,58 Q375,80 400,58 L400,80 Z',
};

function HeroBottomShape({ typeName, isDark }) {
  const d = BOTTOM_SHAPE_PATH[typeName] || BOTTOM_SHAPE_PATH.normal;
  const fill = isDark ? '#18181b' : '#ffffff';
  return (
    <svg
      className="absolute left-0 right-0 w-full pointer-events-none"
      style={{ bottom: '-6px', height: 'calc(5rem + 6px)', zIndex: 1 }}
      viewBox="0 0 400 80"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={d} fill={fill} />
    </svg>
  );
}

function HeroBg({ typeName }) {
  const shapes = HERO_SHAPES[typeName] || HERO_SHAPES.normal;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 400 280"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {shapes.map(({ el, opacity, fill = 'white', stroke, strokeWidth, ...props }, i) =>
        React.createElement(el, {
          key: i,
          fill,
          ...(stroke ? { stroke, strokeWidth: strokeWidth || 20 } : {}),
          opacity,
          ...props,
        })
      )}
    </svg>
  );
}

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

  const scrollPositions = useRef({ presentation: 0, strategie: 0, attaques: 0 });

  const handleTabChange = useCallback((tab) => {
    if (tab === activeTab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    scrollPositions.current[activeTab] = window.scrollY;
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
      <div className="sticky top-0 z-20" style={{ height: 0, overflow: 'visible' }}>
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
            className="relative flex justify-center items-end"
            style={{
              paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)',
              minHeight: 'calc(env(safe-area-inset-top) + 200px)',
              overflow: 'visible',
              background: `linear-gradient(160deg, ${accentHex}ee 0%, ${accentHex}88 55%, ${isDark ? '#1c1c1e' : 'white'} 100%)`,
            }}
          >
            <HeroBg typeName={primaryType} />
            <HeroBottomShape typeName={primaryType} isDark={isDark} />
            <img
              src={data.officialArtwork || data.sprite}
              alt={pokeName}
              className="object-contain object-center"
              style={{
                width: '22rem',
                height: '22rem',
                marginBottom: '-2.2rem',
                position: 'relative',
                zIndex: 2,
                flexShrink: 0,
              }}
              onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
            />
          </div>

          {/* Numéro + nom + types — toujours visibles */}
          <div className="px-5 pb-0" style={{ paddingTop: '2.6rem' }}>
            <p className={`text-sm font-mono font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              #{String(data.id).padStart(4, '0')}
            </p>
            <h1 className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{data?.name || pokeName}</h1>
            <div className="flex gap-2 mb-5">
              {data.types.map(tn => <TypeBadge key={tn} typeName={tn} />)}
            </div>
          </div>

          <div className="px-5 pt-2 pb-2" style={{ display: activeTab === 'presentation' ? 'block' : 'none' }}>
              {data.flavorText && (
                <p className={`text-[18px] leading-relaxed mb-10 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
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

          <div style={{ display: activeTab === 'attaques' ? 'block' : 'none' }}>
            <MovesTab pokeId={pokeId} isDark={isDark} accentHex={accentHex} />
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
