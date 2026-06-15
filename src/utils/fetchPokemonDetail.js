// Logique de fetch et traitement des données pour l'onglet Présentation.
// Extrait de usePokemonDetail pour être réutilisé par le pre-fetcher offline.

import { getI18n } from '../i18n';
import FR_DESCRIPTIONS_GEN9   from '../data/frDescriptionsGen9';
import FR_DESCRIPTIONS_PLA    from '../data/frDescriptionsPLA';
import FR_DESCRIPTIONS_HISUI  from '../data/frDescriptionsHisui';
import FR_DESCRIPTIONS_ALOLA  from '../data/frDescriptionsAlola';
import FR_DESCRIPTIONS_GALAR  from '../data/frDescriptionsGalar';
import FR_DESCRIPTIONS_FORMES from '../data/frDescriptionsFormes';

export const STAT_FR = {
  hp: 'PV', attack: 'ATT', defense: 'DEF',
  'special-attack': 'SATT', 'special-defense': 'SDEF', speed: 'VIT',
};

const FORM_VERSION_PREF = {
  alola:  ['sun', 'moon', 'ultra-sun', 'ultra-moon'],
  galar:  ['sword', 'shield'],
  hisui:  ['legends-arceus'],
  paldea: ['scarlet', 'violet'],
};

const LANG_VARIANTS = {
  ja: ['ja', 'ja-Hrkt'],
};

// Caches partagés entre appels (module-level)
const pokemonCache = new Map();
const speciesCache = new Map();
const typeRelCache = new Map();
const abilityCache = new Map();

function getFormVariant(apiName) {
  const name = String(apiName).toLowerCase();
  for (const variant of Object.keys(FORM_VERSION_PREF)) {
    if (name.includes(`-${variant}`)) return variant;
  }
  return null;
}

export function pickLang(entries, lang, fallbacks = ['fr', 'en']) {
  const primaryVariants = LANG_VARIANTS[lang] || [lang];
  const fallbackList = fallbacks.filter(f => f !== lang && !primaryVariants.includes(f));
  const all = [...primaryVariants, ...fallbackList];
  const list = [...(entries || [])].reverse();
  for (const l of all) {
    const found = list.find(e => e.language.name === l);
    if (found) return found;
  }
  return null;
}

async function fetchTypeRel(typeName) {
  if (typeRelCache.has(typeName)) return typeRelCache.get(typeName);
  const res  = await fetch(`https://pokeapi.co/api/v2/type/${typeName}`);
  const data = await res.json();
  typeRelCache.set(typeName, data.damage_relations);
  return data.damage_relations;
}

async function fetchAbility(abilityName, lang) {
  const key = `${abilityName}-${lang}`;
  if (abilityCache.has(key)) return abilityCache.get(key);
  const res  = await fetch(`https://pokeapi.co/api/v2/ability/${abilityName}`);
  const data = await res.json();
  const nameEntry = pickLang(data.names, lang);
  const langVariants = LANG_VARIANTS[lang] || [lang];
  const descEntries = data.flavor_text_entries?.filter(e => {
    const langs = [...langVariants, 'fr', 'en'].filter((l, i, a) => a.indexOf(l) === i);
    return langs.includes(e.language.name);
  }) || [];
  const reversed = [...descEntries].reverse();
  const descEntry =
    reversed.find(e => langVariants.includes(e.language.name)) ||
    reversed.find(e => e.language.name === 'fr') ||
    reversed.find(e => e.language.name === 'en') ||
    descEntries[descEntries.length - 1];
  const result = {
    nameFr: nameEntry?.name || abilityName,
    descFr: descEntry?.flavor_text?.replace(/[\n\f\r]/g, ' ').split('\\n').join(' ').split('\\f').join(' ') || '',
  };
  abilityCache.set(key, result);
  return result;
}

/**
 * Récupère et traite toutes les données de l'onglet Présentation pour un Pokémon.
 * @param {number|string} pokeId
 * @param {string} language   Code langue PokeAPI (ex: 'fr', 'en')
 * @param {string|null} pokemonNameOverride  Nom FR à utiliser pour les formes alternatives
 * @returns {Promise<Object>} Données traitées prêtes à afficher
 */
