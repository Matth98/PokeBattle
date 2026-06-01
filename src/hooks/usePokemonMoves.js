import { useState, useEffect } from 'react';

const moveCache = new Map();
const pokemonMovesCache = new Map();

// Most-recent-first list of version groups for picking the current moveset
const VERSION_GROUP_PRIORITY = [
  'scarlet-violet', 'the-teal-mask', 'the-indigo-disk',
  'sword-shield', 'the-isle-of-armor', 'the-crown-tundra',
  'ultra-sun-ultra-moon', 'sun-moon',
  'omega-ruby-alpha-sapphire', 'x-y',
  'black-2-white-2', 'black-white',
  'heartgold-soulsilver', 'platinum', 'diamond-pearl',
  'firered-leafgreen', 'emerald', 'ruby-sapphire',
  'crystal', 'gold-silver', 'red-blue',
];

async function fetchMoveDetail(moveName) {
  if (moveCache.has(moveName)) return moveCache.get(moveName);
  const res = await fetch(`https://pokeapi.co/api/v2/move/${moveName}`);
  const data = await res.json();
  const nameEntry =
    data.names?.find(n => n.language.name === 'fr') ||
    data.names?.find(n => n.language.name === 'en');
  const result = {
    nameFr: nameEntry?.name || moveName,
    type: data.type?.name || 'normal',
    damageClass: data.damage_class?.name || 'status',
    power: data.power ?? null,
    accuracy: data.accuracy ?? null,
  };
  moveCache.set(moveName, result);
  return result;
}

export function usePokemonMoves(pokeId) {
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!pokeId) return;

    const cacheKey = String(pokeId);
    if (pokemonMovesCache.has(cacheKey)) {
      setMoves(pokemonMovesCache.get(cacheKey));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokeId}`);
        if (!res.ok) throw new Error('Pokémon introuvable');
        const pokemonData = await res.json();

        // Group level-up moves by version group
        const vgMoves = {};
        for (const entry of pokemonData.moves) {
          for (const vgd of entry.version_group_details) {
            if (vgd.move_learn_method.name !== 'level-up') continue;
            const vg = vgd.version_group.name;
            if (!vgMoves[vg]) vgMoves[vg] = [];
            vgMoves[vg].push({ name: entry.move.name, level: vgd.level_learned_at });
          }
        }

        // Pick best version group
        let selectedMoves = [];
        for (const vg of VERSION_GROUP_PRIORITY) {
          if (vgMoves[vg]?.length > 0) {
            selectedMoves = vgMoves[vg];
            break;
          }
        }
        // Fallback: pick version group with most moves
        if (selectedMoves.length === 0) {
          const best = Object.entries(vgMoves).sort((a, b) => b[1].length - a[1].length)[0];
          if (best) selectedMoves = best[1];
        }

        // Deduplicate by name, sort by level
        const seen = new Set();
        const deduped = selectedMoves
          .sort((a, b) => a.level - b.level)
          .filter(m => { if (seen.has(m.name)) return false; seen.add(m.name); return true; });

        const details = await Promise.all(
          deduped.slice(0, 30).map(async m => {
            const detail = await fetchMoveDetail(m.name);
            return { ...detail, level: m.level };
          })
        );

        if (cancelled) return;
        pokemonMovesCache.set(cacheKey, details);
        setMoves(details);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [pokeId]);

  return { moves, loading, error };
}
