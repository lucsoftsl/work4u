export interface SitemapUrl {
  url: string; lastModified?: Date | string; changeFrequency?: string; priority?: number;
  /** hreflang → absolute URL (en, ro, es, x-default), written as xhtml:link alternates. Every language version lists the full set. */
  alternates?: Readonly<Record<string, string>>;
}

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const day = (d: Date | string | undefined) => {
  if (!d) return null;
  const t = d instanceof Date ? d.getTime() : Date.parse(d);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};

/** One sitemap file (<urlset>). Invalid dates are left out, never replaced by "now". */
export function urlsetXml(entries: ReadonlyArray<SitemapUrl>): string {
  const rows = entries.map((e) => {
    const lastmod = day(e.lastModified);
    const alternates = Object.entries(e.alternates ?? {}).map(([lang, href]) => `<xhtml:link rel="alternate" hreflang="${escapeXml(lang)}" href="${escapeXml(href)}"/>`).join("");
    return `<url><loc>${escapeXml(e.url)}</loc>${alternates}${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}${e.changeFrequency ? `<changefreq>${e.changeFrequency}</changefreq>` : ""}${e.priority !== undefined ? `<priority>${e.priority}</priority>` : ""}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${rows.join("")}</urlset>\n`;
}

/** The sitemap index (<sitemapindex>) listing the files. */
export function sitemapIndexXml(files: ReadonlyArray<{ url: string; lastModified?: Date | string }>): string {
  const rows = files.map((f) => {
    const lastmod = day(f.lastModified);
    return `<sitemap><loc>${escapeXml(f.url)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</sitemap>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows.join("")}</sitemapindex>\n`;
}

export const SITEMAP_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  // Shared caches may keep it for 5 minutes and serve stale for 10 while revalidating: new content shows up quickly.
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
} as const;
