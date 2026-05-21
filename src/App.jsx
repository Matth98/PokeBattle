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
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LoginScreen } from './components/LoginScreen';
import { ClaimPlayerScreen } from './components/ClaimPlayerScreen';
import { PokemonSearchPage } from './components/PokemonSearchPage';
import { PokemonDetailPage } from './components/PokemonDetailPage';
import { PageTransition } from './components/PageTransition';
import { useSwipeBack } from './hooks/useSwipeBack';

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
  const {
    user,
    loading: authLoading,
    dbUser,
    dbUserLoading,
    refetchDbUser,
    signInWithGoogle,
  } = useAuth();
  const toast = useToast();
  const t = isDark ? theme.dark : theme.light;

  const [currentTab, _setCurrentTabState] = useState('home');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedBattle, setSelectedBattle] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPokemon, setSelectedPokemon] = useState(null); // { pokeId, name }
  const [playerDetailTab, setPlayerDetailTab] = useState('pokemon');
  const [backLabel, setBackLabel] = useState('');
  const [navDirection, setNavDirection] = useState(null); // 'push' | 'pop' | null

  // ── Mémoire de scroll par onglet ──
  const scrollMemoryRef = useRef(new Map());
  const shouldRestoreRef = useRef(false);
  // ── Pile de navigation pour le bouton précédent ──
  // Chaque entrée : { tab, extra?, label }
  const navStack = useRef([]);
  const pageRef = useRef(null);

  const TAB_LABELS = { home: 'Accueil', battles: 'Combats', teams: 'Équipes', players: 'Joueurs', pokemonSearch: 'Recherche' };
  const getTabLabel = useCallback((tab) =>
    tab === 'playerDetail' ? (selectedPlayer?.name || 'Joueur') : (TAB_LABELS[tab] || ''),
  [selectedPlayer]);

  // Navigation principale (onglets) — réinitialise la pile
  const setCurrentTab = useCallback((newTab) => {
    setNavDirection(null);
    navStack.current = [];
    setBackLabel('');
    scrollMemoryRef.current.set(currentTab, pageRef.current?.scrollTop ?? 0);
    shouldRestoreRef.current = false;
    _setCurrentTabState(newTab);
  }, [currentTab]);

  // Navigation en profondeur — empile l'état courant
  const navigateTo = useCallback((newTab, extra = {}) => {
    setNavDirection('push');
    const label = getTabLabel(currentTab);
    navStack.current.push({ tab: currentTab, extra, label });
    setBackLabel(label);
    scrollMemoryRef.current.set(currentTab, pageRef.current?.scrollTop ?? 0);
    shouldRestoreRef.current = false;
    _setCurrentTabState(newTab);
  }, [currentTab, getTabLabel]);

  const DETAIL_FALLBACKS = { battleDetail: 'battles', teamDetail: 'teams', playerDetail: 'players', pokemonDetail: 'pokemonSearch', pokemonSearch: 'home' };

  const LEVEL2_TABS = ['playerDetail', 'teamDetail', 'battleDetail', 'pokemonSearch', 'pokemonDetail'];
  const isLevel2Tab = (tab) => LEVEL2_TABS.includes(tab);

  // Retour — dépile et restaure. Fallback si le stack est vide.
  const navigateBack = useCallback(() => {
    setNavDirection('pop');
    const prev = navStack.current.pop();
    const target = prev ?? { tab: DETAIL_FALLBACKS[currentTab] ?? 'home', extra: {}, label: '' };
    if (target.extra?.playerDetailTab !== undefined) {
      setPlayerDetailTab(target.extra.playerDetailTab);
    }
    // Le nouveau label "retour" est l'entrée en dessous dans le stack (si elle existe)
    const newTop = navStack.current[navStack.current.length - 1];
    setBackLabel(newTop?.label || '');
    scrollMemoryRef.current.set(currentTab, pageRef.current?.scrollTop ?? 0);
    shouldRestoreRef.current = !!prev;
    _setCurrentTabState(target.tab);
  }, [currentTab]);

  const { swipeHandlers } = useSwipeBack({
    onBack: navigateBack,
    enabled: isLevel2Tab(currentTab),
    elementRef: pageRef,
  });

  useLayoutEffect(() => {
    if (shouldRestoreRef.current) {
      const saved = scrollMemoryRef.current.get(currentTab) || 0;
      if (pageRef.current) pageRef.current.scrollTop = saved;
      shouldRestoreRef.current = false;
    } else {
      if (pageRef.current) pageRef.current.scrollTop = 0;
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
    if (!val) setBattleEditOrigin(null);
  };
  const setShowTeamForm = (val) => {
    setShowNewTeamForm(val);
    if (!val) setTeamEditOrigin(null);
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [claimLoading, setClaimLoading] = useState(false);

  const handleClaimPlayer = async (playerId) => {
    setClaimLoading(true);
    try {
      const token = await user.getIdToken();
      const res   = await fetch('https://pokebattle-backend.vercel.app/api/users/me/claim-player', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ playerId }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors de la liaison');
        return;
      }
      await refetchDbUser().catch(() => toast.error('Impossible de synchroniser le profil'));
    } finally {
      setClaimLoading(false);
    }
  };

  const handleCreatePlayer = async ({ name, avatar }) => {
    setClaimLoading(true);
    try {
      const token = await user.getIdToken();
      const res   = await fetch('https://pokebattle-backend.vercel.app/api/users/me/create-player', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ name, avatar }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors de la création');
        return;
      }
      const { player } = await res.json();
      setPlayers((prev) => [...prev, player]);
      await refetchDbUser().catch(() => toast.error('Impossible de synchroniser le profil'));
    } finally {
      setClaimLoading(false);
    }
  };

  const loadAllData = async () => {
    const [p, b, t] = await Promise.all([
      fetchPlayers(),
      fetchBattles(),
      fetchTeams()
    ]);
    if (p) setPlayers(p);
    if (b) setBattles(b);
    if (t) setTeams(t);
    setInitialLoading(false);
  };

  const refreshPlayers = async () => {
    const p = await fetchPlayers();
    if (p) setPlayers(p);
  };

  // Charge les données seulement une fois l'utilisateur authentifié
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (user) loadAllData(); }, [user]);

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
      refreshPlayers();
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
      refreshPlayers();
      toast.success('Combat mis à jour');
    } else {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteBattle = async (id) => {
    const success = await deleteBattle(id);
    if (success) {
      setBattles(battles.filter(b => b._id !== id));
      refreshPlayers();
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
    refreshPlayers();
    toast.success(`${ids.length} combat${ids.length > 1 ? 's' : ''} supprimé${ids.length > 1 ? 's' : ''}`);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onSignInWithGoogle={signInWithGoogle}
      />
    );
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <p className="text-xl font-black text-gray-900">Chargement...</p>
      </div>
    );
  }

  // Première connexion : l'utilisateur n'est pas encore lié à une fiche joueur
  if (!dbUserLoading && dbUser && dbUser.playerId === null) {
    return (
      <ClaimPlayerScreen
        availablePlayers={players.filter((p) => !p.userId)}
        onClaim={handleClaimPlayer}
        onCreatePlayer={handleCreatePlayer}
        loading={claimLoading}
      />
    );
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <PageTransition
        pageKey={currentTab}
        direction={navDirection}
        backgroundColor={isDark ? '#000000' : '#ffffff'}
      >
        <div
          ref={pageRef}
          {...swipeHandlers}
          style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}
        >
          {currentTab === 'home' && (
            <Home
              players={players}
              battles={battles}
              teams={teams}
              isDark={isDark}
              setIsDark={setIsDark}
              t={t}
              setCurrentTab={setCurrentTab}
              onSelectBattle={(b) => {
                setSelectedBattle(b);
                navigateTo('battleDetail');
              }}
              onSelectPlayer={(p) => {
                setSelectedPlayer(p);
                setPlayerDetailTab('pokemon');
                navigateTo('playerDetail');
              }}
              onSearchPokemon={() => navigateTo('pokemonSearch')}
            />
          )}

          {currentTab === 'players' && (
            <Players
              players={players}
              t={t}
              isDark={isDark}
              onSelectPlayer={(p) => {
                setSelectedPlayer(p);
                setPlayerDetailTab('pokemon');
                navigateTo('playerDetail');
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

          {currentTab === 'teams' && (
            <Teams
              teams={teams}
              players={players}
              t={t}
              isDark={isDark}
              onSelectTeam={(team) => {
                setSelectedTeam(team);
                navigateTo('teamDetail');
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

          {currentTab === 'battles' && (
            <Battles
              battles={battles}
              players={players}
              teams={teams}
              t={t}
              isDark={isDark}
              onSelectBattle={(b) => {
                setSelectedBattle(b);
                navigateTo('battleDetail');
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

          {currentTab === 'playerDetail' && (
            <PlayerDetail
              player={selectedPlayer}
              teams={teams}
              battles={battles}
              t={t}
              isDark={isDark}
              initialActiveTab={playerDetailTab}
              backLabel={backLabel}
              onBack={() => {
                setSelectedPlayer(null);
                navigateBack();
              }}
              onUpdate={handleUpdatePlayer}
              onAddTeam={handleAddTeam}
              onUpdateTeam={handleUpdateTeam}
              onDeleteTeam={handleDeleteTeam}
              onSelectTeam={(team, activeTab) => {
                setSelectedTeam(team);
                navigateTo('teamDetail', { playerDetailTab: activeTab });
              }}
            />
          )}
          {currentTab === 'teamDetail' && (
            <TeamDetail
              team={selectedTeam}
              t={t}
              isDark={isDark}
              backLabel={backLabel}
              onBack={() => {
                setSelectedTeam(null);
                navigateBack();
              }}
              onEdit={(team) => {
                setSelectedTeam(team);
                setTeamEditOrigin('detail');
                setShowNewTeamForm(true);
              }}
              onUpdate={handleUpdateTeam}
            />
          )}
          {currentTab === 'battleDetail' && (
            <BattleDetail
              battle={selectedBattle}
              players={players}
              t={t}
              isDark={isDark}
              backLabel={backLabel}
              onBack={() => {
                setSelectedBattle(null);
                navigateBack();
              }}
              onEdit={(b) => {
                setSelectedBattle(b);
                setBattleEditOrigin('detail');
                setShowNewBattleForm(true);
              }}
              onDelete={handleDeleteBattle}
            />
          )}
          {currentTab === 'pokemonSearch' && (
            <PokemonSearchPage
              t={t}
              isDark={isDark}
              backLabel={backLabel}
              onBack={navigateBack}
              onSelectPokemon={(pokemon) => {
                setSelectedPokemon(pokemon);
                navigateTo('pokemonDetail');
              }}
            />
          )}
          {currentTab === 'pokemonDetail' && (
            <PokemonDetailPage
              pokeId={selectedPokemon?.pokeId}
              pokeName={selectedPokemon?.name}
              t={t}
              isDark={isDark}
              backLabel={backLabel}
              onBack={() => {
                setSelectedPokemon(null);
                navigateBack();
              }}
            />
          )}
        </div>
      </PageTransition>

      {currentTab !== 'teams' && showNewTeamForm && (
        <Teams
          teams={teams}
          players={players}
          t={t}
          isDark={isDark}
          onSelectTeam={(team) => {
            setSelectedTeam(team);
            navigateTo('teamDetail');
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
          editingTeam={teamEditOrigin === 'detail' ? selectedTeam : null}
          renderPage={false}
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
          editingBattle={battleEditOrigin === 'detail' ? selectedBattle : null}
          renderPage={false}
        />
      )}


      {!['pokemonSearch', 'pokemonDetail'].includes(currentTab) && (
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
      )}
    </div>
  );
}

function App() {
  const [isDark, setIsDark] = useState(false);

  // Synchronise la couleur de la barre de navigation du navigateur avec le thème
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#000000' : '#ffffff');
  }, [isDark]);

  return (
    <AuthProvider>
      <ToastProvider isDark={isDark}>
        <AppContent isDark={isDark} setIsDark={setIsDark} />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
