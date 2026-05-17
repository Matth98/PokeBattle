import React, { useState, useEffect } from 'react';
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

function App() {
  const [isDark, setIsDark] = useState(false);
  const t = isDark ? theme.dark : theme.light;

  const [currentTab, setCurrentTab] = useState('home');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedBattle, setSelectedBattle] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [showNewBattleForm, setShowNewBattleForm] = useState(false);
  const [showNewTeamForm, setShowNewTeamForm] = useState(false);

  const [selectionMode, setSelectionMode] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

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

  const handleAddPlayer = async (name) => {
    const newPlayer = await createPlayer(name);
    if (newPlayer) {
      setPlayers([...players, newPlayer]);
    }
  };

  const handleUpdatePlayer = async (id, data) => {
    const updated = await updatePlayer(id, data);
    if (updated) {
      setPlayers(players.map(p => p._id === id ? updated : p));
      setSelectedPlayer(updated);
    }
  };

  const handleDeletePlayer = async (id) => {
    const success = await deletePlayer(id);
    if (success) {
      setPlayers(players.filter(p => p._id !== id));
    }
  };

  const handleDeleteMultiplePlayers = async (ids) => {
    for (const id of ids) {
      await handleDeletePlayer(id);
    }
  };

  const handleAddTeam = async (teamData) => {
    const newTeam = await createTeam(teamData);
    if (newTeam) {
      setTeams([...teams, newTeam]);
    }
  };

  const handleUpdateTeam = async (id, data) => {
    const updated = await updateTeam(id, data);
    if (updated) {
      setTeams(teams.map(t => t._id === id ? updated : t));
      setSelectedTeam(updated);
    }
  };

  const handleDeleteTeam = async (id) => {
    const success = await deleteTeam(id);
    if (success) {
      setTeams(teams.filter(t => t._id !== id));
    }
  };

  const handleDeleteMultipleTeams = async (ids) => {
    for (const id of ids) {
      await handleDeleteTeam(id);
    }
  };

  const handleAddBattle = async (battleData) => {
    const newBattle = await createBattle(battleData);
    if (newBattle) {
      setBattles([...battles, newBattle]);
      loadAllData();
    }
  };

  const handleUpdateBattle = async (id, data) => {
    const updated = await updateBattle(id, data);
    if (updated) {
      setBattles(battles.map(b => b._id === id ? updated : b));
      setSelectedBattle(updated);
      loadAllData();
    }
  };

  const handleDeleteBattle = async (id) => {
    const success = await deleteBattle(id);
    if (success) {
      setBattles(battles.filter(b => b._id !== id));
      loadAllData();
    }
  };

  const handleDeleteMultipleBattles = async (ids) => {
    for (const id of ids) {
      await handleDeleteBattle(id);
    }
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
          t={t}
          isDark={isDark}
          onBack={() => {
            setSelectedPlayer(null);
            setCurrentTab('players');
          }}
          onUpdate={handleUpdatePlayer}
          onUpdateTeam={handleUpdateTeam}
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
          setShowForm={setShowNewTeamForm}
          editingTeam={selectedTeam}
          clearEditingTeam={() => setSelectedTeam(null)}
        />
      )}

      {currentTab === 'teamDetail' && (
        <TeamDetail
          team={selectedTeam}
          t={t}
          isDark={isDark}
          onBack={() => {
            setSelectedTeam(null);
            setCurrentTab('teams');
          }}
          onEdit={(team) => {
            setSelectedTeam(team);
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
          setShowForm={setShowNewBattleForm}
          editingBattle={selectedBattle}
          clearEditingBattle={() => setSelectedBattle(null)}
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
            setCurrentTab('battles');
          }}
          onEdit={(b) => {
            setSelectedBattle(b);
            setCurrentTab('battles');
            setShowNewBattleForm(true);
          }}
          onDelete={handleDeleteBattle}
        />
      )}

      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isDark={isDark}
        t={t}
      />
    </div>
  );
}

export default App;
