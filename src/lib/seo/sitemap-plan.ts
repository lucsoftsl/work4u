import type { SitemapItem } from "./public-api";

/** Entries per sitemap file. Google allows 50,000; smaller files keep each API/response light. */
export const SITEMAP_CHUNK = 5000;

export interface SitemapTotals { articles: number; workers: number; jobs: number }
export type SitemapKind = "core" | "articles" | "workers" | "jobs";

/** `core`, then `articles-0..n`, `workers-0..n`, `jobs-0..n`. Empty kinds get no file. */
export function planSitemaps(totals: SitemapTotals, chunk: number = SITEMAP_CHUNK): string[] {
  const ids = ["core"];
  for (const kind of ["articles", "workers", "jobs"] as const) {
    const pages = Math.ceil(totals[kind] / chunk);
    for (let i = 0; i < pages; i++) ids.push(`${kind}-${i}`);
  }
  return ids;
}

export function parseSitemapId(id: string): { kind: SitemapKind; page: number } | null {
  if (id === "core") return { kind: "core", page: 0 };
  const m = id.match(/^(articles|workers|jobs)-(\d+)$/);
  return m ? { kind: m[1] as SitemapKind, page: Number(m[2]) } : null;
}

export const PUBLIC_PATH: Record<Exclude<SitemapKind, "core">, string> = { articles: "/blog", workers: "/workers", jobs: "/jobs" };

/** Static, indexable pages (unprefixed English path; the sitemap lists every launch language version with hreflang alternates). */
export const CORE_PATHS: Array<{ path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }> = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/jobs", priority: 0.9, changeFrequency: "daily" },
  { path: "/workers", priority: 0.8, changeFrequency: "daily" },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  { path: "/how-it-works", priority: 0.7, changeFrequency: "monthly" },
  { path: "/pricing", priority: 0.6, changeFrequency: "monthly" },
  { path: "/business", priority: 0.6, changeFrequency: "monthly" },
  { path: "/field-service", priority: 0.8, changeFrequency: "monthly" }, // the B2B home (own header/footer, same sitemap)
  { path: "/contact", priority: 0.4, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
];

/** Canonical slug URL + lastmod from the API's updatedAt (invalid dates are dropped, never faked).
 *  User content is single-language: one URL per item (the unprefixed one), no language variants, no hreflang. */
export function toSitemapEntry(origin: string, kind: Exclude<SitemapKind, "core">, item: SitemapItem) {
  const t = Date.parse(item.updatedAt);
  return { url: `${origin}${PUBLIC_PATH[kind]}/${item.canonicalPath}`, ...(Number.isFinite(t) ? { lastModified: new Date(t) } : {}) };
}
