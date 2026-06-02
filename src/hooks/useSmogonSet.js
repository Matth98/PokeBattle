import { useState, useEffect } from 'react';

// Sets JSON hosted on pkmn/smogon GitHub repo (CORS-friendly raw.githubusercontent.com)
const SETS_BASE = 'https://raw.githubusercontent.com/pkmn/smogon/main/data/sets';

// Pokémon Champions (2025-2026) n'a pas encore de sets Smogon dédiés.
// On essaie en priorité VGC 2025 (règlement le plus proche), puis les formats singles.
const FORMATS = [
  { key: 'gen9vgc2025', label: 'VGC 2025'         },
  { key: 'gen9vgc2024', label: 'VGC 2024'          },
  { key: 'gen9ou',      label: 'Gen 9 OU'          },
  { key: 'gen9uu',      label: 'Gen 9 UU'          },
  { key: 'gen9ru',      label: 'Gen 9 RU'          },
  { key: 'gen9nu',      label: 'Gen 9 NU'          },
  { key: 'gen9pu',      label: 'Gen 9 PU'          },
  { key: 'gen8ou',      label: 'Gen 8 OU'          },
  { key: 'gen8vgc2022', label: 'VGC 2022'          },
  { key: 'gen8uu',      label: 'Gen 8 UU'          },
  { key: 'gen8ru',      label: 'Gen 8 RU'          },
  { key: 'gen8nu',      label: 'Gen 8 NU'          },
  { key: 'gen8pu',      label: 'Gen 8 PU'          },
];

// Incrémenter à chaque modification de FORMATS pour invalider le resultCache
const CACHE_VERSION = 5;

const formatCache  = new Map();
const moveCache    = new Map();
const itemCache    = new Map();
const abilityCache = new Map();
const resultCache  = new Map();

// "charizard-mega-x" → "Charizard-Mega-X"
function toSmogonName(apiName) {
  return String(apiName)
    .split('-')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join('-');
}

// Smogon item name → PokéAPI slug: "Choice Scarf" → "choice-scarf"
function toItemSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Smogon ability name → PokéAPI slug
function toAbilitySlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Pick first element whether value is a string or an array
function first(val) {
  if (!val) return null;
  return Array.isArray(val) ? val[0] : val;
}

async function fetchFormat(formatKey) {
  if (formatCache.has(formatKey)) return formatCache.get(formatKey);
  try {
    const res = await fetch(`${SETS_BASE}/${formatKey}.json`);
    const data = res.ok ? await res.json() : null;
    formatCache.set(formatKey, data);
    return data;
  } catch {
    formatCache.set(formatKey, null);
    return null;
  }
}

async function fetchMoveDetail(moveName) {
  const slug = moveName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (moveCache.has(slug)) return moveCache.get(slug);
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/move/${slug}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const nameEntry = data.names?.find(n => n.language.name === 'fr')
      || data.names?.find(n => n.language.name === 'en');
    // Dernière entrée FR disponible, sinon EN
    const descEntry = [...(data.flavor_text_entries || [])].reverse().find(e => e.language.name === 'fr')
      || [...(data.flavor_text_entries || [])].reverse().find(e => e.language.name === 'en');
    const result = {
      nameFr:      nameEntry?.name || moveName,
      type:        data.type?.name || 'normal',
      damageClass: data.damage_class?.name || 'status',
      power:       data.power ?? null,
      accuracy:    data.accuracy ?? null,
      pp:          data.pp ?? null,
      priority:    data.priority ?? 0,
      desc:        descEntry?.flavor_text?.replace(/\f|\n/g, ' ') || null,
    };
    moveCache.set(slug, result);
    return result;
  } catch {
    const fallback = { nameFr: moveName, type: 'normal', damageClass: 'status', power: null, accuracy: null, pp: null, priority: 0, desc: null };
    moveCache.set(slug, fallback);
    return fallback;
  }
}

