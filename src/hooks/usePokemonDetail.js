import { useState, useEffect } from 'react';
import { useLanguage } from './useLanguage';
import { processPokemonDetail, STAT_FR } from '../utils/fetchPokemonDetail';
import { idbGet, idbSet } from '../utils/offlineDB';

// Re-export STAT_FR pour la compatibilité avec les composants qui l'importent directement
export { STAT_FR };

const DETAIL_CACHE_VERSION = 7;

export function usePokemonDetail(pokeId, pokemonNameOverride = null) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const { language } = useLanguage();

  useEffect(() => {
    if (!pokeId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        // 1. IndexedDB (survit aux rechargements + pré-chargé offline)
        const idbKey = `v${DETAIL_CACHE_VERSION}:${pokeId}:${language}`;
        const cached = await idbGet('detail', idbKey);
        if (cached !== undefined) {
          if (!cancelled) { setData(cached); setLoading(false); }
          return;
        }

        // 2. Fetch réseau + traitement
        const result = await processPokemonDetail(pokeId, language, pokemonNameOverride);
        await idbSet('detail', idbKey, result);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pokeId, language]);

  return { data, loading, error };
}
