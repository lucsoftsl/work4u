'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import en from '@/locales/en.json';
import fr from '@/locales/fr.json';
import es from '@/locales/es.json';

type Dictionaries = {
  en: typeof en;
  fr: typeof fr;
  es: typeof es;
};

const dictionaries: Dictionaries = { en, fr, es };

export type Locale = keyof Dictionaries;
export type TranslationKey = keyof typeof en;

const isLocale = (value?: string | null): value is Locale =>
  value === 'en' || value === 'fr' || value === 'es';

const dictForLocale = (locale: Locale) =>
  dictionaries[locale] as Record<string, string>;

function getInitialLocale(): Locale {
  // This file is a client component, but keep it safe anyway.
  if (typeof window === 'undefined') return 'en';

  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem('locale');
  } catch {
    // ignore
  }

  if (isLocale(saved)) return saved;

  const browser = window.navigator.language?.split('-')[0] ?? 'en';
  return isLocale(browser) ? browser : 'en';
}

export function getTranslator(locale?: string) {
  const lang: Locale = isLocale(locale) ? locale : 'en';

  return (key: TranslationKey | string, fallback?: string) => {
    const dict = dictForLocale(lang);
    const enDict = dictForLocale('en');
    return dict[key] ?? enDict[key] ?? fallback ?? key;
  };
}

// Locale Context
interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey | string, fallback?: string) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getInitialLocale());

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
  };

  // Side-effect: persist locale when it changes
  useEffect(() => {
    try {
      window.localStorage.setItem('locale', locale);
    } catch {
      // ignore
    }
  }, [locale]);

  const t = useMemo(() => {
    return (key: TranslationKey | string, fallback?: string) => {
      const dict = dictForLocale(locale);
      const enDict = dictForLocale('en');
      return dict[key] ?? enDict[key] ?? fallback ?? key;
    };
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LocaleContext);

  if (!context) {
    return {
      locale: 'en' as Locale,
      setLocale: () => { },
      t: (key: TranslationKey | string, fallback?: string) => {
        const enDict = dictForLocale('en');
        return enDict[key] ?? fallback ?? key;
      },
    };
  }

  return context;
}
