// Pré-téléchargement en arrière-plan de tous les Pokémon pour un accès offline complet.
// Ne démarre que quand `enabled` est true (contrôlé par le switch dans les Paramètres).
// La progression est persistée dans IndexedDB — reprend où elle s'était arrêtée.

import { useState, useEffect, useRef } from 'react';
import { idbGet, idbSet, idbHas } from '../utils/offlineDB';
import { processPokemonDetail } from '../utils/fetchPokemonDetail';
import { processPokemonMoves }  from '../utils/fetchPokemonMoves';
import pokemonFr      from '../data/pokemon-fr.json';
import pokemonFormsFr from '../data/pokemon-forms-fr.json';

const BASE_LIST = pokemonFr.map((name, idx) => ({
  pokeId: idx + 1,
  name:   typeof name === 'string' ? name : name.name,
}));
const FORMS_LIST = pokemonFormsFr.map(p => ({ pokeId: p.pokeId, name: p.name }));
const ALL_POKEMON = [...BASE_LIST, ...FORMS_LIST];

export const OFFLINE_TOTAL = ALL_POKEMON.length;

const BATCH_SIZE = 5;
const LANGUAGES  = ['fr'];
const SYNC_KEY   = 'progress';

const SMOGON_BASE    = 'https://raw.githubusercontent.com/pkmn/smogon/main/data/sets';
const SMOGON_FORMATS = [
  'gen9vgc2025','gen9vgc2024','gen9ou','gen9uu','gen9ru','gen9nu','gen9pu',
  'gen8ou','gen8vgc2022','gen8uu','gen8ru','gen8nu','gen8pu',
];
const TYPE_NAMES = [
  'normal','fire','water','electric','grass','ice','fighting',
  'poison','ground','flying','psychic','bug','rock','ghost',
  'dragon','dark','steel','fairy',
];

async function getSyncProgress() {
  return (await idbGet('sync', SYNC_KEY)) || { done: 0, completed: {} };
}

async function saveSyncProgress(progress) {
  await idbSet('sync', SYNC_KEY, progress);
}

async function warmImages(pokeId) {
  await Promise.allSettled([
    fetch(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokeId}.png`),
    fetch(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokeId}.png`),
  ]);
}

async function syncOnePokemon(pokeId, name, language) {
  const detailKey = `v1:${pokeId}:${language}`;
  const movesKey  = `v1:${pokeId}:${language}`;
  const [hasDetail, hasMoves] = await Promise.all([
    idbHas('detail', detailKey),
    idbHas('moves',  movesKey),
  ]);
  await Promise.allSettled([
    hasDetail ? null : processPokemonDetail(pokeId, language, name).then(r => idbSet('detail', detailKey, r)),
    hasMoves  ? null : processPokemonMoves(pokeId, language).then(r => idbSet('moves', movesKey, r)),
    warmImages(pokeId),
  ]);
}

/**
 * @param {boolean} enabled  Activé depuis le switch Paramètres
 * @returns {{ done: number, total: number, finished: boolean }}
 */
export function useOfflineSync(enabled) {
  const [done,     setDone]     = useState(0);
  const [finished, setFinished] = useState(false);
  const running = useRef(false);

  // Charger la progression initiale dès le montage
  useEffect(() => {
    getSyncProgress().then(p => {
      setDone(p.done);
      if (p.done >= OFFLINE_TOTAL) setFinished(true);
    });
  }, []);

  // Démarrer la synchro uniquement quand enabled passe à true
  useEffect(() => {
    if (!enabled || running.current || finished) return;
    running.current = true;

    const run = async () => {
      const progress = await getSyncProgress();
      setDone(progress.done);

      if (progress.done >= OFFLINE_TOTAL) { setFinished(true); return; }

      // Pré-charger les assets statiques en arrière-plan
      Promise.allSettled([
        ...SMOGON_FORMATS.map(fmt => fetch(`${SMOGON_BASE}/${fmt}.json`)),
        ...TYPE_NAMES.map(t =>
          fetch(`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${t}.svg`)
        ),
      ]).catch(() => {});

      const pending = ALL_POKEMON.filter(p => !progress.completed[p.pokeId]);

      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        if (!running.current) break; // arrêt si désactivé entre deux lots
        const batch = pending.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(({ pokeId, name }) =>
            Promise.allSettled(LANGUAGES.map(lang => syncOnePokemon(pokeId, name, lang)))
              .then(() => {
                progress.completed[pokeId] = true;
                progress.done = Object.keys(progress.completed).length;
              })
          )
        );
        setDone(progress.done);
        await saveSyncProgress(progress);
        await new Promise(r => setTimeout(r, 50));
      }

      if (progress.done >= OFFLINE_TOTAL) setFinished(true);
      running.current = false;
    };

    run().catch(() => { running.current = false; });

    // Quand enabled repasse à false, on marque running = false pour stopper proprement
    return () => { running.current = false; };
  }, [enabled, finished]);

  return { done, total: OFFLINE_TOTAL, finished };
}
