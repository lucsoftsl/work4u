// Server-safe translator (no "use client"). Server components and generateMetadata translate into the page's URL language
// (en by default; ro / es for the prefixed pages). Only the dictionary of the requested language is loaded on the server.
import en from "@/locales/en.json";
import { isLaunchLang, type LaunchLang } from "@/lib/i18n-routing";

type Dict = Record<string, string>;
const enDict = en as Dict;

const LOADERS: Record<Exclude<LaunchLang, "en">, () => Promise<{ default: Dict }>> = {
  ro: () => import("@/locales/ro.json"),
  es: () => import("@/locales/es.json"),
};

const brand = (s: string) => s.replace(/\bwork4u\b/gi, "Work4U"); // brand spelling for server-rendered metadata

/** The dictionary for a launch language (English for anything else). */
export async function loadServerDictionary(lang: string): Promise<Dict> {
  if (!isLaunchLang(lang) || lang === "en") return enDict;
  return (await LOADERS[lang]()).default;
}

export type ServerT = (key: string, fallback?: string) => string;

/** Translator for a language: falls back to English per key, then to the fallback, then to the key. */
export async function getServerT(lang: string): Promise<ServerT> {
  const dict = await loadServerDictionary(lang);
  return (key, fallback) => brand(dict[key] ?? enDict[key] ?? fallback ?? key);
}

/** English translator (kept for callers that have no language, e.g. private pages and the share-image routes). */
export function serverT(key: string, fallback?: string): string {
  return brand(enDict[key] ?? fallback ?? key);
}
