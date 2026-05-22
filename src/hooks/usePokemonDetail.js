import { useState, useEffect } from 'react';

const pokemonCache = new Map();
const speciesCache = new Map();
const typeRelCache = new Map();
const abilityCache = new Map();

const EGG_GROUPS_FR = {
  'monster': 'Monstre', 'water1': 'Eau 1', 'bug': 'Insecte', 'flying': 'Vol',
  'ground': 'Terrestre', 'fairy': 'Fée', 'plant': 'Plante', 'humanshape': 'Humanoïde',
  'water3': 'Eau 3', 'mineral': 'Minéral', 'indeterminate': 'Amorphe', 'water2': 'Eau 2',
  'ditto': 'Métamorph', 'dragon': 'Dragon', 'no-eggs': 'Sans œuf', 'human-like': 'Humanoïde',
};

const GROWTH_RATE_FR = {
  'slow': 'Lent', 'medium': 'Moyen', 'fast': 'Rapide', 'medium-slow': 'Moyennement lent',
  'slow-then-very-fast': 'Très lent en fin', 'fast-then-very-slow': 'Très rapide en fin',
};

const GENERATION_FR = {
  'generation-i': 'Génération 1', 'generation-ii': 'Génération 2',
  'generation-iii': 'Génération 3', 'generation-iv': 'Génération 4',
  'generation-v': 'Génération 5', 'generation-vi': 'Génération 6',
  'generation-vii': 'Génération 7', 'generation-viii': 'Génération 8',
  'generation-ix': 'Génération 9',
};

export const STAT_FR = {
  hp: 'PV', attack: 'ATT', defense: 'DEF',
  'special-attack': 'SATT', 'special-defense': 'SDEF', speed: 'VIT',
};

async function fetchTypeRel(typeName) {
  if (typeRelCache.has(typeName)) return typeRelCache.get(typeName);
  const res = await fetch(`https://pokeapi.co/api/v2/type/${typeName}`);
  const data = await res.json();
  typeRelCache.set(typeName, data.damage_relations);
  return data.damage_relations;
}

async function fetchAbility(abilityName) {
  if (abilityCache.has(abilityName)) return abilityCache.get(abilityName);
  const res = await fetch(`https://pokeapi.co/api/v2/ability/${abilityName}`);
  const data = await res.json();
  const nameFr = data.names?.find(n => n.language.name === 'fr')?.name || abilityName;
  const descFr = data.flavor_text_entries
    ?.filter(e => e.language.name === 'fr')
    ?.pop()?.flavor_text?.replace(/[\n\f\r]/g, ' ').split('\\n').join(' ').split('\\f').join(' ') || '';
  const result = { nameFr, descFr };
  abilityCache.set(abilityName, result);
  return result;
}

export function usePokemonDetail(pokeId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!pokeId) return;
    setLoading(true);
    setError(null);
    setData(null);

    let cancelled = false;

    const load = async () => {
      try {
        let pokemonData;
        if (pokemonCache.has(pokeId)) {
          pokemonData = pokemonCache.get(pokeId);
        } else {
          const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokeId}`);
          if (!res.ok) throw new Error('Pokémon introuvable');
          pokemonData = await res.json();
          pokemonCache.set(pokeId, pokemonData);
        }

        const speciesId = pokemonData.species?.url?.match(/\/(\d+)\/$/)?.[1] || pokeId;
        let speciesData;
        if (speciesCache.has(speciesId)) {
          speciesData = speciesCache.get(speciesId);
        } else {
          const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${speciesId}`);
          if (!res.ok) throw new Error('Espèce introuvable');
          speciesData = await res.json();
          speciesCache.set(speciesId, speciesData);
        }

        const typeNames = pokemonData.types.sort((a, b) => a.slot - b.slot).map(t => t.type.name);
        const typeRelations = await Promise.all(typeNames.map(fetchTypeRel));

        // Combine type effectiveness across all types
        const effectiveness = {};
        for (const relations of typeRelations) {
          for (const { name } of (relations.double_damage_from || [])) {
            effectiveness[name] = (effectiveness[name] || 1) * 2;
          }
          for (const { name } of (relations.half_damage_from || [])) {
            effectiveness[name] = (effectiveness[name] || 1) * 0.5;
          }
          for (const { name } of (relations.no_damage_from || [])) {
            effectiveness[name] = 0;
          }
        }

        const abilitiesRaw = [...pokemonData.abilities].sort((a, b) => a.slot - b.slot);
        const abilities = await Promise.all(
          abilitiesRaw.map(async (a) => {
            const detail = await fetchAbility(a.ability.name);
            return { ...detail, isHidden: a.is_hidden };
          })
        );

        const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
        const statsMap = Object.fromEntries(pokemonData.stats.map(s => [s.stat.name, s.base_stat]));
        const stats = STAT_ORDER.map(key => ({ name: STAT_FR[key], value: statsMap[key] || 0 }));
        const total = stats.reduce((sum, s) => sum + s.value, 0);

        const evYield = pokemonData.stats
          .filter(s => s.effort > 0)
          .map(s => `${STAT_FR[s.stat.name] || s.stat.name} +${s.effort}`)
          .join(', ');

        const flavorFr = speciesData.flavor_text_entries
          ?.filter(e => e.language.name === 'fr')
          ?.pop()?.flavor_text
          ?.replace(/\f/g, ' ').replace(/\n/g, ' ') || '';

        const genusFr = speciesData.genera?.find(g => g.language.name === 'fr')?.genus || '';

        let genderText;
        if (speciesData.gender_rate === -1) {
          genderText = 'Asexué';
        } else {
          const femalePercent = (speciesData.gender_rate / 8) * 100;
          genderText = `${100 - femalePercent}% ♂︎  -  ${femalePercent}% ♀︎`;
        }

        if (cancelled) return;

        setData({
          id: pokemonData.id,
          types: typeNames,
          stats,
          total,
          effectiveness,
          abilities,
          flavorText: flavorFr,
          genus: genusFr,
          weight: pokemonData.weight / 10,
          height: pokemonData.height / 10,
          captureRate: speciesData.capture_rate,
          generation: GENERATION_FR[speciesData.generation?.name] || speciesData.generation?.name || '',
          eggGroups: speciesData.egg_groups?.map(g => EGG_GROUPS_FR[g.name] || g.name).join(', ') || '',
          genderText,
          growthRate: GROWTH_RATE_FR[speciesData.growth_rate?.name] || speciesData.growth_rate?.name || '',
          evYield: evYield || '—',
          baseExperience: pokemonData.base_experience ?? '—',
          officialArtwork: pokemonData.sprites?.other?.['official-artwork']?.front_default,
          sprite: pokemonData.sprites?.front_default,
        });
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [pokeId]);

  return { data, loading, error };
}
