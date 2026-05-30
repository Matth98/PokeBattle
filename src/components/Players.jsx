import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, ChevronRight, Trash2, X, Check, CheckSquare, Users, Camera, Loader2 } from 'lucide-react';
import { SwipeableRow } from './SwipeableRow';
import { PlayerAvatar } from './PlayerAvatar';
import { AlertModal } from './AlertModal';
import { resizeImageToDataUrl } from '../utils/imageResize';
import { useAnimatedClose } from '../hooks/useAnimatedClose';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';

export const Players = ({
  players,
  t,
  isDark,
  onSelectPlayer,
  onAddPlayer,
  onDeletePlayer,
  onDeleteMultiple,
  selectionMode,
  setSelectionMode,
  selectedItems,
  setSelectedItems,
  showForm,
  setShowForm,
  isBackground = false,
  initialScrollY = 0,
  onSelectionModeChange = null,
}) => {
  const tr = useTranslation();
  const { dbUser, isSuperAdmin } = useAuth();
  const canEditPlayer = (player) =>
    isSuperAdmin ||
    !player.userId ||
    (dbUser?._id && String(player.userId) === String(dbUser._id));

  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAvatar, setNewPlayerAvatar] = useState(null); // data URL
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);
  const fileInputRef = useRef(null);

  const inSelection = selectionMode === 'players';

  // initialScrollY = position sauvée au départ vers le détail (App.jsx scrollMemoryRef),
  // ou 0 si arrivée par changement d'onglet (setCurrentTab efface la mémoire).
  // Évite le flash topbar : window.scrollY au montage reflète encore la page détail.
  const [scrolled, setScrolled] = useState(() => initialScrollY > 20);
  useEffect(() => {
    if (isBackground) return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isBackground]);

  const resetForm = () => {
    setNewPlayerName('');
    setNewPlayerAvatar(null);
  };

  const [alertMessage, setAlertMessage] = useState(null);
  const [isFormClosing, setIsFormClosing] = useState(false);
  const closeFormWithAnimation = useCallback(() => {
    setIsFormClosing(true);
    setTimeout(() => {
      setIsFormClosing(false);
      resetForm();
      setShowForm(false);
    }, 240);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { isClosing: isDeletingSelectedClosing, handleClose: cancelDeletingSelected } = useAnimatedClose(
    () => setDeletingSelected(false), 180,
  );
  const { isClosing: isConfirmDeleteClosing, handleClose: cancelConfirmDelete } = useAnimatedClose(
    () => setConfirmingDeleteId(null), 180,
  );

  const [footerMounted, setFooterMounted] = useState(false);
  const { isClosing: isFooterClosing, handleClose: closeFooter } = useAnimatedClose(() => setFooterMounted(false), 280);
  useEffect(() => {
    if (selectionMode === 'players') setFooterMounted(true);
    else closeFooter();
  }, [selectionMode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onSelectionModeChange?.(selectionMode === 'players'); }, [selectionMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;
    await onAddPlayer({ name: newPlayerName, avatar: newPlayerAvatar });
    resetForm();
    setShowForm(false);
  };

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setNewPlayerAvatar(dataUrl);
    } catch (err) {
      setAlertMessage({ title: 'Image invalide', message: err.message });
    } finally {
      e.target.value = ''; // permet de re-choisir le même fichier
    }
  };

  const handleDeleteMultiple = async () => {
    setIsDeletingMultiple(true);
    await onDeleteMultiple(selectedItems);
    setIsDeletingMultiple(false);
    setSelectionMode(null);
    setSelectedItems([]);
    setDeletingSelected(false);
  };

  const playerToDelete = confirmingDeleteId
    ? players.find((p) => p._id === confirmingDeleteId)
    : null;

  const handleConfirmSingleDelete = async () => {
    if (confirmingDeleteId) {
      setIsDeletingSingle(true);
      await onDeletePlayer(confirmingDeleteId);
      setIsDeletingSingle(false);
      setConfirmingDeleteId(null);
    }
  };

  return (
    <div className="relative min-h-screen">
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10"
        style={{
          background: isDark
            ? 'radial-gradient(130% 75% at 0% 0%, rgba(0,203,255,0.06) 0%, rgba(0,203,255,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(199,255,231,0.05) 0%, rgba(199,255,231,0) 100%), #09090b'
            : 'radial-gradient(130% 100% at 0% 0%, rgba(0,203,255,0.35) 0%, rgba(0,203,255,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(199,255,231,0.28) 0%, rgba(199,255,231,0) 100%), #EFF6F9',
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
        className={`sticky top-0 z-10 px-5 pb-3 transition-all duration-200 ${
          scrolled
            ? `${t.surfaceBlur} border-b ${t.divider}`
            : 'bg-transparent border-b border-transparent'
        }`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2.5rem)' }}
      >
        <div className="flex justify-between items-center">
          <h1 className={`text-3xl font-black tracking-tight ${t.text}`}>{tr('players.title')}</h1>
          <div className="relative flex items-center gap-2">
            {/* Bouton Check — quitter sélection */}
            <button
              onClick={() => { setSelectionMode(null); setSelectedItems([]); }}
              className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark || scrolled ? '' : 'border border-white/20'} ${!scrolled ? 'shadow-sm' : ''} transition-all duration-200 ${scrolled ? `${t.surfaceMuted} ${t.text}` : (isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900')} ${inSelection ? 'relative opacity-100 scale-100' : 'absolute opacity-0 scale-0 pointer-events-none'}`}
              style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
              aria-label="Quitter la sélection"
            >
              <Check size={20} />
            </button>
            {/* Bouton CheckSquare — entrer sélection (superAdmin uniquement) */}
            {isSuperAdmin && (
              <button
                onClick={() => setSelectionMode('players')}
                disabled={players.length === 0}
                className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark || scrolled ? '' : 'border border-white/20'} ${!scrolled ? 'shadow-sm' : ''} transition-all duration-200 ${scrolled ? `${t.surfaceMuted} ${t.text}` : (isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900')} ${players.length === 0 ? 'opacity-40' : ''} ${inSelection ? 'absolute opacity-0 scale-0 pointer-events-none' : 'relative opacity-100 scale-100'}`}
                style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
                aria-label="Sélectionner"
              >
                <CheckSquare size={20} />
              </button>
            )}
            <button
              onClick={() => setShowForm(true)}
              className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark || scrolled ? '' : 'border border-white/20'} ${!scrolled ? 'shadow-sm' : ''} ${t.accentBg} text-white transition-all duration-200 ${inSelection ? 'absolute opacity-0 scale-0 pointer-events-none' : 'relative opacity-100 scale-100'}`}
              style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
              aria-label="Nouveau joueur"
            >
              <Plus size={22} />
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-[1] px-5 mt-5 pb-40">
        {players.length === 0 ? (
          <div className={`${t.surface} rounded-2xl p-10 text-center mt-12 shadow-sm`}>
            <div className={`w-14 h-14 mx-auto rounded-2xl ${t.iconTileIndigo} flex items-center justify-center mb-4`}>
              <Users size={26} />
            </div>
            <p className={`${t.text} font-bold text-lg mb-1`}>{tr('players.none')}</p>
            <p className={`${t.textSecondary} text-sm mb-6`}>Crée un joueur pour commencer.</p>
            <button
              onClick={() => setShowForm(true)}
              className={`${t.accentBg} text-white px-5 py-2.5 rounded-full font-semibold inline-flex items-center gap-2`}
            >
              <Plus size={16} />
              {tr('players.new')}
            </button>
          </div>
        ) : (
          <div className={`${t.surface} rounded-2xl overflow-hidden shadow-sm`}>
            {players.map((p, idx) => {
              const isLast = idx === players.length - 1;
              const isSelected = selectedItems.includes(p._id);
              const battles = (p.stats?.wins || 0) + (p.stats?.losses || 0);
              return (
                <SwipeableRow
                  key={p._id}
                  onDelete={isSuperAdmin ? () => setConfirmingDeleteId(p._id) : undefined}
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
                              ? selectedItems.filter((id) => id !== p._id)
                              : [...selectedItems, p._id]
                          )
                        : onSelectPlayer(p)
                    }
                    className={`w-full flex items-center gap-3 px-4 py-3 ${t.surface} text-left`}
                  >
                    {inSelection && (
                      <span
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? `${t.accentBg} border-transparent` : `${t.textTertiary} border-current`}`}
                      >
                        {isSelected && <Check size={14} className="text-white" />}
                      </span>
                    )}

                    <PlayerAvatar player={p} size={44} className="flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${t.text} truncate`}>{p.name}</p>
                      <p className={`${t.textSecondary} text-xs mt-0.5`}>
                        {battles} combat{battles > 1 ? 's' : ''} · {p.stats?.wins || 0}V – {p.stats?.losses || 0}D
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

      {/* ── Modale confirmation suppression multiple ── */}
      {deletingSelected && createPortal(
        <div className={`fixed inset-0 ${t.overlay} ${isDeletingSelectedClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isDeletingSelectedClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
            <p className={`font-black text-lg ${t.text} mb-1`}>
              {tr('players.deleteMultipleTitle', selectedItems.length)}
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

      {/* ── Modale confirmation suppression unitaire (swipe) ── */}
      {confirmingDeleteId && createPortal(
        <div className={`fixed inset-0 ${t.overlay} ${isConfirmDeleteClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isConfirmDeleteClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
            <p className={`font-black text-lg ${t.text} mb-1`}>
              {tr('players.deleteTitle')}
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
                onClick={handleConfirmSingleDelete}
                disabled={isDeletingSingle}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {isDeletingSingle ? <Loader2 size={16} className="animate-spin" /> : tr('common.delete')}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Footer sélection ── */}
      {footerMounted && createPortal(
        <div
          className={`fixed bottom-0 left-0 right-0 z-30 ${t.surfaceBlur} border-t ${t.divider} shadow-[0_-8px_28px_rgba(15,23,42,0.08)] ${isFooterClosing ? 'anim-slide-down' : 'anim-slide-up'}`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="grid grid-cols-2 items-center px-4 gap-2" style={{ height: '76px' }}>
            {/* Tout sélectionner / Tout déselectionner */}
            {(() => {
              const allIds = players.map((p) => p._id);
              const allSelected = allIds.length > 0 && allIds.every((id) => selectedItems.includes(id));
              return (
                <button
                  onClick={() => setSelectedItems(allSelected
                    ? selectedItems.filter((id) => !allIds.includes(id))
                    : [...new Set([...selectedItems, ...allIds])]
                  )}
                  className={`text-sm font-semibold ${t.accent} justify-self-start`}
                >
                  {allSelected ? 'Tout déselectionner' : 'Tout sélectionner'}
                </button>
              );
            })()}
            <button
              onClick={() => setDeletingSelected(true)}
              disabled={selectedItems.length === 0}
              className={`justify-self-end h-11 px-4 rounded-full backdrop-blur-xl text-sm font-semibold flex items-center justify-center transition-all duration-200 ${selectedItems.length === 0 ? `${isDark ? 'bg-white/10 text-white/40' : 'bg-white/60 text-gray-400'} ${isDark ? '' : 'border border-white/20'} shadow-sm` : `${t.dangerBg} text-white`}`}
              style={selectedItems.length === 0 && isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
            >
              {selectedItems.length === 0 ? 'Supprimer' : `Supprimer (${selectedItems.length})`}
            </button>
          </div>
        </div>
      , document.body)}

      {/* ── Modale Nouveau joueur (full-height sheet iOS) ── */}
      {showForm && createPortal(
        <div className={`fixed inset-0 ${t.overlay} ${isFormClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex flex-col`}>
          <div className={`${t.surfaceModal} flex-1 overflow-hidden flex flex-col rounded-t-3xl ${isFormClosing ? 'anim-slide-down' : 'anim-slide-up'}`} style={{ marginTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}>
            {/* Barre supérieure */}
            <div className={`${t.surface} px-5 pt-3 pb-3 border-b ${t.divider} flex items-center`}>
              <div className="flex-1">
                <button
                  onClick={closeFormWithAnimation}
                  className={`${t.accent} font-semibold`}
                >
                  {tr('common.cancel')}
                </button>
              </div>
              <h2 className={`text-base font-black ${t.text}`}>{tr('players.new')}</h2>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={handleAddPlayer}
                  disabled={!newPlayerName.trim()}
                  className={`${t.accent} font-bold ${!newPlayerName.trim() ? 'opacity-40' : ''}`}
                >
                  {tr('common.save')}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-8 space-y-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
              {/* Avatar uploader */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group"
                  aria-label="Choisir une photo"
                >
                  <PlayerAvatar
                    player={{ name: newPlayerName, avatar: newPlayerAvatar }}
                    size={104}
                    textSize="text-4xl"
                  />
                  <div className={`absolute bottom-0 right-0 w-9 h-9 rounded-full ${t.accentBg} text-white flex items-center justify-center border-4 ${isDark ? 'border-black' : 'border-gray-50'}`}>
                    <Camera size={16} />
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarPick}
                  className="hidden"
                />
                {newPlayerAvatar && (
                  <button
                    onClick={() => setNewPlayerAvatar(null)}
                    className={`mt-2 ${t.danger} text-xs font-semibold`}
                  >
                    Retirer la photo
                  </button>
                )}
              </div>

              {/* Nom */}
              <div>
                <label className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 ml-1 block`}>
                  {tr('players.nameLabel')}
                </label>
                <input
                  type="text"
                  placeholder={tr('players.namePlaceholder')}
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className={`w-full ${t.inputSoft} rounded-xl px-4 py-3 outline-none focus:ring-2 ${t.accentRing}`}
                />
              </div>
            </div>
          </div>
        </div>
      , document.body)}
      <AlertModal title={alertMessage?.title} message={alertMessage?.message} onClose={() => setAlertMessage(null)} t={t} />
    </div>
  );
};
