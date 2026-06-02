import { useState, useEffect } from 'react';

// Sets JSON hosted on pkmn/smogon GitHub repo (CORS-friendly raw.githubusercontent.com)
const SETS_BASE = 'https://raw.githubusercontent.com/pkmn/smogon/main/data/sets';

// Try most competitive/current formats first
const FORMATS = [
  { key: 'gen9vgc2025regg', label: 'VGC 2025' },
  { key: 'gen9ou',          label: 'Gen 9 OU'  },
  { key: 'gen9uu',          label: 'Gen 9 UU'  },
  { key: 'gen9ru',          label: 'Gen 9 RU'  },
  { key: 'gen9nu',          label: 'Gen 9 NU'  },
  { key: 'gen9pu',          label: 'Gen 9 PU'  },
  { key: 'gen8ou',          label: 'Gen 8 OU'  },
  { key: 'gen8vgc2022',     label: 'VGC 2022'  },
];

const formatCache  = new Map(); // format key → parsed JSON (or null if 404)
const moveCache    = new Map(); // move slug → { nameFr, type, damageClass, power, accuracy }
const itemCache    = new Map(); // item slug → FR name string
const resultCache  = new Map(); // pokeId → fully resolved result object

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
  // PokéAPI expects lowercase hyphenated: "Close Combat" → "close-combat"
  const slug = moveName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (moveCache.has(slug)) return moveCache.get(slug);
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/move/${slug}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const nameEntry = data.names?.find(n => n.language.name === 'fr')
      || data.names?.find(n => n.language.name === 'en');
    const result = {
      nameFr:      nameEntry?.name || moveName,
      type:        data.type?.name || 'normal',
      damageClass: data.damage_class?.name || 'status',
      power:       data.power ?? null,
      accuracy:    data.accuracy ?? null,
    };
    moveCache.set(slug, result);
    return result;
  } catch {
    const fallback = { nameFr: moveName, type: 'normal', damageClass: 'status', power: null, accuracy: null };
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
    const name = frEntry?.name || smogonItemName;
    itemCache.set(slug, name);
    return name;
  } catch {
    itemCache.set(slug, smogonItemName);
    return smogonItemName;
  }
}

export function useSmogonSet(pokeId) {
  const [result,  setResult]  = useState(undefined); // undefined=loading, null=not found, obj=found
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!pokeId) return;

    const cacheKey = String(pokeId);
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
        // Get the PokéAPI internal name (e.g. "charizard-mega-x")
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokeId}`);
        if (!res.ok) throw new Error('Pokémon introuvable');
        const pokemonData = await res.json();
        const smogonName = toSmogonName(pokemonData.name);

        // Find the first format that has a set for this Pokémon
        let rawSet    = null;
        let formatLabel = '';
        for (const { key, label } of FORMATS) {
          const formatData = await fetchFormat(key);
          if (!formatData) continue;
          // Direct key lookup, then case-insensitive fallback
          const speciesEntry = formatData[smogonName]
            ?? Object.entries(formatData).find(([k]) => k.toLowerCase() === smogonName.toLowerCase())?.[1];
          if (speciesEntry) {
            const sets = Object.entries(speciesEntry);
            if (sets.length) {
              const [setName, setInfo] = sets[0];
              rawSet      = { setName, ...setInfo };
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

        // Normalize: each move slot can be string | string[]
        const moveNames = (rawSet.moves || [])
          .map(slot => first(Array.isArray(slot) ? slot : [slot]))
          .filter(Boolean)
          .slice(0, 4);

        const itemName    = first(rawSet.item);
        const abilityName = first(rawSet.ability);

        const [moveDetails, itemFR] = await Promise.all([
          Promise.all(moveNames.map(fetchMoveDetail)),
          fetchItemFR(itemName),
        ]);

        if (cancelled) return;

        const data = {
          setName:     rawSet.setName,
          formatLabel,
          moves:       moveDetails,
          item:        itemFR,
          itemSlug:    itemName ? toItemSlug(itemName) : null,
          // PS item sprite slug: "Choice Scarf" → "choicescarf"
          itemPsSlug:  itemName ? itemName.toLowerCase().replace(/[^a-z0-9]/g, '') : null,
          ability:     abilityName || null,
          nature:      rawSet.nature    ? first(rawSet.nature)    : null,
          evs:         rawSet.evs   || {},
          ivs:         rawSet.ivs   || {},
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
