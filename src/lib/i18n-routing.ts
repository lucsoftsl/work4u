/**
 * Language-prefixed public URLs (SEO Phase 1). Pure helpers shared by the proxy, server pages, metadata and client links.
 *
 *   English is the default and lives at the unprefixed URL (`/jobs`); ro and es live at `/ro/jobs`, `/es/jobs`.
 *   fr and hu stay selectable inside the app but are NOT indexed languages: `/fr/...` and `/hu/...` redirect to the unprefixed URL.
 *   Only public marketing/content pages are prefixed. The signed-in app, admin, B2B apps, auth pages and invite links never are.
 */
import { PRIVATE_ROUTE_PREFIXES, isPrivatePath } from "./seo/private-routes";

export const DEFAULT_LANG = "en" as const;
/** Languages that have their own indexed URLs (hreflang set). */
export const LAUNCH_LANGS = ["en", "ro", "es"] as const;
export type LaunchLang = (typeof LAUNCH_LANGS)[number];
/** Selectable in the app, but without indexed URLs. */
export const CLIENT_ONLY_LANGS = ["fr", "hu"] as const;
export const ALL_LANGS = [...LAUNCH_LANGS, ...CLIENT_ONLY_LANGS] as const;
export type AppLang = (typeof ALL_LANGS)[number];

/** The language choice cookie (also read by the proxy to send returning visitors to their language). */
export const LANG_COOKIE = "NEXT_LOCALE";
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const isLaunchLang = (v: unknown): v is LaunchLang => typeof v === "string" && (LAUNCH_LANGS as readonly string[]).includes(v);
export const isAppLang = (v: unknown): v is AppLang => typeof v === "string" && (ALL_LANGS as readonly string[]).includes(v);

/** Public sections whose pages are localized. `/business` is the marketing page only; its sub-pages are the private company app. */
const EXACT_PUBLIC = new Set(["/", "/service-unavailable", "/pricing", "/how-it-works", "/contact", "/business", "/field-service", "/privacy", "/terms", "/blog", "/jobs", "/workers"]);
/** Sections with one level of detail pages: /blog/{slug-id}, /jobs/{slug-id}, /workers/{slug-id}. */
const DETAIL_PUBLIC = ["blog", "jobs", "workers"] as const;

