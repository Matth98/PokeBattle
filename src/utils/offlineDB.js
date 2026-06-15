// Wrapper IndexedDB pour le cache offline grande capacité.
// Remplace localStorage (limité à ~5 MB) — IndexedDB supporte plusieurs centaines de MB.
//
// Stores disponibles :
//   'detail'   — données onglet Présentation  (clé: "{pokeId}:{lang}")
//   'moves'    — données onglet Attaques       (clé: "{pokeId}:{lang}")
//   'set'      — données onglet Stratégie      (clé: "v{N}:{pokeId}")
//   'sync'     — progression du pré-chargement (clé: "{pokeId}" → true/false)

const DB_NAME    = 'pokescores-offline';
const DB_VERSION = 1;
const STORES     = ['detail', 'moves', 'set', 'sync'];

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store);
        }
      }
    };
    req.onsuccess  = (e) => resolve(e.target.result);
    req.onerror    = (e) => { _dbPromise = null; reject(e.target.error); };
    req.onblocked  = ()  => { _dbPromise = null; reject(new Error('IDB blocked')); };
  });
  return _dbPromise;
}

export async function idbGet(store, key) {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const req = db.transaction(store, 'readonly').objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);   // undefined si absent
      req.onerror   = () => resolve(undefined);
    });
  } catch {
    return undefined;
  }
}

export async function idbSet(store, key, value) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror    = (e) => reject(e.target.error);
    });
  } catch { /* silencieux — stockage plein ou désactivé */ }
}

export async function idbHas(store, key) {
  const val = await idbGet(store, key);
  return val !== undefined;
}

// Vide tous les stores offline (utilisé pour réinitialiser le cache)
export async function idbClearAll() {
  try {
    const db = await openDB();
    await Promise.all(
      STORES.map(store => new Promise((resolve) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).clear();
        tx.oncomplete = resolve;
        tx.onerror    = resolve; // silencieux
      }))
    );
  } catch { /* silencieux */ }
}
