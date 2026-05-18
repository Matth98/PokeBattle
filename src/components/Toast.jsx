import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Check, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

/**
 * Provider à mettre en racine de l'app. Expose `useToast()` pour pousser des toasts.
 *
 * Usage :
 *   const toast = useToast();
 *   toast.success('Joueur créé');
 *   toast.error('Erreur réseau');
 *   toast.info('Photo mise à jour');
 */
export const ToastProvider = ({ children, isDark }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    );
    // Retire vraiment du DOM après l'animation de sortie
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 180);
  }, []);

  const push = useCallback(
    (variant, message, duration = 2500) => {
      const id = ++toastIdCounter;
      setToasts((prev) => [...prev, { id, variant, message, leaving: false }]);
      const timer = setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(() => () => {
    timersRef.current.forEach((t) => clearTimeout(t));
  }, []);

  const api = {
    success: (msg) => push('success', msg),
    error: (msg) => push('error', msg, 3500),
    info: (msg) => push('info', msg),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} isDark={isDark} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Pas planter si oublié — renvoie un noop
    return { success: () => {}, error: () => {}, info: () => {} };
  }
  return ctx;
};

const VARIANT_STYLES = {
  success: { Icon: Check, badge: 'bg-emerald-500 text-white' },
  error: { Icon: AlertCircle, badge: 'bg-red-500 text-white' },
  info: { Icon: Info, badge: 'bg-indigo-500 text-white' },
};

const ToastViewport = ({ toasts, isDark, onDismiss }) => (
  <div
    className="fixed top-0 left-0 right-0 z-[10000] flex flex-col items-center gap-2 pointer-events-none"
    style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
  >
    {toasts.map((t) => {
      const { Icon, badge } = VARIANT_STYLES[t.variant] || VARIANT_STYLES.info;
      return (
        <button
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`pointer-events-auto flex items-center gap-2.5 ${
            isDark ? 'bg-zinc-800 text-white' : 'bg-white text-gray-900'
          } rounded-full pl-2 pr-4 py-2 shadow-lg ${
            isDark ? 'shadow-black/40' : 'shadow-black/15'
          } ${t.leaving ? 'anim-toast-out' : 'anim-toast-in'} max-w-[90%]`}
        >
          <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${badge}`}>
            <Icon size={14} strokeWidth={3} />
          </span>
          <span className="text-sm font-semibold truncate">{t.message}</span>
        </button>
      );
    })}
  </div>
);
