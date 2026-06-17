import React, { useState, useEffect, useLayoutEffect, useCallback, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronDown, Plus, Check, CheckSquare, Shield, Loader2, Target } from 'lucide-react';
import { PlayerAvatar } from './PlayerAvatar';
import { usePokemon } from '../hooks/usePokemon';
import { useAnimatedClose } from '../hooks/useAnimatedClose';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { PokemonPicker } from './PokemonPicker';
import { SwipeableRow } from './SwipeableRow';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { AlertModal } from './AlertModal';

const emptyTeamData = () => ({ name: '', owner: null, format: '1v1', pokemon: [] });

function PokeBallIcon({ colorBlack = 'black', id }) {
  const clipId = `pb-${id}`;
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g clipPath={`url(#${clipId})`}>
        <path d="M5.99994 1.19995C3.55794 1.19995 1.54194 3.03595 1.24194 5.39995H3.68994C3.95394 4.36795 4.88994 3.59995 5.99994 3.59995C7.10994 3.59995 8.04594 4.36795 8.31594 5.39995H10.7579C10.4639 3.03595 8.44794 1.19995 5.99994 1.19995Z" fill={colorBlack}/>
        <path d="M6 0C2.694 0 0 2.694 0 6C0 9.306 2.694 12 6 12C9.306 12 12 9.306 12 6C12 2.694 9.312 0 6 0ZM6 1.2C8.448 1.2 10.464 3.036 10.758 5.4H8.316C8.046 4.368 7.116 3.6 6 3.6C4.884 3.6 3.954 4.368 3.69 5.4H1.242C1.542 3.036 3.558 1.2 6 1.2Z" fill={colorBlack}/>
        <path d="M10.7579 5.39995H8.31594C8.04594 4.36795 7.11594 3.59995 5.99994 3.59995C4.88394 3.59995 3.95394 4.36795 3.68994 5.39995H1.24194C1.54194 3.03595 3.55794 1.19995 5.99994 1.19995C8.44194 1.19995 10.4639 3.03595 10.7579 5.39995Z" fill="#FF1C1C"/>
        <path d="M10.7579 6.59998C10.4639 8.96398 8.44794 10.8 5.99994 10.8C3.55194 10.8 1.54194 8.96398 1.24194 6.59998H3.68994C3.95394 7.63198 4.88994 8.39998 5.99994 8.39998C7.10994 8.39998 8.04594 7.63198 8.31594 6.59998H10.7579Z" fill="white"/>
        <path d="M6.00005 7.20005C6.66279 7.20005 7.20005 6.66279 7.20005 6.00005C7.20005 5.33731 6.66279 4.80005 6.00005 4.80005C5.33731 4.80005 4.80005 5.33731 4.80005 6.00005C4.80005 6.66279 5.33731 7.20005 6.00005 7.20005Z" fill="white"/>
      </g>
      <defs>
        <clipPath id={clipId}><rect width="12" height="12" fill="white"/></clipPath>
      </defs>
    </svg>
  );
}

