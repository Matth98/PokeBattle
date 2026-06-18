import { useState, useEffect, useCallback } from 'react';
import { idbGet, idbSet } from '../utils/offlineDB';

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
const CACHE_VERSION = 11;

const NATURE_FR_NAMES = {
  Hardy:'Hardi', Lonely:'Solo', Brave:'Brave', Adamant:'Rigide', Naughty:'Malin',
  Bold:'Assuré', Docile:'Docile', Relaxed:'Relax', Impish:'Mauvais', Lax:'Lâche',
  Timid:'Timide', Hasty:'Pressé', Serious:'Sérieux', Jolly:'Jovial', Naive:'Naïf',
  Modest:'Modeste', Mild:'Doux', Quiet:'Calme', Bashful:'Pudique', Rash:'Foufou',
  Calm:'Sage', Gentle:'Gentil', Sassy:'Malpoli', Careful:'Prudent', Quirky:'Bizarre',
};

const formatCache  = new Map();
const moveCache    = new Map();
const itemCache    = new Map();
const abilityCache = new Map();

// resultCache persisté dans IndexedDB (store 'set') pour survivre aux rechargements.
// Les clés incluent CACHE_VERSION → une incrémentation invalide automatiquement l'ancien cache.
const resultCache = new Map();

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

// ── Pokepedia cache + fonctions ───────────────────────────────────────────────
const pokepediaCache = new Map();

async function fetchPokepediaNature(smogonNatureKey) {
  if (!smogonNatureKey) return null;
  const frName = NATURE_FR_NAMES[smogonNatureKey];
  if (!frName) return null;
  const cacheKey = `nature:${frName}`;
  if (pokepediaCache.has(cacheKey)) return pokepediaCache.get(cacheKey);
  try {
    const url = 'https://www.pokepedia.fr/api.php?' + new URLSearchParams({
      action: 'query', prop: 'revisions',
      rvprop: 'content', rvslots: 'main',
      format: 'json', origin: '*', redirects: '1', titles: frName,
    });
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const page = Object.values(data.query?.pages || {})[0];
    if (!page || 'missing' in page) { pokepediaCache.set(cacheKey, null); return null; }

    const wikitext = page.revisions?.[0]?.slots?.main?.['*'] || '';
    // Cherche le premier paragraphe de texte libre après les infoboxes
    const lines = wikitext.split('\n');
    let desc = null;
    let pastInfobox = false;
    for (const line of lines) {
      if (line.startsWith('{{')) { pastInfobox = true; continue; }
      if (!pastInfobox) continue;
      const cleaned = line
        .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
        .replace(/'{2,3}/g, '')
        .replace(/\{\{[^}]*\}\}/g, '')
        .replace(/\s+/g, ' ').trim();
      if (cleaned.length > 20) { desc = cleaned; break; }
    }
    pokepediaCache.set(cacheKey, desc);
    return desc;
  } catch {
    pokepediaCache.set(cacheKey, null);
    return null;
  }
}

// ── Fallback Pokepedia (sprite + description FR pour les items absents de PokeAPI) ──

async function fetchPokepediaItem(frName) {
  if (!frName) return null;
  const title = frName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  if (pokepediaCache.has(title)) return pokepediaCache.get(title);
  try {
    const url = 'https://www.pokepedia.fr/api.php?' + new URLSearchParams({
      action: 'query', prop: 'revisions|pageimages',
      rvprop: 'content', rvslots: 'main', piprop: 'original',
      format: 'json', origin: '*', redirects: '1', titles: title,
    });
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const page = Object.values(data.query?.pages || {})[0];
    if (!page || 'missing' in page) { pokepediaCache.set(title, null); return null; }

    const sprite = page.original?.source || null;

    const wikitext = page.revisions?.[0]?.slots?.main?.['*'] || '';

    // Section "Descriptions" ou "Description" — format: ;{{Jeu|XX}}\n:texte
    // On prend le dernier bloc = jeu le plus récent
    const descSection = (wikitext.match(/==\s*Descriptions?\s*==\s*\n([\s\S]*?)(?:\n==[^=]|\s*$)/) || [])[1] || '';
    const blocks = descSection.split(/^;/m).filter(b => b.trim());
    const lastBlock = blocks[blocks.length - 1] || '';
    const rawLine = lastBlock.match(/^:(.*)/m)?.[1] || null;
    const cleanWiki = (s) => s
      ? s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
          .replace(/'{2,3}/g, '')
          .replace(/\{\{[^}]*\}\}/g, '')
          .replace(/\s+/g, ' ').trim()
      : null;
    let desc = cleanWiki(rawLine);
    const result = { sprite, desc };
    pokepediaCache.set(title, result);
    return result;
  } catch {
    pokepediaCache.set(title, null);
    return null;
  }
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
  const psSlug = smogonItemName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (itemCache.has(slug)) return itemCache.get(slug);
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/item/${slug}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const frEntry = data.names?.find(n => n.language.name === 'fr');
    // Sprite : JSON PokeAPI → GitHub raw → Showdown (via itemPsSlug dans le composant)
    let sprite =
      data.sprites?.default ||
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;
    const flavourEntry = [...(data.flavor_text_entries || [])].reverse().find(e => e.language.name === 'fr')
      || [...(data.flavor_text_entries || [])].reverse().find(e => e.language.name === 'en');
    const effectEntry = data.effect_entries?.find(e => e.language.name === 'fr')
      || data.effect_entries?.find(e => e.language.name === 'en');
    let desc = flavourEntry?.text?.replace(/\f|\n/g, ' ')
            || effectEntry?.short_effect?.replace(/\f|\n/g, ' ')
            || null;
    const frName = frEntry?.name || smogonItemName;

    const result = { name: frName, sprite, desc };
    itemCache.set(slug, result);

    // Enrichissement Pokepedia non-bloquant : meilleur sprite + description FR en arrière-plan
    if (frEntry?.name) {
      fetchPokepediaItem(frName).then(ppData => {
        if (!ppData) return;
        const enriched = {
          name: frName,
          sprite: ppData.sprite || sprite,
          desc:   ppData.desc   || desc,
        };
        itemCache.set(slug, enriched);
      }).catch(() => {});
    }

    return result;
  } catch {
    // PokeAPI inaccessible : fallback minimal sans bloquer
    const fallback = { name: smogonItemName, sprite: null, desc: null };
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
    const flavourEntry = [...(data.flavor_text_entries || [])].reverse().find(e => e.language.name === 'fr')
      || [...(data.flavor_text_entries || [])].reverse().find(e => e.language.name === 'en');
    const effectEntry = data.effect_entries?.find(e => e.language.name === 'fr')
      || data.effect_entries?.find(e => e.language.name === 'en');
    const cleanText = (t) => t
      ? t.replace(/[\n\f\r]/g, ' ').split('\\n').join(' ').split('\\f').join(' ').replace(/\s+/g, ' ').trim()
      : null;
    const result = {
      name,
      desc: cleanText(flavourEntry?.flavor_text) || cleanText(effectEntry?.short_effect) || null,
    };
    abilityCache.set(slug, result);
    return result;
  } catch {
    const fallback = { name: smogonAbilityName, desc: null };
    abilityCache.set(slug, fallback);
    return fallback;
  }
}

