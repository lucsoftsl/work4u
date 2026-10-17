import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetSitemapCache } from "@/lib/seo/sitemap-response";
import nextConfig from "../../next.config";

const fetchMock = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", fetchMock);
import robots from "./robots";
import { GET as sitemapIndex } from "./sitemap.xml/route";
import { GET as sitemapFile } from "./sitemap/[file]/route";
import { sitemapIndexXml, urlsetXml } from "@/lib/seo/sitemap-xml";

const totals = { jobs: 7, articles: 2, workers: 0 };
const newest = { jobs: "2026-10-14T09:00:00Z", articles: "2026-10-13T08:00:00Z", workers: "2026-10-01T00:00:00Z" };
function api(url: string) {
  const u = new URL(url);
  const kind = u.pathname.split("/").pop() as keyof typeof totals;
  const offset = Number(u.searchParams.get("offset") ?? 0);
  const limit = Number(u.searchParams.get("limit") ?? 100);
  const n = Math.max(0, Math.min(limit, totals[kind] - offset));
  const items = Array.from({ length: n }, (_, i) => ({ id: String(offset + i), slug: "s", canonicalPath: `s-${offset + i}`, updatedAt: newest[kind] }));
  return new Response(JSON.stringify({ items, total: totals[kind], limit, offset }), { status: 200 });
}
fetchMock.mockImplementation(async (url: string) => api(url));
afterEach(() => { fetchMock.mockReset(); fetchMock.mockImplementation(async (url: string) => api(url)); });

const file = (name: string) => sitemapFile(new Request("http://x"), { params: Promise.resolve({ file: name }) });

