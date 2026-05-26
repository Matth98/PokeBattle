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

  // Écoute les changements de préférence système
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
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
