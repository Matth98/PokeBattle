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

// Couleurs hex canoniques (pour inline styles)
// Couleurs extraites directement depuis les SVG du CDN partywhale/pokemon-type-icons
export const TYPE_HEX = {
  normal:   '#828282', fire:     '#e4613e', water:    '#3099e1',
  grass:    '#439837', electric: '#dfbc28', ice:      '#47c8c8',
  fighting: '#e49021', poison:   '#9354cb', ground:   '#a4733c',
  flying:   '#74aad0', psychic:  '#e96c8c', bug:      '#9f9f28',
  rock:     '#a9a481', ghost:    '#6f4570', dragon:   '#576fbc',
  dark:     '#4f4747', steel:    '#74b0cb', fairy:    '#e18ce1',
};

// Couleurs canoniques pour les badges (Tailwind arbitrary values pour pile la teinte)
// - bg / text : version "pleine" (badge solide, texte blanc)
// - softBg / softText : version "tuile pastel" (fond très transparent, texte coloré),
//   utilisée pour les cartes Fun Facts à la place des tuiles t.iconTile*
export const TYPE_COLORS = {
  normal:   { bg: 'bg-[#A8A77A]', text: 'text-white',      softBg: 'bg-[#A8A77A]/15', softText: 'text-[#A8A77A]' },
  fire:     { bg: 'bg-[#EE8130]', text: 'text-white',      softBg: 'bg-[#EE8130]/15', softText: 'text-[#EE8130]' },
  water:    { bg: 'bg-[#6390F0]', text: 'text-white',      softBg: 'bg-[#6390F0]/15', softText: 'text-[#6390F0]' },
  grass:    { bg: 'bg-[#7AC74C]', text: 'text-white',      softBg: 'bg-[#7AC74C]/15', softText: 'text-[#7AC74C]' },
  electric: { bg: 'bg-[#F7D02C]', text: 'text-gray-900',   softBg: 'bg-[#F7D02C]/20', softText: 'text-[#B89500]' },
  ice:      { bg: 'bg-[#96D9D6]', text: 'text-gray-900',   softBg: 'bg-[#96D9D6]/25', softText: 'text-[#3DA5A0]' },
  fighting: { bg: 'bg-[#C22E28]', text: 'text-white',      softBg: 'bg-[#C22E28]/15', softText: 'text-[#C22E28]' },
  poison:   { bg: 'bg-[#A33EA1]', text: 'text-white',      softBg: 'bg-[#A33EA1]/15', softText: 'text-[#A33EA1]' },
  ground:   { bg: 'bg-[#E2BF65]', text: 'text-gray-900',   softBg: 'bg-[#E2BF65]/20', softText: 'text-[#9A7E1F]' },
  flying:   { bg: 'bg-[#A98FF3]', text: 'text-white',      softBg: 'bg-[#A98FF3]/20', softText: 'text-[#7E5BD9]' },
  psychic:  { bg: 'bg-[#F95587]', text: 'text-white',      softBg: 'bg-[#F95587]/15', softText: 'text-[#F95587]' },
  bug:      { bg: 'bg-[#A6B91A]', text: 'text-white',      softBg: 'bg-[#A6B91A]/15', softText: 'text-[#7A8A0A]' },
  rock:     { bg: 'bg-[#B6A136]', text: 'text-white',      softBg: 'bg-[#B6A136]/20', softText: 'text-[#7E6E15]' },
  ghost:    { bg: 'bg-[#735797]', text: 'text-white',      softBg: 'bg-[#735797]/20', softText: 'text-[#735797]' },
  dragon:   { bg: 'bg-[#6F35FC]', text: 'text-white',      softBg: 'bg-[#6F35FC]/15', softText: 'text-[#6F35FC]' },
  dark:     { bg: 'bg-[#705746]', text: 'text-white',      softBg: 'bg-[#705746]/20', softText: 'text-[#705746]' },
  steel:    { bg: 'bg-[#B7B7CE]', text: 'text-gray-900',   softBg: 'bg-[#B7B7CE]/25', softText: 'text-[#6B6B85]' },
  fairy:    { bg: 'bg-[#D685AD]', text: 'text-white',      softBg: 'bg-[#D685AD]/20', softText: 'text-[#C04F8A]' },
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
