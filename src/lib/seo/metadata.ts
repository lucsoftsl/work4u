import type { Metadata } from "next";
import { BRAND, DEFAULT_DESCRIPTION, absoluteUrl, b2bAbsoluteUrl } from "./site";
import { DEFAULT_LANG, hreflangMap, localizedPath } from "../i18n-routing";

/** Site-wide share image (app/opengraph-image.tsx); used whenever a page has no image of its own. */
export const FALLBACK_OG_IMAGE = "/opengraph-image";

const MAX_DESCRIPTION = 160;

/** Collapse whitespace, strip tags and cut at a word boundary: good enough for <meta description> from user text. */
export function toDescription(text: string | null | undefined, fallback: string = DEFAULT_DESCRIPTION, max = MAX_DESCRIPTION): string {
  const flat = String(text ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  if (!flat) return fallback;
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:-]+$/, "")}…`;
}

const MAX_TITLE = 58; // + " · Work4U" stays within the ~65 characters search engines show

/** Cut a long title (job titles are user text) at a word boundary so the <title> is not truncated mid-word by the search engine. */
export function toTitle(text: string, max = MAX_TITLE): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.5 ? cut.slice(0, space) : cut).replace(/[\s,.;:·|-]+$/, "")}…`;
}

export interface PageMeta {
  /** Page title without the brand; the root template appends " · Work4U". */
  title: string;
  description?: string | null;
  /** Canonical path, e.g. "/jobs/fix-a-tap-123". */
  path: string;
  image?: string | null;
  type?: "website" | "article";
  noindex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  /** Language of the page being rendered (the URL prefix). Default: English, unprefixed. */
  lang?: string;
  /**
   * "pages" (default): static/listing pages that exist in every launch language: self-canonical per language plus
   * hreflang alternates (en, ro, es, x-default). "item": user content (jobs, articles, workers) is single-language and not
   * translated, so every language prefix shows the same content: all of them canonicalize to ONE URL and carry no hreflang.
   */
  alternates?: "pages" | "item";
  /** For alternates "item": the language of the content (null/unknown → the unprefixed English URL). */
  contentLang?: string | null;
  /** Which site the page belongs to: "b2b" builds URLs on the B2B origin (same as the marketplace until the B2B site has its own host). */
  site?: "marketplace" | "b2b";
}

/** OpenGraph locale codes of the launch languages. */
const OG_LOCALE: Record<string, string> = { en: "en_US", ro: "ro_RO", es: "es_ES" };

export function pageMetadata(meta: PageMeta): Metadata {
  const description = toDescription(meta.description);
  const lang = meta.lang ?? DEFAULT_LANG;
  const isItem = meta.alternates === "item";
  // Self-referencing canonical per language; for user content, one canonical for all prefixes.
  const canonicalLang = isItem ? itemCanonicalLang(meta.contentLang) : lang;
  const abs = meta.site === "b2b" ? b2bAbsoluteUrl : absoluteUrl;
  const url = abs(localizedPath(canonicalLang, meta.path));
  const image = meta.image ? (meta.image.startsWith("http") ? meta.image : abs(meta.image)) : abs(FALLBACK_OG_IMAGE);
  const title = toTitle(meta.title);
  const fullTitle = `${title} · ${BRAND}`;
  return {
    title,
    description,
    alternates: isItem ? { canonical: url } : { canonical: url, languages: hreflangMap(meta.path, abs) },
    robots: meta.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: meta.type ?? "website",
      siteName: BRAND,
      locale: OG_LOCALE[canonicalLang] ?? OG_LOCALE[DEFAULT_LANG],
      title: fullTitle,
      description,
      url,
      images: [{ url: image }],
      ...(meta.type === "article" && meta.publishedTime ? { publishedTime: meta.publishedTime } : {}),
      ...(meta.type === "article" && meta.modifiedTime ? { modifiedTime: meta.modifiedTime } : {}),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [image] },
  };
}

/** Private / transient pages: no index, no follow, no canonical games. */
export const NOINDEX: Metadata = { robots: { index: false, follow: false } };

/**
 * The one language version of a user-content item that search engines should index: the content's own language when it is a
 * launch language, otherwise the unprefixed English URL (the item's original URL, so nothing existing moves).
 */
export function itemCanonicalLang(contentLang: string | null | undefined): string {
  return contentLang === "ro" || contentLang === "es" ? contentLang : DEFAULT_LANG;
}

/** Whether a list under `/{lang}` should show an item: unknown content language shows everywhere, known only under its own. */
export function showsUnderLang(contentLang: string | null | undefined, lang: string): boolean {
  if (!contentLang) return true;
  const own = contentLang === "ro" || contentLang === "es" ? contentLang : DEFAULT_LANG;
  return own === lang;
}