export function useSmogonSet(pokeId) {
  const [result,    setResult]    = useState(undefined);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [retryKey,  setRetryKey]  = useState(0);

  // Vide le cache en mémoire + IndexedDB pour ce Pokémon et force un nouveau fetch
  const retry = useCallback(() => {
    const cacheKey = `v${CACHE_VERSION}:${pokeId}`;
    resultCache.delete(cacheKey);
    idbSet('set', cacheKey, undefined).catch(() => {});
    setError(null);
    setResult(undefined);
    setRetryKey(k => k + 1);
  }, [pokeId]);

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
      // IndexedDB — survit aux rechargements + pré-chargé offline
      const persisted = await idbGet('set', cacheKey);
      if (persisted !== undefined) {
        resultCache.set(cacheKey, persisted);
        if (!cancelled) { setResult(persisted); setLoading(false); }
        return;
      }

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

        // Trouver le premier format (par priorité) qui contient un set pour ce Pokémon
        // On fetche séquentiellement et on s'arrête dès qu'on trouve — évite de télécharger
        // tous les JSONs Smogon (potentiellement 1-2 MB) quand le premier format suffit.
        // Les formats déjà en cache (formatCache) sont retournés instantanément.
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
          // Ne pas mettre null en cache : un échec réseau ou un set manquant temporairement
          // ne doit pas bloquer définitivement. On retente à la prochaine visite.
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
          itemDesc:    itemFR?.desc || null,
          itemPsSlug:  itemName ? itemName.toLowerCase().replace(/[^a-z0-9]/g, '') : null,
          itemSlug:    itemName ? toItemSlug(itemName) : null,
          ability:     abilityFR?.name || null,
          abilityDesc: abilityFR?.desc || null,
          nature:      rawSet.nature ? first(rawSet.nature) : null,
          evs:         (Array.isArray(rawSet.evs) ? rawSet.evs[0] : rawSet.evs) || {},
          ivs:         (Array.isArray(rawSet.ivs) ? rawSet.ivs[0] : rawSet.ivs) || {},
          natureDesc:  null,
        };

        resultCache.set(cacheKey, data);
        await idbSet('set', cacheKey, data);
        setResult(data);

        // Enrichissement Pokepedia non-bloquant : sprite item + description nature en arrière-plan
        const enrichPromises = [];

        if (!cancelled && itemName && itemFR?.name) {
          enrichPromises.push(
            fetchPokepediaItem(itemFR.name).then(ppData => {
              if (cancelled || !ppData) return null;
              return { itemSprite: ppData.sprite || data.itemSprite, itemDesc: ppData.desc || data.itemDesc };
            }).catch(() => null)
          );
        } else {
          enrichPromises.push(Promise.resolve(null));
        }

        if (!cancelled && rawSet.nature) {
          enrichPromises.push(
            fetchPokepediaNature(first(rawSet.nature)).then(natureDesc => {
              if (cancelled || !natureDesc) return null;
              return { natureDesc };
            }).catch(() => null)
          );
        } else {
          enrichPromises.push(Promise.resolve(null));
        }

        Promise.all(enrichPromises).then(([itemEnrich, natureEnrich]) => {
          if (cancelled) return;
          const patch = { ...(itemEnrich || {}), ...(natureEnrich || {}) };
          if (Object.keys(patch).length === 0) return;
          const enriched = { ...data, ...patch };
          resultCache.set(cacheKey, enriched);
          idbSet('set', cacheKey, enriched).catch(() => {});
          setResult(enriched);
        }).catch(() => {});
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [pokeId, retryKey]); // retryKey force un nouveau fetch quand l'utilisateur clique "Réessayer"

  return { result, loading, error, retry };
}
