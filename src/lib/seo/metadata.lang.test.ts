import { describe, expect, it } from "vitest";
import { itemCanonicalLang, pageMetadata, showsUnderLang } from "./metadata";

const O = "http://localhost:3000";
const full = { en: `${O}/pricing`, ro: `${O}/ro/pricing`, es: `${O}/es/pricing`, "x-default": `${O}/pricing` };

describe("pageMetadata per language", () => {
  it("self-referencing canonical per language plus the same reciprocal hreflang set on every version", () => {
    for (const [lang, canonical] of [["en", full.en], ["ro", full.ro], ["es", full.es]] as const) {
      const m = pageMetadata({ title: "Pricing", path: "/pricing", lang });
      expect(m.alternates).toEqual({ canonical, languages: full });
      expect(m.openGraph?.url).toBe(canonical);
    }
    expect(pageMetadata({ title: "Pricing", path: "/pricing" }).alternates?.canonical).toBe(full.en);
  });
  it("home page: /ro and /es, x-default is the bare origin path", () => {
    const m = pageMetadata({ title: "Home", path: "/", lang: "ro" });
    expect(m.alternates).toEqual({ canonical: `${O}/ro`, languages: { en: `${O}/`, ro: `${O}/ro`, es: `${O}/es`, "x-default": `${O}/` } });
  });
  it("sets the OpenGraph locale of the page language; fr/hu are never in hreflang", () => {
    expect((pageMetadata({ title: "x", path: "/jobs", lang: "es" }).openGraph as { locale?: string }).locale).toBe("es_ES");
    expect(Object.keys(pageMetadata({ title: "x", path: "/jobs", lang: "ro" }).alternates?.languages ?? {}).sort()).toEqual(["en", "es", "ro", "x-default"]);
  });
  it("user-content items: one canonical for all prefixes and no hreflang", () => {
    for (const lang of ["en", "ro", "es"]) {
      expect(pageMetadata({ title: "x", path: "/jobs/a-1", lang, alternates: "item" }).alternates).toEqual({ canonical: `${O}/jobs/a-1` });
    }
    expect(pageMetadata({ title: "x", path: "/jobs/a-1", lang: "en", alternates: "item", contentLang: "es" }).alternates).toEqual({ canonical: `${O}/es/jobs/a-1` });
  });
  it("content language rules", () => {
    expect(itemCanonicalLang(null)).toBe("en");
    expect(itemCanonicalLang("fr")).toBe("en"); // not an indexed language
    expect(itemCanonicalLang("ro")).toBe("ro");
    expect(showsUnderLang(null, "ro")).toBe(true);
    expect(showsUnderLang("ro", "ro")).toBe(true);
    expect(showsUnderLang("ro", "en")).toBe(false);
    expect(showsUnderLang("es", "ro")).toBe(false);
  });
});
