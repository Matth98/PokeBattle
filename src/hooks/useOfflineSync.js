// Pilote le Web Worker de synchronisation offline.
// Toute la logique lourde (fetch, JSON, IndexedDB) tourne dans un thread séparé —
// le thread UI reste toujours fluide, même pendant un téléchargement intensif.

import { useState, useEffect, useRef } from 'react';
import { idbGet, idbSet, idbClearAll } from '../utils/offlineDB';
import pokemonFr      from '../data/pokemon-fr.json';
import pokemonFormsFr from '../data/pokemon-forms-fr.json';

const BASE_LIST  = pokemonFr.map((name, idx) => ({ pokeId: idx + 1 }));
const FORMS_LIST = pokemonFormsFr.map(p => ({ pokeId: p.pokeId }));
export const OFFLINE_TOTAL = BASE_LIST.length + FORMS_LIST.length;

const SYNC_KEY = 'progress';

async function getSyncProgress() {
  return (await idbGet('sync', SYNC_KEY)) || { done: 0, completed: {}, previouslyComplete: false };
}

/**
 * @param {boolean} enabled  Activé depuis le switch Paramètres
 * @returns {{
 *   done: number,
 *   total: number,
 *   finished: boolean,
 *   syncing: boolean,
 *   hasNewData: boolean,
 *   reset: () => Promise<void>,
 * }}
 */
export function useOfflineSync(enabled) {
  const [done,       setDone]       = useState(0);
  const [finished,   setFinished]   = useState(false);
  const [syncing,    setSyncing]    = useState(false);
  const [hasNewData, setHasNewData] = useState(false);
  const workerRef = useRef(null);

  // Charger la progression initiale au montage
  useEffect(() => {
    getSyncProgress().then(progress => {
      setDone(progress.done);
      if (progress.done >= OFFLINE_TOTAL) {
        setFinished(true);
      } else if (progress.previouslyComplete) {
        setHasNewData(true);
      }
    });
  }, []);

  // Démarrer / arrêter le worker selon `enabled`
  useEffect(() => {
    if (!enabled || finished) {
      // Arrêter le worker si on désactive le mode offline en cours de route
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'STOP' });
        workerRef.current.terminate();
        workerRef.current = null;
        setSyncing(false);
      }
      return;
    }

    if (workerRef.current) return; // déjà en cours

    setHasNewData(false);
    setSyncing(true);

    // Webpack 5 / CRA 5 : bundle le worker dans un chunk séparé
    const worker = new Worker(
      new URL('../workers/offlineSync.worker.js', import.meta.url)
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, done: d } = e.data;
      if (type === 'PROGRESS') {
        setDone(d);
      } else if (type === 'DONE') {
        setFinished(true);
        setSyncing(false);
        worker.terminate();
        workerRef.current = null;
      }
    };

    worker.onerror = () => {
      setSyncing(false);
      worker.terminate();
      workerRef.current = null;
    };

    worker.postMessage({ type: 'START' });

    return () => {
      worker.postMessage({ type: 'STOP' });
      worker.terminate();
      workerRef.current = null;
    };
  }, [enabled, finished]);

  const reset = async () => {
    // Arrêter le worker en cours si besoin
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'STOP' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    await idbClearAll();
    setDone(0);
    setFinished(false);
    setSyncing(false);
    setHasNewData(false);
  };

  return { done, total: OFFLINE_TOTAL, finished, syncing, hasNewData, reset };
}
