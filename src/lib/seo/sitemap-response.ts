import { sitemapFileEntries } from "./sitemap-data";
import { SITEMAP_HEADERS, urlsetXml } from "./sitemap-xml";

/** Seconds crawlers are asked to wait after an outage response. */
export const SITEMAP_RETRY_AFTER = 120;

// Last good XML per file id (this server process). When the API cannot be reached, this copy is served instead of an error: a
// crawler keeps its URLs. It lives only in memory, so a cold start during an outage has none and answers 503.
const lastGood = new Map<string, string>();

/** Test hook: forget every saved copy. */
export const resetSitemapCache = () => lastGood.clear();

/**
 * One sitemap file as an HTTP response.
 *  - unknown id → 404
 *  - API reachable → 200 and the copy is remembered
 *  - API unreachable → the last good copy (200, `X-Sitemap-Stale: 1`, cached for only a minute), else 503 + Retry-After with a
 *    plain-text body. Never a 500, and never an empty but valid <urlset>: an empty one would tell crawlers the URLs are gone.
 */
export async function sitemapFileResponse(id: string): Promise<Response> {
  try {
    const entries = await sitemapFileEntries(id);
    if (!entries) return new Response("Not found", { status: 404 });
    const xml = urlsetXml(entries);
    lastGood.set(id, xml);
    return new Response(xml, { headers: SITEMAP_HEADERS });
  } catch {
    const stale = lastGood.get(id);
    if (stale) return new Response(stale, { headers: { ...SITEMAP_HEADERS, "Cache-Control": "public, s-maxage=60", "X-Sitemap-Stale": "1" } });
    return new Response("Service temporarily unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": String(SITEMAP_RETRY_AFTER), "Cache-Control": "no-store" },
    });
  }
}
