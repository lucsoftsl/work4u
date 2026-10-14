import { describe, expect, it } from "vitest";
import { retryTarget, unavailablePath, canonicalPathOf, decideRoute, hreflangMap, isLocalizablePath, launchLangOf, localizedPath, splitLangPrefix } from "./i18n-routing";

describe("which paths are localized", () => {
  it("marketing, listing and detail pages are; the app, auth, apps and private sub-pages are not", () => {
    for (const p of ["/", "/pricing", "/how-it-works", "/contact", "/business", "/field-service", "/privacy", "/terms", "/blog", "/jobs", "/workers", "/jobs/fix-tap-9", "/blog/tips-a1", "/workers/ana-w1", "/jobs/", "/jobs?x=1"]) expect(isLocalizablePath(p), p).toBe(true);
    for (const p of ["/dashboard", "/chat", "/profile", "/signin", "/signup", "/admin", "/admin/users", "/ops/o1", "/tech/o1/today", "/b2b/invite/abc", "/jobs/x/edit", "/jobs/x/nearby-pros", "/business/dashboard", "/business/roster", "/my-jobs", "/post-job", "/blog/a/b", "/api/landing", "/robots.txt", "/sitemap.xml", "/sitemap/core.xml"]) expect(isLocalizablePath(p), p).toBe(false);
  });
});

describe("localizedPath / canonicalPathOf", () => {
  it("prefixes ro and es, keeps English unprefixed, keeps query and hash", () => {
    expect(localizedPath("ro", "/jobs")).toBe("/ro/jobs");
    expect(localizedPath("es", "/")).toBe("/es");
    expect(localizedPath("ro", "/jobs?category=plumbing&page=2")).toBe("/ro/jobs?category=plumbing&page=2");
    expect(localizedPath("es", "/blog/tips-a1#top")).toBe("/es/blog/tips-a1#top");
    expect(localizedPath("en", "/jobs")).toBe("/jobs");
    expect(localizedPath(undefined, "/jobs")).toBe("/jobs");
  });
  it("never touches private, external or protocol-relative links, nor fr/hu (not indexed languages)", () => {
    for (const h of ["/dashboard", "/jobs/x/edit", "https://example.com/jobs", "//evil.com/jobs", "#top", "mailto:a@b.co"]) expect(localizedPath("ro", h), h).toBe(h);
    expect(localizedPath("fr", "/jobs")).toBe("/jobs");
    expect(localizedPath("hu", "/pricing")).toBe("/pricing");
  });
  it("re-prefixing an already prefixed path switches the language instead of stacking", () => {
    expect(localizedPath("es", "/ro/jobs")).toBe("/es/jobs");
    expect(localizedPath("en", "/ro/jobs")).toBe("/jobs");
    expect(canonicalPathOf("/es/blog/tips-a1?x=1")).toBe("/blog/tips-a1?x=1");
    expect(splitLangPrefix("/ro")).toEqual({ lang: "ro", path: "/" });
    expect(splitLangPrefix("/room")).toEqual({ lang: null, path: "/room" });
  });
});

describe("hreflang", () => {
  const abs = (p: string) => `https://w4u.test${p}`;
  it("is reciprocal-by-construction: the same set from any language version, x-default = unprefixed English", () => {
    const expected = { en: "https://w4u.test/jobs", ro: "https://w4u.test/ro/jobs", es: "https://w4u.test/es/jobs", "x-default": "https://w4u.test/jobs" };
    expect(hreflangMap("/jobs", abs)).toEqual(expected);
    expect(hreflangMap("/ro/jobs", abs)).toEqual(expected);
    expect(hreflangMap("/es/jobs", abs)).toEqual(expected);
    expect(hreflangMap("/", abs)["ro"]).toBe("https://w4u.test/ro");
    expect(Object.keys(hreflangMap("/", abs))).not.toContain("fr");
  });
});

describe("browser language", () => {
  it("only launch languages are suggested", () => {
    expect(launchLangOf("ro-RO")).toBe("ro");
    expect(launchLangOf("es")).toBe("es");
    expect(launchLangOf("fr-FR")).toBeNull();
    expect(launchLangOf("hu")).toBeNull();
    expect(launchLangOf(undefined)).toBeNull();
  });
});

