import { useState, useEffect } from 'react';

const STORAGE_KEY = 'pokebattle-theme-mode';
const VALID_MODES = ['light', 'dark', 'system'];

const getSystemDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const getSavedMode = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return VALID_MODES.includes(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
};

export const useThemeMode = () => {
  const [themeMode, setThemeModeState] = useState(getSavedMode);
  const [systemDark, setSystemDark] = useState(getSystemDark);

  // Écoute les changements de préférence système.
  // Sur iOS, le multitâche peut déclencher un faux événement `change` au moment
  // où l'app reprend (prefers-color-scheme toggle transitoire → re-render flash).
  // - On ignore les events quand la page est cachée (app en arrière-plan).
  // - On resynchronise au retour au premier plan via visibilitychange.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const onMqChange = () => {
      if (!document.hidden) setSystemDark(mq.matches);
    };

    const onVisibilityChange = () => {
      if (!document.hidden) setSystemDark(mq.matches);
    };

    mq.addEventListener('change', onMqChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      mq.removeEventListener('change', onMqChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const setThemeMode = (mode) => {
    if (!VALID_MODES.includes(mode)) return;
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
    setThemeModeState(mode);
  };

  const isDark =
    themeMode === 'dark' ? true :
    themeMode === 'light' ? false :
    systemDark;

  return { isDark, themeMode, setThemeMode };
};
