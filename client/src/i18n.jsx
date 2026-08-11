import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Translations live in per-language JSON under i18n/locales/. English (en.json) is the
// single source of truth; run `npm run i18n:sync` to auto-fill the others (scripts/i18n-sync.js).
import en from './i18n/locales/en.json';
import hi from './i18n/locales/hi.json';
import ar from './i18n/locales/ar.json';
import bn from './i18n/locales/bn.json';
import es from './i18n/locales/es.json';
import fr from './i18n/locales/fr.json';
import ru from './i18n/locales/ru.json';

/* ---------- simplified inline SVG flags (render everywhere, unlike emoji flags) ---------- */
const FLAGS = {
  en: (<svg viewBox="0 0 20 14"><rect width="20" height="14" fill="#012169" /><path d="M0 0 20 14M20 0 0 14" stroke="#fff" strokeWidth="2.6" /><path d="M0 0 20 14M20 0 0 14" stroke="#C8102E" strokeWidth="1.2" /><path d="M10 0V14M0 7H20" stroke="#fff" strokeWidth="3.6" /><path d="M10 0V14M0 7H20" stroke="#C8102E" strokeWidth="2" /></svg>),
  hi: (<svg viewBox="0 0 20 14"><rect width="20" height="4.67" fill="#FF9933" /><rect y="4.67" width="20" height="4.67" fill="#fff" /><rect y="9.33" width="20" height="4.67" fill="#138808" /><circle cx="10" cy="7" r="1.5" fill="none" stroke="#000080" strokeWidth=".5" /></svg>),
  ar: (<svg viewBox="0 0 20 14"><rect width="20" height="14" fill="#006C35" /><rect x="3" y="9" width="14" height="1.3" fill="#fff" /></svg>),
  bn: (<svg viewBox="0 0 20 14"><rect width="20" height="14" fill="#006A4E" /><circle cx="8.5" cy="7" r="3.3" fill="#F42A41" /></svg>),
  es: (<svg viewBox="0 0 20 14"><rect width="20" height="14" fill="#AA151B" /><rect y="3.5" width="20" height="7" fill="#F1BF00" /></svg>),
  fr: (<svg viewBox="0 0 20 14"><rect width="6.67" height="14" fill="#0055A4" /><rect x="6.67" width="6.67" height="14" fill="#fff" /><rect x="13.33" width="6.67" height="14" fill="#EF4135" /></svg>),
  ru: (<svg viewBox="0 0 20 14"><rect width="20" height="4.67" fill="#fff" /><rect y="4.67" width="20" height="4.67" fill="#0039A6" /><rect y="9.33" width="20" height="4.67" fill="#D52B1E" /></svg>),
};

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ar', label: 'العربية' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'ru', label: 'Русский' },
];

export function Flag({ code }) {
  return <span className="flag" aria-hidden="true">{FLAGS[code] || FLAGS.en}</span>;
}

/* ---------- translations (assembled from locale JSON) ---------- */
const translations = { en, hi, ar, bn, es, fr, ru };

const LangCtx = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('dbl_lang') || 'en');

  useEffect(() => {
    localStorage.setItem('dbl_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const t = useCallback((key) => {
    const get = (obj) => key.split('.').reduce((a, k) => (a ? a[k] : undefined), obj);
    return get(translations[lang]) ?? get(translations.en) ?? key;
  }, [lang]);

  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);
