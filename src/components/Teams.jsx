import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2, X, Check, CheckSquare, Shield, Loader2 } from 'lucide-react';
import { PlayerAvatar } from './PlayerAvatar';
import { usePokemon } from '../hooks/usePokemon';
import { useAnimatedClose } from '../hooks/useAnimatedClose';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { PokemonPicker } from './PokemonPicker';
import { SwipeableRow } from './SwipeableRow';
import { useAuth } from '../hooks/useAuth';

const emptyTeamData = () => ({ name: '', owner: null, format: '1v1', pokemon: [] });

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
}) => {
  const { dbUser, isSuperAdmin } = useAuth();
  const canEditTeam = (team) =>
    isSuperAdmin ||
    !team.userId ||
    (dbUser?._id && String(team.userId) === String(dbUser._id));

  const [newTeamData, setNewTeamData] = useState(emptyTeamData());
  const [teamFormErrors, setTeamFormErrors] = useState({ name: false, owner: false, pokemon: false });
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [pickingPokemon, setPickingPokemon] = useState(false);
  const { getPokemonImageUrl } = usePokemon();

  const isEditing = Boolean(editingTeam && showForm);
  // Prevent background scroll on iOS when the form is open
  useBodyScrollLock(showForm);

  // Pré-remplit le formulaire en mode édition
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
    }
  }, [isEditing, editingTeam]);

  const resetForm = () => {
    setNewTeamData(emptyTeamData());
    setTeamFormErrors({ name: false, owner: false, pokemon: false });
    setPickingPokemon(false);
    if (clearEditingTeam) clearEditingTeam();
  };

  // Fermeture animée du formulaire (Cancel ou après sauvegarde)
  const [isFormClosing, setIsFormClosing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [openPlayerDropdown, setOpenPlayerDropdown] = useState(false);
  const closeFormWithAnimation = useCallback(() => {
    setIsFormClosing(true);
    setTimeout(() => {
      setIsFormClosing(false);
      resetForm();
      setShowForm(false);
    }, 240);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const isAtMax = currentCount >= required;

  const handleSelectPokemon = (pokemon) => {
    setNewTeamData((prev) => {
      // Sécurité : ne dépasse jamais la limite du format
      if (prev.pokemon.length >= requiredPokemonForFormat(prev.format)) return prev;
      return {
        ...prev,
        pokemon: [
          ...prev.pokemon,
          {
            id: `${Date.now()}-${pokemon.pokeId}`,
            pokeId: pokemon.pokeId,
            name: pokemon.name,
          },
        ],
      };
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
      pokemon: !newTeamData.pokemon || newTeamData.pokemon.length !== required,
    };
    setTeamFormErrors(errors);
    if (errors.name || errors.owner || errors.pokemon) return;

    const owner = players.find(p => p._id === newTeamData.owner);
    const payload = {
      ...newTeamData,
      ownerId: newTeamData.owner,
      owner: owner?.name,
    };
    setIsSaving(true);
    try {
    if (isEditing) {
      await onUpdateTeam(editingTeam._id, payload);
    } else {
      await onAddTeam(payload);
    }

    // Synchronise les Pokémon de l'équipe avec le roster du propriétaire :
    // tout pokeId absent du roster est ajouté.
    if (owner && onUpdatePlayer) {
      const existingIds = new Set((owner.pokemon || []).map((p) => p.pokeId));
      const toAdd = newTeamData.pokemon
        .filter((p) => !existingIds.has(p.pokeId))
        .map((p) => ({
          id: `${Date.now()}-${p.pokeId}-${Math.random().toString(36).slice(2, 7)}`,
          pokeId: p.pokeId,
          name: p.name,
          level: 50,
        }));
      if (toAdd.length > 0) {
        await onUpdatePlayer(owner._id, {
          ...owner,
          pokemon: [...(owner.pokemon || []), ...toAdd],
        });
      }
    }
    } finally {
      setIsSaving(false);
    }
    closeFormWithAnimation();
  };

  const handleDeleteMultiple = async () => {
    await onDeleteMultiple(selectedItems);
    setSelectionMode(null);
    setSelectedItems([]);
    setDeletingSelected(false);
  };

  const inSelection = selectionMode === 'teams';

  return (
    <>
    {renderPage && (
    <div className={`min-h-screen ${t.pageBg}`}>
      {/* ── En-tête sticky ── */}
      <div
        className={`${t.surfaceBlur} sticky top-0 z-10 px-5 pt-12 pb-3 border-b ${t.divider}`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2.5rem)' }}
      >
        <div className="flex justify-between items-center">
          <h1 className={`text-3xl font-black tracking-tight ${t.text}`}>Équipes</h1>
          <div className="flex items-center gap-2">
            {inSelection ? (
              <>
                <button
                  onClick={() => setSelectedItems(teams.map((team) => team._id))}
                  className={`px-3 h-9 rounded-full ${t.surfaceMuted} ${t.text} text-sm font-semibold`}
                >
                  Tout
                </button>
                <button
                  onClick={() => setDeletingSelected(true)}
                  disabled={selectedItems.length === 0}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${t.dangerBg} text-white ${selectedItems.length === 0 ? 'opacity-40' : ''}`}
                  aria-label="Supprimer la sélection"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => {
                    setSelectionMode(null);
                    setSelectedItems([]);
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${t.surfaceMuted} ${t.text}`}
                  aria-label="Annuler"
                >
                  <X size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setSelectionMode('teams')}
                  disabled={teams.length === 0}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${t.surfaceMuted} ${t.text} ${teams.length === 0 ? 'opacity-40' : ''}`}
                  aria-label="Sélectionner"
                >
                  <CheckSquare size={18} />
                </button>
                <button
                  onClick={() => {
                    if (clearEditingTeam) clearEditingTeam();
                    setNewTeamData(emptyTeamData());
                    setShowForm(true);
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${t.accentBg} text-white`}
                  aria-label="Nouvelle équipe"
                >
                  <Plus size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 pb-32">
        {teams.length === 0 ? (
          <div className={`${t.surface} rounded-2xl p-10 text-center mt-12`}>
            <div className={`w-14 h-14 mx-auto rounded-2xl ${t.iconTileIndigo} flex items-center justify-center mb-4`}>
              <Shield size={26} />
            </div>
            <p className={`${t.text} font-bold text-lg mb-1`}>Aucune équipe</p>
            <p className={`${t.textSecondary} text-sm mb-6`}>Crée une équipe pour commencer.</p>
            <button
              onClick={() => setShowForm(true)}
              className={`${t.accentBg} text-white px-5 py-2.5 rounded-full font-semibold inline-flex items-center gap-2`}
            >
              <Plus size={16} />
              Créer une équipe
            </button>
          </div>
        ) : (
          <div className={`${t.surface} rounded-2xl overflow-hidden`}>
            {teams.map((team, idx) => {
              const thumbSlots = (team.pokemon || []).slice(0, 4);
              const isSelected = selectedItems.includes(team._id);
              const isLast = idx === teams.length - 1;
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
                        ? setSelectedItems(
                            isSelected
                              ? selectedItems.filter((id) => id !== team._id)
                              : [...selectedItems, team._id]
                          )
                        : onSelectTeam(team)
                    }
                    className={`w-full flex items-center gap-3 p-3 ${t.surface} text-left`}
                  >
                    {inSelection && (
                      <span
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? `${t.accentBg} border-transparent` : `${t.textTertiary} border-current`}`}
                      >
                        {isSelected && <Check size={14} className="text-white" />}
                      </span>
                    )}

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
                      <p className={`${t.textSecondary} text-xs mt-0.5 flex items-center gap-1.5`}>
                        <span className="truncate">
                          {team.owner} · {(team.pokemon || []).length} Pokémon
                        </span>
                        <span className={`inline-flex flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${t.accentSoftBg} ${t.accentSoftText}`}>
                          {team.format}
                        </span>
                      </p>
                    </div>

                    {!inSelection && <ChevronRight size={18} className={t.textTertiary} />}
                  </button>
                </SwipeableRow>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modale confirmation suppression unitaire (swipe) ── */}
      {confirmingDeleteId && (() => {
        const team = teams.find((tt) => tt._id === confirmingDeleteId);
        return (
          <div className={`fixed inset-0 ${t.overlay} ${isConfirmDeleteClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
            <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isConfirmDeleteClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
              <p className={`font-black text-lg ${t.text} mb-1`}>
                Supprimer {team?.name} ?
              </p>
              <p className={`${t.textSecondary} text-sm mb-5`}>Cette action est définitive.</p>
              <div className="flex gap-2">
                <button
                  onClick={cancelConfirmDelete}
                  className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
                >
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    await onDeleteTeam(confirmingDeleteId);
                    setConfirmingDeleteId(null);
                  }}
                  className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white`}
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modale confirmation suppression multiple ── */}
      {deletingSelected && (
        <div className={`fixed inset-0 ${t.overlay} ${isDeletingSelectedClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isDeletingSelectedClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
            <p className={`font-black text-lg ${t.text} mb-1`}>
              Supprimer {selectedItems.length} équipe{selectedItems.length > 1 ? 's' : ''} ?
            </p>
            <p className={`${t.textSecondary} text-sm mb-5`}>Cette action est définitive.</p>
            <div className="flex gap-2">
              <button
                onClick={cancelDeletingSelected}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteMultiple}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white`}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    )}

      {/* ── Formulaire Créer / Modifier équipe (full-screen sheet iOS) ── */}
      {showForm && (
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
                  Annuler
                </button>
              </div>
              <h2 className={`text-base font-black ${t.text}`}>
                {isEditing ? 'Modifier l\'équipe' : 'Créer une équipe'}
              </h2>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={handleSaveTeam}
                  disabled={isSaving}
                  className={`${t.accent} font-bold flex items-center gap-1 disabled:opacity-60`}
                >
                  {isSaving
                    ? <Loader2 size={16} className="animate-spin" />
                    : (isEditing ? 'Enregistrer' : 'Créer')}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
              {/* Nom */}
              <div>
                <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                  Nom de l'équipe
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mon équipe de feu"
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
                <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                  Propriétaire
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenPlayerDropdown(!openPlayerDropdown)}
                    className={`w-full ${t.inputSoft} ${teamFormErrors.owner ? 'ring-2 ring-red-500/50' : ''} rounded-xl px-4 py-3 flex items-center gap-3 text-left`}
                  >
                    {newTeamData.owner ? (
                      <>
                        <PlayerAvatar player={players.find((p) => p._id === newTeamData.owner)} size={32} textSize="text-xs" className="flex-shrink-0" />
                        <span className={`flex-1 font-medium ${t.text}`}>{players.find((p) => p._id === newTeamData.owner)?.name}</span>
                      </>
                    ) : (
                      <span className={`flex-1 ${t.textSecondary}`}>Sélectionner un joueur</span>
                    )}
                    <ChevronDown size={16} className={t.textSecondary} />
                  </button>
                  {openPlayerDropdown && (
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
                </div>
                {teamFormErrors.owner && <p className={`${t.danger} text-xs mt-1.5 ml-1`}>Ce champ est requis</p>}
              </div>

              {/* Format - Segmented control iOS */}
              <div>
                <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                  Format
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
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} ml-1`}>
                    Pokémon (
                    <span className={currentCount === required ? t.success : t.warning}>
                      {currentCount}/{required}
                    </span>
                    )
                  </label>
                  <button
                    onClick={() => setPickingPokemon(true)}
                    disabled={isAtMax}
                    className={`${t.accent} text-sm font-semibold flex items-center gap-1 ${isAtMax ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <Plus size={16} />
                    Ajouter
                  </button>
                </div>

                {newTeamData.pokemon.length === 0 ? (
                  <div className={`${t.surfaceInset} rounded-2xl p-6 text-center ${t.textSecondary} text-sm`}>
                    Aucun Pokémon sélectionné
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
                {teamFormErrors.pokemon && currentCount !== required && (
                  <p className={`${t.danger} text-xs mt-2 ml-1`}>
                    {currentCount < required
                      ? `Il manque ${required - currentCount} Pokémon (${currentCount}/${required}) pour le format ${newTeamData.format}`
                      : `Trop de Pokémon (${currentCount}/${required}) pour le format ${newTeamData.format}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sélection d'un Pokémon pour l'équipe */}
      {pickingPokemon && (() => {
        const owner = players.find((p) => p._id === newTeamData.owner);
        const ownerRoster = (owner?.pokemon || []).map((p) => ({ pokeId: p.pokeId, name: p.name }));
        return (
          <PokemonPicker
            t={t}
            isDark={isDark}
            title="Choisir un Pokémon"
            alreadyPickedIds={newTeamData.pokemon.map((p) => p.pokeId)}
            defaultResults={ownerRoster}
            defaultLabel={owner ? `Pokémon de ${owner.name}` : null}
            onSelect={handleSelectPokemon}
            onClose={() => setPickingPokemon(false)}
          />
        );
      })()}
    </>
  );
};
