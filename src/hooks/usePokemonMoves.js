import { useState, useEffect } from 'react';
import { useLanguage } from './useLanguage';

// Version groups du plus récent au plus ancien
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

const moveDetailCache = new Map();
const machineCache    = new Map();

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
    name: moveName,
    nameFr: nameEntry?.name ?? moveName,
    type: data.type?.name ?? 'normal',
    power: data.power ?? null,
    accuracy: data.accuracy ?? null,
    pp: data.pp ?? null,
    priority: data.priority ?? 0,
    damageClass: data.damage_class?.name ?? 'status',
    desc: descEntry?.flavor_text?.replace(/[\n\f\r]/g, ' ') ?? '',
    // machines array pour récupérer le numéro CT/CS plus tard
    machines: data.machines ?? [],
  };
  moveDetailCache.set(key, result);
  return result;
}

// Retourne { prefix: 'CT'|'CS'|'TR', number: 169 } ou null
async function fetchMachineNumber(machineUrl) {
  if (machineCache.has(machineUrl)) return machineCache.get(machineUrl);
  const res = await fetch(machineUrl);
  if (!res.ok) { machineCache.set(machineUrl, null); return null; }
  const data = await res.json();
  const itemName = data.item?.name ?? '';
  let result = null;
  if (itemName.startsWith('tm')) {
    result = { prefix: 'CT', number: parseInt(itemName.slice(2), 10) };
  } else if (itemName.startsWith('hm')) {
    result = { prefix: 'CS', number: parseInt(itemName.slice(2), 10) };
  } else if (itemName.startsWith('tr')) {
    result = { prefix: 'TR', number: parseInt(itemName.slice(2), 10) };
  }
  machineCache.set(machineUrl, result);
  return result;
}

export function usePokemonMoves(pokeId) {
  const [moves, setMoves] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { language } = useLanguage();

  useEffect(() => {
    if (!pokeId) return;
    setLoading(true);
    setError(null);
    setMoves(null);

    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokeId}`);
        if (!res.ok) throw new Error('Pokémon introuvable');
        const pokemonData = await res.json();

        // Version group le plus récent disponible pour ce Pokémon
        const allVGs = new Set(
          pokemonData.moves.flatMap(m =>
            m.version_group_details.map(d => d.version_group.name)
          )
        );
        const bestVG = VG_PRIORITY.find(vg => allVGs.has(vg)) ?? [...allVGs][0];

        // Garder uniquement les attaques du meilleur version group
        const entries = pokemonData.moves
          .map(moveData => {
            const detail = moveData.version_group_details.find(
              d => d.version_group.name === bestVG
            );
            if (!detail) return null;
            return {
              moveName: moveData.move.name,
              method: detail.move_learn_method.name,
              level: detail.level_learned_at,
            };
          })
          .filter(Boolean);

        // Détails de toutes les attaques en parallèle
        const details = await Promise.all(
          entries.map(e =>
            fetchMoveDetail(e.moveName, language).then(d => ({
              ...d,
              method: e.method,
              level: e.level,
            }))
          )
        );

        // Numéros CT : récupérer en parallèle pour les attaques machine
        await Promise.all(
          details
            .filter(m => m.method === 'machine')
            .map(async m => {
              const entry = m.machines?.find(mc => mc.version_group.name === bestVG);
              if (!entry) return;
              const machineNum = await fetchMachineNumber(entry.machine.url);
              m.machineNum = machineNum; // mutation directe, avant setMoves
            })
        );

        if (cancelled) return;

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

        setMoves({ levelUp, machine, egg, versionGroup: bestVG });
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [pokeId, language]);

  return { moves, loading, error };
}
