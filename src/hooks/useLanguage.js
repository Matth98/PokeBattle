import { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'pokescores_language';

export const LANGUAGES = [
  { code: 'fr', label: 'Français',  flag: '🇫🇷' },
  { code: 'en', label: 'English',   flag: '🇬🇧' },
  { code: 'es', label: 'Español',   flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch',   flag: '🇩🇪' },
  { code: 'ja', label: '日本語',     flag: '🇯🇵' },
];

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'fr'
  );

  const setLanguage = (code) => {
    localStorage.setItem(STORAGE_KEY, code);
    setLanguageState(code);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
