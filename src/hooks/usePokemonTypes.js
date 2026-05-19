import { useEffect, useState } from 'react';

// Cache module : la requête /pokemon/{id} est appelée 1 seule fois par pokeId
// par session, peu importe combien de composants l'affichent.
const typeCache = new Map(); // pokeId -> string[] (FR)
const inFlight = new Map();  // pokeId -> Promise

// Traduction des 18 types — PokeAPI les expose en anglais
export const TYPE_FR = {
  normal: 'Normal',
  fire: 'Feu',
  water: 'Eau',
  grass: 'Plante',
  electric: 'Électrik',
  ice: 'Glace',
  fighting: 'Combat',
  poison: 'Poison',
  ground: 'Sol',
  flying: 'Vol',
  psychic: 'Psy',
  bug: 'Insecte',
  rock: 'Roche',
  ghost: 'Spectre',
  dragon: 'Dragon',
  dark: 'Ténèbres',
  steel: 'Acier',
  fairy: 'Fée',
};

// Couleurs canoniques pour les badges (Tailwind arbitrary values pour pile la teinte)
export const TYPE_COLORS = {
  normal:   { bg: 'bg-[#A8A77A]', text: 'text-white' },
  fire:     { bg: 'bg-[#EE8130]', text: 'text-white' },
  water:    { bg: 'bg-[#6390F0]', text: 'text-white' },
  grass:    { bg: 'bg-[#7AC74C]', text: 'text-white' },
  electric: { bg: 'bg-[#F7D02C]', text: 'text-gray-900' },
  ice:      { bg: 'bg-[#96D9D6]', text: 'text-gray-900' },
  fighting: { bg: 'bg-[#C22E28]', text: 'text-white' },
  poison:   { bg: 'bg-[#A33EA1]', text: 'text-white' },
  ground:   { bg: 'bg-[#E2BF65]', text: 'text-gray-900' },
  flying:   { bg: 'bg-[#A98FF3]', text: 'text-white' },
  psychic:  { bg: 'bg-[#F95587]', text: 'text-white' },
  bug:      { bg: 'bg-[#A6B91A]', text: 'text-white' },
  rock:     { bg: 'bg-[#B6A136]', text: 'text-white' },
  ghost:    { bg: 'bg-[#735797]', text: 'text-white' },
  dragon:   { bg: 'bg-[#6F35FC]', text: 'text-white' },
  dark:     { bg: 'bg-[#705746]', text: 'text-white' },
  steel:    { bg: 'bg-[#B7B7CE]', text: 'text-gray-900' },
  fairy:    { bg: 'bg-[#D685AD]', text: 'text-white' },
};

const fetchPokemonTypes = (pokeId) => {
  if (typeCache.has(pokeId)) return Promise.resolve(typeCache.get(pokeId));
  if (inFlight.has(pokeId)) return inFlight.get(pokeId);

  const p = fetch(`https://pokeapi.co/api/v2/pokemon/${pokeId}`)
    .then((r) => {
      if (!r.ok) throw new Error('Pokémon introuvable');
      return r.json();
    })
    .then((data) => {
      // data.types = [{slot, type:{name:"grass"}}, ...]
      const types = (data.types || [])
        .sort((a, b) => a.slot - b.slot)
        .map((t) => t.type?.name)
        .filter(Boolean);
      typeCache.set(pokeId, types);
      inFlight.delete(pokeId);
      return types;
    })
    .catch((err) => {
      inFlight.delete(pokeId);
      throw err;
    });

  inFlight.set(pokeId, p);
  return p;
};

/**
 * Retourne un map { pokeId -> string[] (noms anglais) } pour la liste fournie.
 * Mise à jour incrémentielle dès qu'un Pokémon arrive.
 */
export const usePokemonTypes = (pokeIds = []) => {
  const [types, setTypes] = useState(() => {
    const init = {};
    pokeIds.forEach((id) => {
      if (typeCache.has(id)) init[id] = typeCache.get(id);
    });
    return init;
  });

  useEffect(() => {
    let cancelled = false;
    pokeIds.forEach((id) => {
      if (typeCache.has(id)) return; // déjà connu
      fetchPokemonTypes(id)
        .then((t) => {
          if (cancelled) return;
          setTypes((prev) => ({ ...prev, [id]: t }));
        })
        .catch(() => { /* on ignore les erreurs, l'UI fallback sera silencieux */ });
    });
    return () => { cancelled = true; };
  }, [pokeIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return types;
};
