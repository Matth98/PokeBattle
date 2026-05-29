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
  // Sur iOS, le multitâche génère un faux event `change` qui peut arriver
  // APRÈS que la page soit redevenue visible → re-render parasite → flash.
  // Fix : fenêtre de suppression de 500 ms après chaque retour au premier plan.
  // Les vrais changements de thème (> 500 ms après la reprise) passent normalement.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    let suppressUntil = 0;

    const onMqChange = () => {
      if (Date.now() < suppressUntil) return; // événement transitoire iOS, ignoré
      setSystemDark(mq.matches);
    };

    const onVisibilityChange = () => {
      if (document.hidden) return;
      // Bloque les events change pendant 500 ms après la reprise
      suppressUntil = Date.now() + 500;
      // Re-lit immédiatement la préférence réelle (bail-out si identique)
      setSystemDark(mq.matches);
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
