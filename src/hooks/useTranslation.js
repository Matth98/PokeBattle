import { useLanguage } from './useLanguage';
import { getI18n } from '../i18n';

/**
 * Returns a translation lookup function `tr`.
 * Usage: const tr = useTranslation();
 *        tr('home.title')          → string
 *        tr('home.winsOf', 3, 10)  → calls function with args
 *
 * NOTE: `t` is already used for the theme object in all components.
 *       Always destructure this hook as `const tr = useTranslation()`.
 */
export function useTranslation() {
  const { language } = useLanguage();
  const translations = getI18n(language);

  return (keyPath, ...args) => {
    const keys = keyPath.split('.');
    let val = translations;
    for (const k of keys) val = val?.[k];

    // Fallback to French if key missing in target language
    if (val === undefined) {
      let fallback = getI18n('fr');
      for (const k of keys) fallback = fallback?.[k];
      val = fallback;
    }

    if (typeof val === 'function') return val(...args);
    return val ?? keyPath;
  };
}
