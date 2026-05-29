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
  //
  // Problème iOS : au retour du multitâche, `mq.matches` peut brièvement renvoyer
  // une mauvaise valeur ET un faux event `change` peut se déclencher juste après.
  // Lire `mq.matches` immédiatement dans `visibilitychange` causait donc un passage
  // intempestif en dark mode ("l'app passe en dark toute seule").
  //
  // Solution :
  //  - On NE lit PAS `mq.matches` au retour au premier plan (valeur instable).
  //  - On ouvre une fenêtre de suppression de 500 ms pour ignorer les faux events.
  //  - Après 550 ms (iOS stabilisé), on lit la valeur réelle une seule fois.
  //  - Les vrais changements de thème hors fenêtre passent via `onMqChange` normalement.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    let suppressUntil = 0;
    let resumeTimer;

    const onMqChange = () => {
      if (Date.now() < suppressUntil) return; // événement transitoire iOS, ignoré
      setSystemDark(mq.matches);
    };

    const onVisibilityChange = () => {
      if (document.hidden) return;
      // Bloque les events change pendant 500 ms (iOS peut en émettre de faux)
      suppressUntil = Date.now() + 500;
      // Lecture différée : après stabilisation iOS, on resynchronise proprement
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        setSystemDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }, 550);
    };

    mq.addEventListener('change', onMqChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      mq.removeEventListener('change', onMqChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimeout(resumeTimer);
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
