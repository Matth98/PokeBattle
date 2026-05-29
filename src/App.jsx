import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
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
import { SettingsPage } from './components/SettingsPage';
import { LanguageProvider } from './hooks/useLanguage';
import { useThemeMode } from './hooks/useThemeMode';
import { useEdgeSwipeBack } from './hooks/useEdgeSwipeBack';

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

const SUB_PAGES = ['playerDetail', 'teamDetail', 'battleDetail', 'pokemonSearch', 'pokemonDetail'];

function AppContent({ isDark, themeMode, setThemeMode }) {
  const {
    user,
    loading: authLoading,
    dbUser,
    dbUserLoading,
    refetchDbUser,
    signInWithGoogle,
    signOut,
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
  const [prevTab, setPrevTab] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Mémoire de scroll par onglet ──
  const scrollMemoryRef = useRef(new Map());
  const shouldRestoreRef = useRef(false);
  const navStack = useRef([]);
  const searchPageRef = useRef(null);

  const TAB_LABELS = { home: 'Accueil', battles: 'Combats', teams: 'Équipes', players: 'Joueurs', pokemonSearch: 'Recherche' };
  const getTabLabel = useCallback((tab) =>
    tab === 'playerDetail' ? (selectedPlayer?.name || 'Joueur') : (TAB_LABELS[tab] || ''),
  [selectedPlayer]);

  // Navigation principale (onglets) — réinitialise la pile
  const setCurrentTab = useCallback((newTab) => {
    setNavDirection(null);
    navStack.current = [];
    setBackLabel('');
    scrollMemoryRef.current.set(currentTab, window.scrollY);
    window.scrollTo({ top: 0, behavior: 'auto' });
    shouldRestoreRef.current = false;
    setPrevTab(null);
    _setCurrentTabState(newTab);
  }, [currentTab]);

  // Navigation en profondeur — empile l'état courant
  const navigateTo = useCallback((newTab, extra = {}) => {
    setNavDirection('push');
    const label = getTabLabel(currentTab);
    navStack.current.push({ tab: currentTab, extra, label });
    setBackLabel(label);
    scrollMemoryRef.current.set(currentTab, window.scrollY);
    shouldRestoreRef.current = false;
    setPrevTab(currentTab);
    _setCurrentTabState(newTab);
  }, [currentTab, getTabLabel]);

  const DETAIL_FALLBACKS = { battleDetail: 'battles', teamDetail: 'teams', playerDetail: 'players', pokemonDetail: 'pokemonSearch', pokemonSearch: 'home' };

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
    scrollMemoryRef.current.set(currentTab, window.scrollY);
    shouldRestoreRef.current = !!prev;
    setPrevTab(navStack.current[navStack.current.length - 1]?.tab ?? null);
    _setCurrentTabState(target.tab);
  }, [currentTab]);

  const handleBack = useCallback(() => {
    if (currentTab === 'playerDetail') setSelectedPlayer(null);
    if (currentTab === 'battleDetail') setSelectedBattle(null);
    if (currentTab === 'teamDetail') setSelectedTeam(null);
    if (currentTab === 'pokemonDetail') {
      setSelectedPokemon(null);
      flushSync(() => navigateBack());
      searchPageRef.current?.focus();
      return;
    }
    navigateBack();
  }, [currentTab, navigateBack]);

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

  const bgPageRef = useRef(null);
  const bgScrollRef = useRef(null);
  const bgOverlayRef = useRef(null);
  const [pokemonDetailOpen, setPokemonDetailOpen] = useState(false);
  const pageRef = useEdgeSwipeBack({
    onBack: handleBack,
    enabled: SUB_PAGES.includes(currentTab) && !settingsOpen && !showNewBattleForm && !showNewTeamForm && !pokemonDetailOpen,
    bgRef: bgPageRef,
    bgOverlayRef: bgOverlayRef,
  });

  // Restaure la position de scroll dans la couche fond quand prevTab change
  useEffect(() => {
    if (bgScrollRef.current && prevTab) {
      bgScrollRef.current.scrollTop = scrollMemoryRef.current.get(prevTab) || 0;
    }
  }, [prevTab]);

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
    syncPlayerPokemon,
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

  // Sync silencieux des rosters lors de la création d'un combat :
  // un User peut ajouter des Pokémon même à un joueur revendiqué par un autre compte.
  // On ne montre pas de toast en cas d'échec (le combat lui-même est déjà enregistré).
  const handleSyncBattlePokemon = async (id, data) => {
    // Utilise PATCH /players/:id/pokemon — pas de vérification de propriétaire,
    // accessible à tout utilisateur authentifié (sync silencieux après un combat).
    const updated = await syncPlayerPokemon(id, data.pokemon);
    if (updated) {
      setPlayers(prev => prev.map(p => p._id === id ? updated : p));
    }
    // Pas de toast.error — l'erreur est ignorée silencieusement
  };

  const handleDeletePlayer = async (id) => {
    const target = players.find((p) => p._id === id);
    const success = await deletePlayer(id);
    if (success) {
      setPlayers((prev) => prev.filter((p) => p._id !== id));
      // Les combats liés ont été supprimés côté serveur — on resynchronise
      setBattles((prev) => prev.filter(
        (b) => String(b.player1?._id ?? b.player1) !== String(id) &&
               String(b.player2?._id ?? b.player2) !== String(id)
      ));
      // Si le joueur supprimé était le joueur lié de l'utilisateur courant
      if (dbUser?.playerId && String(dbUser.playerId) === String(id)) {
        await refetchDbUser().catch(() => {});
      }
      toast.success(`${target?.name || 'Joueur'} supprimé`);
    } else {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDeleteMultiplePlayers = async (ids) => {
    const idSet = new Set(ids.map(String));
    let successCount = 0;
    for (const id of ids) {
      const target = players.find((p) => p._id === id);
      const success = await deletePlayer(id);
      if (success) {
        successCount++;
        setPlayers((prev) => prev.filter((p) => p._id !== id));
        setBattles((prev) => prev.filter(
          (b) => String(b.player1?._id ?? b.player1) !== String(id) &&
                 String(b.player2?._id ?? b.player2) !== String(id)
        ));
      }
      if (!success && target) toast.error(`Échec : ${target.name}`);
    }
    // Si l'un des joueurs supprimés était le joueur lié de l'utilisateur courant
    if (dbUser?.playerId && idSet.has(String(dbUser.playerId))) {
      await refetchDbUser().catch(() => {});
    }
    if (successCount > 0) {
      toast.success(`${successCount} joueur${successCount > 1 ? 's' : ''} supprimé${successCount > 1 ? 's' : ''}`);
    }
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
    const result = await deleteBattle(id);
    if (result === true) {
      setBattles((prev) => prev.filter(b => b._id !== id));
      refreshPlayers();
      toast.success('Combat supprimé');
    } else {
      toast.error(typeof result === 'string' ? result : 'Erreur lors de la suppression');
    }
  };

  const handleDeleteMultipleBattles = async (ids) => {
    let successCount = 0;
    let lastError = null;
    for (const id of ids) {
      const result = await deleteBattle(id);
      if (result === true) {
        setBattles((prev) => prev.filter((b) => b._id !== id));
        successCount++;
      } else {
        lastError = typeof result === 'string' ? result : 'Erreur suppression';
      }
    }
    refreshPlayers();
    if (successCount > 0) {
      toast.success(`${successCount} combat${successCount > 1 ? 's' : ''} supprimé${successCount > 1 ? 's' : ''}`);
    }
    if (successCount < ids.length) {
      toast.error(lastError || `${ids.length - successCount} combat${ids.length - successCount > 1 ? 's' : ''} non supprimé${ids.length - successCount > 1 ? 's' : ''}`);
    }
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
        <img
          src={`${process.env.PUBLIC_URL}/Match-button.svg`}
          alt="Chargement"
          className="w-20 h-20 animate-spin"
          style={{ animationDuration: '1.2s', animationTimingFunction: 'linear' }}
        />
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
      {/* Couche fond : page précédente, visible pendant le swipe-back */}
      {prevTab && SUB_PAGES.includes(currentTab) && (
        <div
          ref={bgPageRef}
          className={isDark ? 'dark' : ''}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9,
            pointerEvents: 'none',
            transform: 'translateX(-25vw)',
            overflow: 'hidden',
          }}
        >
          {/* Conteneur scrollable — preserves scroll position, fixed children stay relative to bgPageRef */}
          <div
            ref={bgScrollRef}
            style={{ position: 'absolute', inset: 0, overflowY: 'auto', pointerEvents: 'none' }}
          >
            {prevTab === 'home' && <Home players={players} battles={battles} teams={teams} isDark={isDark} t={t} setCurrentTab={() => {}} setSelectedBattle={() => {}} onSelectPlayer={() => {}} onSearchPokemon={() => {}} linkedPlayer={players.find(p => p._id === dbUser?.playerId)} onOpenSettings={() => {}} isBackground initialScrollY={scrollMemoryRef.current.get('home') || 0} />}
            {prevTab === 'players' && <Players players={players} t={t} isDark={isDark} onSelectPlayer={() => {}} onAddPlayer={() => {}} onDeletePlayer={() => {}} onDeleteMultiple={() => {}} selectionMode={null} setSelectionMode={() => {}} selectedItems={[]} setSelectedItems={() => {}} showForm={false} setShowForm={() => {}} isBackground initialScrollY={scrollMemoryRef.current.get('players') || 0} />}
            {prevTab === 'battles' && <Battles battles={battles} players={players} teams={teams} t={t} isDark={isDark} onSelectBattle={() => {}} onAddBattle={() => {}} onUpdateBattle={() => {}} onUpdatePlayer={() => {}} onSyncPokemon={() => {}} onDeleteBattle={() => {}} onDeleteMultiple={() => {}} selectionMode={null} setSelectionMode={() => {}} selectedItems={[]} setSelectedItems={() => {}} showForm={false} setShowForm={() => {}} editingBattle={null} clearEditingBattle={() => {}} isBackground initialScrollY={scrollMemoryRef.current.get('battles') || 0} />}
            {prevTab === 'teams' && <Teams teams={teams} players={players} t={t} isDark={isDark} onSelectTeam={() => {}} onAddTeam={() => {}} onUpdateTeam={() => {}} onUpdatePlayer={() => {}} onDeleteTeam={() => {}} onDeleteMultiple={() => {}} selectionMode={null} setSelectionMode={() => {}} selectedItems={[]} setSelectedItems={() => {}} showForm={false} setShowForm={() => {}} editingTeam={null} clearEditingTeam={() => {}} isBackground initialScrollY={scrollMemoryRef.current.get('teams') || 0} />}
            {prevTab === 'playerDetail' && selectedPlayer && <PlayerDetail player={selectedPlayer} teams={teams} battles={battles} t={t} isDark={isDark} initialActiveTab={playerDetailTab} backLabel={backLabel} onBack={() => {}} onUpdate={() => {}} onAddTeam={() => {}} onUpdateTeam={() => {}} onDeleteTeam={() => {}} onSelectTeam={() => {}} />}
            {prevTab === 'teamDetail' && selectedTeam && <TeamDetail team={selectedTeam} t={t} isDark={isDark} backLabel={backLabel} onBack={() => {}} onEdit={() => {}} onUpdate={() => {}} />}
            {prevTab === 'battleDetail' && selectedBattle && <BattleDetail battle={selectedBattle} players={players} t={t} isDark={isDark} backLabel={backLabel} onBack={() => {}} onEdit={() => {}} onDelete={() => {}} />}
            {prevTab === 'pokemonSearch' && <PokemonSearchPage t={t} isDark={isDark} backLabel={backLabel} onBack={() => {}} onSelectPokemon={() => {}} isBackground />}
          </div>
          {/* Overlay d'assombrissement — z-index élevé pour couvrir tout le contenu */}
          <div ref={bgOverlayRef} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 9999, pointerEvents: 'none' }} />
        </div>
      )}

      {/* Couche avant : page courante */}
      {/* zIndex: 10 — contenu regular sous Navigation (z-20) ; overlays dans la couche modale z-30 */}
      <div ref={pageRef} style={{ position: 'relative', zIndex: 10 }}>
      {currentTab === 'home' && (
        <Home
          players={players}
          battles={battles}
          teams={teams}
          isDark={isDark}
          t={t}
          initialScrollY={scrollMemoryRef.current.get('home') || 0}
          setCurrentTab={navigateTo}
          setSelectedBattle={setSelectedBattle}
          onSelectPlayer={(p) => {
            setSelectedPlayer(p);
            setPlayerDetailTab('pokemon');
            navigateTo('playerDetail');
          }}
          onSearchPokemon={() => navigateTo('pokemonSearch')}
          linkedPlayer={players.find(p => p._id === dbUser?.playerId)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {currentTab === 'players' && (
        <Players
          players={players}
          t={t}
          isDark={isDark}
          initialScrollY={scrollMemoryRef.current.get('players') || 0}
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
          onViewingPokemonChange={(isOpen) => setPokemonDetailOpen(isOpen)}
        />
      )}

      {(currentTab === 'teams' || currentTab === 'teamDetail') && (
        <div className={currentTab !== 'teams' ? 'hidden' : ''}>
        <Teams
          teams={teams}
          players={players}
          t={t}
          isDark={isDark}
          initialScrollY={scrollMemoryRef.current.get('teams') || 0}
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
        </div>
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
          onViewingPokemonChange={(isOpen) => setPokemonDetailOpen(isOpen)}
        />
      )}

      {(currentTab === 'battles' || currentTab === 'battleDetail') && (
        <div className={currentTab !== 'battles' ? 'hidden' : ''}>
        <Battles
          battles={battles}
          players={players}
          teams={teams}
          t={t}
          isDark={isDark}
          initialScrollY={scrollMemoryRef.current.get('battles') || 0}
          onSelectBattle={(b) => {
            setSelectedBattle(b);
            navigateTo('battleDetail');
          }}
          onAddBattle={handleAddBattle}
          onUpdateBattle={handleUpdateBattle}
          onUpdatePlayer={handleUpdatePlayer}
          onSyncPokemon={handleSyncBattlePokemon}
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
        </div>
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
          onViewingPokemonChange={(isOpen) => setPokemonDetailOpen(isOpen)}
        />
      )}


      {(currentTab === 'pokemonSearch' || currentTab === 'pokemonDetail') && (
        <div className={currentTab !== 'pokemonSearch' ? 'hidden' : ''}>
          <PokemonSearchPage
            ref={searchPageRef}
            t={t}
            isDark={isDark}
            backLabel={backLabel}
            onBack={navigateBack}
            onSelectPokemon={(pokemon) => {
              setSelectedPokemon(pokemon);
              navigateTo('pokemonDetail');
            }}
          />
        </div>
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
            flushSync(() => navigateBack());
            searchPageRef.current?.focus();
          }}
        />
      )}


      </div>{/* fin couche avant */}

      {/* Navigation hors du transform — position: fixed z-20 non affecté */}
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

      {/* Couche modale — z-30 > Navigation z-20, hors du stacking context de pageRef (z-10) */}
      <div style={{ position: 'relative', zIndex: 30 }}>
        {settingsOpen && (
          <SettingsPage
            user={user}
            linkedPlayer={players.find(p => p._id === dbUser?.playerId)}
            isDark={isDark}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            t={t}
            onClose={() => setSettingsOpen(false)}
            onSignOut={() => { setSettingsOpen(false); signOut(); }}
            onOpenPlayer={() => {
              setSettingsOpen(false);
              const p = players.find(pl => pl._id === dbUser?.playerId);
              if (!p) return;
              setTimeout(() => {
                setSelectedPlayer(p);
                setPlayerDetailTab('pokemon');
                navigateTo('playerDetail');
              }, 350);
            }}
          />
        )}
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
            onSyncPokemon={handleSyncBattlePokemon}
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
      </div>
    </div>
  );
}

function App() {
  const { isDark, themeMode, setThemeMode } = useThemeMode();

  // Synchronise la couleur de la barre de navigation du navigateur avec le thème
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#000000' : '#ffffff');
  }, [isDark]);

  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider isDark={isDark}>
          <AppContent isDark={isDark} themeMode={themeMode} setThemeMode={setThemeMode} />
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
