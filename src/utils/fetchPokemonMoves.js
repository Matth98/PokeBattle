// Logique de fetch et traitement des données pour l'onglet Attaques.
// Extrait de usePokemonMoves pour être réutilisé par le pre-fetcher offline.

import { idbGet, idbSet } from './offlineDB';

const VG_PRIORITY = [
  'scarlet-violet', 'the-teal-mask', 'the-indigo-disk',
  'sword-shield', 'the-isle-of-armor', 'the-crown-tundra',
  'brilliant-diamond-and-shining-pearl', 'legends-arceus',
  'ultra-sun-ultra-moon', 'sun-moon', 'lets-go-pikachu-lets-go-eevee',
  'omega-ruby-alpha-sapphire', 'x-y',
  'black-2-white-2', 'black-white',
  'heartgold-soulsilver', 'platinum', 'diamond-pearl',
  'firered-leafgreen', 'emerald', 'ruby-sapphire',
  'crystal', 'gold-silver', 'red-blue', 'yellow',
];

// Caches partagés (module-level)
const moveDetailCache = new Map();
const machineCache    = new Map();
const pokemonCache    = new Map();

async function fetchMoveDetail(moveName, lang) {
  const key = `${moveName}-${lang}`;
  if (moveDetailCache.has(key)) return moveDetailCache.get(key);

  const res = await fetch(`https://pokeapi.co/api/v2/move/${moveName}`);
  if (!res.ok) throw new Error(`Move ${moveName} not found`);
  const data = await res.json();

  const nameEntry =
    data.names?.find(n => n.language.name === lang) ??
    data.names?.find(n => n.language.name === 'fr') ??
    data.names?.find(n => n.language.name === 'en');

  const descList = [...(data.flavor_text_entries ?? [])].reverse();
  const descEntry =
    descList.find(e => e.language.name === lang) ??
    descList.find(e => e.language.name === 'fr') ??
    descList.find(e => e.language.name === 'en');

  const result = {
    name:        moveName,
    nameFr:      nameEntry?.name ?? moveName,
    type:        data.type?.name ?? 'normal',
    power:       data.power ?? null,
    accuracy:    data.accuracy ?? null,
    pp:          data.pp ?? null,
    priority:    data.priority ?? 0,
    damageClass: data.damage_class?.name ?? 'status',
    desc:        descEntry?.flavor_text?.replace(/[\n\f\r]/g, ' ') ?? '',
    machines:    data.machines ?? [],
  };
  moveDetailCache.set(key, result);
  return result;
}

async function fetchMachineNumber(machineUrl) {
  // 1. Cache mémoire (même session)
  if (machineCache.has(machineUrl)) return machineCache.get(machineUrl);

  // 2. IndexedDB (cross-session — les URLs machine sont partagées entre tous les Pokémon)
  const persisted = await idbGet('machine', machineUrl);
  if (persisted !== undefined) {
    machineCache.set(machineUrl, persisted);
    return persisted;
  }

  // 3. Réseau
  const res = await fetch(machineUrl);
  if (!res.ok) { machineCache.set(machineUrl, null); return null; }
  const data     = await res.json();
  const itemName = data.item?.name ?? '';
  let result = null;
  if      (itemName.startsWith('tm')) result = { prefix: 'CT', number: parseInt(itemName.slice(2), 10) };
  else if (itemName.startsWith('hm')) result = { prefix: 'CS', number: parseInt(itemName.slice(2), 10) };
  else if (itemName.startsWith('tr')) result = { prefix: 'TR', number: parseInt(itemName.slice(2), 10) };
  machineCache.set(machineUrl, result);
  await idbSet('machine', machineUrl, result);   // persisté pour les prochains Pokémon et sessions
  return result;
}

/**
 * Récupère et traite toutes les données de l'onglet Attaques pour un Pokémon.
 * @param {number|string} pokeId
 * @param {string} language   Code langue PokeAPI (ex: 'fr', 'en')
 * @returns {Promise<{levelUp, machine, egg, versionGroup}>}
 */
export async function processPokemonMoves(pokeId, language) {
  let pokemonData;
  if (pokemonCache.has(pokeId)) {
    pokemonData = pokemonCache.get(pokeId);
  } else {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokeId}`);
    if (!res.ok) throw new Error('Pokémon introuvable');
    pokemonData = await res.json();
    pokemonCache.set(pokeId, pokemonData);
  }

  // Formes sans attaques propres (ex: Gigamax, Dynamax) → fallback sur la forme de base de l'espèce
  if (pokemonData.moves.length === 0 && pokemonData.species?.url) {
    const speciesId = pokemonData.species.url.match(/\/(\d+)\/$/)?.[1];
    if (speciesId && String(speciesId) !== String(pokeId)) {
      return processPokemonMoves(Number(speciesId), language);
    }
  }

  const allVGs = new Set(
    pokemonData.moves.flatMap(m =>
      m.version_group_details.map(d => d.version_group.name)
    )
  );
  const bestVG = VG_PRIORITY.find(vg => allVGs.has(vg)) ?? [...allVGs][0];

  const entries = pokemonData.moves
    .map(moveData => {
      const detail = moveData.version_group_details.find(
        d => d.version_group.name === bestVG
      );
      if (!detail) return null;
      return {
        moveName: moveData.move.name,
        method:   detail.move_learn_method.name,
        level:    detail.level_learned_at,
      };
    })
    .filter(Boolean);

  const details = await Promise.all(
    entries.map(e =>
      fetchMoveDetail(e.moveName, language).then(d => ({
        ...d,
        method: e.method,
        level:  e.level,
      }))
    )
  );

  await Promise.all(
    details
      .filter(m => m.method === 'machine')
      .map(async m => {
        const entry = m.machines?.find(mc => mc.version_group.name === bestVG);
        if (!entry) return;
        m.machineNum = await fetchMachineNumber(entry.machine.url);
      })
  );

  const levelUp = details
    .filter(m => m.method === 'level-up')
    .sort((a, b) => a.level - b.level || a.nameFr.localeCompare(b.nameFr));

  const machine = details
    .filter(m => m.method === 'machine')
    .sort((a, b) => {
      const na = a.machineNum?.number ?? 9999;
      const nb = b.machineNum?.number ?? 9999;
      return na - nb || a.nameFr.localeCompare(b.nameFr);
    });

  const egg = details
    .filter(m => m.method === 'egg')
    .sort((a, b) => a.nameFr.localeCompare(b.nameFr));

  return { levelUp, machine, egg, versionGroup: bestVG };
}
