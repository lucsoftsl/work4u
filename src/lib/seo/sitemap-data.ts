import { list, type SitemapItem } from "./public-api";
import { CORE_PATHS, PUBLIC_PATH, SITEMAP_CHUNK, parseSitemapId, planSitemaps, toSitemapEntry } from "./sitemap-plan";
import { SITE_URL, absoluteUrl } from "./site";
import { LAUNCH_LANGS, hreflangMap, localizedPath } from "../i18n-routing";
import type { SitemapUrl } from "./sitemap-xml";
import buildInfo from "@/data/build-info.generated.json";

type Kind = "articles" | "workers" | "jobs";
const KINDS: readonly Kind[] = ["articles", "workers", "jobs"];

/** Count + newest update per kind. A failing API counts as empty (robots/sitemap never take the site down, and the next request retries). */
export async function sitemapSummary(): Promise<Record<Kind, { total: number; newest?: string }>> {
  const entries = await Promise.all(
    KINDS.map(async (k) => {
      try {
        const r = await list<SitemapItem>(k, { limit: 1, sitemap: true }); // sorted by updatedAt DESC for jobs/workers
        return [k, { total: r.total, newest: r.items[0]?.updatedAt }] as const;
      } catch {
        return [k, { total: 0 }] as const;
      }
    }),
  );
  return Object.fromEntries(entries) as Record<Kind, { total: number; newest?: string }>;
}

/** Static pages only change with a deploy: their lastmod is the build's content date (git commit date, else build time), written by
 *  scripts/write-build-info.mjs at build, so it needs no deploy variable. NEXT_PUBLIC_BUILD_DATE can still override it. */
const STATIC_LASTMOD: string | undefined = (process.env.NEXT_PUBLIC_BUILD_DATE || buildInfo.builtAt) || undefined;

export async function sitemapFileIds(): Promise<string[]> {
  const s = await sitemapSummary();
  return planSitemaps({ articles: s.articles.total, workers: s.workers.total, jobs: s.jobs.total });
}

export async function sitemapIndexEntries(): Promise<Array<{ url: string; lastModified?: string }>> {
  const s = await sitemapSummary();
  const ids = planSitemaps({ articles: s.articles.total, workers: s.workers.total, jobs: s.jobs.total });
  return ids.map((id) => {
    const parsed = parseSitemapId(id);
    const newest = parsed && parsed.kind !== "core" ? s[parsed.kind].newest : STATIC_LASTMOD;
    return { url: `${SITE_URL}/sitemap/${id}.xml`, ...(newest ? { lastModified: newest } : {}) };
  });
}

/** Entries of one sitemap file, or null for an unknown id (→ 404). */
export async function sitemapFileEntries(id: string): Promise<SitemapUrl[] | null> {
  const parsed = parseSitemapId(id);
  if (!parsed) return null;
  if (parsed.kind === "core") {
    const s = await sitemapSummary();
    const newestFor: Record<string, string | undefined> = { "/": newest(s), "/jobs": s.jobs.newest, "/workers": s.workers.newest, "/blog": s.articles.newest };
    // One entry per language version, each carrying the full reciprocal hreflang set (en, ro, es, x-default → unprefixed English).
    return CORE_PATHS.flatMap((p) => {
      const lastModified = newestFor[p.path] ?? STATIC_LASTMOD;
      const alternates = hreflangMap(p.path, absoluteUrl);
      return LAUNCH_LANGS.map((lang) => ({ url: absoluteUrl(localizedPath(lang, p.path)), alternates, changeFrequency: p.changeFrequency, priority: p.priority, ...(lastModified ? { lastModified } : {}) }));
    });
  }
  const kind = parsed.kind;
  const { items } = await list<SitemapItem>(kind, { limit: SITEMAP_CHUNK, offset: parsed.page * SITEMAP_CHUNK, sitemap: true });
  return items.map((item) => toSitemapEntry(SITE_URL, kind, item));
}

function newest(s: Record<Kind, { newest?: string }>): string | undefined {
  return KINDS.map((k) => s[k].newest).filter((x): x is string => !!x).sort().at(-1);
}

export { PUBLIC_PATH };
