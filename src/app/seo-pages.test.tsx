import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import type { PublicArticle, PublicJob, PublicWorker } from "@/lib/seo/public-api";

const m = vi.hoisted(() => ({
  article: { status: "missing" } as unknown, job: { status: "missing" } as unknown, worker: { status: "missing" } as unknown,
  signedIn: false,
}));
class Nav extends Error { constructor(public kind: string, public to?: string) { super(kind); } }
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Nav("notFound"); },
  permanentRedirect: (to: string) => { throw new Nav("redirect", to); },
  redirect: (to: string) => { throw new Nav("redirect", to); },
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (n: string) => (n === "work4u_auth" && m.signedIn ? { value: "1" } : undefined) }) }));
vi.mock("@/lib/seo/public-api", async (o) => ({
  ...(await o<typeof import("@/lib/seo/public-api")>()),
  getPublicArticle: async () => m.article, getPublicJob: async () => m.job, getPublicWorker: async () => m.worker,
}));
vi.mock("@/components/blog/BlogArticleView", () => ({ BlogArticleView: () => null }));
vi.mock("./(public)/[lang]/jobs/[id]/job-detail-client", () => ({ default: () => null }));
vi.mock("./(public)/[lang]/workers/[id]/worker-detail-client", () => ({ default: () => null }));

import BlogArticlePage, { generateMetadata as articleMeta } from "./(public)/[lang]/blog/[id]/page";
import JobDetailPage, { generateMetadata as jobMeta } from "./(public)/[lang]/jobs/[id]/page";
import WorkerProfilePage, { generateMetadata as workerMeta } from "./(public)/[lang]/workers/[id]/page";

const article: PublicArticle = { id: "a1", slug: "tips", canonicalPath: "tips-a1", title: "Tips", excerpt: "Short", coverImageUrl: null, publishedAt: "2026-10-01", updatedAt: "2026-10-02", contentLanguage: null, bodyHtml: "<p>Hi</p>" };
const job: PublicJob = { id: "9", slug: "fix-tap", canonicalPath: "fix-tap-9", title: "Fix a tap", category: "plumbing", description: "Leaking tap in the kitchen.", budget: 40, budgetType: "FIXED", budgetCurrency: "EUR", location: "Budapest", remote: false, employerName: "Ana", postedByCompany: false, jobPostingEligible: false, validThrough: null, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-02T00:00:00Z", contentLanguage: null };
const worker: PublicWorker = { id: "w1", slug: "ana", canonicalPath: "ana-w1", name: "Ana", photoUrl: null, rating: 4.8, reviewCount: 3, listingCount: 1, categories: ["cleaning"], updatedAt: "", indexable: true,
  listings: [{ id: "l1", title: "House cleaning", category: "cleaning", description: "Thorough", pricingModel: "HOURLY", rate: 15, rateCurrency: "EUR", serviceRadiusKm: 10, availability: null, imageUrl: null, updatedAt: "" }] };

const params = (id: string, lang = "en") => ({ params: Promise.resolve({ lang, id }) });
async function nav(fn: () => Promise<unknown>): Promise<Nav | null> {
  try { await fn(); return null; } catch (e) { if (e instanceof Nav) return e; throw e; }
}
/** All JSON-LD blobs in a rendered server tree. */
function jsonLd(node: ReactNode): string[] {
  const out: string[] = [];
  const walk = (n: ReactNode) => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (!isValidElement(n)) return;
    const el = n as ReactElement<{ data?: unknown; children?: ReactNode }>;
    if (typeof el.type === "function" && "data" in el.props && el.props.data !== undefined) out.push(JSON.stringify(el.props.data));
    walk(el.props.children);
  };
  walk(node);
  return out;
}

beforeEach(() => { m.signedIn = false; m.article = m.job = m.worker = { status: "missing" }; });
afterEach(() => vi.clearAllMocks());

