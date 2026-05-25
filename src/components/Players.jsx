import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, ChevronRight, Trash2, X, Check, CheckSquare, Users, Camera } from 'lucide-react';
import { SwipeableRow } from './SwipeableRow';
import { PlayerAvatar } from './PlayerAvatar';
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
  const fileInputRef = useRef(null);

  const inSelection = selectionMode === 'players';

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const resetForm = () => {
    setNewPlayerName('');
    setNewPlayerAvatar(null);
  };

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
      alert('Image invalide : ' + err.message);
    } finally {
      e.target.value = ''; // permet de re-choisir le même fichier
    }
  };

  const handleDeleteMultiple = async () => {
    await onDeleteMultiple(selectedItems);
    setSelectionMode(null);
    setSelectedItems([]);
    setDeletingSelected(false);
  };

  const playerToDelete = confirmingDeleteId
    ? players.find((p) => p._id === confirmingDeleteId)
    : null;

  const handleConfirmSingleDelete = async () => {
    if (confirmingDeleteId) {
      await onDeletePlayer(confirmingDeleteId);
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
            ? 'radial-gradient(ellipse 130% 75% at 0% 0%, rgba(0,203,255,0.06) 0%, rgba(0,203,255,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(199,255,231,0.05) 0%, rgba(199,255,231,0) 100%), #09090b'
            : 'radial-gradient(ellipse 130% 75% at 0% 0%, rgba(0,203,255,0.35) 0%, rgba(0,203,255,0) 100%), radial-gradient(ellipse 120% 70% at 100% 0%, rgba(199,255,231,0.28) 0%, rgba(199,255,231,0) 100%), #EFF6F9',
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {[300, 420, 540, 660].map((px) => {
          const vw = `${(px / 390 * 100).toFixed(1)}vw`;
          return (
            <div
              key={px}
              className={`absolute rounded-full border ${isDark ? 'border-white/5' : 'border-black/[0.06]'}`}
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
          <div className="flex items-center gap-2">
            {inSelection ? (
              <>
                <button
                  onClick={() => setSelectedItems(players.map((p) => p._id))}
                  className={`px-5 h-11 rounded-full backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} shadow-sm transition-all duration-200 ${scrolled ? `${t.surfaceMuted} ${t.text}` : (isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900')} text-sm font-semibold`}
                  style={isDark ? { boxShadow: '1px 1px #ffffff36', borderTop: '1px solid #ffffff36' } : undefined}
                >
                  Tout
                </button>
                <button
                  onClick={() => setDeletingSelected(true)}
                  disabled={selectedItems.length === 0}
                  className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} shadow-sm ${t.dangerBg} text-white ${selectedItems.length === 0 ? 'opacity-40' : ''}`}
                  style={isDark ? { boxShadow: '1px 1px #ffffff36', borderTop: '1px solid #ffffff36' } : undefined}
                  aria-label="Supprimer la sélection"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => {
                    setSelectionMode(null);
                    setSelectedItems([]);
                  }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} shadow-sm transition-all duration-200 ${scrolled ? `${t.surfaceMuted} ${t.text}` : (isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900')}`}
                  style={isDark ? { boxShadow: '1px 1px #ffffff36', borderTop: '1px solid #ffffff36' } : undefined}
                  aria-label="Annuler"
                >
                  <X size={20} />
                </button>
              </>
            ) : (
              <>
                {isSuperAdmin && (
                  <button
                    onClick={() => setSelectionMode('players')}
                    disabled={players.length === 0}
                    className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} shadow-sm transition-all duration-200 ${scrolled ? `${t.surfaceMuted} ${t.text}` : (isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900')} ${players.length === 0 ? 'opacity-40' : ''}`}
                    style={isDark ? { boxShadow: '1px 1px #ffffff36', borderTop: '1px solid #ffffff36' } : undefined}
                    aria-label="Sélectionner"
                  >
                    <CheckSquare size={20} />
                  </button>
                )}
                <button
                  onClick={() => setShowForm(true)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} shadow-sm ${t.accentBg} text-white`}
                  style={isDark ? { boxShadow: '1px 1px #ffffff36', borderTop: '1px solid #ffffff36' } : undefined}
                  aria-label="Nouveau joueur"
                >
                  <Plus size={22} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-[1] px-5 mt-5 pb-40">
        {players.length === 0 ? (
          <div className={`${t.surface} rounded-2xl p-10 text-center mt-12`}>
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
          <div className={`${t.surface} rounded-2xl overflow-hidden`}>
            {players.map((p, idx) => {
              const isLast = idx === players.length - 1;
              const isSelected = selectedItems.includes(p._id);
              const battles = (p.stats?.wins || 0) + (p.stats?.losses || 0);
              return (
                <SwipeableRow
                  key={p._id}
                  onDelete={canEditPlayer(p) ? () => setConfirmingDeleteId(p._id) : undefined}
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
      {deletingSelected && (
        <div className={`fixed inset-0 ${t.overlay} ${isDeletingSelectedClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isDeletingSelectedClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
            <p className={`font-black text-lg ${t.text} mb-1`}>
              {tr('players.deleteMultipleTitle', selectedItems.length)}
            </p>
            <p className={`${t.textSecondary} text-sm mb-5`}>{tr('common.irreversible')}</p>
            <div className="flex gap-2">
              <button
                onClick={cancelDeletingSelected}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
              >
                {tr('common.cancel')}
              </button>
              <button
                onClick={handleDeleteMultiple}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white`}
              >
                {tr('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale confirmation suppression unitaire (swipe) ── */}
      {confirmingDeleteId && (
        <div className={`fixed inset-0 ${t.overlay} ${isConfirmDeleteClosing ? 'anim-fade-out' : 'anim-fade-in'} z-[9999] flex items-center justify-center p-4`}>
          <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full ${isConfirmDeleteClosing ? 'anim-scale-out' : 'anim-scale-in'}`}>
            <p className={`font-black text-lg ${t.text} mb-1`}>
              {tr('players.deleteTitle')}
            </p>
            <p className={`${t.textSecondary} text-sm mb-5`}>{tr('common.irreversible')}</p>
            <div className="flex gap-2">
              <button
                onClick={cancelConfirmDelete}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.surfaceMuted} ${t.text}`}
              >
                {tr('common.cancel')}
              </button>
              <button
                onClick={handleConfirmSingleDelete}
                className={`flex-1 py-3 rounded-xl font-semibold ${t.dangerBg} text-white`}
              >
                {tr('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale Nouveau joueur (full-height sheet iOS) ── */}
      {showForm && (
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
      )}
    </div>
  );
};