export const Teams = ({
  teams,
  players,
  t,
  isDark,
  onSelectTeam,
  onAddTeam,
  onUpdateTeam,
  onUpdatePlayer,
  onDeleteTeam,
  onDeleteMultiple,
  selectionMode,
  setSelectionMode,
  selectedItems,
  setSelectedItems,
  showForm,
  setShowForm,
  editingTeam,
  clearEditingTeam,
  renderPage = true,
  isBackground = false,
  initialScrollY = 0,
  isActive = true,
  formatFilter = 'all',
  setFormatFilter = () => {},
  onSelectionModeChange = null,
}) => {
  const tr = useTranslation();
  const { dbUser, isSuperAdmin } = useAuth();
  // Équipes appartenant à l'utilisateur courant
  const myTeams = isSuperAdmin
    ? teams
    : teams.filter((team) =>
        dbUser?._id && String(team.userId) === String(dbUser._id)
      );
  const canEditTeam = (team) =>
    isSuperAdmin ||
    (dbUser?._id && team.userId && String(team.userId) === String(dbUser._id));

  // formatFilter est piloté depuis App.jsx pour que la couche de fond (swipe-back)
  // reflète toujours l'état courant. Le prop a une valeur par défaut 'all'.
  const uid = useId();

  const [newTeamData, setNewTeamData] = useState(emptyTeamData());
  const [teamFormErrors, setTeamFormErrors] = useState({ name: false, owner: false, pokemon: false });
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);
  const [pickingPokemon, setPickingPokemon] = useState(false);
  const [pendingConceptTeam, setPendingConceptTeam] = useState(null);
  const { getPokemonImageUrl } = usePokemon();

  const isEditing = Boolean(editingTeam && showForm);
  // Prevent background scroll on iOS when the form is open
  useBodyScrollLock(showForm);

  // Pré-remplit le formulaire en mode édition ou pré-sélectionne le joueur courant en création
  useEffect(() => {
    if (isEditing) {
      setNewTeamData({
        name: editingTeam.name || '',
        owner: editingTeam.ownerId || null,
        format: editingTeam.format || '2v2',
        pokemon: (editingTeam.pokemon || []).map((p) => ({
          ...p,
          id: p.id || `${p.pokeId}-${Math.random().toString(36).slice(2, 7)}`,
        })),
      });
    } else if (showForm && !isSuperAdmin && dbUser?.playerId) {
      setNewTeamData((prev) => ({ ...prev, owner: dbUser.playerId }));
    }
  }, [showForm, isEditing, editingTeam, isSuperAdmin, dbUser?.playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setNewTeamData(emptyTeamData());
    setTeamFormErrors({ name: false, owner: false, pokemon: false });
    setPickingPokemon(false);
    if (clearEditingTeam) clearEditingTeam();
  };

  // Fermeture animée du formulaire (Cancel ou après sauvegarde)
  const [isFormClosing, setIsFormClosing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [openPlayerDropdown, setOpenPlayerDropdown] = useState(false);
  const closeFormWithAnimation = useCallback(() => {
    setIsFormClosing(true);
    setTimeout(() => {
      setIsFormClosing(false);
      resetForm();
      setShowForm(false);
    }, 240);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [footerMounted, setFooterMounted] = useState(false);
  const { isClosing: isFooterClosing, handleClose: closeFooter } = useAnimatedClose(() => setFooterMounted(false), 280);
  useEffect(() => {
    if (selectionMode === 'teams') setFooterMounted(true);
    else closeFooter();
  }, [selectionMode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onSelectionModeChange?.(selectionMode === 'teams'); }, [selectionMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fermeture animée des modales de confirmation
  const { isClosing: isConfirmDeleteClosing, handleClose: cancelConfirmDelete } = useAnimatedClose(
    () => setConfirmingDeleteId(null), 180,
  );
  const { isClosing: isDeletingSelectedClosing, handleClose: cancelDeletingSelected } = useAnimatedClose(
    () => setDeletingSelected(false), 180,
  );

  // Nombre exact de Pokémon requis selon le format
  // 1v1 = 3 Pokémon (1 actif, 2 en réserve)
  // 2v2 = 4 Pokémon (2 actifs, 2 en réserve)
  const requiredPokemonForFormat = (format) => (format === '1v1' ? 3 : 4);
  const required = requiredPokemonForFormat(newTeamData.format);
  const currentCount = newTeamData.pokemon.length;
  const handleSelectPokemon = (pokemonOrArray) => {
    const toAdd = Array.isArray(pokemonOrArray) ? pokemonOrArray : [pokemonOrArray];
    setNewTeamData((prev) => {
      const entries = toAdd.map((p, i) => ({
        id: `${Date.now()}-${i}-${p.pokeId}`,
        pokeId: p.pokeId,
        name: p.name,
      }));
      return { ...prev, pokemon: [...prev.pokemon, ...entries] };
    });
    setPickingPokemon(false);
  };

  const handleRemovePokemonFromForm = (id) => {
    setNewTeamData((prev) => ({
      ...prev,
      pokemon: prev.pokemon.filter((p) => p.id !== id),
    }));
  };

  const handleSaveTeam = async () => {
    const errors = {
      name: !newTeamData.name.trim(),
      owner: !newTeamData.owner,
    };
    setTeamFormErrors(errors);
    if (errors.name || errors.owner) return;
    if (newTeamData.pokemon.length !== required) {
      setAlertMessage({ title: 'Format invalide', message: newTeamData.pokemon.length < required
        ? tr('teams.missingPokemon', required - newTeamData.pokemon.length, newTeamData.pokemon.length, required, newTeamData.format)
        : tr('teams.tooManyPokemon', newTeamData.pokemon.length, required, newTeamData.format) });
      return;
    }

    const owner = players.find(p => p._id === newTeamData.owner);
    const payload = {
      ...newTeamData,
      ownerId: newTeamData.owner,
      owner: owner?.name,
    };

    // Si l'équipe éditée est déjà Concept, on la resauvegarde directement en Concept
    // en marquant les nouveaux Pokémon non possédés comme isConcept aussi.
    if (isEditing && editingTeam.isConcept) {
      const existingIds = owner ? new Set((owner.pokemon || []).map((p) => p.pokeId)) : new Set();
      const conceptPayload = {
        ...payload,
        isConcept: true,
        pokemon: payload.pokemon.map((p) => ({
          ...p,
          isConcept: !existingIds.has(p.pokeId) ? true : undefined,
        })),
      };
      setIsSaving(true);
      try {
        await onUpdateTeam(editingTeam._id, conceptPayload);
      } finally {
        setIsSaving(false);
      }
      closeFormWithAnimation();
      return;
    }

    // Détecte les Pokémon absents du roster du propriétaire (création ou édition d'équipe classique)
    if (owner) {
      const existingIds = new Set((owner.pokemon || []).map((p) => p.pokeId));
      const missingPokemon = newTeamData.pokemon.filter((p) => !existingIds.has(p.pokeId));
      if (missingPokemon.length > 0) {
        setPendingConceptTeam({ payload, owner, missingPokemon });
        return;
      }
    }

    setIsSaving(true);
    try {
      if (isEditing) {
        await onUpdateTeam(editingTeam._id, payload);
      } else {
        await onAddTeam(payload);
      }
    } finally {
      setIsSaving(false);
    }
    closeFormWithAnimation();
  };

  const confirmSaveAsConcept = async () => {
    if (!pendingConceptTeam) return;
    const { payload, missingPokemon } = pendingConceptTeam;
    const missingIds = new Set(missingPokemon.map((p) => p.pokeId));
    const conceptPayload = {
      ...payload,
      isConcept: true,
      pokemon: payload.pokemon.map((p) => ({
        ...p,
        isConcept: missingIds.has(p.pokeId) ? true : undefined,
      })),
    };
    setIsSaving(true);
    try {
      if (isEditing) {
        await onUpdateTeam(editingTeam._id, conceptPayload);
      } else {
        await onAddTeam(conceptPayload);
      }
    } finally {
      setIsSaving(false);
    }
    setPendingConceptTeam(null);
    closeFormWithAnimation();
  };

  const confirmAddToRoster = async () => {
    if (!pendingConceptTeam) return;
    const { payload, owner, missingPokemon } = pendingConceptTeam;
    setIsSaving(true);
    try {
      if (isEditing) {
        await onUpdateTeam(editingTeam._id, payload);
      } else {
        await onAddTeam(payload);
      }
      if (onUpdatePlayer) {
        const toAdd = missingPokemon.map((p) => ({
          id: `${Date.now()}-${p.pokeId}-${Math.random().toString(36).slice(2, 7)}`,
          pokeId: p.pokeId,
          name: p.name,
          level: 50,
        }));
        await onUpdatePlayer(owner._id, {
          ...owner,
          pokemon: [...(owner.pokemon || []), ...toAdd],
        });
      }
    } finally {
      setIsSaving(false);
    }
    setPendingConceptTeam(null);
    closeFormWithAnimation();
  };

  const handleDeleteMultiple = async () => {
    setIsDeletingMultiple(true);
    await onDeleteMultiple(selectedItems);
    setIsDeletingMultiple(false);
    setSelectionMode(null);
    setSelectedItems([]);
    setDeletingSelected(false);
  };

  const inSelection = selectionMode === 'teams';
  const [ready, setReady] = useState(false);
  useEffect(() => { const raf = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(raf); }, []);
  const selTr = ready ? 'transition-all duration-200' : '';

  const [scrolled, setScrolled] = useState(() => initialScrollY > 20);
  // Même logique que Battles : empêcher le listener de polluer scrolled quand caché.
  const isActiveRef = useRef(isActive);
  useLayoutEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => {
    if (isBackground) return;
    const onScroll = () => {
      if (!isActiveRef.current) return;
      if (document.documentElement.style.overflow === 'hidden') return;
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isBackground]);
  useEffect(() => {
    if (!showForm) setScrolled(window.scrollY > 20);
  }, [showForm]);

  return (
    <>
    {renderPage && (
    <div className="relative min-h-screen">
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10"
        style={{
          background: isDark
            ? 'radial-gradient(130% 75% at 0% 0%, rgba(72,0,255,0.06) 0%, rgba(72,0,255,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(125,252,116,0.05) 0%, rgba(125,252,116,0) 100%), #09090b'
            : 'radial-gradient(130% 100% at 0% 0%, rgba(72,0,255,0.35) 0%, rgba(72,0,255,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(125,252,116,0.28) 0%, rgba(125,252,116,0) 100%), #EFF6F9',
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {[300, 420, 540, 660].map((px) => {
          const vw = `${(px / 390 * 100).toFixed(1)}vw`;
          return (
            <div
              key={px}
              className={`absolute rounded-full border ${isDark ? 'border-white/5' : 'border-white/50'}`}
              style={{ width: vw, height: vw, top: `calc(${vw} / -2)`, left: `calc(${vw} / -2)` }}
            />
          );
        })}
      </div>
      {/* ── En-tête sticky ── */}
      <div
        className={`sticky top-0 z-10 px-4 transition-all duration-200 relative ${
          scrolled ? '' : ''
        }`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)', paddingBottom: '0.75rem' }}
      >
        <div className="absolute inset-x-0 top-0 -bottom-12 pointer-events-none transition-opacity duration-300" style={{
          opacity: scrolled ? 1 : 0,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
        }} />
        <div className="absolute inset-x-0 top-0 -bottom-12 pointer-events-none transition-opacity duration-300" style={{
          opacity: scrolled ? 1 : 0,
          background: isDark
            ? 'linear-gradient(to bottom, rgba(9,9,11,0.85) 0%, transparent 100%)'
            : 'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, transparent 100%)',
        }} />
        <div className="flex justify-between items-center relative">
          <h1 className={`${scrolled ? 'text-xl' : 'text-3xl'} font-black tracking-tight transition-all duration-300 ${t.text}`}>{tr('teams.title')}</h1>
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => { setSelectionMode(null); setSelectedItems([]); }}
              className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} ${selTr} ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'} ${inSelection ? 'relative opacity-100 scale-100' : 'absolute opacity-0 scale-0 pointer-events-none'}`}
              style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
              aria-label={tr('common.cancel')}
            >
              <Check size={20} />
            </button>
            {myTeams.length > 0 && (
              <button
                onClick={() => setSelectionMode('teams')}
                className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} ${selTr} ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'} ${inSelection ? 'absolute opacity-0 scale-0 pointer-events-none' : 'relative opacity-100 scale-100'}`}
                style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
                aria-label="Sélectionner"
              >
                <CheckSquare size={20} />
              </button>
            )}
            <button
              onClick={() => {
                if (clearEditingTeam) clearEditingTeam();
                setNewTeamData(emptyTeamData());
                setShowForm(true);
              }}
              className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} ${t.accentBg} text-white ${selTr} ${inSelection ? 'absolute opacity-0 scale-0 pointer-events-none' : 'relative opacity-100 scale-100'}`}
              style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
              aria-label="Nouvelle équipe"
            >
              <Plus size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Filtres format ── */}
      {teams.length > 0 && (
        <div className="relative z-[1] px-5 mt-4 flex gap-2">
          {[
            { id: 'all', label: 'Tous' },
            { id: '1v1', label: '1v1' },
            { id: '2v2', label: '2v2' },
          ].map(({ id, label }) => {
            const active = formatFilter === id;
            return (
              <button
                key={id}
                onClick={() => setFormatFilter(id)}
                className={`inline-flex items-center ${id === 'all' ? 'gap-1' : 'gap-1.5'} rounded-full text-sm font-bold transition-all ${
                  'px-4 h-9'
                } ${
                  active
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                    : isDark
                      ? 'bg-zinc-800 text-gray-300'
                      : 'bg-white text-gray-600 shadow-sm'
                }`}
              >
                {id === 'all' && <PokeBallIcon colorBlack="black" id={`${uid}-all`} />}
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="relative z-[1] px-5 mt-4 pb-40">
        {teams.length === 0 ? (
          <div className={`${t.surface} rounded-2xl p-10 text-center mt-12 shadow-sm`}>
            <div className={`w-14 h-14 mx-auto rounded-2xl ${t.iconTileIndigo} flex items-center justify-center mb-4`}>
              <Shield size={26} />
            </div>
            <p className={`${t.text} font-bold text-lg mb-1`}>{tr('teams.none')}</p>
            <p className={`${t.textSecondary} text-sm mb-6`}>{tr('teams.noneDesc')}</p>
            <button
              onClick={() => setShowForm(true)}
              className={`${t.accentBg} text-white px-5 py-2.5 rounded-full font-semibold inline-flex items-center gap-2`}
            >
              <Plus size={16} />
              {tr('teams.new')}
            </button>
          </div>
        ) : (
          <div className={`${t.surface} rounded-2xl overflow-hidden shadow-sm`}>
            {(() => {
              const filtered = formatFilter === 'all' ? teams : teams.filter(tm => tm.format === formatFilter);
              if (filtered.length === 0) {
                return (
                  <div className={`p-10 text-center ${t.textSecondary} text-sm`}>
                    Aucune équipe pour ce format.
                  </div>
                );
              }
              return filtered.map((team, idx) => {
              const thumbSlots = (team.pokemon || []).slice(0, 4);
              const isSelected = selectedItems.includes(team._id);
              const isLast = idx === filtered.length - 1;
              return (
                <SwipeableRow
                  key={team._id}
                  onDelete={canEditTeam(team) ? () => setConfirmingDeleteId(team._id) : undefined}
                  disabled={inSelection}
                  surfaceClass={t.surface}
                  className={[
                    !isLast ? `border-b ${t.divider}` : '',
                    idx === 0 ? 'rounded-t-2xl' : '',
                    isLast ? 'rounded-b-2xl' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <button
                    onClick={() =>
                      inSelection
                        ? canEditTeam(team) && setSelectedItems(
                            isSelected
                              ? selectedItems.filter((id) => id !== team._id)
                              : [...selectedItems, team._id]
                          )
                        : onSelectTeam(team)
                    }
                    className={`w-full flex items-center gap-3 p-3 ${t.surface} text-left`}
                  >
                    <span className={`rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selTr} overflow-hidden ${isSelected ? `${t.accentBg} border-transparent` : `${t.textTertiary} border-current`} ${inSelection && canEditTeam(team) ? 'w-6 h-6 opacity-100 scale-100' : 'w-0 h-0 border-0 opacity-0 scale-75 -mr-3'}`}>
                      {isSelected && <Check size={14} className="text-white" />}
                    </span>

                    {/* Miniature 2x2 */}
                    <div className={`flex-shrink-0 w-14 h-14 rounded-xl ${t.surfaceMuted} p-1 grid grid-cols-2 grid-rows-2 gap-0.5`}>
                      {[0, 1, 2, 3].map((i) => {
                        const p = thumbSlots[i];
                        return (
                          <div key={i} className="flex items-center justify-center overflow-hidden">
                            {p ? (
                              <img
                                src={getPokemonImageUrl(p.pokeId)}
                                alt={p.name}
                                className="w-full h-full object-contain"
                                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${t.text} truncate`}>{team.name}</p>
                      <div className={`${t.textSecondary} text-xs mt-0.5 flex items-center gap-1.5 min-w-0`}>
                        {(() => {
                          const ownerPlayer = players.find(p => p._id === team.ownerId);
                          return ownerPlayer ? <PlayerAvatar player={ownerPlayer} size={16} textSize="text-[8px]" className="flex-shrink-0" /> : null;
                        })()}
                        <span className="truncate">{team.owner} · {(team.pokemon || []).length} Pokémon</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {team.isConcept && (
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isDark ? 'bg-amber-400/15 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                          Concept
                        </span>
                      )}
                      {!team.isConcept && (team.pokemon || []).length < (team.format === '2v2' ? 4 : 3) && (
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-500'}`}>
                          À compléter
                        </span>
                      )}
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold ${team.format === '1v1' ? (isDark ? 'bg-purple-300/10 text-purple-300' : 'bg-purple-600/10 text-purple-600') : (isDark ? 'bg-teal-300/10 text-teal-300' : 'bg-teal-600/10 text-teal-600')}`}>
                        {team.format}
                      </span>
                    </div>
                    <span className={`${selTr} overflow-hidden flex items-center flex-shrink-0 ${inSelection ? 'w-0 opacity-0' : 'w-[18px] opacity-100'}`}>
                      <ChevronRight size={18} className={t.textTertiary} />
                    </span>
                  </button>
                </SwipeableRow>
              );
              });
            })()}
          </div>
        )}
      </div>

      {/* ── Modale confirmation suppression unitaire (swipe) ── */}
      {confirmingDeleteId && (() => {
        const team = teams.find((tt) => tt._id === confirmingDeleteId);
        return createPortal(
          <div className={`fixed inset-0 ${t.overlay} ${isConfirmDeleteClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
            <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isConfirmDeleteClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
              <p className={`font-black text-lg ${t.text} mb-1`}>
                {tr('teams.deleteTitle')} {team?.name} ?
              </p>
              <p className={`${t.textSecondary} text-sm mb-5`}>{tr('common.irreversible')}</p>
              <div className="flex gap-2">
                <button
                  onClick={cancelConfirmDelete}
                  disabled={isDeletingSingle}
                  className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text} disabled:opacity-50`}
                >
                  {tr('common.cancel')}
                </button>
                <button
                  onClick={async () => {
                    setIsDeletingSingle(true);
                    await onDeleteTeam(confirmingDeleteId);
                    setIsDeletingSingle(false);
                    setConfirmingDeleteId(null);
                  }}
                  disabled={isDeletingSingle}
                  className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {isDeletingSingle ? <Loader2 size={16} className="animate-spin" /> : tr('common.delete')}
                </button>
              </div>
            </div>
          </div>
        , document.body);
      })()}

      {/* ── Modale confirmation suppression multiple ── */}
      {deletingSelected && createPortal(
        <div className={`fixed inset-0 ${t.overlay} ${isDeletingSelectedClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isDeletingSelectedClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
            <p className={`font-black text-lg ${t.text} mb-1`}>
              {tr('teams.deleteMultipleTitle', selectedItems.length)}
            </p>
            <p className={`${t.textSecondary} text-sm mb-5`}>{tr('common.irreversible')}</p>
            <div className="flex gap-2">
              <button
                onClick={cancelDeletingSelected}
                disabled={isDeletingMultiple}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text} disabled:opacity-50`}
              >
                {tr('common.cancel')}
              </button>
              <button
                onClick={handleDeleteMultiple}
                disabled={isDeletingMultiple}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {isDeletingMultiple ? <Loader2 size={16} className="animate-spin" /> : tr('common.delete')}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
    )}

      {/* ── Formulaire Créer / Modifier équipe (full-screen sheet iOS) ── */}
      {showForm && createPortal(
        <div className={`fixed inset-0 ${t.overlay} ${isFormClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex flex-col`}>
          <div className={`${t.surfaceModal} flex-1 overflow-hidden flex flex-col rounded-t-3xl ${isFormClosing ? 'anim-slide-down' : 'anim-slide-up'}`} style={{ marginTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}>
            {/* Barre supérieure */}
            <div className={`${t.surface} px-5 pt-3 pb-3 border-b ${t.divider} flex items-center`}>
              <div className="flex-1">
                <button
                  onClick={closeFormWithAnimation}
                  disabled={isSaving}
                  className={`${t.accent} font-semibold disabled:opacity-40`}
                >
                  {tr('common.cancel')}
                </button>
              </div>
              <h2 className={`text-base font-black ${t.text}`}>
                {isEditing ? tr('teams.editTitle') : tr('teams.newTitle')}
              </h2>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={handleSaveTeam}
                  disabled={isSaving}
                  className={`${t.accent} font-bold flex items-center gap-1 disabled:opacity-60`}
                >
                  {isSaving
                    ? <Loader2 size={16} className="animate-spin" />
                    : (isEditing ? tr('common.save') : tr('common.create'))}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
              {/* Nom */}
              <div>
                <label className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                  {tr('teams.nameLabel')}
                </label>
                <input
                  type="text"
                  placeholder={tr('teams.namePlaceholder')}
                  value={newTeamData.name}
                  onChange={(e) => setNewTeamData({ ...newTeamData, name: e.target.value })}
                  className={`w-full ${t.inputSoft} ${teamFormErrors.name ? 'ring-2 ring-red-500/50' : ''} rounded-xl px-4 py-3 outline-none focus:ring-2 ${t.accentRing}`}
                />
                {teamFormErrors.name && <p className={`${t.danger} text-xs mt-1.5 ml-1`}>Ce champ est requis</p>}
              </div>

              {/* Overlay fermeture dropdown */}
              {openPlayerDropdown && <div className="fixed inset-0 z-40" onClick={() => setOpenPlayerDropdown(false)} />}

              {/* Propriétaire */}
              <div>
                <label className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                  {tr('teams.owner')}
                </label>
                <div className="relative">
                  {(() => {
                    const isLocked = !isSuperAdmin && !isEditing;
                    return (
                      <>
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => !isLocked && setOpenPlayerDropdown(!openPlayerDropdown)}
                          className={`w-full ${t.inputSoft} ${teamFormErrors.owner ? 'ring-2 ring-red-500/50' : ''} rounded-xl px-4 py-3 flex items-center gap-3 text-left${isLocked ? ' opacity-70 cursor-default' : ''}`}
                        >
                          {newTeamData.owner ? (
                            <>
                              <PlayerAvatar player={players.find((p) => p._id === newTeamData.owner)} size={32} textSize="text-xs" className="flex-shrink-0" />
                              <span className={`flex-1 font-medium ${t.text}`}>{players.find((p) => p._id === newTeamData.owner)?.name}</span>
                            </>
                          ) : (
                            <span className={`flex-1 ${t.textSecondary}`}>{tr('teams.selectPlayer')}</span>
                          )}
                          {!isLocked && <ChevronDown size={16} className={t.textSecondary} />}
                        </button>
                        {!isLocked && openPlayerDropdown && (
                          <div className={`absolute top-full left-0 right-0 mt-1 ${t.surface} rounded-xl shadow-lg z-50 overflow-hidden border ${t.divider}`}>
                            {players.map((p) => (
                              <button
                                key={p._id}
                                type="button"
                                onClick={() => { setNewTeamData({ ...newTeamData, owner: p._id }); setOpenPlayerDropdown(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left ${t.surfaceMuted} hover:opacity-80`}
                              >
                                <PlayerAvatar player={p} size={32} textSize="text-xs" className="flex-shrink-0" />
                                <span className={`font-medium ${t.text}`}>{p.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                {teamFormErrors.owner && <p className={`${t.danger} text-xs mt-1.5 ml-1`}>Ce champ est requis</p>}
              </div>

              {/* Format - Segmented control iOS */}
              <div>
                <label className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                  {tr('teams.format')}
                </label>
                <div className={`flex gap-1 p-1 rounded-xl ${t.surfaceMuted}`}>
                  {['1v1', '2v2'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setNewTeamData({ ...newTeamData, format: fmt })}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
                        newTeamData.format === fmt
                          ? isDark
                            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                            : `${t.surface} ${t.text} shadow-sm`
                          : t.textSecondary
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pokémon */}
              {newTeamData.owner && <div>
                <div className="flex justify-between items-center mb-2">
                  <label className={`text-sm font-bold uppercase tracking-wide ${t.textSecondary} ml-1`}>
                    Pokémon (
                    <span className={currentCount === required ? t.success : t.warning}>
                      {currentCount}/{required}
                    </span>
                    )
                  </label>
                  <button
                    onClick={() => setPickingPokemon(true)}
                    
                    className={`${t.accent} text-sm font-semibold flex items-center gap-1`}
                  >
                    <Plus size={16} />
                    {tr('common.add')}
                  </button>
                </div>

                {newTeamData.pokemon.length === 0 ? (
                  <div className={`${t.surfaceInset} rounded-2xl p-6 text-center ${t.textSecondary} text-sm`}>
                    {tr('teams.noPokemon')}
                  </div>
                ) : (
                  <div className={`${t.surfaceInset} rounded-2xl overflow-hidden`}>
                    {newTeamData.pokemon.map((p, idx) => {
                      const isLast = idx === newTeamData.pokemon.length - 1;
                      return (
                        <SwipeableRow
                          key={p.id}
                          onDelete={() => handleRemovePokemonFromForm(p.id)}
                          surfaceClass={t.surfaceInset}
                          className={!isLast ? `border-b ${t.divider}` : ''}
                        >
                          <div className="flex items-center gap-3 px-4 py-2.5">
                            <img
                              src={getPokemonImageUrl(p.pokeId)}
                              alt={p.name}
                              className="w-10 h-10 object-contain flex-shrink-0"
                              onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                            />
                            <span className={`flex-1 font-semibold ${t.text} truncate`}>{p.name}</span>
                            <span className={`${t.textTertiary} text-xs font-mono`}>#{p.pokeId}</span>
                          </div>
                        </SwipeableRow>
                      );
                    })}
                  </div>
                )}
              </div>}
            </div>
          </div>
        </div>
      , document.body)}

      {/* Modal Sélection d'un Pokémon pour l'équipe */}
      {pickingPokemon && (() => {
        const owner = players.find((p) => p._id === newTeamData.owner);
        const ownerRoster = (owner?.pokemon || []).map((p) => ({ pokeId: p.pokeId, name: p.name }));
        return createPortal(
          <PokemonPicker
            t={t}
            isDark={isDark}
            title="Ajouter un Pokémon"
            alreadyPickedIds={newTeamData.pokemon.map((p) => p.pokeId)}
            defaultResults={ownerRoster}
            defaultLabel={owner ? `Pokémon de ${owner.name}` : null}
            onSelect={handleSelectPokemon}
            onClose={() => setPickingPokemon(false)}
            multiSelect
          />
        , document.body);
      })()}

      {footerMounted && createPortal(
        <div
          className={`fixed bottom-0 left-0 right-0 z-30 pointer-events-none ${isFooterClosing ? 'anim-slide-down' : 'anim-slide-up'}`}
          style={{
            paddingTop: '48px',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="absolute inset-0" style={{
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            maskImage: 'linear-gradient(to top, black 0%, transparent 85%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 85%)',
          }} />
          <div className="absolute inset-0" style={{
            background: isDark
              ? 'linear-gradient(to top, rgba(9,9,11,0.7) 0%, transparent 80%)'
              : 'linear-gradient(to top, rgba(255,255,255,0.7) 0%, transparent 80%)',
          }} />
          <div className="pointer-events-auto grid grid-cols-2 items-center px-4 gap-2 relative" style={{ height: '76px' }}>
            {(() => {
              const visibleTeams = formatFilter === 'all' ? myTeams : myTeams.filter((t) => t.format === formatFilter);
              const allIds = visibleTeams.map((team) => team._id);
              const allSelected = allIds.length > 0 && allIds.every((id) => selectedItems.includes(id));
              return (
                <button
                  onClick={() => setSelectedItems(allSelected
                    ? selectedItems.filter((id) => !allIds.includes(id))
                    : [...new Set([...selectedItems, ...allIds])]
                  )}
                  className={`justify-self-start h-11 px-4 rounded-full backdrop-blur-xl text-sm font-semibold flex items-center justify-center transition-all duration-200 ${isDark ? 'bg-white/10 text-white' : 'bg-white text-gray-900 shadow-[0_4px_24px_rgba(0,0,0,0.12)]'}`}
                  style={isDark ? { borderTop: '1px solid #ffffff36' } : undefined}
                >
                  {allSelected ? 'Tout déselectionner' : 'Tout sélectionner'}
                </button>
              );
            })()}
            <button
              onClick={() => setDeletingSelected(true)}
              className={`justify-self-end h-11 px-4 rounded-full backdrop-blur-xl text-sm font-semibold flex items-center justify-center transition-all duration-200 bg-red-500/90 text-white border border-red-400/60 ${!isDark ? 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]' : ''} ${selectedItems.length === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              style={isDark ? { borderTop: '1px solid #ffffff36' } : undefined}
            >
              {`Supprimer (${selectedItems.length})`}
            </button>
          </div>
        </div>
      , document.body)}
      <AlertModal title={alertMessage?.title} message={alertMessage?.message} onClose={() => setAlertMessage(null)} t={t} />

      {pendingConceptTeam && createPortal(
        <div className={`fixed inset-0 ${t.overlay} anim-fade-in z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 w-full max-w-sm anim-scale-in`}>
            <div className="flex items-center gap-2 mb-1">
              <Target size={20} className={t.accent} />
              <p className={`font-black text-lg ${t.text}`}>Pokémon non possédés</p>
            </div>
            <p className={`${t.textSecondary} text-base mb-3`}>
              {(() => {
                const isMe = String(pendingConceptTeam.owner._id) === String(dbUser?.playerId);
                const collection = isMe ? 'ta collection' : `la collection de ${pendingConceptTeam.owner.name}`;
                const names = pendingConceptTeam.missingPokemon.map((p) => p.name).join(', ');
                return `${names} ${pendingConceptTeam.missingPokemon.length === 1 ? "n'est pas" : "ne sont pas"} dans ${collection}. Que veux-tu faire ?`;
              })()}
            </p>
            <div className="grid grid-cols-6 gap-1 mb-5">
              {pendingConceptTeam.missingPokemon.map((p) => (
                <img
                  key={p.pokeId}
                  src={getPokemonImageUrl(p.pokeId)}
                  alt={p.name}
                  className="w-full aspect-square object-contain"
                />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={confirmSaveAsConcept}
                disabled={isSaving}
                className={`relative w-full py-3 px-4 rounded-xl font-bold border flex items-center justify-center ${isDark ? 'bg-yellow-400/30 text-yellow-300 border-yellow-400/50' : 'bg-yellow-400/25 text-yellow-700 border-yellow-400/60'}`}
              >
                <Plus size={16} className="absolute left-4" />
                Créer une équipe Concept
              </button>
              <button
                onClick={confirmAddToRoster}
                disabled={isSaving}
                className={`w-full py-3 px-4 rounded-xl font-semibold ${t.accentSoftBg} ${t.accentSoftText}`}
              >
                Ajouter à la collection
              </button>
              <button
                onClick={() => setPendingConceptTeam(null)}
                disabled={isSaving}
                className={`w-full py-3 rounded-xl font-semibold ${t.textSecondary}`}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
