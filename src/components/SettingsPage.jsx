import React, { useRef, useCallback, useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { X, ChevronRight, LogOut, Moon, Sun, Check, Smartphone, Bell, BellOff, Copy } from 'lucide-react';
import { PlayerAvatar } from './PlayerAvatar';
import { useLanguage, LANGUAGES } from '../hooks/useLanguage';
import { useTranslation } from '../hooks/useTranslation';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { usePushNotifications } from '../hooks/usePushNotifications';

const THEME_OPTIONS = [
  { value: 'light',  Icon: Sun,     labelKey: 'settings.lightMode'  },
  { value: 'system', Icon: Smartphone, labelKey: 'settings.systemMode' },
  { value: 'dark',   Icon: Moon,    labelKey: 'settings.darkMode'   },
];

export const SettingsPage = ({ user, linkedPlayer, isDark, themeMode, setThemeMode, t, onClose, onSignOut, onOpenPlayer }) => {
  const tr = useTranslation();
  const displayName = linkedPlayer?.name || user?.displayName || user?.email || 'Utilisateur';
  const email       = user?.email || '';
  const { language, setLanguage } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const { permission, isSubscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const [tokenCopied, setTokenCopied] = useState(false);

  const copyToken = useCallback(async () => {
    const token = await user?.getIdToken?.();
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  }, [user]);
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
        className={`relative ${isDark ? 'bg-zinc-900' : 'bg-[#EAF3F7]'} flex-1 overflow-hidden flex flex-col rounded-t-3xl`}
        style={{ y, marginTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
      >
        {/* ── Background illustration (Pokéball) ── */}
        <div
          className="absolute bottom-0 right-0 pointer-events-none select-none z-0"
          style={{ width: 300, height: 300 }}
          aria-hidden="true"
        >
          <svg width="300" height="300" viewBox="0 0 303 303" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g opacity="0.03">
              <path d="M106.066 106.066C47.5812 164.551 47.5812 259.713 106.066 318.198C164.551 376.683 259.713 376.683 318.198 318.198C376.683 259.713 376.683 164.551 318.198 106.066C259.713 47.5812 164.551 47.5812 106.066 106.066ZM121.976 121.976C169.006 74.9462 243.936 72.4166 293.978 114.376L244.609 163.745C221.959 148.53 190.919 150.921 170.915 170.925C150.911 190.929 148.53 221.97 163.734 244.62L114.376 293.978C72.4166 243.936 74.9462 169.006 121.976 121.976ZM237.434 186.83C251.387 200.783 251.387 223.481 237.434 237.434C223.481 251.387 200.783 251.387 186.83 237.434C172.877 223.481 172.877 200.783 186.83 186.83C200.783 172.877 223.481 172.877 237.434 186.83ZM302.288 302.288C255.258 349.318 180.328 351.847 130.286 309.888L179.655 260.519C202.305 275.735 233.345 273.343 253.349 253.339C273.353 233.335 275.735 202.294 260.525 179.649L309.893 130.281C351.853 180.323 349.328 255.248 302.293 302.283L302.288 302.288Z" fill={isDark ? 'white' : 'black'}/>
            </g>
          </svg>
        </div>

        {/* ── Grip handle ── */}
        <div className="absolute top-0 left-0 right-0 flex justify-center pt-3 z-10 pointer-events-none">
          <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-white/30' : 'bg-black/20'}`} />
        </div>

        {/* ── Close button ── */}
        <button
          onClick={handleClose}
          className={`absolute top-2 right-4 w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} z-20 ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'}`}
          style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
          aria-label={tr('common.close')}
        >
          <X size={22} />
        </button>

        {/* ── Scrollable content ── */}
        <div
          ref={scrollRef}
          className="relative z-10 flex-1 overflow-y-auto"
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
                <div className="w-full flex items-center gap-3 px-4 py-4">
                  {/* Icône + label du mode actif */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-indigo-400/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
                    {(() => { const { Icon } = THEME_OPTIONS.find(o => o.value === themeMode); return <Icon size={18} />; })()}
                  </div>
                  <span className={`flex-1 text-left font-medium ${t.text}`}>
                    {tr(THEME_OPTIONS.find(o => o.value === themeMode).labelKey)}
                  </span>
                  {/* Toggle 3 états */}
                  <div className={`flex items-center gap-0.5 rounded-full p-1 ${isDark ? 'bg-zinc-700' : 'bg-gray-100'}`}>
                    {THEME_OPTIONS.map(({ value, Icon }) => {
                      const active = themeMode === value;
                      return (
                        <button
                          key={value}
                          onClick={() => setThemeMode(value)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                            active
                              ? isDark
                                ? 'bg-zinc-500 text-white shadow'
                                : 'bg-white text-gray-900 shadow-sm'
                              : isDark
                                ? 'text-zinc-400'
                                : 'text-gray-400'
                          }`}
                        >
                          <Icon size={15} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Notifications ── */}
            {permission !== 'unsupported' && (
              <section>
                <p className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary} mb-2 px-1`}>
                  Notifications
                </p>
                <div className={`${isDark ? 'bg-zinc-850' : t.surface} rounded-2xl overflow-hidden`}>
                  <button
                    onClick={isSubscribed ? unsubscribe : subscribe}
                    disabled={pushLoading || permission === 'denied'}
                    className="w-full flex items-center gap-3 px-4 py-4 disabled:opacity-50"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isSubscribed
                        ? isDark ? 'bg-indigo-400/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'
                        : isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isSubscribed ? <Bell size={18} /> : <BellOff size={18} />}
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-medium ${t.text}`}>
                        {isSubscribed ? 'Notifications activées' : 'Activer les notifications'}
                      </p>
                      {permission === 'denied' && (
                        <p className={`text-xs ${t.textSecondary} mt-0.5`}>
                          Autorisez les notifications dans les réglages de votre navigateur
                        </p>
                      )}
                    </div>
                    {/* Toggle pill */}
                    {permission !== 'denied' && (
                      <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                        isSubscribed ? 'bg-indigo-500' : isDark ? 'bg-zinc-600' : 'bg-gray-200'
                      }`}>
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                          isSubscribed ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                    )}
                  </button>
                </div>
              </section>
            )}

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
                  onClick={copyToken}
                  className={`w-full flex items-center gap-3 px-4 py-4 border-b ${t.divider}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-gray-100 text-gray-500'}`}>
                    <Copy size={18} />
                  </div>
                  <span className={`flex-1 text-left font-medium ${t.text}`}>
                    {tokenCopied ? 'Token copié ✓' : 'Copier mon token Firebase'}
                  </span>
                </button>
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
