import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { isValidElement, type ReactElement } from "react";
import en from "@/locales/en.json";
import ro from "@/locales/ro.json";
import es from "@/locales/es.json";
import { LocaleProvider, type Locale } from "@/lib/i18n";

vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/" }));
vi.mock("@/lib/landing-api", () => ({ fetchLandingContent: vi.fn(() => new Promise(() => undefined)) }));

import HomePage, { generateMetadata } from "./page";

const E = en as Record<string, string>;
const DICT: Record<string, Record<string, string>> = { ro, es };
const HERO: Record<string, [string, string]> = { ro: ["Găsește ajutor pentru orice sarcină.", "Sau câștigă făcând."], es: ["Encuentra ayuda para cualquier tarea.", "O gana haciéndolo."] };

const payload = (lang: string) => ({
  hero: { desktopTitleLine1: HERO[lang][0], desktopTitleLine2: HERO[lang][1], desktopSubtitle: "Sub", desktopSearchPlaceholder: "S", desktopImageUrl: "/assets/welcome1.png", mobileTitle: "m", mobileBadge: "b", mobileSearchPlaceholder: "s", filterAriaLabel: "f" },
  categories: { desktopTitle: "C", desktopSubtitle: "s", desktopViewAllLabel: "v", desktopItems: [{ slug: "plumbing", name: "Instalator", iconKey: "wrench", jobCount: 2 }], mobileTitle: "C", mobileViewAllLabel: "v", mobileItems: [] },
  professionals: { badgeLabel: "b", title: "P", subtitle: "s", verifiedLabel: "v", ctaLabel: "c", items: [] },
  jobs: { title: "J", subtitle: "s", viewAllLabel: "v", items: [] },
  footer: { brand: "Work4U", tagline: "t", copyright: "c", language: "x", currency: "EUR", columns: [{ title: "C", links: [{ label: "A", href: "/about" }] }], mobileLinks: [{ label: "A", href: "/about" }] },
  mobile: { topRatedTitle: "t", topRatedBadge: "b", topRatedJobsCompletedTitle: "j", topRatedResponsivenessTitle: "r", topRatedItems: [], activeJobsTitle: "a", activeJobsFilterLabel: "f", activeJobItems: [], bottomNav: [1, 2, 3, 4].map((n) => ({ label: `n${n}`, iconKey: (["home", "explore", "messages", "profile"] as const)[n - 1] })) },
  actions: { signInLabel: "s", notificationsLabel: "n", joinNowLabel: "j", searchButtonLabel: "s", categoryViewAllHref: "/jobs", jobsViewAllHref: "/jobs", signInHref: "/signin", joinNowAuthHref: "/dashboard", joinNowGuestHref: "/signup" },
});

const urls: string[] = [];
const stubApi = (mode: "ok" | "down") =>
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    urls.push(url);
    if (mode === "down") throw new Error("ECONNREFUSED");
    const lang = new URL(url).searchParams.get("locale") ?? "en";
    return new Response(JSON.stringify(payload(lang)), { status: 200 });
  }));
afterEach(() => { vi.unstubAllGlobals(); urls.length = 0; });

/** The server HTML of /{lang}: what a crawler receives (page element rendered inside the language's provider). */
async function serverHtml(lang: "ro" | "es") {
  const page = await HomePage({ params: Promise.resolve({ lang }) });
  expect(isValidElement(page)).toBe(true);
  return renderToString(<LocaleProvider initialLocale={lang as Locale} initialDictionary={DICT[lang]}>{page as ReactElement}</LocaleProvider>);
}
const h1 = (html: string) => (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

describe.each(["ro", "es"] as const)("home page server HTML for /%s", (lang) => {
  it("asks the API for the page language and renders its translated hero, not the English one", async () => {
    stubApi("ok");
    const html = await serverHtml(lang);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain(`locale=${lang}`);
    expect(h1(html)).toContain(HERO[lang][0]);
    expect(html).not.toContain(E["landing.hero.line1"]);
  });
  it("when the API is down, the static landing is in the page language too (h1 from the dictionary)", async () => {
    stubApi("down");
    const html = await serverHtml(lang);
    expect(h1(html)).toContain(DICT[lang]["landing.hero.line1"]);
    expect(h1(html)).not.toContain(E["landing.hero.line1"]);
    expect(html).not.toContain(E["landing.fallback.subtitle"]);
  });
  it("title and meta description are translated (not the English constants) and self-canonical", async () => {
    const m = await generateMetadata({ params: Promise.resolve({ lang }) });
    const title = (m.title as { absolute: string }).absolute;
    expect(title).toContain(DICT[lang]["seo.homeTagline"]);
    expect(title).not.toContain("Local help and local work");
    expect(m.description).toBe(DICT[lang]["landing.fallback.subtitle"]);
    expect(m.description).not.toBe(E["landing.fallback.subtitle"]);
    expect(m.alternates?.canonical).toBe(`http://localhost:3000/${lang}`);
  });
});

describe("home page in English", () => {
  it("still requests the English payload", async () => {
    stubApi("ok");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => { urls.push(url); return new Response("{}", { status: 503 }); }));
    await HomePage({ params: Promise.resolve({ lang: "en" }) });
    expect(urls[0]).toContain("locale=en");
    const m = await generateMetadata({ params: Promise.resolve({ lang: "en" }) });
    expect((m.title as { absolute: string }).absolute).toBe("Work4U: Local help and local work");
  });
});
