import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import ro from "@/locales/ro.json";
import es from "@/locales/es.json";
import en from "@/locales/en.json";
import { toDescription } from "@/lib/seo/metadata";

vi.mock("@/lib/site-settings-api", () => ({ siteSettingsApi: { getContactInfo: vi.fn(() => new Promise(() => undefined)) } }));

import FieldServicePage, { generateMetadata } from "./page";
import DemoPage, { generateMetadata as demoMeta } from "./demo/page";

const D: Record<string, Record<string, string>> = { en, ro, es };
const html = async (lang: string) => renderToStaticMarkup((await FieldServicePage({ params: Promise.resolve({ lang }) })) as ReactElement);
const hrefs = (h: string) => [...h.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
const jsonLd = (h: string) => [...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].flatMap((m) => JSON.parse(m[1].replace(/\\u003c/g, "<")));

describe.each(["en", "ro", "es"])("/field-service in %s", (lang) => {
  it("one h1 in the page language, all sections, no marketplace links", async () => {
    const h = await html(lang);
    expect((h.match(/<h1/g) ?? []).length).toBe(1);
    // the headline is split into two spans (second sentence in the brand colour): compare the h1's text
    const h1Text = (h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    expect(h1Text).toBe(D[lang]["b2b.mkt.hero.h1"]);
    for (const id of ["how-it-works", "features", "reliability", "roles", "faq"]) expect(h).toContain(`id="${id}"`);
    // every link stays in the B2B world: its own pages, sign-in, the shared legal pages, the /business hub, section anchors
    const prefix = lang === "en" ? "" : `/${lang}`;
    for (const href of hrefs(h)) {
      const path = href.split("#")[0];
      expect(path === "" || /^\/(ro\/|es\/)?(field-service(\/demo)?|privacy|terms|business)?$/.test(path) || path === "/ops/signin" || path === prefix || path === `${prefix}/field-service`, href).toBe(true);
    }
    for (const bad of ["/dashboard", "/jobs", "/workers", "/signin", "/signup", "/post-job", "/blog", "/pricing", "/chat"]) {
      expect(hrefs(h).some((x) => x === bad || x.startsWith(`${bad}/`) || x.startsWith(`/${lang}${bad}`)), bad).toBe(false);
    }
    expect(h).toContain(`href="${prefix}/field-service/demo"`); // the demo CTA keeps the language
    expect(h).toContain('href="/ops/signin"');
  });
  it("has no marketplace chrome or widgets", async () => {
    const h = await html(lang);
    expect(h).not.toMatch(/ForCompanies|aria-label="Footer"|BottomTabBar|language banner|Hiring|Working/);
    expect(h).toContain("<header");
    expect(h).toContain("<footer");
    expect((h.match(/<main/g) ?? []).length).toBe(1);
  });
  it("FAQPage JSON-LD matches the visible FAQ text", async () => {
    const h = await html(lang);
    const faq = jsonLd(h).find((d) => d["@type"] === "FAQPage");
    expect(faq.mainEntity).toHaveLength(6);
    for (const q of faq.mainEntity) {
      expect(h).toContain(q.name.replace(/'/g, "&#x27;"));
      expect(h).toContain(q.acceptedAnswer.text.replace(/'/g, "&#x27;"));
    }
  });
  it("metadata: translated title and description, self-canonical, hreflang en/ro/es/x-default on the B2B origin", async () => {
    const m = await generateMetadata({ params: Promise.resolve({ lang }) });
    expect(m.description).toBe(toDescription(D[lang]["b2b.mkt.meta.description"])); // cut at a word boundary to fit a snippet
    expect(String(m.title)).toBe(D[lang]["b2b.mkt.meta.title"]); // short enough to survive the 58-character title cut
    const canonical = lang === "en" ? "http://localhost:3000/field-service" : `http://localhost:3000/${lang}/field-service`;
    expect(m.alternates?.canonical).toBe(canonical);
    expect(m.alternates?.languages).toEqual({ en: "http://localhost:3000/field-service", ro: "http://localhost:3000/ro/field-service", es: "http://localhost:3000/es/field-service", "x-default": "http://localhost:3000/field-service" });
    expect(m.robots).toBeUndefined();
  });
});

describe("translations", () => {
  it("ro and es differ from English for the hero and the CTA", () => {
    for (const l of ["ro", "es"]) for (const k of ["b2b.mkt.hero.h1", "b2b.mkt.hero.sub", "b2b.mkt.nav.cta", "b2b.mkt.faq.1", "b2b.mkt.roles.note"]) expect(D[l][k], `${l} ${k}`).not.toBe(D.en[k]);
  });
  it("the FAQ pairs all contain exactly one ' / ' separator", () => {
    for (const l of ["en", "ro", "es"]) for (const n of [1, 2, 3, 4, 5, 6]) expect(D[l][`b2b.mkt.faq.${n}`].split(" / ")).toHaveLength(2);
  });
});

describe("demo page", () => {
  it("is out of the index and uses the B2B chrome in the page language", async () => {
    const m = await demoMeta({ params: Promise.resolve({ lang: "ro" }) });
    expect(m.robots).toEqual({ index: false, follow: false });
    const h = renderToStaticMarkup((await DemoPage({ params: Promise.resolve({ lang: "ro" }) })) as ReactElement);
    expect(h).toContain(ro["b2b.mkt.demo.title"]);
    expect((h.match(/<h1/g) ?? []).length).toBe(1);
    expect(h).toContain('href="/ro/field-service"');
  });
});