export async function processPokemonDetail(pokeId, language, pokemonNameOverride = null) {
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

  const isAlternateForm = pokemonData.id >= 10000;
  const formVariant = getFormVariant(pokemonData.name);

  const typeNames    = pokemonData.types.sort((a, b) => a.slot - b.slot).map(t => t.type.name);
  const typeRelations = await Promise.all(typeNames.map(fetchTypeRel));

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

  const i18n     = getI18n(language);
  const STAT_MAP = i18n.stats;
  const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
  const statsMap = Object.fromEntries(pokemonData.stats.map(s => [s.stat.name, s.base_stat]));
  const stats    = STAT_ORDER.map(key => ({ name: STAT_MAP[key] || STAT_FR[key], value: statsMap[key] || 0 }));
  const total    = stats.reduce((sum, s) => sum + s.value, 0);

  const evYield = pokemonData.stats
    .filter(s => s.effort > 0)
    .map(s => `${STAT_MAP[s.stat.name] || STAT_FR[s.stat.name] || s.stat.name} +${s.effort}`)
    .join(', ');

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
    if (!flavorEntry) flavorEntry = pickLang(speciesData.flavor_text_entries, language);
  } else {
    flavorEntry = pickLang(speciesData.flavor_text_entries, language);
  }

  let flavorText = flavorEntry?.flavor_text?.replace(/\f/g, ' ').replace(/\n/g, ' ') || '';
  if (language === 'fr' && !speciesData.flavor_text_entries?.some(e => e.language.name === 'fr')) {
    flavorText = FR_DESCRIPTIONS_PLA[pokemonData.id] || FR_DESCRIPTIONS_GEN9[pokemonData.id] || flavorText;
  }
  if (language === 'fr' && formVariant === 'hisui' && (!flavorEntry || flavorEntry.language?.name !== 'fr')) {
    flavorText = FR_DESCRIPTIONS_HISUI[pokemonData.id] || flavorText;
  }
  if (language === 'fr' && formVariant === 'alola') {
    flavorText = FR_DESCRIPTIONS_ALOLA[pokemonData.id] || flavorText;
  }
  if (language === 'fr' && formVariant === 'galar') {
    flavorText = FR_DESCRIPTIONS_GALAR[pokemonData.id] || flavorText;
  }
  if (language === 'fr' && isAlternateForm) {
    flavorText = FR_DESCRIPTIONS_FORMES[pokemonData.id] || flavorText;
  }

  const genusEntry = pickLang(speciesData.genera, language);
  const genus = genusEntry?.genus || '';

  const nameEntry = pickLang(speciesData.names, language);
  const name = (isAlternateForm && pokemonNameOverride)
    ? pokemonNameOverride
    : (nameEntry?.name || pokemonData.name);

  let genderText;
  if (speciesData.gender_rate === -1) {
    genderText = i18n.pokemon.asexual;
  } else {
    const femalePercent = (speciesData.gender_rate / 8) * 100;
    genderText = `${100 - femalePercent}% ♂︎  -  ${femalePercent}% ♀︎`;
  }

  return {
    id:             pokemonData.id,
    name,
    types:          typeNames,
    stats,
    total,
    effectiveness,
    abilities,
    flavorText,
    genus,
    weight:         pokemonData.weight / 10,
    height:         pokemonData.height / 10,
    captureRate:    speciesData.capture_rate,
    generation:     i18n.generation[speciesData.generation?.name] || speciesData.generation?.name || '',
    eggGroups:      speciesData.egg_groups?.map(g => i18n.eggGroup[g.name] || g.name).join(', ') || '',
    genderText,
    growthRate:     i18n.growthRate[speciesData.growth_rate?.name] || speciesData.growth_rate?.name || '',
    evYield:        evYield || '—',
    baseExperience: pokemonData.base_experience ?? '—',
    officialArtwork: pokemonData.sprites?.other?.['official-artwork']?.front_default,
    sprite:         pokemonData.sprites?.front_default,
  };
}
