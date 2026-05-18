import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { theme } from './utils/theme';
import { useAPI } from './hooks/useAPI';
import { Home } from './components/Home';
import { Players } from './components/Players';
import { PlayerDetail } from './components/PlayerDetail';
import { Teams } from './components/Teams';
import { TeamDetail } from './components/TeamDetail';
import { Battles } from './components/Battles';
import { BattleDetail } from './components/BattleDetail';
import { Navigation } from './components/Navigation';
import { ToastProvider, useToast } from './components/Toast';

// Tailwind CDN
if (typeof document !== 'undefined' && !document.querySelector('script[src*="tailwindcss"]')) {
  const script = document.createElement('script');
  script.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(script);
}

// Font Awesome
if (typeof document !== 'undefined' && !document.querySelector('link[href*="font-awesome"]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
  document.head.appendChild(link);
}

function AppContent({ isDark, setIsDark }) {
  const toast = useToast();
  const t = isDark ? theme.dark : theme.light;

  const [currentTab, _setCurrentTabState] = useState('home');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedBattle, setSelectedBattle] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // ── Mémoire de scroll par onglet ──
  // setCurrentTab : navigation "avant" — sauvegarde la position quittée et scroll top
  // goBackTo : navigation "retour" — restaure la position sauvegardée pour l'onglet cible
  const scrollMemoryRef = useRef(new Map());
  const shouldRestoreRef = useRef(false);

  const setCurrentTab = useCallback((newTab) => {
    scrollMemoryRef.current.set(currentTab, window.scrollY);
    shouldRestoreRef.current = false;
    _setCurrentTabState(newTab);
  }, [currentTab]);

  const goBackTo = useCallback((newTab) => {
    scrollMemoryRef.current.set(currentTab, window.scrollY);
    shouldRestoreRef.current = true;
    _setCurrentTabState(newTab);
  }, [currentTab]);

  useLayoutEffect(() => {
    if (shouldRestoreRef.current) {
      const saved = scrollMemoryRef.current.get(currentTab) || 0;
      window.scrollTo({ top: saved, behavior: 'auto' });
      shouldRestoreRef.current = false;
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [currentTab]);

  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [showNewBattleForm, setShowNewBattleForm] = useState(false);
  const [showNewTeamForm, setShowNewTeamForm] = useState(false);

  // Mémorise d'où on a ouvert le formulaire d'édition ('detail' = depuis la fiche détail,
  // null = depuis la liste). Permet de revenir à la fiche détail à la fermeture.
  const [battleEditOrigin, setBattleEditOrigin] = useState(null);
  const [teamEditOrigin, setTeamEditOrigin] = useState(null);

  const [selectionMode, setSelectionMode] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

  // Wrappers de fermeture : si on était venus depuis la fiche détail, on y retourne
  const setShowBattleForm = (val) => {
    setShowNewBattleForm(val);
    if (!val) {
      if (battleEditOrigin === 'detail') {
        setCurrentTab('battleDetail');
      }
      setBattleEditOrigin(null);
    }
  };
  const setShowTeamForm = (val) => {
    setShowNewTeamForm(val);
    if (!val) {
      if (teamEditOrigin === 'detail') {
        setCurrentTab('teamDetail');
      }
      setTeamEditOrigin(null);
    }
  };

  const {
    loading,
    fetchPlayers,
    fetchBattles,
    fetchTeams,
    createPlayer,
    updatePlayer,
    deletePlayer,
    createBattle,
    updateBattle,
    deleteBattle,
    createTeam,
    updateTeam,
    deleteTeam
  } = useAPI();

  const [players, setPlayers] = useState([]);
  const [battles, setBattles] = useState([]);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const [p, b, t] = await Promise.all([
      fetchPlayers(),
      fetchBattles(),
      fetchTeams()
    ]);
    if (p) setPlayers(p);
    if (b) setBattles(b);
    if (t) setTeams(t);
  };

  const handleAddPlayer = async (data) => {
    // data peut être un string (nom) pour rétro-compat, ou { name, avatar }
    const payload = typeof data === 'string' ? { name: data } : data;
    const newPlayer = await createPlayer(payload);
    if (newPlayer) {
      setPlayers([...players, newPlayer]);
      toast.success(`${newPlayer.name} ajouté`);
    } else {
      toast.error('Erreur lors de la création');
    }
  };

  const handleUpdatePlayer = async (id, data) => {
    const updated = await updatePlayer(id, data);
    if (updated) {
      setPlayers(players.map(p => p._id === id ? updated : p));
      setSelectedPlayer(updated);
    } else {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeletePlayer = async (id) => {
    const target = players.find((p) => p._id === id);
    const success = await deletePlayer(id);
    if (success) {
      setPlayers(players.filter(p => p._id !== id));
      toast.success(`${target?.name || 'Joueur'} supprimé`);
    } else {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDeleteMultiplePlayers = async (ids) => {
    for (const id of ids) {
      const target = players.find((p) => p._id === id);
      const success = await deletePlayer(id);
      if (success) setPlayers((prev) => prev.filter((p) => p._id !== id));
      if (!success && target) toast.error(`Échec : ${target.name}`);
    }
    toast.success(`${ids.length} joueur${ids.length > 1 ? 's' : ''} supprimé${ids.length > 1 ? 's' : ''}`);
  };

  const handleAddTeam = async (teamData) => {
    const newTeam = await createTeam(teamData);
    if (newTeam) {
      setTeams([...teams, newTeam]);
      toast.success(`Équipe « ${newTeam.name} » créée`);
    } else {
      toast.error('Erreur lors de la création');
    }
  };

  const handleUpdateTeam = async (id, data) => {
    const updated = await updateTeam(id, data);
    if (updated) {
      setTeams(teams.map(t => t._id === id ? updated : t));
      setSelectedTeam(updated);
      toast.success(`Équipe « ${updated.name} » mise à jour`);
    } else {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteTeam = async (id) => {
    const target = teams.find((tt) => tt._id === id);
    const success = await deleteTeam(id);
    if (success) {
      setTeams(teams.filter(t => t._id !== id));
      toast.success(`Équipe « ${target?.name || ''} » supprimée`);
    } else {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDeleteMultipleTeams = async (ids) => {
    for (const id of ids) {
      const success = await deleteTeam(id);
      if (success) setTeams((prev) => prev.filter((t) => t._id !== id));
    }
    toast.success(`${ids.length} équipe${ids.length > 1 ? 's' : ''} supprimée${ids.length > 1 ? 's' : ''}`);
  };

  const handleAddBattle = async (battleData) => {
    const newBattle = await createBattle(battleData);
    if (newBattle) {
      setBattles([...battles, newBattle]);
      loadAllData();
      setCurrentTab('battles');
      toast.success('Combat enregistré');
    } else {
      toast.error('Erreur lors de la création');
    }
  };

  const handleUpdateBattle = async (id, data) => {
    const updated = await updateBattle(id, data);
    if (updated) {
      setBattles(battles.map(b => b._id === id ? updated : b));
      setSelectedBattle(updated);
      loadAllData();
      toast.success('Combat mis à jour');
    } else {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteBattle = async (id) => {
    const success = await deleteBattle(id);
    if (success) {
      setBattles(battles.filter(b => b._id !== id));
      loadAllData();
      toast.success('Combat supprimé');
    } else {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDeleteMultipleBattles = async (ids) => {
    for (const id of ids) {
      const success = await deleteBattle(id);
      if (success) setBattles((prev) => prev.filter((b) => b._id !== id));
    }
    loadAllData();
    toast.success(`${ids.length} combat${ids.length > 1 ? 's' : ''} supprimé${ids.length > 1 ? 's' : ''}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <p className="text-xl font-black text-gray-900">Chargement...</p>
      </div>
    );
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      {currentTab === 'home' && (
        <Home
          players={players}
          battles={battles}
          teams={teams}
          isDark={isDark}
          setIsDark={setIsDark}
          t={t}
          setCurrentTab={setCurrentTab}
          setSelectedBattle={setSelectedBattle}
        />
      )}

      {currentTab === 'players' && (
        <Players
          players={players}
          t={t}
          isDark={isDark}
          onSelectPlayer={(p) => {
            setSelectedPlayer(p);
            setCurrentTab('playerDetail');
          }}
          onAddPlayer={handleAddPlayer}
          onDeletePlayer={handleDeletePlayer}
          onDeleteMultiple={handleDeleteMultiplePlayers}
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
          selectedItems={selectedItems}
          setSelectedItems={setSelectedItems}
          showForm={showNewPlayerForm}
          setShowForm={setShowNewPlayerForm}
        />
      )}

      {currentTab === 'playerDetail' && (
        <PlayerDetail
          player={selectedPlayer}
          teams={teams}
          battles={battles}
          t={t}
          isDark={isDark}
          onBack={() => {
            setSelectedPlayer(null);
            goBackTo('players');
          }}
          onUpdate={handleUpdatePlayer}
          onAddTeam={handleAddTeam}
          onUpdateTeam={handleUpdateTeam}
          onSelectTeam={(team) => {
            setSelectedTeam(team);
            setCurrentTab('teamDetail');
          }}
        />
      )}

      {currentTab === 'teams' && (
        <Teams
          teams={teams}
          players={players}
          t={t}
          isDark={isDark}
          onSelectTeam={(team) => {
            setSelectedTeam(team);
            setCurrentTab('teamDetail');
          }}
          onAddTeam={handleAddTeam}
          onUpdateTeam={handleUpdateTeam}
          onUpdatePlayer={handleUpdatePlayer}
          onDeleteTeam={handleDeleteTeam}
          onDeleteMultiple={handleDeleteMultipleTeams}
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
          selectedItems={selectedItems}
          setSelectedItems={setSelectedItems}
          showForm={showNewTeamForm}
          setShowForm={setShowTeamForm}
          editingTeam={selectedTeam}
          clearEditingTeam={() => {
            // Si on revient sur la fiche détail, on garde selectedTeam pour que la page se rende
            if (teamEditOrigin !== 'detail') {
              setSelectedTeam(null);
            }
          }}
        />
      )}

      {currentTab === 'teamDetail' && (
        <TeamDetail
          team={selectedTeam}
          t={t}
          isDark={isDark}
          onBack={() => {
            setSelectedTeam(null);
            goBackTo('teams');
          }}
          onEdit={(team) => {
            setSelectedTeam(team);
            setTeamEditOrigin('detail');
            setCurrentTab('teams');
            setShowNewTeamForm(true);
          }}
          onUpdate={handleUpdateTeam}
        />
      )}

      {currentTab === 'battles' && (
        <Battles
          battles={battles}
          players={players}
          teams={teams}
          t={t}
          isDark={isDark}
          onSelectBattle={(b) => {
            setSelectedBattle(b);
            setCurrentTab('battleDetail');
          }}
          onAddBattle={handleAddBattle}
          onUpdateBattle={handleUpdateBattle}
          onUpdatePlayer={handleUpdatePlayer}
          onDeleteBattle={handleDeleteBattle}
          onDeleteMultiple={handleDeleteMultipleBattles}
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
          selectedItems={selectedItems}
          setSelectedItems={setSelectedItems}
          showForm={showNewBattleForm}
          setShowForm={setShowBattleForm}
          editingBattle={selectedBattle}
          clearEditingBattle={() => {
            // Si on revient sur la fiche détail, on garde selectedBattle pour que la page se rende
            if (battleEditOrigin !== 'detail') {
              setSelectedBattle(null);
            }
          }}
        />
      )}

      {currentTab === 'battleDetail' && (
        <BattleDetail
          battle={selectedBattle}
          players={players}
          t={t}
          isDark={isDark}
          onBack={() => {
            setSelectedBattle(null);
            goBackTo('battles');
          }}
          onEdit={(b) => {
            setSelectedBattle(b);
            setBattleEditOrigin('detail');
            setCurrentTab('battles');
            setShowNewBattleForm(true);
          }}
          onDelete={handleDeleteBattle}
        />
      )}

      {currentTab !== 'battles' && showNewBattleForm && (
        <Battles
          battles={battles}
          players={players}
          teams={teams}
          t={t}
          isDark={isDark}
          onSelectBattle={(b) => {
            setSelectedBattle(b);
            setCurrentTab('battleDetail');
          }}
          onAddBattle={handleAddBattle}
          onUpdateBattle={handleUpdateBattle}
          onUpdatePlayer={handleUpdatePlayer}
          onDeleteBattle={handleDeleteBattle}
          onDeleteMultiple={handleDeleteMultipleBattles}
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
          selectedItems={selectedItems}
          setSelectedItems={setSelectedItems}
          showForm={showNewBattleForm}
          setShowForm={setShowBattleForm}
          editingBattle={null}
          renderPage={false}
        />
      )}

      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isDark={isDark}
        t={t}
        onCreateBattle={() => {
          setBattleEditOrigin(null);
          setShowNewBattleForm(true);
        }}
      />
    </div>
  );
}

function App() {
  const [isDark, setIsDark] = useState(false);
  return (
    <ToastProvider isDark={isDark}>
      <AppContent isDark={isDark} setIsDark={setIsDark} />
    </ToastProvider>
  );
}

export default App;
