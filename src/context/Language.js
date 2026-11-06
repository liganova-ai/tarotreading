import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import translations from '@/lib/translations.json';
import { isLanguage } from '@/lib/languages.mjs';

const LanguageContext = createContext(null);
export function LanguageProvider({ children }) {
  const router = useRouter();
  const [language, updateLanguage] = useState('en');
  const [languageReady, setReady] = useState(false);
  useEffect(() => {
    try { const saved = localStorage.getItem('oracle-language'); if (isLanguage(saved)) updateLanguage(saved); } catch {}
    setReady(true);
  }, []);
  const setLanguage = useCallback(value => {
    if (router.pathname !== '/' || !isLanguage(value)) return;
    updateLanguage(value);
    try { localStorage.setItem('oracle-language', value); } catch {}
  }, [router.pathname]);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const t = useCallback((text, values = {}) => {
    let translated = translations[language][text] || text;
    for (const [key, value] of Object.entries(values)) translated = translated.replaceAll(`{${key}}`, String(value));
    return translated;
  }, [language]);
  return <LanguageContext.Provider value={{ language, languageReady, setLanguage, t }}>{children}</LanguageContext.Provider>;
}
export const useLanguage = () => useContext(LanguageContext);
