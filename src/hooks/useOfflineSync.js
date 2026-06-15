// Pré-téléchargement en arrière-plan de tous les Pokémon pour un accès offline complet.
// - Ne démarre que quand `enabled` est true (switch dans les Paramètres)
// - Utilise requestIdleCallback pour ne jamais bloquer l'UI
// - Détecte les nouvelles données disponibles après une mise à jour de l'app

import { useState, useEffect, useRef } from 'react';
import { idbGet, idbSet, idbHas, idbClearAll } from '../utils/offlineDB';
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

// Petit lot pour ne pas saturer les APIs — requestIdleCallback gère le reste
const BATCH_SIZE = 2;
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

// Attend que le navigateur soit idle avant de continuer (ne bloque jamais l'UI)
function whenIdle() {
  return new Promise(resolve => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(resolve, { timeout: 3000 });
    } else {
      setTimeout(resolve, 32); // fallback : ~2 frames
    }
  });
}

async function getSyncProgress() {
  return (await idbGet('sync', SYNC_KEY)) || { done: 0, completed: {}, previouslyComplete: false };
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
 * @returns {{
 *   done: number,
 *   total: number,
 *   finished: boolean,
 *   syncing: boolean,
 *   hasNewData: boolean,   // true = était 100% mais de nouveaux Pokémon sont disponibles
 * }}
 */
export function useOfflineSync(enabled) {
  const [done,       setDone]       = useState(0);
  const [finished,   setFinished]   = useState(false);
  const [syncing,    setSyncing]    = useState(false);
  const [hasNewData, setHasNewData] = useState(false);
  const running = useRef(false);

  // Charger la progression au montage et détecter les nouvelles données
  useEffect(() => {
    getSyncProgress().then(progress => {
      const alreadyDone = progress.done;
      setDone(alreadyDone);

      if (alreadyDone >= OFFLINE_TOTAL) {
        // Tout est téléchargé pour la version actuelle
        setFinished(true);
      } else if (progress.previouslyComplete) {
        // Était complet par le passé → nouvelles données disponibles depuis une màj
        setHasNewData(true);
      }
    });
  }, []);

  // Démarrer la synchro uniquement quand enabled passe à true
  useEffect(() => {
    if (!enabled || running.current || finished) return;

    running.current = true;
    setHasNewData(false);  // la bannière disparaît une fois le téléchargement lancé
    setSyncing(true);

    const run = async () => {
      const progress = await getSyncProgress();
      setDone(progress.done);

      if (progress.done >= OFFLINE_TOTAL) {
        setFinished(true);
        setSyncing(false);
        running.current = false;
        return;
      }

      // Pré-charger assets statiques (non bloquant)
      Promise.allSettled([
        ...SMOGON_FORMATS.map(fmt => fetch(`${SMOGON_BASE}/${fmt}.json`)),
        ...TYPE_NAMES.map(t =>
          fetch(`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${t}.svg`)
        ),
      ]).catch(() => {});

      const pending = ALL_POKEMON.filter(p => !progress.completed[p.pokeId]);

      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        if (!running.current) break;

        // Céder le thread à l'UI avant chaque lot
        await whenIdle();
        if (!running.current) break;

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
      }

      if (progress.done >= OFFLINE_TOTAL) {
        // Marquer comme complet pour détecter les futures mises à jour
        progress.previouslyComplete = true;
        await saveSyncProgress(progress);
        setFinished(true);
      }

      setSyncing(false);
      running.current = false;
    };

    run().catch(() => { setSyncing(false); running.current = false; });

    return () => { running.current = false; };
  }, [enabled, finished]);

  const reset = async () => {
    running.current = false;
    await idbClearAll();
    setDone(0);
    setFinished(false);
    setSyncing(false);
    setHasNewData(false);
  };

  return { done, total: OFFLINE_TOTAL, finished, syncing, hasNewData, reset };
}
