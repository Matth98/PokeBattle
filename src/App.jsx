import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { theme } from './utils/theme';
import { sortBattlesDesc } from './utils/battles';
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
import ProductTour from './components/ProductTour';
import { useTour } from './hooks/useTour';
import { LanguageProvider } from './hooks/useLanguage';
import { useThemeMode } from './hooks/useThemeMode';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useEdgeSwipeBack } from './hooks/useEdgeSwipeBack';
import { useOfflineSync, OFFLINE_TOTAL } from './hooks/useOfflineSync';


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
  const { permission, isSubscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();

  // Mode hors ligne — persisté, déclenche le pré-téléchargement quand actif
  const [offlineMode, setOfflineModeRaw] = useState(
    () => localStorage.getItem('offline-mode') === 'true'
  );
  const setOfflineMode = (val) => {
    localStorage.setItem('offline-mode', val ? 'true' : 'false');
    setOfflineModeRaw(val);
  };
  const { done: syncDone, total: syncTotal, finished: syncFinished, syncing: syncSyncing, hasNewData: syncHasNewData, reset: syncReset } = useOfflineSync(offlineMode);


  // ── Préchargement des avatars par défaut (après le premier paint) ──
  useEffect(() => {
    ['/avatars/lilie.png','/avatars/cynthia.png','/avatars/erika.png','/avatars/professeur_chen.png',
     '/avatars/pepper.png','/avatars/gladio.png','/avatars/serena.png','/avatars/giovanni.png',
     '/avatars/mashynn.png','/avatars/red.jpg',
     '/pokeball-open.png','/pokemon-faces.png',
    ].forEach((src) => { const img = new Image(); img.src = src; });
  }, []);

  // ── Raccourci clavier thème (desktop) : Cmd/Ctrl + Shift + T ──
  useEffect(() => {
    const MODES = ['light', 'dark', 'system'];
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'k') {
        e.preventDefault();
        setThemeMode(MODES[(MODES.indexOf(themeMode) + 1) % MODES.length]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [themeMode, setThemeMode]);

  const [currentTab, _setCurrentTabState] = useState('home');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedBattle, setSelectedBattle] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPokemon, setSelectedPokemon] = useState(null); // { pokeId, name }
  const selectedTeamRef = useRef(selectedTeam);
  const selectedPlayerRef = useRef(selectedPlayer);
  const selectedBattleRef = useRef(selectedBattle);
  selectedTeamRef.current = selectedTeam;
  selectedPlayerRef.current = selectedPlayer;
  selectedBattleRef.current = selectedBattle;
  const [playerDetailTab, setPlayerDetailTab] = useState('pokemon');
  const [backLabel, setBackLabel] = useState('');
  const [navDirection, setNavDirection] = useState(null); // 'push' | 'pop' | null
  const [prevTab, setPrevTab] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hideNav, setHideNav] = useState(false);
  const { tourActive, startTour, endTour, resetTour } = useTour();
  // Snapshot du top 3 avant une suppression depuis BattleDetail → permet l'animation sur Home
  const homeDeleteSnapshotRef = useRef(null);

  // ── Mémoire de scroll par onglet ──
  const scrollMemoryRef = useRef(new Map());
  const searchMemoryRef = useRef(new Map());
  const shouldRestoreRef = useRef(false);
  const navStack = useRef([]);
  const searchPageRef = useRef(null);

  const TAB_LABELS = { home: 'Accueil', battles: 'Combats', teams: 'Équipes', players: 'Joueurs', pokemonSearch: 'Recherche' };
  const getTabLabel = useCallback((tab) =>
    tab === 'playerDetail' ? (selectedPlayer?.name || 'Joueur') : (TAB_LABELS[tab] || ''),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [selectedPlayer]);

  // Navigation principale (onglets) — réinitialise la pile
  const setCurrentTab = useCallback((newTab) => {
    // Déjà sur cet onglet exact : scroll animé vers le haut, rien d'autre
    if (newTab === currentTab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setNavDirection(null);
    navStack.current = [];
    setBackLabel('');
    scrollMemoryRef.current.set(currentTab, currentTab === 'pokemonSearch' ? (searchPageRef.current?.getScrollTop() ?? 0) : window.scrollY);
    scrollMemoryRef.current.set(newTab, 0); // reset : pas une navigation retour, l'onglet repart de 0
    if (newTab === 'pokemonSearch') searchMemoryRef.current.set('pokemonSearch', '');
    window.scrollTo({ top: 0, behavior: 'auto' });
    shouldRestoreRef.current = false;
    setPrevTab(null);
    // Réinitialiser les filtres des onglets à état persistant (préservés seulement via navigateBack)
    if (newTab === 'battles') { setBattlesFormatFilter('all'); setBattlesCollapsedGroups(new Set()); }
    if (newTab === 'teams') setTeamsFormatFilter('all');
    _setCurrentTabState(newTab);
  }, [currentTab]);

  // Navigation en profondeur — empile l'état courant
  const navigateTo = useCallback((newTab, extra = {}) => {
    setNavDirection('push');
    const label = getTabLabel(currentTab);
    navStack.current.push({ tab: currentTab, extra, label });
    setBackLabel(label);
    scrollMemoryRef.current.set(currentTab, currentTab === 'pokemonSearch' ? (searchPageRef.current?.getScrollTop() ?? 0) : window.scrollY);
    if (currentTab === 'pokemonSearch') {
      searchMemoryRef.current.set('pokemonSearch', searchPageRef.current?.getSearchTerm() ?? searchMemoryRef.current.get('pokemonSearch') ?? '');
      searchMemoryRef.current.set('pokemonSearch-activeTab', searchPageRef.current?.getActiveTab() ?? searchMemoryRef.current.get('pokemonSearch-activeTab') ?? 'pokemon');
      searchMemoryRef.current.set('pokemonSearch-teamFormatFilter', searchPageRef.current?.getTeamFormatFilter() ?? searchMemoryRef.current.get('pokemonSearch-teamFormatFilter') ?? 'all');
    }
    shouldRestoreRef.current = false;
    setPrevTab(currentTab);
    _setCurrentTabState(newTab);
  }, [currentTab, getTabLabel]);

  const DETAIL_FALLBACKS = { battleDetail: 'battles', teamDetail: 'teams', playerDetail: 'players', pokemonDetail: 'pokemonSearch', pokemonSearch: 'home' };

  // Retour — dépile et restaure. Fallback si le stack est vide.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const navigateBack = useCallback(() => {
    setNavDirection('pop');
    let prev = navStack.current.pop();
    // Skip stale detail entries (their selected item was cleared by a prior back action)
    while (prev) {
      const stale =
        (prev.tab === 'teamDetail' && !selectedTeamRef.current) ||
        (prev.tab === 'playerDetail' && !selectedPlayerRef.current) ||
        (prev.tab === 'battleDetail' && !selectedBattleRef.current);
      if (stale) { prev = navStack.current.pop(); }
      else { break; }
    }
    const target = prev ?? { tab: DETAIL_FALLBACKS[currentTab] ?? 'home', extra: {}, label: '' };
    if (target.extra?.playerDetailTab !== undefined) {
      setPlayerDetailTab(target.extra.playerDetailTab);
    }
    // Le nouveau label "retour" est l'entrée en dessous dans le stack (si elle existe)
    const newTop = navStack.current[navStack.current.length - 1];
    setBackLabel(newTop?.label || '');
    scrollMemoryRef.current.set(currentTab, currentTab === 'pokemonSearch' ? (searchPageRef.current?.getScrollTop() ?? 0) : window.scrollY);
    shouldRestoreRef.current = !!prev;
    setPrevTab(navStack.current[navStack.current.length - 1]?.tab ?? null);
    _setCurrentTabState(target.tab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Si un swipe-back vient de se terminer, reset le transform du pageRef maintenant
    // que React a commité le nouveau contenu dedans (plus de flash de l'ancienne page).
    resetFg();
    if (shouldRestoreRef.current) {
      const saved = scrollMemoryRef.current.get(currentTab) || 0;
      if (currentTab === 'pokemonSearch') {
        searchPageRef.current?.setScrollTop(saved);
      } else {
        window.scrollTo({ top: saved, behavior: 'auto' });
      }
      shouldRestoreRef.current = false;
    } else {
      if (currentTab === 'pokemonSearch') {
        searchPageRef.current?.setScrollTop(0);
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  }, [currentTab]); // eslint-disable-line react-hooks/exhaustive-deps -- resetFg est un useCallback(fn,[]) stable, ne peut pas figurer dans le tableau (TDZ : déclaré après ce useLayoutEffect)

  // Filtres Combats/Équipes remontés ici pour que la couche de fond du swipe-back
  // reflète l'état courant sans rendu dupliqué.
  const [battlesFormatFilter, setBattlesFormatFilter] = useState('all');
  const [battlesCollapsedGroups, setBattlesCollapsedGroups] = useState(() => {
    try {
      const saved = sessionStorage.getItem('battlesCollapsedGroups');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [teamsFormatFilter, setTeamsFormatFilter] = useState('all');

  // Persistance sessionStorage déléguée ici (Battles ne l'écrit plus quand l'état est contrôlé)
  useEffect(() => {
    try { sessionStorage.setItem('battlesCollapsedGroups', JSON.stringify([...battlesCollapsedGroups])); } catch {}
  }, [battlesCollapsedGroups]);

  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [showNewBattleForm, setShowNewBattleForm] = useState(false);
  const [showNewTeamForm, setShowNewTeamForm] = useState(false);

  // Mémorise d'où on a ouvert le formulaire d'édition ('detail' = depuis la fiche détail,
  // null = depuis la liste). Permet de revenir à la fiche détail à la fermeture.
  const [battleEditOrigin, setBattleEditOrigin] = useState(null);
  const [teamEditOrigin, setTeamEditOrigin] = useState(null);
  const [teamDetailOrigin, setTeamDetailOrigin] = useState('teams');

  const [selectionMode, setSelectionMode] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

  const bgPageRef = useRef(null);
  const bgScrollRef = useRef(null);
  const bgOverlayRef = useRef(null);
  const { pageRef, resetFg } = useEdgeSwipeBack({
    onBack: handleBack,
    enabled: SUB_PAGES.includes(currentTab) && !settingsOpen && !showNewBattleForm && !showNewTeamForm,
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

  const tourSteps = React.useMemo(() => {
    const myPlayer = players.find(p => p._id === dbUser?.playerId);
    const hasPokemon = (myPlayer?.pokemon?.length ?? 0) > 0;
    const myTeams = myPlayer ? teams.filter(t => t.ownerId === myPlayer._id) : [];
    const hasTeams = myTeams.length > 0;

    return [
    {
      selector: hasPokemon ? '[data-tour="add-pokemon"]' : '[data-tour="pokemon-empty-state"]',
      title: 'Ajoute tes Pokémon',
      description: 'Commence par ajouter les Pokémon que tu utilises en combat.',
      beforeShow: () => {
        if (currentTab !== 'playerDetail') {
          if (myPlayer) {
            setSelectedPlayer(myPlayer);
            setPlayerDetailTab('pokemon');
            _setCurrentTabState('playerDetail');
          }
        } else {
          document.querySelector('[data-tour="tab-pokemon"]')?.click();
        }
      },
    },
    {
      selector: hasTeams ? '[data-tour="add-team"]' : '[data-tour="teams-empty-state"]',
      title: 'Crée ton équipe',
      description: 'Regroupe tes Pokémon en équipes pour organiser tes stratégies.',
      beforeShow: () => {
        document.querySelector('[data-tour="tab-teams"]')?.click();
      },
    },
    {
      selector: '[data-tour="nav-battles"]',
      title: 'Tes combats',
      description: "Retrouve ici l'historique de tous tes combats enregistrés.",
    },
    {
      selector: '[data-tour="nav-battle-btn"]',
      title: 'Lance un combat',
      description: 'Appuie sur la Pokéball pour enregistrer un nouveau combat.',
    },
    {
      selector: '[data-tour="nav-home"]',
      title: "Page d'accueil",
      description: 'Retrouve un résumé de ton activité et tes derniers combats.',
    },
  ]; }, [currentTab, players, teams, dbUser]); // eslint-disable-line react-hooks/exhaustive-deps
  // Sur iOS, Firebase peut fire onAuthStateChanged avec null puis avec l'utilisateur
  // en deux passes distinctes. authSettled ajoute 250ms de stabilisation après que
  // authLoading passe à false avant d'afficher LoginScreen, évitant le flash.
  const [authSettled, setAuthSettled] = useState(false);
  useEffect(() => {
    if (!authLoading) {
      const t = setTimeout(() => setAuthSettled(true), 250);
      return () => clearTimeout(t);
    } else {
      setAuthSettled(false);
    }
  }, [authLoading]);

  // Tri alphabétique stable — utilisé partout (pages + modales)
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' })),
    [players],
  );
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' })),
    [teams],
  );
  const incompleteTeamsCount = useMemo(
    () => teams.filter((team) => (team.pokemon || []).length < (team.format === '2v2' ? 4 : 3)).length,
    [teams],
  );
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
      startTour();
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
      startTour();
    } finally {
      setClaimLoading(false);
    }
  };

  const loadAllData = async () => {
    try {
      const [p, b, t] = await Promise.all([
        fetchPlayers(),
        fetchBattles(),
        fetchTeams()
      ]);
      if (p) setPlayers(p);
      if (b) setBattles(b);
      if (t) setTeams(t);
    } finally {
      setInitialLoading(false);
    }
  };

  const refreshPlayers = async () => {
    const p = await fetchPlayers();
    if (p) {
      setPlayers(p);
      setSelectedPlayer(prev => prev ? (p.find(x => String(x._id) === String(prev._id)) ?? prev) : null);
    }
  };

  // Charge les données seulement une fois l'utilisateur authentifié
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (user) loadAllData(); }, [user]);

  // Synchronisation multi-appareils : polling toutes les 15 s + refresh au retour en premier plan
  const refreshAll = useCallback(async () => {
    const [p, b, t] = await Promise.all([fetchPlayers(), fetchBattles(), fetchTeams()]);
    if (p) setPlayers(p);
    if (b) setBattles(b);
    if (t) setTeams(t);
  }, [fetchPlayers, fetchBattles, fetchTeams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshAll, 15000);
    const onVisible = () => { if (document.visibilityState === 'visible') refreshAll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, refreshAll]);

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
      setSelectedPlayer(prev => prev && String(prev._id) === String(id) ? updated : prev);
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
      toast.success(`Équipe « ${newTeam.name} » ajoutée à ${newTeam.owner}`);
    } else {
      toast.error('Erreur lors de la création');
    }
  };

  const handleUpdateTeam = async (id, data) => {
    const updated = await updateTeam(id, data);
    if (updated) {
      // Merge sent data with API response: fields the backend may strip (isConcept, pokemon[].isConcept)
      // are preserved from data; backend-authoritative fields (timestamps, _id) come from updated.
      const merged = { ...data, ...updated };
      setTeams((prev) => prev.map(t => t._id === id ? merged : t));
      setSelectedTeam(merged);
      toast.success(`Équipe « ${updated.name} » mise à jour`);
    } else {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleUpdateTeamSilent = async (id, data, toastMsg) => {
    const updated = await updateTeam(id, data);
    if (updated) {
      const merged = { ...data, ...updated };
      setTeams((prev) => prev.map(t => t._id === id ? merged : t));
      setSelectedTeam((prev) => prev?._id === id ? merged : prev);
      if (toastMsg) toast.success(toastMsg);
    }
  };

  const handleDeleteTeam = async (id) => {
    const target = teams.find((tt) => tt._id === id);
    const success = await deleteTeam(id);
    if (success) {
      setTeams((prev) => prev.filter(t => t._id !== id));
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
      setBattles((prev) => [...prev, newBattle]);
      refreshPlayers();
      toast.success('Combat enregistré');
    } else {
      toast.error('Erreur lors de la création');
    }
  };

  const handleUpdateBattle = async (id, data) => {
    const updated = await updateBattle(id, data);
    if (updated) {
      setBattles((prev) => prev.map(b => b._id === id ? updated : b));
      setSelectedBattle(updated);
      refreshPlayers();
      toast.success('Combat mis à jour');
    } else {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteBattle = async (id) => {
    // Si on supprime depuis BattleDetail avec Home en fond, capturer le top 3 avant suppression
    if (currentTab === 'battleDetail') {
      homeDeleteSnapshotRef.current = sortBattlesDesc(battles).slice(0, 3);
    }
    const result = await deleteBattle(id);
    if (result === true) {
      setBattles((prev) => prev.filter(b => b._id !== id));
      refreshPlayers();
      toast.success('Combat supprimé');
    } else {
      homeDeleteSnapshotRef.current = null;
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: isDark ? '#09090b' : '#ffffff' }}>
        <img src={`${process.env.PUBLIC_URL}/Match-button.svg`} alt="" style={{ width: '5rem', height: '5rem', animation: 'spin 1.2s linear infinite' }} />
      </div>
    );
  }

  if (!user && (!authSettled || authLoading)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: isDark ? '#09090b' : '#ffffff' }}>
        <img src={`${process.env.PUBLIC_URL}/Match-button.svg`} alt="" style={{ width: '5rem', height: '5rem', animation: 'spin 1.2s linear infinite' }} />
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: isDark ? '#09090b' : '#ffffff' }}>
        <img src={`${process.env.PUBLIC_URL}/Match-button.svg`} alt="" style={{ width: '5rem', height: '5rem', animation: 'spin 1.2s linear infinite' }} />
      </div>
    );
  }

  // Première connexion : l'utilisateur n'est pas encore lié à une fiche joueur
  if (!dbUserLoading && dbUser && dbUser.playerId === null) {
    return (
      <ClaimPlayerScreen
        availablePlayers={sortedPlayers.filter((p) => !p.userId)}
        onClaim={handleClaimPlayer}
        onCreatePlayer={handleCreatePlayer}
        loading={claimLoading}
      />
    );
  }

  return (
    <div className={isDark ? 'dark' : ''} style={{ overflowX: 'clip' }}>
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
            opacity: 0,
            visibility: 'hidden',
          }}
        >
          {/* Conteneur scrollable — preserves scroll position, fixed children stay relative to bgPageRef */}
          <div
            ref={bgScrollRef}
            style={{ position: 'absolute', inset: 0, overflowY: 'auto', pointerEvents: 'none' }}
          >
            {prevTab === 'home' && <Home players={sortedPlayers} battles={battles} teams={sortedTeams} isDark={isDark} t={t} setCurrentTab={() => {}} setSelectedBattle={() => {}} onSelectPlayer={() => {}} onSearchPokemon={() => {}} linkedPlayer={players.find(p => p._id === dbUser?.playerId)} onOpenSettings={() => {}} isBackground initialScrollY={scrollMemoryRef.current.get('home') || 0} />}
            {prevTab === 'players' && <Players players={sortedPlayers} t={t} isDark={isDark} onSelectPlayer={() => {}} onAddPlayer={() => {}} onDeletePlayer={() => {}} onDeleteMultiple={() => {}} selectionMode={null} setSelectionMode={() => {}} selectedItems={[]} setSelectedItems={() => {}} showForm={false} setShowForm={() => {}} isBackground initialScrollY={scrollMemoryRef.current.get('players') || 0} />}
            {prevTab === 'battles' && <Battles battles={battles} players={sortedPlayers} teams={sortedTeams} t={t} isDark={isDark} onSelectBattle={() => {}} onAddBattle={() => {}} onUpdateBattle={() => {}} onUpdatePlayer={() => {}} onSyncPokemon={() => {}} onDeleteBattle={() => {}} onDeleteMultiple={() => {}} selectionMode={null} setSelectionMode={() => {}} selectedItems={[]} setSelectedItems={() => {}} showForm={false} setShowForm={() => {}} editingBattle={null} clearEditingBattle={() => {}} isBackground initialScrollY={scrollMemoryRef.current.get('battles') || 0} formatFilter={battlesFormatFilter} collapsedGroups={battlesCollapsedGroups} />}
            {prevTab === 'teams' && <Teams teams={sortedTeams} players={sortedPlayers} t={t} isDark={isDark} onSelectTeam={() => {}} onAddTeam={() => {}} onUpdateTeam={() => {}} onUpdatePlayer={() => {}} onDeleteTeam={() => {}} onDeleteMultiple={() => {}} selectionMode={null} setSelectionMode={() => {}} selectedItems={[]} setSelectedItems={() => {}} showForm={false} setShowForm={() => {}} editingTeam={null} clearEditingTeam={() => {}} isBackground initialScrollY={scrollMemoryRef.current.get('teams') || 0} formatFilter={teamsFormatFilter} />}
            {prevTab === 'playerDetail' && selectedPlayer && <PlayerDetail player={selectedPlayer} teams={sortedTeams} battles={battles} t={t} isDark={isDark} initialActiveTab={playerDetailTab} backLabel={backLabel} onBack={() => {}} onUpdate={() => {}} onAddTeam={() => {}} onUpdateTeam={() => {}} onDeleteTeam={() => {}} onSelectTeam={() => {}} initialScrollY={scrollMemoryRef.current.get('playerDetail') || 0} initialPokemonSearch={searchMemoryRef.current.get('playerDetail-pokemon') || ''} initialTeamsSearch={searchMemoryRef.current.get('playerDetail-teams') || ''} isBackground />}
            {prevTab === 'teamDetail' && selectedTeam && <TeamDetail team={selectedTeam} t={t} isDark={isDark} backLabel={backLabel} onBack={() => {}} onEdit={() => {}} onUpdate={() => {}} initialScrollY={scrollMemoryRef.current.get('teamDetail') || 0} isBackground />}
            {prevTab === 'battleDetail' && selectedBattle && <BattleDetail battle={selectedBattle} players={sortedPlayers} teams={sortedTeams} t={t} isDark={isDark} backLabel={backLabel} onBack={() => {}} onEdit={() => {}} onDelete={() => {}} onAddTeam={() => {}} initialScrollY={scrollMemoryRef.current.get('battleDetail') || 0} isBackground />}
            {prevTab === 'pokemonSearch' && <PokemonSearchPage t={t} isDark={isDark} backLabel={backLabel} onBack={() => {}} onSelectPokemon={() => {}} teams={sortedTeams} players={sortedPlayers} isBackground initialSearchTerm={searchMemoryRef.current.get('pokemonSearch') || ''} initialActiveTab={searchMemoryRef.current.get('pokemonSearch-activeTab') || 'pokemon'} initialTeamFormatFilter={searchMemoryRef.current.get('pokemonSearch-teamFormatFilter') || 'all'} initialScrollY={scrollMemoryRef.current.get('pokemonSearch') || 0} />}
          </div>
          {/* Overlay d'assombrissement — z-index élevé pour couvrir tout le contenu */}
          <div ref={bgOverlayRef} style={{ position: 'absolute', inset: 0, background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.18)', zIndex: 9999, pointerEvents: 'none' }} />
        </div>
      )}

      {/* Couche avant : page courante */}
      {/* zIndex: 10 — contenu regular sous Navigation (z-20) ; overlays dans la couche modale z-30 */}
      <div ref={pageRef} style={{ position: 'relative', zIndex: 10 }}>
      {currentTab === 'home' && (
        <Home
          players={sortedPlayers}
          battles={battles}
          teams={sortedTeams}
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
          onRefresh={refreshAll}
          refreshEnabled={!settingsOpen}
          deleteAnimSnapshot={homeDeleteSnapshotRef.current}
          onDeleteAnimConsumed={() => { homeDeleteSnapshotRef.current = null; }}
          onViewPokemon={(p) => { setSelectedPokemon(p); navigateTo('pokemonDetail'); }}
          pushPermission={permission}
          pushIsSubscribed={isSubscribed}
          onPushSubscribe={subscribe}
          offlineMode={offlineMode}
          syncDone={syncDone}
          syncTotal={syncTotal}
          syncFinished={syncFinished}
          syncHasNewData={syncHasNewData}
          onOpenOfflineSettings={() => setSettingsOpen(true)}
        />
      )}

      {currentTab === 'players' && (
        <Players
          players={sortedPlayers}
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
          onSelectionModeChange={(active) => setHideNav(active)}
        />
      )}

      {currentTab === 'playerDetail' && (
        <PlayerDetail
          player={selectedPlayer}
          teams={sortedTeams}
          battles={battles}
          t={t}
          isDark={isDark}
          initialActiveTab={playerDetailTab}
          backLabel={backLabel}
          initialScrollY={navDirection === 'pop' ? scrollMemoryRef.current.get('playerDetail') || 0 : 0}
          initialPokemonSearch={navDirection === 'pop' ? searchMemoryRef.current.get('playerDetail-pokemon') || '' : ''}
          onPokemonSearchChange={(v) => searchMemoryRef.current.set('playerDetail-pokemon', v)}
          initialTeamsSearch={navDirection === 'pop' ? searchMemoryRef.current.get('playerDetail-teams') || '' : ''}
          onTeamsSearchChange={(v) => searchMemoryRef.current.set('playerDetail-teams', v)}
          onBack={() => {
            setSelectedPlayer(null);
            navigateBack();
          }}
          onUpdate={handleUpdatePlayer}
          onAddTeam={handleAddTeam}
          onUpdateTeam={handleUpdateTeam}
          onUpdateTeamSilent={handleUpdateTeamSilent}
          onDeleteTeam={handleDeleteTeam}
          onSelectTeam={(team, activeTab) => {
            setSelectedTeam(team);
            setTeamDetailOrigin('players');
            navigateTo('teamDetail', { playerDetailTab: activeTab });
          }}
          onActiveTabChange={(tab) => setPlayerDetailTab(tab)}
          onViewPokemon={(p) => { setSelectedPokemon(p); navigateTo('pokemonDetail'); }}
          onSelectionModeChange={(active) => setHideNav(active)}
        />
      )}

      {(currentTab === 'teams' || currentTab === 'teamDetail') && (
        <div className={currentTab !== 'teams' ? 'hidden' : ''}>
        <Teams
          teams={sortedTeams}
          players={sortedPlayers}
          t={t}
          isDark={isDark}
          initialScrollY={scrollMemoryRef.current.get('teams') || 0}
          isActive={currentTab === 'teams'}
          formatFilter={teamsFormatFilter}
          setFormatFilter={setTeamsFormatFilter}
          onSelectTeam={(team) => {
            setSelectedTeam(team);
            setTeamDetailOrigin('teams');
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
          showForm={currentTab === 'teams' ? showNewTeamForm : false}
          setShowForm={setShowTeamForm}
          onSelectionModeChange={(active) => setHideNav(active)}
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
          players={sortedPlayers}
          teams={sortedTeams}
          onAddTeam={handleAddTeam}
          onUpdatePlayer={handleUpdatePlayer}
          initialScrollY={navDirection === 'pop' ? scrollMemoryRef.current.get('teamDetail') || 0 : 0}
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
          onViewPokemon={(p) => { setSelectedPokemon(p); navigateTo('pokemonDetail'); }}
        />
      )}

      {(currentTab === 'battles' || currentTab === 'battleDetail') && (
        <div className={currentTab !== 'battles' ? 'hidden' : ''}>
        <Battles
          battles={battles}
          players={sortedPlayers}
          teams={sortedTeams}
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
          showForm={currentTab === 'battles' ? showNewBattleForm : false}
          setShowForm={setShowBattleForm}
          onSelectionModeChange={(active) => setHideNav(active)}
          editingBattle={selectedBattle}
          clearEditingBattle={() => {
            // Si on revient sur la fiche détail, on garde selectedBattle pour que la page se rende
            if (battleEditOrigin !== 'detail') {
              setSelectedBattle(null);
            }
          }}
          isActive={currentTab === 'battles'}
          formatFilter={battlesFormatFilter}
          setFormatFilter={setBattlesFormatFilter}
          collapsedGroups={battlesCollapsedGroups}
          setCollapsedGroups={setBattlesCollapsedGroups}
        />
        </div>
      )}

      {currentTab === 'battleDetail' && (
        <BattleDetail
          battle={selectedBattle}
          players={sortedPlayers}
          teams={sortedTeams}
          t={t}
          isDark={isDark}
          backLabel={backLabel}
          initialScrollY={navDirection === 'pop' ? scrollMemoryRef.current.get('battleDetail') || 0 : 0}
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
          onAddTeam={handleAddTeam}
          onUpdatePlayer={handleUpdatePlayer}
          onViewPokemon={(p) => { setSelectedPokemon(p); navigateTo('pokemonDetail'); }}
          onPlayerClick={(p) => { setSelectedPlayer(p); navigateTo('playerDetail'); }}
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
            initialSearchTerm={navDirection === 'pop' ? searchMemoryRef.current.get('pokemonSearch') || '' : ''}
            initialActiveTab={navDirection === 'pop' ? searchMemoryRef.current.get('pokemonSearch-activeTab') || 'pokemon' : 'pokemon'}
            initialTeamFormatFilter={navDirection === 'pop' ? searchMemoryRef.current.get('pokemonSearch-teamFormatFilter') || 'all' : 'all'}
            onSearchChange={(v) => searchMemoryRef.current.set('pokemonSearch', v)}
            onActiveTabChange={(tab) => searchMemoryRef.current.set('pokemonSearch-activeTab', tab)}
            onTeamFormatFilterChange={(f) => searchMemoryRef.current.set('pokemonSearch-teamFormatFilter', f)}
            onSelectPokemon={(pokemon) => {
              setSelectedPokemon(pokemon);
              navigateTo('pokemonDetail');
            }}
            teams={sortedTeams}
            players={sortedPlayers}
            onSelectTeam={(team) => {
              setSelectedTeam(team);
              setTeamDetailOrigin('pokemonSearch');
              navigateTo('teamDetail');
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
          myPlayer={players.find(p => p._id === dbUser?.playerId) || null}
          teams={teams}
          onUpdatePlayer={handleUpdatePlayer}
          onUpdateTeam={handleUpdateTeam}
          onUpdateTeamSilent={handleUpdateTeamSilent}
        />
      )}


      </div>{/* fin couche avant */}

      {/* Navigation hors du transform — position: fixed z-20 non affecté */}
        <Navigation
          hidden={hideNav || currentTab === 'pokemonDetail' || currentTab === 'pokemonSearch' || currentTab === 'teamDetail' || currentTab === 'battleDetail'}
          animated={hideNav}
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          isDark={isDark}
          t={t}
          badgeCounts={{ teams: incompleteTeamsCount }}
          onCreateBattle={() => {
            setBattleEditOrigin(null);
            setShowNewBattleForm(true);
          }}
          onOpenPokedex={() => {
            // Depuis une équipe ouverte via la recherche → retour arrière = retrouver saisie + onglet
            if (currentTab === 'teamDetail' && teamDetailOrigin === 'pokemonSearch') {
              setSelectedTeam(null);
              navigateBack();
            } else {
              navigateTo('pokemonSearch');
            }
          }}
          teamDetailOrigin={teamDetailOrigin}
        />

      {/* Couche modale — z-30 > Navigation z-20, hors du stacking context de pageRef (z-10) */}
      <div style={{ position: 'relative', zIndex: 30 }}>
        {settingsOpen && (
          <SettingsPage
            user={user}
            dbUser={dbUser}
            linkedPlayer={players.find(p => p._id === dbUser?.playerId)}
            isDark={isDark}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            t={t}
            pushPermission={permission}
            pushIsSubscribed={isSubscribed}
            pushLoading={pushLoading}
            onPushSubscribe={subscribe}
            onPushUnsubscribe={unsubscribe}
            onClose={() => setSettingsOpen(false)}
            onSignOut={() => { setSettingsOpen(false); signOut(); }}
            onRestartTour={() => { resetTour(); startTour(); }}
            offlineMode={offlineMode}
            onOfflineModeToggle={setOfflineMode}
            syncDone={syncDone}
            syncTotal={syncTotal}
            syncFinished={syncFinished}
            onSyncReset={syncReset}
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
            teams={sortedTeams}
            players={sortedPlayers}
            t={t}
            isDark={isDark}
            onSelectTeam={(team) => {
              setSelectedTeam(team);
              setTeamDetailOrigin('teams');
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
            players={sortedPlayers}
            teams={sortedTeams}
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

      {tourActive && (
        <ProductTour
          steps={tourSteps}
          onDone={endTour}
          onSkip={endTour}
          isDark={isDark}
        />
      )}
    </div>
  );
}

const DEFAULT_AVATAR_URLS = [
  '/avatars/lilie.png',
  '/avatars/cynthia.png',
  '/avatars/erika.png',
  '/avatars/professeur_chen.png',
  '/avatars/pepper.png',
  '/avatars/gladio.png',
  '/avatars/serena.png',
  '/avatars/giovanni.png',
  '/avatars/mashynn.png',
  '/avatars/red.jpg',
  '/pokeball-open.png',
  '/pokemon-faces.png',
];

function App() {
  const { isDark, themeMode, setThemeMode } = useThemeMode();

  useLayoutEffect(() => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.style.opacity = '0';
      splash.style.pointerEvents = 'none';
      setTimeout(() => splash.remove(), 200);
    }
  }, []);

  useEffect(() => {
    DEFAULT_AVATAR_URLS.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Synchronise la couleur de la barre de navigation du navigateur avec le thème.
  // En mode "système" les deux <meta theme-color media="..."> de l'HTML gèrent déjà
  // la couleur avant que React s'initialise — on ne touche qu'en mode forcé pour
  // écraser la media query avec une valeur explicite.
  useEffect(() => {
    if (themeMode === 'system') return; // laissé aux media queries CSS dans index.html
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute('content', isDark ? '#000000' : '#ffffff');
    });
  }, [isDark, themeMode]);

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
