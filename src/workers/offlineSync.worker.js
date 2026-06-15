// Web Worker — tourne dans un thread séparé, jamais sur le thread UI.
// Gère le pré-téléchargement de tous les Pokémon sans jamais bloquer l'interface.

import { processPokemonDetail } from '../utils/fetchPokemonDetail';
import { processPokemonMoves }  from '../utils/fetchPokemonMoves';
import { idbGet, idbSet, idbHas } from '../utils/offlineDB';
import pokemonFr      from '../data/pokemon-fr.json';
import pokemonFormsFr from '../data/pokemon-forms-fr.json';

const BASE_LIST = pokemonFr.map((name, idx) => ({
  pokeId: idx + 1,
  name:   typeof name === 'string' ? name : name.name,
}));
const FORMS_LIST = pokemonFormsFr.map(p => ({ pokeId: p.pokeId, name: p.name }));
const ALL_POKEMON = [...BASE_LIST, ...FORMS_LIST];

const BATCH_SIZE = 5;   // Plus agressif : le thread UI n'est jamais impacté
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
  const key = `v1:${pokeId}:${language}`;
  const [hasDetail, hasMoves] = await Promise.all([
    idbHas('detail', key),
    idbHas('moves',  key),
  ]);
  await Promise.allSettled([
    hasDetail ? null : processPokemonDetail(pokeId, language, name).then(r => idbSet('detail', key, r)),
    hasMoves  ? null : processPokemonMoves(pokeId, language).then(r => idbSet('moves', key, r)),
    warmImages(pokeId),
  ]);
}

self.onmessage = async (e) => {
  if (e.data?.type !== 'START') return;

  const progress = await getSyncProgress();
  self.postMessage({ type: 'PROGRESS', done: progress.done, total: ALL_POKEMON.length });

  if (progress.done >= ALL_POKEMON.length) {
    self.postMessage({ type: 'DONE' });
    return;
  }

  // Assets statiques (non bloquant — on n'attend pas)
  Promise.allSettled([
    ...SMOGON_FORMATS.map(fmt => fetch(`${SMOGON_BASE}/${fmt}.json`)),
    ...TYPE_NAMES.map(t =>
      fetch(`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${t}.svg`)
    ),
  ]).catch(() => {});

  const pending = ALL_POKEMON.filter(p => !progress.completed[p.pokeId]);

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    // Vérifier si le main thread a demandé l'arrêt
    if (self._stopped) return;

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

    self.postMessage({ type: 'PROGRESS', done: progress.done, total: ALL_POKEMON.length });
    await saveSyncProgress(progress);
  }

  if (progress.done >= ALL_POKEMON.length) {
    progress.previouslyComplete = true;
    await saveSyncProgress(progress);
    self.postMessage({ type: 'DONE' });
  }
};

// Signal d'arrêt propre depuis le main thread
self.addEventListener('message', (e) => {
  if (e.data?.type === 'STOP') self._stopped = true;
});