describe("blog article page", () => {
  it("unknown, unpublished or gone → real 404 + noindex metadata", async () => {
    expect((await nav(() => BlogArticlePage(params("nope"))))?.kind).toBe("notFound");
    m.article = { status: "gone" };
    expect((await nav(() => BlogArticlePage(params("nope"))))?.kind).toBe("notFound");
    expect((await articleMeta(params("nope"))).robots).toEqual({ index: false, follow: false });
  });
  it("old id and stale slugs 308 to the canonical slug URL", async () => {
    m.article = { status: "ok", data: article };
    expect(await nav(() => BlogArticlePage(params("a1")))).toMatchObject({ kind: "redirect", to: "/blog/tips-a1" });
    expect(await nav(() => BlogArticlePage(params("old-title-a1")))).toMatchObject({ to: "/blog/tips-a1" });
  });
  it("canonical URL renders with Article + Breadcrumb JSON-LD and canonical/OG metadata", async () => {
    m.article = { status: "ok", data: article };
    const tree = await BlogArticlePage(params("tips-a1"));
    const ld = jsonLd(tree).join("");
    expect(ld).toContain('"@type":"Article"');
    expect(ld).toContain('"@type":"BreadcrumbList"');
    const meta = await articleMeta(params("tips-a1"));
    expect(meta.alternates?.canonical).toMatch(/\/blog\/tips-a1$/);
    expect((meta.openGraph as { type: string }).type).toBe("article");
  });
});

describe("job page", () => {
  it("anonymous visitors (crawlers) get a real 404 for a job that is not public", async () => {
    expect((await nav(() => JobDetailPage(params("9"))))?.kind).toBe("notFound");
  });
  it("a signed-in participant still gets the app for a non-public job (no hard 404), with noindex", async () => {
    m.signedIn = true;
    const tree = await JobDetailPage(params("9"));
    expect(isValidElement(tree)).toBe(true);
    expect((await jobMeta(params("9"))).robots).toEqual({ index: false, follow: false });
  });
  it("public job: 308 to the slug URL; canonical page has breadcrumbs and NO JobPosting for an individual's task", async () => {
    m.job = { status: "ok", data: job };
    expect(await nav(() => JobDetailPage(params("9")))).toMatchObject({ kind: "redirect", to: "/jobs/fix-tap-9" });
    const ld = jsonLd(await JobDetailPage(params("fix-tap-9"))).join("");
    expect(ld).toContain('"@type":"BreadcrumbList"');
    expect(ld).not.toContain("JobPosting");
    const meta = await jobMeta(params("fix-tap-9"));
    expect(String(meta.title)).toContain("Fix a tap");
    expect(meta.alternates?.canonical).toMatch(/\/jobs\/fix-tap-9$/);
  });
});

describe("job page: JobPosting for company jobs", () => {
  it("emits JobPosting with the company name and country for an eligible company job", async () => {
    m.job = { status: "ok", data: { ...job, postedByCompany: true, jobPostingEligible: true, employerName: "Anna Personal", companyName: "Acme Cleaning S.L.", country: "ES", city: "Barcelona" } };
    const ld = jsonLd(await JobDetailPage(params("fix-tap-9"))).join("");
    expect(ld).toContain('"@type":"JobPosting"');
    expect(ld).toContain("Acme Cleaning S.L.");
    expect(ld).not.toContain("Anna Personal");
  });
  it("no JobPosting while the API has no companyName (never falls back to the poster's name)", async () => {
    m.job = { status: "ok", data: { ...job, postedByCompany: true, jobPostingEligible: true, employerName: "Anna Personal", country: "ES" } };
    expect(jsonLd(await JobDetailPage(params("fix-tap-9"))).join("")).not.toContain("JobPosting");
  });
});

describe("worker profile page", () => {
  it("404 for unknown/suspended profiles; signed-in users keep the app", async () => {
    expect((await nav(() => WorkerProfilePage(params("w1"))))?.kind).toBe("notFound");
    m.signedIn = true;
    expect(isValidElement(await WorkerProfilePage(params("w1")))).toBe(true);
  });
  it("owner opt-out: page stays public but is noindex and has no structured data", async () => {
    m.worker = { status: "ok", data: { ...worker, indexable: false } };
    const meta = await workerMeta(params("ana-w1"));
    expect(meta.robots).toEqual({ index: false, follow: false });
    const ld = jsonLd(await WorkerProfilePage(params("ana-w1"))).join("");
    expect(ld).not.toContain("Service");
  });
  it("indexable profile: canonical, conservative Service markup, no Person and no personal data beyond the page", async () => {
    m.worker = { status: "ok", data: worker };
    expect((await workerMeta(params("ana-w1"))).robots).toBeUndefined();
    const ld = jsonLd(await WorkerProfilePage(params("ana-w1"))).join("");
    expect(ld).toContain('"@type":"Service"');
    expect(ld).not.toContain("Person");
    expect(await nav(() => WorkerProfilePage(params("w1")))).toMatchObject({ to: "/workers/ana-w1" });
  });
});

