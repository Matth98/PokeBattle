import React, { useRef, useCallback, useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { X, ChevronRight, LogOut, Moon, Sun, Check } from 'lucide-react';
import { PlayerAvatar } from './PlayerAvatar';
import { useLanguage, LANGUAGES } from '../hooks/useLanguage';
import { useTranslation } from '../hooks/useTranslation';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export const SettingsPage = ({ user, linkedPlayer, isDark, setIsDark, t, onClose, onSignOut, onOpenPlayer }) => {
  const tr = useTranslation();
  const displayName = linkedPlayer?.name || user?.displayName || user?.email || 'Utilisateur';
  const email       = user?.email || '';
  const { language, setLanguage } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  useBodyScrollLock();

  // ── Framer-motion spring bottom sheet ──
  const H = typeof window !== 'undefined' ? window.innerHeight : 800;
  const y = useMotionValue(H);
  const overlayOpacity = useTransform(y, [0, H * 0.45], [1, 0]);
  const sheetRef = useRef(null);
  const scrollRef = useRef(null);

  const dismiss = useCallback((velocityY = 800) => {
    animate(y, H, {
      type: 'spring',
      damping: 18,
      stiffness: 200,
      velocity: velocityY,
      restDelta: 1,
    });
    setTimeout(() => onClose(), 320);
  }, [y, H, onClose]);

  const handleClose = useCallback(() => dismiss(400), [dismiss]);

  const snapBack = useCallback(() => {
    animate(y, 0, { type: 'spring', damping: 30, stiffness: 400 });
  }, [y]);

  // ── Native touch listeners (non-passive) ──
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    let startY = 0;
    let startScrollTop = 0;
    let lastY = 0;
    let lastTime = 0;
    let tracking = false;

    const onTouchStart = (e) => {
      startY = e.touches[0].clientY;
      lastY  = startY;
      lastTime = Date.now();
      startScrollTop = scrollRef.current?.scrollTop ?? 0;
      tracking = false;
    };

    const onTouchMove = (e) => {
      const currentY = e.touches[0].clientY;
      const deltaY   = currentY - startY;
      lastY  = currentY;
      lastTime = Date.now();

      if (!tracking) {
        if (deltaY > 8 && startScrollTop <= 0) {
          tracking = true;
        } else {
          return;
        }
      }

      e.preventDefault();
      if (deltaY > 0) y.set(deltaY);
    };

    const onTouchEnd = (e) => {
      if (!tracking) return;
      tracking = false;

      const deltaY  = lastY - startY;
      const velocity = (e.changedTouches[0].clientY - startY) /
                       Math.max(1, Date.now() - (lastTime - 50));

      if (velocity > 0.5 || deltaY > 120) {
        dismiss(velocity * 1000);
      } else {
        snapBack();
      }
    };

    sheet.addEventListener('touchstart', onTouchStart, { passive: true  });
    sheet.addEventListener('touchmove',  onTouchMove,  { passive: false });
    sheet.addEventListener('touchend',   onTouchEnd,   { passive: true  });

    return () => {
      sheet.removeEventListener('touchstart', onTouchStart);
      sheet.removeEventListener('touchmove',  onTouchMove);
      sheet.removeEventListener('touchend',   onTouchEnd);
    };
  }, [y, dismiss, snapBack]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col backdrop-blur-md"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', opacity: overlayOpacity }}
    >
      <motion.div
        ref={sheetRef}
        className={`relative ${isDark ? 'bg-zinc-900' : 'bg-[#F2F2F7]'} flex-1 overflow-hidden flex flex-col rounded-t-3xl`}
        style={{ y, marginTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
      >
        {/* ── Grip handle ── */}
        <div className="absolute top-0 left-0 right-0 flex justify-center pt-3 z-10 pointer-events-none">
          <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-white/30' : 'bg-black/20'}`} />
        </div>

        {/* ── Close button ── */}
        <button
          onClick={handleClose}
          className={`absolute top-2 right-4 w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl shadow-sm z-10 ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-gray-700'}`}
          style={isDark ? { boxShadow: '1px 1px #ffffff36', borderTop: '1px solid #ffffff36' } : undefined}
          aria-label={tr('common.close')}
        >
          <X size={20} />
        </button>

        {/* ── Scrollable content ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          data-scroll-lock-ignore
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}
        >
          {/* Title */}
          <div className="px-5 pt-8 pb-4">
            <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {tr('settings.title')}
            </h1>
          </div>

          <div className="px-5 space-y-6 pb-4">

            {/* ── Profil ── */}
            <section>
              <button
                onClick={() => { handleClose(); setTimeout(() => onOpenPlayer(), 350); }}
                className={`w-full ${isDark ? 'bg-zinc-850' : t.surface} rounded-2xl p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-transform duration-100`}
              >
                <PlayerAvatar player={linkedPlayer} size={64} textSize="text-2xl" className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-base ${t.text} truncate`}>{displayName}</p>
                  {email && <p className={`text-sm ${t.textSecondary} truncate`}>{email}</p>}
                </div>
                <ChevronRight size={18} className={`flex-shrink-0 ${t.textTertiary}`} />
              </button>
            </section>

            {/* ── Apparence ── */}
            <section>
              <p className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 px-1`}>
                {tr('settings.appearance')}
              </p>
              <div className={`${isDark ? 'bg-zinc-850' : t.surface} rounded-2xl overflow-hidden`}>
                <button
                  onClick={() => setIsDark(!isDark)}
                  className="w-full flex items-center gap-3 px-4 py-4"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-indigo-400/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
                    {isDark ? <Moon size={18} /> : <Sun size={18} />}
                  </div>
                  <span className={`flex-1 text-left font-medium ${t.text}`}>
                    {isDark ? tr('settings.darkMode') : tr('settings.lightMode')}
                  </span>
                  <div className={`w-12 h-7 rounded-full transition-colors duration-200 flex items-center px-1 ${isDark ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${isDark ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </button>
              </div>
            </section>

            {/* ── Langue ── */}
            <section className="hidden">
              <p className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 px-1`}>
                {tr('settings.language')}
              </p>
              <div className={`${isDark ? 'bg-zinc-850' : t.surface} rounded-2xl overflow-hidden`}>
                <button
                  onClick={() => setLangOpen(o => !o)}
                  className="w-full flex items-center gap-3 px-4 py-4"
                >
                  <span className="text-2xl leading-none">{currentLang.flag}</span>
                  <span className={`flex-1 text-left font-medium ${t.text}`}>{currentLang.label}</span>
                  <ChevronRight
                    size={16}
                    className={`${t.textTertiary} transition-transform duration-200 ${langOpen ? 'rotate-90' : ''}`}
                  />
                </button>

                {langOpen && (
                  <div className={`border-t ${t.divider}`}>
                    {LANGUAGES.map((lang, i) => (
                      <button
                        key={lang.code}
                        onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 ${i < LANGUAGES.length - 1 ? `border-b ${t.divider}` : ''}`}
                      >
                        <span className="text-xl leading-none w-7 text-center">{lang.flag}</span>
                        <span className={`flex-1 text-left text-sm font-medium ${t.text}`}>{lang.label}</span>
                        {lang.code === language && (
                          <Check size={16} className="text-indigo-500 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ── Compte ── */}
            <section>
              <p className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 px-1`}>
                {tr('settings.account')}
              </p>
              <div className={`${isDark ? 'bg-zinc-850' : t.surface} rounded-2xl overflow-hidden`}>
                <button
                  onClick={onSignOut}
                  className="w-full flex items-center gap-3 px-4 py-4"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/15 text-red-500">
                    <LogOut size={18} />
                  </div>
                  <span className="flex-1 text-left font-medium text-red-500">{tr('settings.signOut')}</span>
                </button>
              </div>
            </section>

          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