async function fetchItemFR(smogonItemName) {
  if (!smogonItemName) return null;
  const slug = toItemSlug(smogonItemName);
  if (itemCache.has(slug)) return itemCache.get(slug);
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/item/${slug}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const frEntry = data.names?.find(n => n.language.name === 'fr');
    // PokéAPI sprite en priorité, puis fallback GitHub raw sprites
    const sprite =
      data.sprites?.default ||
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;
    const result = {
      name:   frEntry?.name || smogonItemName,
      sprite,
    };
    itemCache.set(slug, result);
    return result;
  } catch {
    const fallback = { name: smogonItemName, sprite: null };
    itemCache.set(slug, fallback);
    return fallback;
  }
}

async function fetchAbilityFR(smogonAbilityName) {
  if (!smogonAbilityName) return null;
  const slug = toAbilitySlug(smogonAbilityName);
  if (abilityCache.has(slug)) return abilityCache.get(slug);
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/ability/${slug}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const frEntry = data.names?.find(n => n.language.name === 'fr');
    const name = frEntry?.name || smogonAbilityName;
    abilityCache.set(slug, name);
    return name;
  } catch {
    abilityCache.set(slug, smogonAbilityName);
    return smogonAbilityName;
  }
}

export function useSmogonSet(pokeId) {
  const [result,  setResult]  = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!pokeId) return;

    const cacheKey = `v${CACHE_VERSION}:${pokeId}`;
    if (resultCache.has(cacheKey)) {
      setResult(resultCache.get(cacheKey));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(undefined);
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokeId}`);
        if (!res.ok) throw new Error('Pokémon introuvable');
        const pokemonData = await res.json();
        const smogonName = toSmogonName(pokemonData.name);

        // Talent par défaut depuis PokéAPI (non-caché, premier talent non-caché)
        const defaultAbilitySlug =
          pokemonData.abilities?.find(a => !a.is_hidden)?.ability?.name
          ?? pokemonData.abilities?.[0]?.ability?.name
          ?? null;

        // Trouver le premier format qui contient un set pour ce Pokémon
        let rawSet = null;
        let formatLabel = '';
        for (const { key, label } of FORMATS) {
          const formatData = await fetchFormat(key);
          if (!formatData) continue;
          const speciesEntry = formatData[smogonName]
            ?? Object.entries(formatData).find(([k]) => k.toLowerCase() === smogonName.toLowerCase())?.[1];
          if (speciesEntry) {
            const sets = Object.entries(speciesEntry);
            if (sets.length) {
              const [setName, setInfo] = sets[0];
              rawSet = { setName, ...setInfo };
              formatLabel = label;
              break;
            }
          }
        }

        if (!rawSet) {
          resultCache.set(cacheKey, null);
          if (!cancelled) { setResult(null); setLoading(false); }
          return;
        }

        const moveNames = (rawSet.moves || [])
          .map(slot => first(Array.isArray(slot) ? slot : [slot]))
          .filter(Boolean)
          .slice(0, 4);

        const itemName = first(rawSet.item);

        // Talent : priorité au set Smogon, fallback sur le talent principal du Pokémon
        const abilityName = first(rawSet.ability) ?? defaultAbilitySlug;

        const [moveDetails, itemFR, abilityFR] = await Promise.all([
          Promise.all(moveNames.map(fetchMoveDetail)),
          fetchItemFR(itemName),
          fetchAbilityFR(abilityName),
        ]);

        if (cancelled) return;

        const data = {
          setName:     rawSet.setName,
          formatLabel,
          moves:       moveDetails,
          item:        itemFR?.name || null,
          itemSprite:  itemFR?.sprite || null,
          itemPsSlug:  itemName ? itemName.toLowerCase().replace(/[^a-z0-9]/g, '') : null,
          itemSlug:    itemName ? toItemSlug(itemName) : null,
          ability:     abilityFR,
          nature:      rawSet.nature ? first(rawSet.nature) : null,
          evs:         (Array.isArray(rawSet.evs) ? rawSet.evs[0] : rawSet.evs) || {},
          ivs:         (Array.isArray(rawSet.ivs) ? rawSet.ivs[0] : rawSet.ivs) || {},
        };

        resultCache.set(cacheKey, data);
        setResult(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [pokeId]);

  return { result, loading, error };
}
