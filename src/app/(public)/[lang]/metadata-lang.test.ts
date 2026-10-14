import { afterEach, describe, expect, it, vi } from "vitest";
import en from "@/locales/en.json";
import ro from "@/locales/ro.json";
import es from "@/locales/es.json";

vi.mock("@/lib/seo/public-api", async (o) => ({
  ...(await o<typeof import("@/lib/seo/public-api")>()),
  listPublicJobs: async () => ({ items: [], total: 0, limit: 1, offset: 0 }),
}));

import { generateMetadata as pricing } from "./pricing/layout";
import { generateMetadata as how } from "./how-it-works/layout";
import { generateMetadata as contact } from "./contact/layout";
import { generateMetadata as business } from "./business/layout";
import { generateMetadata as privacy } from "./privacy/page";
import { generateMetadata as terms } from "./terms/page";
import { generateMetadata as blog } from "./blog/page";
import { generateMetadata as jobs } from "./jobs/page";
import { generateMetadata as workers } from "./workers/page";
import { generateMetadata as home } from "./page";

afterEach(() => vi.unstubAllGlobals());
const DICT: Record<string, Record<string, string>> = { ro, es };
const E = en as Record<string, string>;
const params = (lang: string) => ({ params: Promise.resolve({ lang }), searchParams: Promise.resolve({}) });
const text = (v: unknown) => (typeof v === "string" ? v : (v as { absolute?: string })?.absolute ?? "");
// Sentences that only exist in English strings, wherever they leak (metadata of a translated page must not contain them).
const ENGLISH_MARKERS = ["Read the latest articles", "Post a task and get help", "Local help and local work", "How Work4U collects", "Tips, updates"];

describe.each(["ro", "es"] as const)("every public page's metadata is fully in /%s", (lang) => {
  const pages = { home, pricing, how, contact, business, privacy, terms, blog, jobs, workers };
  it.each(Object.entries(pages))("%s", async (_name, fn) => {
    const m = await (fn as (p: ReturnType<typeof params>) => Promise<{ title?: unknown; description?: string | null; openGraph?: { locale?: string } }>)(params(lang));
    const all = `${text(m.title)} | ${m.description ?? ""}`;
    for (const marker of ENGLISH_MARKERS) expect(all, marker).not.toContain(marker);
    expect(m.description, "description").toBeTruthy();
    expect(m.description).not.toMatch(/\. [A-Z][a-z]+ [a-z]+ [a-z]+ .*Work4U team\.$/);
    expect(m.openGraph?.locale).toBe(lang === "ro" ? "ro_RO" : "es_ES");
    // the title/description come from the language's dictionary: they are not byte-identical to the English ones
    const enM = await (fn as (p: ReturnType<typeof params>) => Promise<{ title?: unknown; description?: string | null }>)(params("en"));
    expect(`${text(m.title)}|${m.description}`).not.toBe(`${text(enM.title)}|${enM.description}`);
  });
  it("the blog description is exactly the translated subtitle (no English sentence appended)", async () => {
    expect((await blog(params(lang))).description).toBe(DICT[lang]["blog.subtitle"].replace(/\bwork4u\b/gi, "Work4U"));
    expect(DICT[lang]["blog.subtitle"]).not.toBe(E["blog.subtitle"]);
  });
});
