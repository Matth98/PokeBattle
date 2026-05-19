import { useState, useCallback } from 'react';
import pokemonFr from '../data/pokemon-fr.json';
import pokemonFormsFr from '../data/pokemon-forms-fr.json';

// Données bundlées dans l'app : zéro dépendance réseau pour les noms.
// L'index dans le tableau = pokeId - 1 (Bulbizarre = index 0 → pokeId 1).
const BASE_LIST = pokemonFr.map((name, idx) => ({ pokeId: idx + 1, name }));
const POKEMON_LIST = [...BASE_LIST, ...pokemonFormsFr];

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

export const usePokemon = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const searchPokemon = useCallback((query) => {
    const q = normalize((query || '').trim());
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    // Filtrage en mémoire, instantané
    const filtered = NORMALIZED_INDEX
      .filter((p) => p._normalized.includes(q))
      .slice(0, 20)
      .map(({ pokeId, name }) => ({ pokeId, name }));
    setSearchResults(filtered);
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
