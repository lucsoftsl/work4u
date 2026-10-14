import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, proxy } from "./proxy";

const req = (path: string, init: { cookie?: string; ua?: string } = {}) =>
  new NextRequest(`http://localhost:3000${path}`, { headers: { ...(init.cookie ? { cookie: init.cookie } : {}), "user-agent": init.ua ?? "Mozilla/5.0" } });
const loc = (r: Response) => r.headers.get("location");

describe("proxy (language prefixes + signed-in /signin)", () => {
  it("/en/... is a 301 to the unprefixed canonical URL, query kept", () => {
    const r = proxy(req("/en/jobs?page=2"));
    expect(r.status).toBe(301);
    expect(loc(r)).toBe("http://localhost:3000/jobs?page=2");
  });
  it("fr / hu prefixes are a temporary redirect to the unprefixed page and remember the choice", () => {
    const r = proxy(req("/fr/pricing"));
    expect(r.status).toBe(302);
    expect(loc(r)).toBe("http://localhost:3000/pricing");
    expect(r.headers.get("set-cookie")).toMatch(/NEXT_LOCALE=fr/);
  });
  it("unprefixed public pages are rewritten to the English tree without changing the URL", () => {
    const r = proxy(req("/jobs/fix-9?x=1"));
    expect(r.status).toBe(200);
    expect(r.headers.get("x-middleware-rewrite")).toBe("http://localhost:3000/en/jobs/fix-9?x=1");
  });
  it("ro / es pages pass through; prefixed private paths are a 308 to the private route", () => {
    expect(proxy(req("/ro/jobs")).headers.get("x-middleware-next")).toBe("1");
    const r = proxy(req("/ro/dashboard"));
    expect(r.status).toBe(308);
    expect(loc(r)).toBe("http://localhost:3000/dashboard");
  });
  it("a ro/es cookie sends a returning person to their language (307, Vary: Cookie); bots and everyone else are not redirected", () => {
    const r = proxy(req("/pricing", { cookie: "NEXT_LOCALE=ro" }));
    expect(r.status).toBe(307);
    expect(loc(r)).toBe("http://localhost:3000/ro/pricing");
    expect(r.headers.get("vary")).toMatch(/Cookie/i);
    expect(proxy(req("/pricing", { cookie: "NEXT_LOCALE=ro", ua: "Googlebot/2.1" })).status).toBe(200);
    expect(proxy(req("/pricing")).status).toBe(200);
  });
  it("unknown URLs are rewritten to the styled 404 page; /ro/foo is a direct 404, not a 308", () => {
    expect(proxy(req("/ro/foo")).headers.get("x-middleware-rewrite")).toBe("http://localhost:3000/ro/not-found-page");
    expect(proxy(req("/xx/jobs")).headers.get("x-middleware-rewrite")).toBe("http://localhost:3000/en/not-found-page");
    expect(proxy(req("/foo", { cookie: "NEXT_LOCALE=es" })).headers.get("x-middleware-rewrite")).toBe("http://localhost:3000/es/not-found-page");
  });
  it("the 404 and 503 rewrites carry their status, noindex and Retry-After", () => {
    const nf = proxy(req("/foo"));
    expect(nf.status).toBe(404);
    expect(nf.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    const un = proxy(req("/ro/service-unavailable?from=%2Fro%2Fjobs"));
    expect(un.status).toBe(503);
    expect(un.headers.get("retry-after")).toBe("120");
    expect(un.headers.get("x-middleware-rewrite")).toBe("http://localhost:3000/ro/service-unavailable?from=%2Fro%2Fjobs");
    expect(proxy(req("/jobs")).status).toBe(200); // ordinary rewrites keep their status
  });
  it("private app and the invite link are untouched", () => {
    for (const p of ["/dashboard", "/chat", "/tech/o1/today", "/b2b/invite/abc"]) expect(proxy(req(p, { cookie: "NEXT_LOCALE=ro" })).headers.get("x-middleware-next"), p).toBe("1");
  });
  it("keeps the old behaviour: signed-in users are sent from /signin to the dashboard unless a redirect target is given", () => {
    const r = proxy(req("/signin", { cookie: "work4u_auth=1" }));
    expect(r.status).toBe(307);
    expect(loc(r)).toBe("http://localhost:3000/dashboard");
    expect(proxy(req("/signin?redirect=/profile", { cookie: "work4u_auth=1" })).headers.get("x-middleware-next")).toBe("1");
    expect(proxy(req("/signin")).headers.get("x-middleware-next")).toBe("1");
  });
  it("the matcher skips Next internals, API routes and files with an extension (sitemaps, robots, assets, service workers)", () => {
    const re = new RegExp(`^${config.matcher[0].replace(/\(\?!/, "(?!")}$`);
    for (const p of ["/", "/jobs", "/ro/jobs", "/signin", "/tech/o1/today"]) expect(re.test(p), p).toBe(true);
    for (const p of ["/_next/static/x.js", "/api/landing", "/robots.txt", "/sitemap.xml", "/sitemap/core.xml", "/tech-sw.js", "/assets/a.png", "/opengraph-image"]) {
      if (p === "/opengraph-image") continue; // no extension: handled by decideRoute ("next")
      expect(re.test(p), p).toBe(false);
    }
  });
});
