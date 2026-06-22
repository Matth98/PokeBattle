import { useState, useCallback } from 'react';
import pokemonFr from '../data/pokemon-fr.json';
import pokemonFormsFr from '../data/pokemon-forms-fr.json';

// Données bundlées dans l'app : zéro dépendance réseau pour les noms.
// L'index dans le tableau = pokeId - 1 (Bulbizarre = index 0 → pokeId 1).
const toTextGlyph = (s) => s.replace(/[♂♀]/g, '$&︎');
const BASE_LIST = pokemonFr.map((name, idx) => ({ pokeId: idx + 1, name: toTextGlyph(name) }));
const POKEMON_LIST = [...BASE_LIST, ...pokemonFormsFr];

const GENERATION_RANGES = [
  { label: 'Génération 1', min: 1,   max: 151  },
  { label: 'Génération 2', min: 152,  max: 251  },
  { label: 'Génération 3', min: 252,  max: 386  },
  { label: 'Génération 4', min: 387,  max: 493  },
  { label: 'Génération 5', min: 494,  max: 649  },
  { label: 'Génération 6', min: 650,  max: 721  },
  { label: 'Génération 7', min: 722,  max: 809  },
  { label: 'Génération 8', min: 810,  max: 905  },
  { label: 'Génération 9', min: 906,  max: 1025 },
];

export const POKEMON_BY_GENERATION = GENERATION_RANGES.map(({ label, min, max }) => ({
  label,
  pokemon: BASE_LIST.filter(p => p.pokeId >= min && p.pokeId <= max),
}));

// Recherche insensible aux accents (Bulbi vs bulbi, etc.)
const normalize = (str = '') =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// Index pré-calculé une seule fois, accélère le filter
const NORMALIZED_INDEX = POKEMON_LIST.map((p) => ({
  ...p,
  _normalized: normalize(p.name),
}));

const POKEMON_NAME_MAP = new Map(POKEMON_LIST.map((p) => [p.pokeId, p.name]));

// Formes genrées — découvertes dynamiquement lors de la visite d'une fiche espèce.
// Format : { pokeId: speciesId, name, gender: 'female'|'male', altPokeId }
//   pokeId   = ID de l'espèce de base (678, 876…) — ID affiché à l'utilisateur
//   altPokeId = ID interne PokeAPI (10025, 10186…) — utilisé pour sprites/fetch uniquement
//              (null jusqu'à la première visite de la fiche)

// Seeds : espèces connues pour avoir une forme femelle significative.
// Seuls les IDs d'espèce (déjà utilisés partout dans l'app) sont hardcodés ici.
// L'altPokeId est null et se remplira dynamiquement via registerGenderForm.
const GENDER_FORM_SEEDS = [
  { pokeId: 678,  gender: 'female' }, // Mistigrix ♀
  { pokeId: 876,  gender: 'female' }, // Wimessir ♀
  { pokeId: 902,  gender: 'female' }, // Paragruel ♀
  { pokeId: 916,  gender: 'female' }, // Gourmelet ♀
].map(({ pokeId, gender }) => ({
  pokeId,
  name: toTextGlyph(`${POKEMON_NAME_MAP.get(pokeId) || ''} ♀`),
  gender,
  altPokeId: null,
}));

const SEED_KEYS = new Set(GENDER_FORM_SEEDS.map((s) => `${s.pokeId}:${s.gender}`));

const GENDER_FORMS_STORAGE_KEY = 'gender_forms_v7';

// Cache des formes genrées : initialisé immédiatement avec les seeds.
// registerGenderForm met à jour altPokeId dans ce tableau en place.
const GENDER_FORMS_CACHE = GENDER_FORM_SEEDS.map((s) => ({ ...s }));
let genderFormsLoaded = false;

function loadGenderForms() {
  if (genderFormsLoaded) return GENDER_FORMS_CACHE;
  genderFormsLoaded = true;
  // Merge localStorage : met à jour les seeds existants et ajoute les formes extra
  let stored = [];
  try {
    const raw = localStorage.getItem(GENDER_FORMS_STORAGE_KEY);
    stored = raw ? JSON.parse(raw) : [];
  } catch { /* ignore */ }
  for (const f of stored) {
    if (f.gender !== 'female') continue;
    const existing = GENDER_FORMS_CACHE.find((c) => c.pokeId === f.pokeId && c.gender === f.gender);
    if (existing) {
      existing.altPokeId = f.altPokeId;
    } else if (!SEED_KEYS.has(`${f.pokeId}:${f.gender}`)) {
      GENDER_FORMS_CACHE.push(f);
    }
  }
  return GENDER_FORMS_CACHE;
}

// Appel unique au chargement du module pour hydrater altPokeId depuis localStorage
loadGenderForms();

