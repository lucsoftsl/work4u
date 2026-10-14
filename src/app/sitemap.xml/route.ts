import { sitemapIndexEntries } from "@/lib/seo/sitemap-data";
import { SITEMAP_HEADERS, sitemapIndexXml } from "@/lib/seo/sitemap-xml";

// Rendered on every request (never at build time, so a build with the API down cannot fail on it); the API calls behind it are
// cached for a few minutes, so new jobs / articles / workers appear without a redeploy.
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(sitemapIndexXml(await sitemapIndexEntries()), { headers: SITEMAP_HEADERS });
}
