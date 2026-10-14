import { sitemapFileResponse } from "@/lib/seo/sitemap-response";

export const dynamic = "force-dynamic";

/** /sitemap/core.xml, /sitemap/articles-0.xml, /sitemap/jobs-3.xml ...  API down: last good copy, else 503 + Retry-After (never 500). */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const id = file.endsWith(".xml") ? file.slice(0, -4) : "";
  if (!id) return new Response("Not found", { status: 404 });
  return sitemapFileResponse(id);
}