describe("language prefixes on user-content pages (one canonical per item, no hreflang)", () => {
  it("/ro item pages 308 to the /ro canonical slug URL, keeping the language", async () => {
    m.article = { status: "ok", data: article };
    m.job = { status: "ok", data: job };
    m.worker = { status: "ok", data: worker };
    expect(await nav(() => BlogArticlePage(params("a1", "ro")))).toMatchObject({ kind: "redirect", to: "/ro/blog/tips-a1" });
    expect(await nav(() => JobDetailPage(params("9", "es")))).toMatchObject({ kind: "redirect", to: "/es/jobs/fix-tap-9" });
    expect(await nav(() => WorkerProfilePage(params("w1", "ro")))).toMatchObject({ kind: "redirect", to: "/ro/workers/ana-w1" });
  });
  it("content with unknown language: every prefix canonicalizes to the unprefixed URL and has no hreflang alternates", async () => {
    m.article = { status: "ok", data: article };
    m.job = { status: "ok", data: job };
    m.worker = { status: "ok", data: worker };
    for (const lang of ["en", "ro", "es"]) {
      const a = await articleMeta(params("tips-a1", lang));
      expect(a.alternates).toEqual({ canonical: "http://localhost:3000/blog/tips-a1" });
      expect((await jobMeta(params("fix-tap-9", lang))).alternates).toEqual({ canonical: "http://localhost:3000/jobs/fix-tap-9" });
      expect((await workerMeta(params("ana-w1", lang))).alternates).toEqual({ canonical: "http://localhost:3000/workers/ana-w1" });
    }
  });
  it("content with a known launch language canonicalizes to its own language version", async () => {
    m.job = { status: "ok", data: { ...job, contentLanguage: "ro" } };
    for (const lang of ["en", "ro", "es"]) expect((await jobMeta(params("fix-tap-9", lang))).alternates).toEqual({ canonical: "http://localhost:3000/ro/jobs/fix-tap-9" });
  });
  it("JSON-LD breadcrumbs use the page language for the lists and the canonical language for the item", async () => {
    m.job = { status: "ok", data: job };
    const ld = jsonLd(await JobDetailPage(params("fix-tap-9", "ro"))).join("");
    expect(ld).toContain("http://localhost:3000/ro/jobs");
    expect(ld).toContain("http://localhost:3000/jobs/fix-tap-9");
    expect(ld).not.toContain("/ro/jobs/fix-tap-9");
  });
});

describe("API unreachable: 503 state, never a 404 or a 500", () => {
  it("jobs, articles and workers redirect to the language's /service-unavailable with the URL to retry (signed in or not)", async () => {
    m.article = m.job = m.worker = { status: "unavailable" };
    expect(await nav(() => JobDetailPage(params("fix-tap-9")))).toMatchObject({ kind: "redirect", to: "/service-unavailable?from=%2Fjobs%2Ffix-tap-9" });
    expect(await nav(() => JobDetailPage(params("fix-tap-9", "ro")))).toMatchObject({ to: "/ro/service-unavailable?from=%2Fro%2Fjobs%2Ffix-tap-9" });
    m.signedIn = true;
    expect(await nav(() => JobDetailPage(params("9", "es")))).toMatchObject({ to: "/es/service-unavailable?from=%2Fes%2Fjobs%2F9" });
    expect(await nav(() => BlogArticlePage(params("tips-a1", "ro")))).toMatchObject({ to: "/ro/service-unavailable?from=%2Fro%2Fblog%2Ftips-a1" });
    expect(await nav(() => WorkerProfilePage(params("ana-w1")))).toMatchObject({ to: "/service-unavailable?from=%2Fworkers%2Fana-w1" });
  });
  it("metadata for that state is noindex with the translated title", async () => {
    m.article = m.job = m.worker = { status: "unavailable" };
    for (const meta of [await jobMeta(params("x", "ro")), await articleMeta(params("x", "es")), await workerMeta(params("x"))]) {
      expect(meta.robots).toEqual({ index: false, follow: false });
      expect(String(meta.title)).toMatch(/indisponibil|disponible|unavailable/i);
    }
  });
  it("a really missing item is still a 404 (not confused with an outage)", async () => {
    m.job = { status: "missing" };
    expect((await nav(() => JobDetailPage(params("nope"))))?.kind).toBe("notFound");
  });
});