describe("decideRoute (the proxy)", () => {
  const go = (pathname: string, cookieLang: string | null = null, search = "", userAgent = "Mozilla/5.0") => decideRoute({ pathname, search, cookieLang, userAgent });

  it("English prefix → 301 to the unprefixed canonical URL, query kept", () => {
    expect(go("/en/jobs", null, "?page=2")).toEqual({ action: "redirect", to: "/jobs?page=2", status: 301 });
    expect(go("/en")).toEqual({ action: "redirect", to: "/", status: 301 });
    expect(go("/en/blog/tips-a1")).toEqual({ action: "redirect", to: "/blog/tips-a1", status: 301 });
  });
  it("fr / hu are not indexed languages: 302 to the unprefixed URL and the choice is remembered for the client", () => {
    expect(go("/fr/pricing")).toEqual({ action: "redirect", to: "/pricing", status: 302, cookieLang: "fr" });
    expect(go("/hu", null, "?a=1")).toEqual({ action: "redirect", to: "/?a=1", status: 302, cookieLang: "hu" });
  });
  it("ro / es public pages are served; prefixed private paths go to the unprefixed private route", () => {
    expect(go("/ro/jobs")).toEqual({ action: "next" });
    expect(go("/es")).toEqual({ action: "next" });
    expect(go("/ro/jobs/fix-9")).toEqual({ action: "next" });
    expect(go("/ro/dashboard")).toEqual({ action: "redirect", to: "/dashboard", status: 308 });
    expect(go("/es/jobs/x/edit")).toEqual({ action: "redirect", to: "/jobs/x/edit", status: 308 });
  });
  it("unknown paths under a valid prefix are a direct 404 (no 308 hop), rendered in that language", () => {
    const nf = (to: string) => ({ action: "rewrite", to, status: 404, headers: { "X-Robots-Tag": "noindex, nofollow" } });
    expect(go("/ro/foo")).toEqual(nf("/ro/not-found-page"));
    expect(go("/es/test")).toEqual({ action: "redirect", to: "/test", status: 308 }); // private-listed paths keep the 308
    expect(go("/es/jobs/x/y", null, "?a=1")).toEqual(nf("/es/not-found-page?a=1"));
  });
  it("unknown first segments (/foo, /xx/jobs) are rewritten to the styled 404, in the cookie language when known", () => {
    const nf = (to: string) => ({ action: "rewrite", to, status: 404, headers: { "X-Robots-Tag": "noindex, nofollow" } });
    expect(go("/foo")).toEqual(nf("/en/not-found-page"));
    expect(go("/xx/jobs")).toEqual(nf("/en/not-found-page"));
    expect(go("/xx", "ro")).toEqual(nf("/ro/not-found-page"));
    expect(go("/foo", "fr")).toEqual(nf("/en/not-found-page"));
    expect(go("/not-found-page")).toEqual(nf("/en/not-found-page")); // visiting the internal page directly is also a 404
    for (const p of ["/jobs/x/y", "/opengraph-image"]) expect(go(p), p).toEqual({ action: "next" });
  });
  it("/service-unavailable is a 503 with Retry-After and noindex, in the page language, never cookie-redirected or indexed", () => {
    const un = (to: string) => ({ action: "rewrite", to, status: 503, headers: { "X-Robots-Tag": "noindex, nofollow", "Retry-After": "120" } });
    expect(go("/service-unavailable", null, "?from=%2Fjobs")).toEqual(un("/en/service-unavailable?from=%2Fjobs"));
    expect(go("/service-unavailable", "ro")).toEqual(un("/en/service-unavailable"));
    expect(go("/ro/service-unavailable", null, "?from=%2Fro%2Fjobs")).toEqual(un("/ro/service-unavailable?from=%2Fro%2Fjobs"));
    expect(go("/es/service-unavailable")).toEqual(un("/es/service-unavailable"));
    expect(go("/en/service-unavailable")).toEqual({ action: "redirect", to: "/service-unavailable", status: 301 });
  });
  it("unavailablePath / retryTarget: language-aware, local paths only", () => {
    expect(unavailablePath("ro", "/ro/jobs?x=1")).toBe("/ro/service-unavailable?from=%2Fro%2Fjobs%3Fx%3D1");
    expect(unavailablePath("en", "/jobs")).toBe("/service-unavailable?from=%2Fjobs");
    expect(unavailablePath("es", "//evil.com")).toBe("/es/service-unavailable?from=%2F");
    expect(retryTarget("/ro/jobs?x=1")).toBe("/ro/jobs?x=1");
    for (const bad of ["//evil.com", "https://evil.com", "javascript:alert(1)", undefined, "/a\\b"]) expect(retryTarget(bad), String(bad)).toBe("/");
  });
  it("unprefixed public pages are rewritten to the English tree (the URL does not change)", () => {
    expect(go("/")).toEqual({ action: "rewrite", to: "/en" });
    expect(go("/jobs", null, "?category=x")).toEqual({ action: "rewrite", to: "/en/jobs?category=x" });
    expect(go("/blog/tips-a1", "en")).toEqual({ action: "rewrite", to: "/en/blog/tips-a1" });
  });
  it("a visitor with a ro/es cookie is sent to that language on unprefixed entry pages (temporary redirect), nobody else", () => {
    expect(go("/pricing", "ro", "?success=1")).toEqual({ action: "redirect", to: "/ro/pricing?success=1", status: 307 });
    expect(go("/", "es")).toEqual({ action: "redirect", to: "/es", status: 307 });
    expect(go("/pricing", "fr")).toEqual({ action: "rewrite", to: "/en/pricing" }); // client-only language: stays on the English URL
    expect(go("/pricing", "en")).toEqual({ action: "rewrite", to: "/en/pricing" }); // an explicit English choice is respected
    expect(go("/pricing", null)).toEqual({ action: "rewrite", to: "/en/pricing" }); // first visit: never redirected by IP / Accept-Language
  });
  it("bots are never cookie-redirected", () => {
    expect(go("/pricing", "ro", "", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toEqual({ action: "rewrite", to: "/en/pricing" });
    expect(go("/pricing", "ro", "", "Chrome-Lighthouse")).toEqual({ action: "rewrite", to: "/en/pricing" });
  });
  it("link-preview and search bots are never cookie-redirected", () => {
    for (const ua of ["WhatsApp/2.23.20.0 A", "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)", "Facebot", "Twitterbot/1.0", "LinkedInBot/1.0 (compatible; Mozilla/5.0)", "Slackbot-LinkExpanding 1.0", "Slack-ImgProxy", "TelegramBot (like TwitterBot)", "Mozilla/5.0 (compatible; Discordbot/2.0)", "SkypeUriPreview Preview/0.5", "Pinterest/0.2", "Embedly/0.2", "vkShare; +http://vk.com/dev/Share", "Applebot/0.1", "Mozilla/5.0 (compatible; bingbot/2.0)", "Mozilla/5.0 (compatible; Googlebot/2.1)", "Google-InspectionTool/1.0", "Mozilla/5.0 (compatible; YandexBot/3.0)", "DuckDuckBot/1.1", "Mozilla/5.0 (compatible; AhrefsBot/7.0)", "Mozilla/5.0 (compatible; SemrushBot/7)", "iMessage-LinkPreview", "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1)"]) {
      expect(go("/pricing", "ro", "", ua), ua).toEqual({ action: "rewrite", to: "/en/pricing" });
    }
    for (const ua of ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 Edg/124.0"]) {
      expect(go("/pricing", "ro", "", ua).action, ua).toBe("redirect");
    }
  });
  it("private app, assets, API, invite links and the PWA scope are untouched", () => {
    for (const p of ["/dashboard", "/chat", "/admin/users", "/ops/o1/dashboard", "/tech/o1/today", "/signin", "/signup", "/b2b/invite/abc", "/api/landing", "/robots.txt", "/sitemap.xml", "/sitemap/core.xml", "/tech-sw.js", "/assets/welcome1.png", "/jobs/x/edit", "/business/dashboard"]) {
      expect(go(p, "ro"), p).toEqual({ action: "next" });
    }
  });
});
