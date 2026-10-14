/**
 * Routes that must never be indexed: signed-in app, admin, B2B apps, auth pages, invite links, dev leftovers.
 * Used for the X-Robots-Tag headers in next.config.ts and for the robots.txt Disallow list.
 * Every top-level folder in src/app must be listed here or in PUBLIC_ROUTES (enforced by routes.test.ts).
 */
export const PRIVATE_ROUTE_PREFIXES = [
  "/admin", "/ops", "/tech", "/b2b",
  "/dashboard", "/chat", "/profile", "/notifications", "/referrals",
  "/my-jobs", "/my-applications", "/my-listings",
  "/post-job", "/post-service",
  "/signin", "/signup",
  "/business/dashboard", "/business/roster", "/business/schedule",
  "/test",
] as const;

/** Job sub-pages that are private even though /jobs/[id] is public. */
export const PRIVATE_JOB_SUBPAGES = ["edit", "nearby-pros"] as const;

/** Top-level app folders that are public (indexable) pages or non-page route handlers. */
export const PUBLIC_ROUTES = ["", "blog", "business", "contact", "how-it-works", "jobs", "pricing", "privacy", "terms", "workers", "api", "sitemap", "sitemap.xml"] as const;

export function isPrivatePath(pathname: string): boolean {
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  if (PRIVATE_ROUTE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return true;
  const m = path.match(/^\/jobs\/[^/]+\/([^/]+)$/);
  return !!m && (PRIVATE_JOB_SUBPAGES as readonly string[]).includes(m[1]);
}

/** next.config.ts `headers()` sources (path-to-regexp). */
export const PRIVATE_HEADER_SOURCES: string[] = [
  ...PRIVATE_ROUTE_PREFIXES.flatMap((p) => [p, `${p}/:path*`]),
  "/jobs/:id/edit", "/jobs/:id/nearby-pros",
];
