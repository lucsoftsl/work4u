import type { MetadataRoute } from "next";
import { PRIVATE_ROUTE_PREFIXES } from "@/lib/seo/private-routes";
import { SITE_URL } from "@/lib/seo/site";

// robots.txt only steers crawling; the real "do not index" is the noindex header/meta on those routes.
// Static on purpose: it must never depend on the API (the sitemap index lists the files at request time).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...PRIVATE_ROUTE_PREFIXES, "/api"] }], // prefix rules: "/signin" also covers "/signin/..."
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