// Récupère silencieusement les altPokeId manquants pour les seeds via l'API.
// Ne fait rien si toutes les seeds ont déjà un altPokeId (localStorage hydraté).
export async function prefetchSeedAltPokeIds() {
  const missing = GENDER_FORMS_CACHE.filter(
    (f) => f.gender === 'female' && f.altPokeId === null && SEED_KEYS.has(`${f.pokeId}:${f.gender}`)
  );
  for (const seed of missing) {
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${seed.pokeId}`);
      if (!res.ok) continue;
      const data = await res.json();
      const femaleVariety = data.varieties?.find((v) => v.pokemon.name.endsWith('-female'));
      if (!femaleVariety) continue;
      const altId = parseInt(femaleVariety.pokemon.url.match(/\/(\d+)\/$/)?.[1], 10);
      if (!isNaN(altId)) {
        const name = toTextGlyph(`${POKEMON_NAME_MAP.get(seed.pokeId) || ''} ♀`);
        registerGenderForm(seed.pokeId, name, 'female', altId);
      }
    } catch { /* silently ignore — sprite reste le sprite de base */ }
  }
}

export function getGenderForms() {
  return loadGenderForms();
}

// speciesPokeId : ID de l'espèce (ex: 678)
// name          : nom affiché (ex: "Mistigrix ♀")
// gender        : 'female' | 'male'
// altPokeId     : ID interne PokeAPI (ex: 10025) — pour sprites uniquement
export function registerGenderForm(speciesPokeId, name, gender, altPokeId) {
  name = toTextGlyph(name);
  const existing = GENDER_FORMS_CACHE.find((f) => f.pokeId === speciesPokeId && f.gender === gender);
  if (existing) {
    if (existing.name === name && existing.altPokeId === altPokeId) return;
    existing.name = name;
    existing.altPokeId = altPokeId;
  } else {
    GENDER_FORMS_CACHE.push({ pokeId: speciesPokeId, name, gender, altPokeId });
  }
  try { localStorage.setItem(GENDER_FORMS_STORAGE_KEY, JSON.stringify(GENDER_FORMS_CACHE)); } catch { /* ignore */ }
}

// Retourne l'ID de sprite à utiliser pour un pokémon.
// Pour les formes genrées (nouvelle API), retourne l'altPokeId depuis le cache.
// Pour les anciennes entrées DB (pokeId >= 10000), retourne pokeId directement.
export function getPokemonSpriteId(pokemon) {
  if (pokemon.altPokeId) return pokemon.altPokeId;
  // Déduit le genre depuis le nom si le champ gender a été strippé par le backend
  const gender = pokemon.gender
    ?? (pokemon.name?.includes('♀') ? 'female' : pokemon.name?.includes('♂') ? 'male' : null);
  if (gender) {
    const form = loadGenderForms().find(
      (f) => f.pokeId === pokemon.pokeId && f.gender === gender
    );
    if (form?.altPokeId) return form.altPokeId;
  }
  return pokemon.pokeId;
}

export function resolvePokemonName(pokeId, gender) {
  if (gender === 'female' || gender === 'male') {
    const form = loadGenderForms().find((f) => f.pokeId === pokeId && f.gender === gender);
    if (form) return form.name;
  }
  if (POKEMON_NAME_MAP.has(pokeId)) return POKEMON_NAME_MAP.get(pokeId);
  // Rétrocompatibilité : anciennes entrées DB avec pokeId = altPokeId (10xxx)
  const legacy = loadGenderForms().find((f) => f.altPokeId === pokeId);
  return legacy?.name ?? null;
}

// Image officielle (sprites PokeAPI, hébergés sur raw.githubusercontent.com)
export const getPokemonImageUrl = (pokeId) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokeId}.png`;

const computeResults = (query) => {
  const q = normalize((query || '').trim());
  if (!q) return [];
  const genderForms = loadGenderForms().map((p) => ({ ...p, _normalized: normalize(p.name) }));
  const seen = new Set();
  return [...NORMALIZED_INDEX, ...genderForms]
    .filter((p) => {
      if (!p._normalized.includes(q)) return false;
      const key = `${p.pokeId}:${p.gender ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.pokeId - b.pokeId)
    .slice(0, 20)
    .map(({ pokeId, name, gender, altPokeId }) => ({ pokeId, name, gender, altPokeId }));
};

export const usePokemon = (initialQuery = '') => {
  const [searchResults, setSearchResults] = useState(() => computeResults(initialQuery));
  const [searchLoading, setSearchLoading] = useState(false);

  const searchPokemon = useCallback((query) => {
    const q = normalize((query || '').trim());
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    setSearchResults(computeResults(query));
    setSearchLoading(false);
  }, []);

  return {
    searchResults,
    searchLoading,
    error: null,
    searchPokemon,
    getPokemonImageUrl,
  };
};
