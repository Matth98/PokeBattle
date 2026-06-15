import { useState, useEffect } from 'react';
import { useLanguage } from './useLanguage';
import { processPokemonMoves } from '../utils/fetchPokemonMoves';
import { idbGet, idbSet } from '../utils/offlineDB';

const MOVES_CACHE_VERSION = 1;

export function usePokemonMoves(pokeId) {
  const [moves,   setMoves]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const { language } = useLanguage();

  useEffect(() => {
    if (!pokeId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setMoves(null);

      try {
        // 1. IndexedDB (survit aux rechargements + pré-chargé offline)
        const idbKey = `v${MOVES_CACHE_VERSION}:${pokeId}:${language}`;
        const cached = await idbGet('moves', idbKey);
        if (cached !== undefined) {
          if (!cancelled) { setMoves(cached); setLoading(false); }
          return;
        }

        // 2. Fetch réseau + traitement
        const result = await processPokemonMoves(pokeId, language);
        await idbSet('moves', idbKey, result);
        if (!cancelled) setMoves(result);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [pokeId, language]);

  return { moves, loading, error };
}
