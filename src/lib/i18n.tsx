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
import hu from '@/locales/hu.json';
import ro from '@/locales/ro.json';

type Dictionaries = {
  en: typeof en;
  fr: typeof fr;
  es: typeof es;
  hu: typeof hu;
  ro: typeof ro;
};

// The DB (translationStrings table) is the editable source of truth for
// admins, but the running app never fetches it directly — these bundled
// JSON files are resynced from the DB at build time (see
// scripts/sync-translations.mjs, wired as the "prebuild" step) and are what
// actually ships. This keeps every page load a synchronous, zero-network
// dictionary lookup instead of a per-locale-change API round trip.
const dictionaries: Dictionaries = { en, fr, es, hu, ro };

export type Locale = keyof Dictionaries;
export type TranslationKey = keyof typeof en;

const isLocale = (value?: string | null): value is Locale =>
  value === 'en' || value === 'fr' || value === 'es' || value === 'hu' || value === 'ro';

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
  // Always start at 'en' so the client's first render matches the server's
  // (which has no access to localStorage/navigator.language) — reading the
  // real saved locale here instead caused a hydration mismatch on every
  // page that renders translated text (e.g. the footer). The real locale
  // is applied a moment later, client-only, via the effect below.
  const [locale, setLocaleState] = useState<Locale>('en');

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
  };

  // One-time, client-only: adopt the saved/browser locale after mount.
  // This reads an external system (localStorage/navigator.language) that's
  // unavailable during SSR, so syncing it into state here — rather than in
  // the initializer above — is the deliberate fix for the hydration
  // mismatch, not an anti-pattern the lint rule below is meant to catch.
  useEffect(() => {
    const initial = getInitialLocale();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocaleState((current) => (current === initial ? current : initial));
  }, []);

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