describe("robots.txt", () => {
  it("allows the site, disallows the private apps and the API (bare prefixes, so /signin itself is covered), and points at the index", () => {
    const r = robots();
    const rule = (Array.isArray(r.rules) ? r.rules[0] : r.rules) as { allow: string; disallow: string[] };
    expect(rule.allow).toBe("/");
    for (const p of ["/admin", "/ops", "/tech", "/b2b", "/dashboard", "/chat", "/signin", "/signup", "/api"]) expect(rule.disallow).toContain(p);
    expect(rule.disallow).not.toContain("/jobs");
    expect(r.sitemap).toMatch(/\/sitemap\.xml$/);
  });
  it("never calls the API, so a build or deploy with the API down cannot fail on it", () => {
    robots();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("sitemap index and files (rendered per request, fresh content)", () => {
  it("the index lists one file per non-empty kind with the newest update as lastmod", async () => {
    const res = await sitemapIndex();
    expect(res.headers.get("content-type")).toContain("application/xml");
    expect(res.headers.get("cache-control")).toContain("s-maxage=300");
    const xml = await res.text();
    expect(xml).toContain("<sitemapindex");
    expect(xml).toMatch(/sitemap\/core\.xml/);
    expect(xml).toMatch(/sitemap\/jobs-0\.xml<\/loc><lastmod>2026-10-14/);
    expect(xml).toMatch(/sitemap\/articles-0\.xml/);
    expect(xml).not.toMatch(/workers-0/); // no workers = no file
  });
  it("a new kind appears on the next request (regression: articles-0.xml was 404 because ids were fixed at build time)", async () => {
    totals.articles = 0;
    expect(await (await sitemapIndex()).text()).not.toContain("articles-0");
    totals.articles = 2;
    expect(await (await sitemapIndex()).text()).toContain("articles-0");
    expect((await file("articles-0.xml")).status).toBe(200);
  });
  it("core.xml has the static public pages with lastmod where it is known, and no private paths", async () => {
    const xml = await (await file("core.xml")).text();
    for (const p of ["/</loc>", "/jobs</loc>", "/pricing</loc>", "/blog</loc>"]) expect(xml).toContain(p);
    expect(xml).toMatch(/\/jobs<\/loc>(<xhtml:link [^>]+\/>)+<lastmod>2026-10-14/); // newest job
    expect(xml).toMatch(/\/blog<\/loc>(<xhtml:link [^>]+\/>)+<lastmod>2026-10-13/); // newest article
    expect(xml).not.toMatch(/admin|dashboard|signin/);
    // every URL has a lastmod, including the static pages (build date), not just the content-driven ones
    expect((xml.match(/<url>/g) ?? []).length).toBe((xml.match(/<lastmod>/g) ?? []).length);
  });
  it("core.xml lists every launch language version, each with the full reciprocal hreflang set and an unprefixed x-default", async () => {
    const xml = await (await file("core.xml")).text();
    const loc = (u: string) => `<loc>http://localhost:3000${u}</loc>`;
    for (const u of ["/jobs", "/ro/jobs", "/es/jobs", "/ro", "/es", "/ro/pricing", "/es/how-it-works"]) expect(xml, u).toContain(loc(u));
    expect(xml).not.toContain(loc("/en/jobs"));
    expect(xml).not.toMatch(/<loc>[^<]*\/(fr|hu)(\/|<)/);
    const urlOf = (u: string) => xml.split("<url>").find((b) => b.startsWith(loc(u)))!;
    const set = (b: string) => [...b.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => `${m[1]}=${m[2]}`).sort();
    const expected = ["en=http://localhost:3000/jobs", "es=http://localhost:3000/es/jobs", "ro=http://localhost:3000/ro/jobs", "x-default=http://localhost:3000/jobs"];
    for (const u of ["/jobs", "/ro/jobs", "/es/jobs"]) expect(set(urlOf(u)), u).toEqual(expected);
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml).toContain(loc("/"));
    expect(set(urlOf("/"))).toContain("ro=http://localhost:3000/ro");
  });
  it("core.xml lists the B2B home /field-service in every launch language with the same hreflang set", async () => {
    const xml = await (await file("core.xml")).text();
    for (const u of ["/field-service", "/ro/field-service", "/es/field-service"]) expect(xml, u).toContain(`<loc>http://localhost:3000${u}</loc>`);
    expect(xml).not.toMatch(/<loc>[^<]*\/(ops|tech|b2b)(\/|<)/); // the logged-in B2B app is never listed
    expect(xml).not.toContain("/field-service/demo"); // thin contact page: out of the index and the sitemap
  });
  it("item sitemaps list one canonical URL per item: no language prefixes, no hreflang", async () => {
    const xml = await (await file("jobs-0.xml")).text();
    expect(xml).not.toMatch(/\/(ro|es|en)\/jobs/);
    expect(xml).not.toContain("hreflang");
  });
  it("jobs-0.xml lists canonical slug URLs with lastmod; unknown or malformed ids are 404", async () => {
    const xml = await (await file("jobs-0.xml")).text();
    expect((xml.match(/<url>/g) ?? []).length).toBe(7);
    expect(xml).toContain("/jobs/s-0</loc><lastmod>2026-10-14");
    for (const bad of ["../etc.xml", "jobs.xml", "users-0.xml", "jobs-0"]) expect((await file(bad)).status, bad).toBe(404);
  });
  it("with the API down the index still renders (core only) instead of failing", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await sitemapIndex();
    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toContain("core.xml");
    expect(xml).not.toContain("jobs-0");
  });
});

describe("sitemap xml", () => {
  it("escapes URLs and drops invalid dates instead of faking them", () => {
    const xml = urlsetXml([{ url: "https://x.test/a?b=1&c=<2>", lastModified: "garbage" }]);
    expect(xml).toContain("a?b=1&amp;c=&lt;2&gt;");
    expect(xml).not.toContain("lastmod");
    expect(sitemapIndexXml([{ url: "https://x.test/s.xml", lastModified: new Date("2026-10-01T00:00:00Z") }])).toContain("<lastmod>2026-10-01T00:00:00.000Z</lastmod>");
  });
});

describe("noindex headers (next.config)", () => {
  it("sends X-Robots-Tag noindex for private routes and no-referrer for invite links", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const has = (source: string, key: string, value?: string) => rules.some((r) => r.source === source && r.headers.some((h) => h.key === key && (!value || h.value.includes(value))));
    for (const s of ["/admin/:path*", "/ops/:path*", "/tech/:path*", "/dashboard/:path*", "/chat/:path*", "/signin", "/b2b/:path*", "/jobs/:id/edit"]) expect(has(s, "X-Robots-Tag", "noindex"), s).toBe(true);
    expect(has("/b2b/:path*", "Referrer-Policy", "no-referrer")).toBe(true);
    expect(rules.some((r) => r.source === "/jobs/:path*" || r.source === "/blog/:path*")).toBe(false);
  });
});

describe("sitemap files when the API cannot be reached", () => {
  beforeEach(() => resetSitemapCache());
  const down = () => fetchMock.mockImplementation(async () => { throw new Error("fetch failed: ECONNREFUSED"); });
  const serverError = () => fetchMock.mockImplementation(async () => new Response("boom", { status: 500 }));

  it.each(["jobs-0.xml", "workers-0.xml", "articles-0.xml"])("%s: cold cache → 503 + Retry-After, a plain-text body that is not a sitemap, never a 500 or an empty urlset", async (name) => {
    for (const fail of [down, serverError]) {
      fail();
      const res = await file(name);
      expect(res.status).toBe(503);
      expect(res.headers.get("retry-after")).toBe("120");
      expect(res.headers.get("cache-control")).toMatch(/no-store/);
      expect(res.headers.get("content-type")).toMatch(/^text\/plain/);
      const body = await res.text();
      expect(body).not.toMatch(/urlset|<url>|<\?xml/);
    }
  });
  it("keeps serving the last good copy (stale-if-error), marked as stale and short-lived", async () => {
    totals.jobs = 7;
    const fresh = await file("jobs-0.xml");
    expect(fresh.status).toBe(200);
    const good = await fresh.text();
    expect(good).toContain("/jobs/s-0</loc>");
    down();
    const stale = await file("jobs-0.xml");
    expect(stale.status).toBe(200);
    expect(await stale.text()).toBe(good);
    expect(stale.headers.get("content-type")).toMatch(/application\/xml/);
    expect(stale.headers.get("cache-control")).toMatch(/s-maxage=60/);
    expect(stale.headers.get("x-sitemap-stale")).toBe("1");
    expect(fresh.headers.get("x-sitemap-stale")).toBeNull();
  });
  it("an id with no copy yet still gets 503 while another id has one; unknown ids stay 404; the index and core.xml stay 200", async () => {
    down();
    expect((await file("articles-0.xml")).status).toBe(503);
    expect((await file("bogus.xml")).status).toBe(404);
    expect((await file("core.xml")).status).toBe(200);
    expect((await sitemapIndex()).status).toBe(200);
  });
});
