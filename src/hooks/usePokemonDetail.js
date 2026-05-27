import { useState, useEffect } from 'react';
import { useLanguage } from './useLanguage';
import { getI18n } from '../i18n';
import FR_DESCRIPTIONS_GEN9 from '../data/frDescriptionsGen9';
import FR_DESCRIPTIONS_PLA  from '../data/frDescriptionsPLA';
import FR_DESCRIPTIONS_HISUI from '../data/frDescriptionsHisui';
import FR_DESCRIPTIONS_ALOLA from '../data/frDescriptionsAlola';
import FR_DESCRIPTIONS_GALAR from '../data/frDescriptionsGalar';
import FR_DESCRIPTIONS_FORMES from '../data/frDescriptionsFormes';

const pokemonCache = new Map();
const speciesCache = new Map();
const typeRelCache = new Map();
const abilityCache = new Map();

// Preferred game versions per regional form variant — ensures we get the description
// that actually describes that form (e.g. Alolan Raichu in Sun/Moon, not Kanto Raichu)
const FORM_VERSION_PREF = {
  alola: ['sun', 'moon', 'ultra-sun', 'ultra-moon'],
  galar: ['sword', 'shield'],
  hisui: ['legends-arceus'],
  paldea: ['scarlet', 'violet'],
};

function getFormVariant(pokemonApiName) {
  if (!pokemonApiName) return null;
  const name = pokemonApiName.toLowerCase();
  for (const variant of Object.keys(FORM_VERSION_PREF)) {
    if (name.includes(`-${variant}`)) return variant;
  }
  return null;
}

// Kept for backward compat — components importing STAT_FR directly still work
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

// Variantes de codes langue dans PokeAPI
// (ex: flavor_text_entries japonais = 'ja-Hrkt', names japonais = 'ja')
const LANG_VARIANTS = {
  ja: ['ja', 'ja-Hrkt'],
};

function pickLang(entries, lang, fallbacks = ['fr', 'en']) {
  const primaryVariants = LANG_VARIANTS[lang] || [lang];
  // Fallbacks dédupliqués (retire les variantes du lang primaire)
  const fallbackList = fallbacks.filter(f => f !== lang && !primaryVariants.includes(f));
  const all = [...primaryVariants, ...fallbackList];
  // Inverser la liste pour préférer l'entrée la plus récente (dernier jeu)
  const list = [...(entries || [])].reverse();
  for (const l of all) {
    const found = list.find(e => e.language.name === l);
    if (found) return found;
  }
  return null;
}

async function fetchAbility(abilityName, lang) {
  const key = `${abilityName}-${lang}`;
  if (abilityCache.has(key)) return abilityCache.get(key);
  const res = await fetch(`https://pokeapi.co/api/v2/ability/${abilityName}`);
  const data = await res.json();
  const nameEntry = pickLang(data.names, lang);
  const langVariants = LANG_VARIANTS[lang] || [lang];
  const descEntries = data.flavor_text_entries?.filter(e => {
    const langs = [...langVariants, 'fr', 'en'].filter((l, i, a) => a.indexOf(l) === i);
    return langs.includes(e.language.name);
  }) || [];
  const reversed = [...descEntries].reverse();
  const descEntry = reversed.find(e => langVariants.includes(e.language.name))
    || reversed.find(e => e.language.name === 'fr')
    || reversed.find(e => e.language.name === 'en')
    || descEntries[descEntries.length - 1];
  const result = {
    nameFr: nameEntry?.name || abilityName,
    descFr: descEntry?.flavor_text?.replace(/[\n\f\r]/g, ' ').split('\\n').join(' ').split('\\f').join(' ') || '',
  };
  abilityCache.set(key, result);
  return result;
}


