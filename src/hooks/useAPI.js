import { useState, useCallback } from 'react';
import { auth } from '../firebase';

const API_BASE_URL = 'https://pokebattle-backend.vercel.app/api';

const getAuthHeaders = async () => {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const useAPI = () => {
  const [error, setError] = useState(null);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/players`, {
        headers: await getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Erreur chargement joueurs');
      return await res.json();
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  const fetchBattles = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/battles`, {
        headers: await getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Erreur chargement combats');
      return await res.json();
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/teams`, {
        headers: await getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Erreur chargement équipes');
      return await res.json();
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  const createPlayer = useCallback(async (payload) => {
    try {
      const body =
        typeof payload === 'string'
          ? { name: payload, stats: { wins: 0, losses: 0 }, pokemon: [] }
          : { ...payload, stats: { wins: 0, losses: 0 }, pokemon: [] };
      const res = await fetch(`${API_BASE_URL}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Erreur création joueur');
      return await res.json();
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const updatePlayer = useCallback(async (id, data) => {
    try {
      const res = await fetch(`${API_BASE_URL}/players/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Erreur modification joueur');
      return await res.json();
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  // Sync silencieux du roster Pokémon — utilise PATCH /players/:id/pokemon
  // qui ne vérifie pas la propriété. Tout utilisateur authentifié peut l'appeler.
  const syncPlayerPokemon = useCallback(async (id, pokemon) => {
    try {
      const res = await fetch(`${API_BASE_URL}/players/${id}/pokemon`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ pokemon }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const deletePlayer = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/players/${id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.error || `Erreur ${res.status}`;
        setError(msg);
        return false;
      }
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  const createBattle = useCallback(async (battleData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/battles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ ...battleData, timestamp: new Date().toISOString() })
      });
      if (!res.ok) throw new Error('Erreur création combat');
      return await res.json();
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const updateBattle = useCallback(async (id, battleData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/battles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify(battleData)
      });
      if (!res.ok) throw new Error('Erreur modification combat');
      return await res.json();
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const deleteBattle = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/battles/${id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.error || `Erreur ${res.status}`;
        setError(msg);
        return msg; // retourne le message d'erreur (truthy string ≠ true)
      }
      return true;
    } catch (err) {
      setError(err.message);
      return err.message;
    }
  }, []);

  const createTeam = useCallback(async (teamData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify(teamData)
      });
      if (!res.ok) throw new Error('Erreur création équipe');
      return await res.json();
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const updateTeam = useCallback(async (id, teamData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/teams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify(teamData)
      });
      if (!res.ok) throw new Error('Erreur modification équipe');
      return await res.json();
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const deleteTeam = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/teams/${id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Erreur suppression équipe');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  return {
    error,
    fetchPlayers,
    fetchBattles,
    fetchTeams,
    createPlayer,
    updatePlayer,
    syncPlayerPokemon,
    deletePlayer,
    createBattle,
    updateBattle,
    deleteBattle,
    createTeam,
    updateTeam,
    deleteTeam
  };
};
