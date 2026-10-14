import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { isValidElement, type ReactElement } from "react";
import ro from "@/locales/ro.json";
import es from "@/locales/es.json";
import en from "@/locales/en.json";
import { LocaleProvider, type Locale } from "@/lib/i18n";

class Nav extends Error { constructor(public to: string) { super(to); } }
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Nav(to); }, notFound: () => { throw new Error("notFound"); }, usePathname: () => "/", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
vi.mock("@/lib/seo/public-api", async (o) => ({
  ...(await o<typeof import("@/lib/seo/public-api")>()),
  listPublicJobs: async () => { throw new Error("ECONNREFUSED"); },
  listPublicWorkers: async () => { throw new Error("ECONNREFUSED"); },
  listPublicArticles: async () => { throw new Error("ECONNREFUSED"); },
}));

import JobsPage from "./jobs/page";
import WorkersPage from "./workers/page";
import BlogPage from "./blog/page";
import ServiceUnavailablePage, { generateMetadata as unavailableMeta } from "./service-unavailable/page";
import NotFoundPage, { generateMetadata as notFoundMeta } from "./not-found-page/page";

afterEach(() => vi.unstubAllGlobals());
const DICT: Record<string, Record<string, string>> = { en, ro, es };
const html = (lang: string, el: unknown) => renderToString(<LocaleProvider initialLocale={lang as Locale} initialDictionary={DICT[lang]}>{el as ReactElement}</LocaleProvider>);
const to = async (fn: () => Promise<unknown>) => { try { await fn(); return null; } catch (e) { if (e instanceof Nav) return e.to; throw e; } };

describe("list pages with the API down (cold cache)", () => {
  it.each([["/jobs", JobsPage], ["/workers", WorkersPage], ["/blog", BlogPage]] as const)("%s redirects to the 503 state of its own language, not a 500 and not an empty list", async (path, Page) => {
    for (const [lang, prefix] of [["en", ""], ["ro", "/ro"], ["es", "/es"]] as const) {
      expect(await to(() => Page({ params: Promise.resolve({ lang }) } as never) as Promise<unknown>)).toBe(`${prefix}/service-unavailable?from=${encodeURIComponent(`${prefix}${path}`)}`);
    }
  });
});

describe("the 503 page", () => {
  const render = async (lang: string, from?: string) => html(lang, await ServiceUnavailablePage({ searchParams: Promise.resolve(from ? { from } : {}) }));
  it("is real server HTML: one h1, the translated message, a Retry link to the page that failed, a link home", async () => {
    for (const lang of ["en", "ro", "es"]) {
      const out = await render(lang, `/${lang === "en" ? "" : `${lang}/`}jobs`);
      expect((out.match(/<h1/g) ?? []).length).toBe(1);
      expect(out).toContain(DICT[lang]["unavailable.title"]);
      expect(out).toContain(DICT[lang]["unavailable.body"].replace(/'/g, "&#x27;"));
      expect(out).toContain(`>${DICT[lang]["unavailable.retry"]}</a>`);
      expect(out).toContain(`href="${lang === "en" ? "" : `/${lang}`}/jobs"`);
    }
    expect(await render("ro")).toContain('href="/"');
  });
  it("only retries local paths; is noindex with a translated title", async () => {
    expect(await render("en", "//evil.com")).toContain('href="/"');
    const m = await unavailableMeta({ params: Promise.resolve({ lang: "ro" }), searchParams: Promise.resolve({}) });
    expect(m.robots).toEqual({ index: false, follow: false });
    expect(m.title).toBe(ro["unavailable.title"]);
  });
});

describe("the 404 page (rewrite target of the proxy)", () => {
  it("server HTML has the h1, the 404 message and links home / to jobs, in the page language", async () => {
    for (const lang of ["en", "ro", "es"]) {
      const out = html(lang, NotFoundPage());
      expect(isValidElement(NotFoundPage())).toBe(true);
      expect((out.match(/<h1/g) ?? []).length).toBe(1);
      expect(out).toContain(">404<");
      expect(out).toContain(DICT[lang]["errors.notFoundTitle"]);
      expect(out).toContain(DICT[lang]["errors.notFoundDesc"].replace(/'/g, "&#x27;"));
      expect(out).toContain(`href="${lang === "en" ? "/" : `/${lang}`}"`);
      expect(out).toContain(`href="${lang === "en" ? "" : `/${lang}`}/jobs"`);
    }
    const m = await notFoundMeta({ params: Promise.resolve({ lang: "es" }) });
    expect(m.robots).toEqual({ index: false, follow: false });
    expect(m.title).toBe(es["errors.notFoundTitle"]);
  });
});