export function usePokemonDetail(pokeId, pokemonNameOverride = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { language } = useLanguage();

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

        // Detect whether this is any alternate form (IDs ≥ 10000 in PokeAPI)
        const isAlternateForm = pokemonData.id >= 10000;
        // Detect regional form variant from PokeAPI name (e.g. "raichu-alola" → "alola")
        const formVariant = getFormVariant(pokemonData.name);

        const typeNames = pokemonData.types.sort((a, b) => a.slot - b.slot).map(t => t.type.name);
        const typeRelations = await Promise.all(typeNames.map(fetchTypeRel));

        // Combine type effectiveness across all types
        const effectiveness = {};
        for (const relations of typeRelations) {
          for (const { name } of (relations.double_damage_from || [])) {
            effectiveness[name] = (effectiveness[name] ?? 1) * 2;
          }
          for (const { name } of (relations.half_damage_from || [])) {
            effectiveness[name] = (effectiveness[name] ?? 1) * 0.5;
          }
          for (const { name } of (relations.no_damage_from || [])) {
            effectiveness[name] = 0;
          }
        }

        const abilitiesRaw = [...pokemonData.abilities].sort((a, b) => a.slot - b.slot);
        const abilities = await Promise.all(
          abilitiesRaw.map(async (a) => {
            const detail = await fetchAbility(a.ability.name, language);
            return { ...detail, isHidden: a.is_hidden };
          })
        );

        const i18n = getI18n(language);
        const STAT_MAP = i18n.stats;

        const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
        const statsMap = Object.fromEntries(pokemonData.stats.map(s => [s.stat.name, s.base_stat]));
        const stats = STAT_ORDER.map(key => ({ name: STAT_MAP[key] || STAT_FR[key], value: statsMap[key] || 0 }));
        const total = stats.reduce((sum, s) => sum + s.value, 0);

        const evYield = pokemonData.stats
          .filter(s => s.effort > 0)
          .map(s => `${STAT_MAP[s.stat.name] || STAT_FR[s.stat.name] || s.stat.name} +${s.effort}`)
          .join(', ');

        // For regional forms, prefer the game version that introduced that form so we get
        // the description that actually describes the form (not the Kanto/base form).
        let flavorEntry;
        if (formVariant && FORM_VERSION_PREF[formVariant]) {
          const preferredVersions = FORM_VERSION_PREF[formVariant];
          const langVariants = LANG_VARIANTS[language] || [language];
          const fallbacks = ['fr', 'en'].filter(l => l !== language && !langVariants.includes(l));
          const allLangs = [...langVariants, ...fallbacks];
          flavorEntry = null;
          for (const lang of allLangs) {
            const entry = speciesData.flavor_text_entries?.find(
              e => e.language.name === lang && preferredVersions.includes(e.version.name)
            );
            if (entry) { flavorEntry = entry; break; }
          }
          // Fall back to default (most recent) if no version-specific entry found
          if (!flavorEntry) flavorEntry = pickLang(speciesData.flavor_text_entries, language);
        } else {
          flavorEntry = pickLang(speciesData.flavor_text_entries, language);
        }

        let flavorText = flavorEntry?.flavor_text?.replace(/\f/g, ' ').replace(/\n/g, ' ') || '';

        // Fallback statique pour le français : si PokeAPI n'a pas d'entrée française
        // (Gen VIII Légendes Arceus #899-905, Gen IX #906-1025), on utilise les descriptions officielles.
        if (language === 'fr' && !speciesData.flavor_text_entries?.some(e => e.language.name === 'fr')) {
          flavorText = FR_DESCRIPTIONS_PLA[pokemonData.id] || FR_DESCRIPTIONS_GEN9[pokemonData.id] || flavorText;
        }
        // Fallback statique pour les formes régionales de Hisui (pas de traduction FR dans PokeAPI)
        if (language === 'fr' && formVariant === 'hisui' && (!flavorEntry || flavorEntry.language?.name !== 'fr')) {
          flavorText = FR_DESCRIPTIONS_HISUI[pokemonData.id] || flavorText;
        }
        // Fallback statique pour les formes régionales d'Alola (priorité sur PokeAPI pour garantir
        // que la description décrit bien la forme régionale et non la forme de base)
        if (language === 'fr' && formVariant === 'alola') {
          flavorText = FR_DESCRIPTIONS_ALOLA[pokemonData.id] || flavorText;
        }
        // Fallback statique pour les formes régionales de Galar (même raison qu'Alola)
        if (language === 'fr' && formVariant === 'galar') {
          flavorText = FR_DESCRIPTIONS_GALAR[pokemonData.id] || flavorText;
        }
        // Fallback statique pour les formes alternatives (non régionales OU régionales sans entrée FR
        // dans PokeAPI pour leur version d'origine — ex : Motisma, Tauros de Paldéa, Plumeline…)
        // S'applique à toutes les formes ≥ 10000 : si une entrée existe dans FR_DESCRIPTIONS_FORMES,
        // elle prend la priorité sur la description générique de l'espèce de base.
        if (language === 'fr' && isAlternateForm) {
          flavorText = FR_DESCRIPTIONS_FORMES[pokemonData.id] || flavorText;
        }

        const genusEntry = pickLang(speciesData.genera, language);
        const genus = genusEntry?.genus || '';

        // Pokémon name in current language
        // For ANY alternate form (pokeId >= 10000), use the override name from the app's data
        // (already localized) because species names only contain the base Pokémon name
        // (e.g. "Raichu" instead of "Raichu d'Alola", "Motisma" instead of "Motisma Chaleur")
        const nameEntry = pickLang(speciesData.names, language);
        const name = (isAlternateForm && pokemonNameOverride) ? pokemonNameOverride : (nameEntry?.name || pokemonData.name);

        let genderText;
        if (speciesData.gender_rate === -1) {
          genderText = i18n.pokemon.asexual;
        } else {
          const femalePercent = (speciesData.gender_rate / 8) * 100;
          genderText = `${100 - femalePercent}% ♂︎  -  ${femalePercent}% ♀︎`;
        }

        if (cancelled) return;

        setData({
          id: pokemonData.id,
          name,
          types: typeNames,
          stats,
          total,
          effectiveness,
          abilities,
          flavorText,
          genus,
          weight: pokemonData.weight / 10,
          height: pokemonData.height / 10,
          captureRate: speciesData.capture_rate,
          generation: i18n.generation[speciesData.generation?.name] || speciesData.generation?.name || '',
          eggGroups: speciesData.egg_groups?.map(g => i18n.eggGroup[g.name] || g.name).join(', ') || '',
          genderText,
          growthRate: i18n.growthRate[speciesData.growth_rate?.name] || speciesData.growth_rate?.name || '',
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
  }, [pokeId, language]);

  return { data, loading, error };
}