const clean = (path: string) => {
  const p = path.split(/[?#]/)[0].replace(/\/+$/, "");
  return p === "" ? "/" : p;
};

/** True for pages that exist in every launch language (so they get a prefix). `/jobs/x/edit` or `/business/dashboard` are not. */
export function isLocalizablePath(path: string): boolean {
  const p = clean(path);
  if (EXACT_PUBLIC.has(p)) return true;
  const parts = p.split("/").filter(Boolean);
  return parts.length === 2 && (DETAIL_PUBLIC as readonly string[]).includes(parts[0]);
}

/** Splits a leading language segment: `/ro/jobs` → { lang: "ro", path: "/jobs" }; no prefix → lang null. */
export function splitLangPrefix(pathname: string): { lang: AppLang | null; path: string } {
  const m = pathname.match(/^\/([a-z]{2})(\/.*|$)/);
  if (m && isAppLang(m[1])) return { lang: m[1], path: m[2] === "" ? "/" : m[2] };
  return { lang: null, path: pathname || "/" };
}

/** `localizedPath("ro", "/jobs?x=1")` → `/ro/jobs?x=1`. English and non-localizable paths are returned unchanged. */
export function localizedPath(lang: string | null | undefined, href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const { path } = splitLangPrefix(href.split(/[?#]/)[0]);
  const rest = href.slice(href.split(/[?#]/)[0].length);
  if (!isLocalizablePath(path) || !isLaunchLang(lang) || lang === DEFAULT_LANG) return `${path}${rest}`;
  return `${path === "/" ? `/${lang}` : `/${lang}${path}`}${rest}`;
}

/** The unprefixed (English / canonical) form of any path. */
export const canonicalPathOf = (href: string): string => localizedPath(DEFAULT_LANG, href);

/** hreflang map for a localizable path: en, ro, es and x-default (the unprefixed English URL). Absolute URLs. */
export function hreflangMap(path: string, absolute: (p: string) => string): Record<string, string> {
  const base = splitLangPrefix(path).path;
  const out: Record<string, string> = {};
  for (const l of LAUNCH_LANGS) out[l] = absolute(localizedPath(l, base));
  out["x-default"] = absolute(localizedPath(DEFAULT_LANG, base));
  return out;
}

/** Bots never get a language suggestion or a cookie-based redirect (cookie redirects need a cookie, which bots do not send). */
export const BOT_UA = new RegExp(
  [
    "bot", "crawl", "spider", "slurp", "lighthouse", "headless", "pagespeed", "preview", // generic (Googlebot, bingbot, Twitterbot, LinkedInBot, Slackbot...)
    "facebookexternalhit", "facebot", "whatsapp", "telegram", "discord", "slack", "skype", "pinterest", "embedly", "vkshare", "quora",
    "applebot", "yandex", "baidu", "duckduck", "ahrefs", "semrush", "inspectiontool", "mediapartners", "adsbot", // link unfurlers, search and SEO tools
  ].join("|"),
  "i",
);

/** Browser language ("ro-RO") → a launch language, else null. */
export function launchLangOf(navigatorLanguage: string | null | undefined): LaunchLang | null {
  const base = (navigatorLanguage ?? "").toLowerCase().split("-")[0];
  return isLaunchLang(base) ? base : null;
}

/** First path segments that exist (public sections, private app, handlers). Anything else is an unknown URL → a real, styled 404. */
const KNOWN_ROOTS = new Set<string>([
  ...PRIVATE_ROUTE_PREFIXES.map((p) => p.split("/")[1]),
  ...[...EXACT_PUBLIC].map((p) => p.split("/")[1]).filter(Boolean),
  "api", "sitemap", "robots.txt", "opengraph-image", "twitter-image", "icon",
]);

/** Pages rendered by the proxy's rewrites with an explicit status (a rewrite's status is the response status):
 *  - /{lang}/not-found-page: the styled 404 as a normal page, with real server HTML (notFound() inside a route group falls back to
 *    Next's empty `__next_error__` shell that only the client fills in);
 *  - /{lang}/service-unavailable: the "temporarily unavailable" state (503 + Retry-After) that list/detail pages redirect to when the API is down. */
export const NOT_FOUND_PAGE = "/not-found-page";
export const UNAVAILABLE_PAGE = "/service-unavailable";
export const RETRY_AFTER_SECONDS = 120;

const NOINDEX_HEADERS = { "X-Robots-Tag": "noindex, nofollow" } as const;
const pageLang = (lang: string | null | undefined) => (lang === "ro" || lang === "es" ? lang : DEFAULT_LANG);

const notFoundFor = (lang: string | null | undefined, search: string): ProxyDecision => ({
  action: "rewrite", to: `/${pageLang(lang)}${NOT_FOUND_PAGE}${search}`, status: 404, headers: NOINDEX_HEADERS,
});
const unavailableFor = (lang: string | null | undefined, search: string): ProxyDecision => ({
  action: "rewrite", to: `/${pageLang(lang)}${UNAVAILABLE_PAGE}${search}`, status: 503, headers: { ...NOINDEX_HEADERS, "Retry-After": String(RETRY_AFTER_SECONDS) },
});

/** Where a public page sends the visitor when the content API is unreachable. `from` is the URL to retry (same-site path only). */
export function unavailablePath(lang: string | null | undefined, from: string): string {
  const safe = from.startsWith("/") && !from.startsWith("//") ? from : "/";
  return `${localizedPath(lang, UNAVAILABLE_PAGE)}?from=${encodeURIComponent(safe)}`;
}

/** The retry target from `?from=`: a local path or "/". */
export function retryTarget(from: string | string[] | undefined): string {
  const v = Array.isArray(from) ? from[0] : from;
  return v && v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : "/";
}

export type ProxyDecision =
  | { action: "next" }
  | { action: "rewrite"; to: string; status?: 404 | 503; headers?: Readonly<Record<string, string>> }
  | { action: "redirect"; to: string; status: 301 | 302 | 307 | 308; cookieLang?: AppLang };

/**
 * What the proxy does for a request. Pure, so it is unit-tested without a server.
 *  - `/en/...`            → 301 to the unprefixed URL (canonical)
 *  - `/fr/...`, `/hu/...` → 302 to the unprefixed URL, remembering the choice in the cookie (client-side language, not indexed)
 *  - `/ro/...`, `/es/...` → served (the [lang] segment); a prefixed non-public path (`/ro/dashboard`) → 308 to the unprefixed path
 *  - unprefixed public    → cookie ro/es and a normal visit → 307 to that language; otherwise rewrite to the English tree
 *  - everything else (private app, assets, api) → untouched
 */
export function decideRoute(input: { pathname: string; search: string; cookieLang: string | null | undefined; userAgent?: string | null }): ProxyDecision {
  const { pathname, search } = input;
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) return { action: "next" }; // files (the proxy matcher skips them too)
  const { lang, path } = splitLangPrefix(pathname);

  if (lang) {
    if (lang === "en") return { action: "redirect", to: `${path}${search}`, status: 301 };
    if (lang === "fr" || lang === "hu") return { action: "redirect", to: `${path}${search}`, status: 302, cookieLang: lang };
    if (path === UNAVAILABLE_PAGE) return unavailableFor(lang, search);
    if (isLocalizablePath(path)) return { action: "next" };
    // A prefix on a private path (/ro/dashboard) goes to the private route; on anything else (/ro/foo) it is simply a 404.
    return isPrivatePath(path) ? { action: "redirect", to: `${path}${search}`, status: 308 } : notFoundFor(lang, search);
  }

  if (pathname === UNAVAILABLE_PAGE) return unavailableFor(DEFAULT_LANG, search); // never cookie-redirected: it is a transient error page
  if (!isLocalizablePath(pathname)) {
    const root = pathname.split("/")[1] ?? "";
    // Unknown first segment (/foo, /xx/jobs): a 404 in the language the visitor chose, when known.
    return KNOWN_ROOTS.has(root) ? { action: "next" } : notFoundFor(input.cookieLang, search);
  }
  const bot = BOT_UA.test(input.userAgent ?? "");
  if (!bot && (input.cookieLang === "ro" || input.cookieLang === "es")) return { action: "redirect", to: `${localizedPath(input.cookieLang, pathname)}${search}`, status: 307 };
  return { action: "rewrite", to: `/en${pathname === "/" ? "" : pathname}${search}` };
}
