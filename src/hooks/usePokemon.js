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

const computeResults = (query) => {
  const q = normalize((query || '').trim());
  if (!q) return [];
  return NORMALIZED_INDEX
    .filter((p) => p._normalized.includes(q))
    .sort((a, b) => a.pokeId - b.pokeId)
    .slice(0, 20)
    .map(({ pokeId, name }) => ({ pokeId, name }));
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

  // Image officielle (sprites PokeAPI, hébergés sur raw.githubusercontent.com)
  const getPokemonImageUrl = (pokeId) =>
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokeId}.png`;

  return {
    searchResults,
    searchLoading,
    error: null,
    searchPokemon,
    getPokemonImageUrl,
  };
};
