/**
 * Server-side client for the public, cacheable content API (`/api/public/*`, no auth, no cookies).
 * Uses Next's data cache (`revalidate`) so one render does not become one API request: the API allows
 * 600 req/min per IP and the Next server shares one IP.
 */
import { API_BASE_URL } from "@/lib/http";

export type PublicBudgetType = "FIXED" | "HOURLY";

export interface PublicJob {
  id: string; slug: string; canonicalPath: string;
  title: string; category: string; summary?: string; description?: string;
  budget: number; budgetType: PublicBudgetType; budgetCurrency: string;
  location: string; remote: boolean; employerName: string | null;
  /** Derived from the geocoded location by the API; null when it cannot be told reliably. `region` is always null for now. */
  country?: string | null; region?: string | null; city?: string | null;
  /** Company name for company (Business) jobs. `employerName` is the poster's personal name and must never be used as hiringOrganization. */
  companyName?: string | null;
  postedByCompany: boolean; jobPostingEligible: boolean;
  validThrough: string | null; createdAt: string; updatedAt: string; contentLanguage: string | null;
}
export interface PublicArticle {
  id: string; slug: string; canonicalPath: string; title: string; excerpt: string | null;
  coverImageUrl: string | null; publishedAt: string; updatedAt: string; contentLanguage: string | null;
  bodyHtml?: string | null;
}
export interface PublicListing {
  id: string; title: string; category: string; description: string; pricingModel: string | null;
  rate: number | null; rateCurrency: string | null; serviceRadiusKm: number | null; availability: string | null;
  imageUrl: string | null; updatedAt: string;
}
export interface PublicWorker {
  id: string; slug: string; canonicalPath: string; name: string; photoUrl: string | null;
  rating: number | null; reviewCount: number; listingCount: number; categories: string[]; updatedAt: string;
  indexable?: boolean; listings?: PublicListing[];
}
export interface SitemapItem { id: string; slug: string; canonicalPath: string; updatedAt: string; postedByCompany?: boolean }
export interface PublicList<T> { items: T[]; total: number; limit: number; offset: number }

export type Lookup<T> = { status: "ok"; data: T } | { status: "missing" } | { status: "gone" } | { status: "unavailable" };

export type PublicKind = "jobs" | "articles" | "workers";

/** Worker pages must reflect an opt-out or deletion quickly (the API caches them for about a minute). */
const REVALIDATE: Record<PublicKind, number> = { jobs: 300, articles: 600, workers: 60 };

async function request(path: string, kind: PublicKind): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/public/${path}`, { headers: { Accept: "application/json" }, next: { revalidate: REVALIDATE[kind], tags: [`public-${kind}`] } });
}

/** 404 → missing, 410 → gone, API unreachable or erroring → unavailable (the page answers 503, never a 404 that would drop the URL). */
export async function lookup<T>(kind: PublicKind, idOrSlug: string): Promise<Lookup<T>> {
  try {
    const res = await request(`${kind}/${encodeURIComponent(idOrSlug)}`, kind);
    if (res.status === 404) return { status: "missing" };
    if (res.status === 410) return { status: "gone" };
    if (!res.ok) return { status: "unavailable" };
    return { status: "ok", data: (await res.json()) as T };
  } catch {
    return { status: "unavailable" };
  }
}

export async function list<T>(kind: PublicKind, opts: { limit?: number; offset?: number; sitemap?: boolean } = {}): Promise<PublicList<T>> {
  const q = new URLSearchParams();
  if (opts.limit) q.set("limit", String(opts.limit));
  if (opts.offset) q.set("offset", String(opts.offset));
  if (opts.sitemap) q.set("view", "sitemap");
  const res = await request(`${kind}${q.size ? `?${q}` : ""}`, kind);
  if (!res.ok) throw new Error(`Public ${kind} list failed (${res.status})`);
  return (await res.json()) as PublicList<T>;
}

export const getPublicJob = (idOrSlug: string) => lookup<PublicJob>("jobs", idOrSlug);
export const getPublicArticle = (idOrSlug: string) => lookup<PublicArticle>("articles", idOrSlug);
export const getPublicWorker = (idOrSlug: string) => lookup<PublicWorker>("workers", idOrSlug);
export const listPublicJobs = (limit = 24, offset = 0) => list<PublicJob>("jobs", { limit, offset });
export const listPublicArticles = (limit = 60, offset = 0) => list<PublicArticle>("articles", { limit, offset });
export const listPublicWorkers = (limit = 24, offset = 0) => list<PublicWorker>("workers", { limit, offset });
