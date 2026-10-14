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
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE } from '@/lib/i18n-routing';

// The DB (translationStrings table) is the editable source of truth for
// admins, but the running app never fetches it directly: these JSON files are
// resynced from the DB at build time (scripts/sync-translations.mjs, the
// "prebuild" step) and are what ships. English is bundled (it is the server
// render and the fallback for every missing key); the other four are separate
// chunks loaded only when a visitor actually uses that language, so a page no
// longer ships all five (about 825 KB raw) to everyone.
type Dict = Record<string, string>;

export const LOCALES = ['en', 'fr', 'es', 'hu', 'ro'] as const;
export type Locale = (typeof LOCALES)[number];
export type TranslationKey = keyof typeof en;

const LOADERS: Record<Exclude<Locale, 'en'>, () => Promise<{ default: Dict }>> = {
  fr: () => import('@/locales/fr.json'),
  es: () => import('@/locales/es.json'),
  hu: () => import('@/locales/hu.json'),
  ro: () => import('@/locales/ro.json'),
};

const loaded: Partial<Record<Locale, Dict>> = { en: en as Dict };
const inflight: Partial<Record<Locale, Promise<Dict>>> = {};

const isLocale = (value?: string | null): value is Locale =>
  value === 'en' || value === 'fr' || value === 'es' || value === 'hu' || value === 'ro';

/** Loads (once) the dictionary for a locale. English is always available. */
export function loadDictionary(locale: Locale): Promise<Dict> {
  const ready = loaded[locale];
  if (ready) return Promise.resolve(ready);
  inflight[locale] ??= LOADERS[locale as Exclude<Locale, 'en'>]().then((mod) => (loaded[locale] = mod.default as Dict));
  return inflight[locale] as Promise<Dict>;
}

const dictForLocale = (locale: Locale): Dict => loaded[locale] ?? (en as Dict);

/** Remembers the language: localStorage for the app, a cookie so the proxy can send returning visitors to their language. */
function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem('locale', locale);
  } catch {
    // ignore
  }
  document.cookie = `${LANG_COOKIE}=${locale}; Path=/; Max-Age=${LANG_COOKIE_MAX_AGE}; SameSite=Lax`;
}

function readLangCookie(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]+)`));
  return m ? m[1] : null;
}

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
  const cookie = readLangCookie();
  if (isLocale(cookie)) return cookie;

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

interface LocaleProviderProps {
  children: ReactNode;
  /** Public pages: the language of the URL (/ro/..., /es/..., or en for the unprefixed pages). The server rendered this language. */
  initialLocale?: Locale;
  /** The dictionary the server used for `initialLocale`, so the first client render matches the server HTML (no flash of English). */
  initialDictionary?: Dict;
}

export function LocaleProvider({ children, initialLocale, initialDictionary }: LocaleProviderProps) {
  // Seed the module cache before the first render: hydration must produce the same text the server sent.
  if (initialLocale && initialDictionary && !loaded[initialLocale]) loaded[initialLocale] = initialDictionary;
  // Private pages always start at 'en' so the client's first render matches the server's
  // (which has no access to localStorage/navigator.language) — reading the
  // real saved locale here instead caused a hydration mismatch on every
  // page that renders translated text (e.g. the footer). The real locale
  // is applied a moment later, client-only, via the effect below.
  // Public pages start at the URL's language instead.
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? 'en');
  // The URL language changed without a remount (e.g. /ro/jobs → /es/jobs): follow it (state derived from props, adjusted during render).
  const [seenInitial, setSeenInitial] = useState(initialLocale);
  if (initialLocale !== seenInitial) {
    setSeenInitial(initialLocale);
    if (initialLocale) setLocaleState(initialLocale);
  }
  // Bumped when a dictionary finishes loading so `t` re-renders with the real strings.
  const [dictVersion, setDictVersion] = useState(0);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    persistLocale(newLocale);
  };

  // One-time, client-only: adopt the saved/browser locale after mount.
  // This reads an external system (localStorage/navigator.language) that's
  // unavailable during SSR, so syncing it into state here — rather than in
  // the initializer above — is the deliberate fix for the hydration
  // mismatch, not an anti-pattern the lint rule below is meant to catch.
  useEffect(() => {
    const initial = getInitialLocale();
    // A prefixed URL (/ro, /es) is an explicit choice and wins. On an unprefixed page only the client-only languages
    // (fr, hu) are adopted from the saved preference: ro / es users are sent to their prefixed URL by the proxy.
    if (initialLocale && initialLocale !== 'en') return;
    if (initialLocale === 'en' && initial !== 'fr' && initial !== 'hu') return;
    setLocaleState((current) => (current === initial ? current : initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep <html lang> in step (screen readers, hyphenation). The server already sent the right one for public pages.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // A visit to a prefixed URL is a language choice: remember it (cookie for the proxy, localStorage for the app).
  useEffect(() => {
    if (initialLocale && initialLocale !== 'en') persistLocale(initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    if (locale === 'en') return;
    let active = true;
    void loadDictionary(locale).then(() => {
      if (active) setDictVersion((v) => v + 1);
    });
    return () => {
      active = false;
    };
  }, [locale]);

  const t = useMemo(() => {
    void dictVersion; // re-derive once the locale's dictionary has arrived
    return (key: TranslationKey | string, fallback?: string) => {
      const dict = dictForLocale(locale);
      const enDict = dictForLocale('en');
      return dict[key] ?? enDict[key] ?? fallback ?? key;
    };
  }, [locale, dictVersion]);

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
