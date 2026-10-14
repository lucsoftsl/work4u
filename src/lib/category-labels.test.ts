import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES, buildCategoryLabels } from "../../scripts/category-labels-lib.mjs";
import generated from "@/data/category-labels.generated.json";
import { CATEGORIES } from "@/data/categories";
import { matchCategoryIds } from "./search-text";

const root = process.cwd();
const dicts = Object.fromEntries((LOCALES as string[]).map((l) => [l, JSON.parse(readFileSync(join(root, `src/locales/${l}.json`), "utf8"))]));

describe("generated category labels", () => {
  it("are in sync with the locale files (re-run `npm run sync-translations` if this fails)", () => {
    expect(generated).toEqual(buildCategoryLabels(dicts));
  });
  it("cover every category, in every locale", () => {
    for (const c of CATEGORIES) {
      const entry = (generated as Record<string, Record<string, string>>)[c.nameKey];
      expect(Object.keys(entry).sort()).toEqual([...(LOCALES as string[])].sort());
    }
  });
});

describe("category search across languages without loading the other dictionaries", () => {
  it("finds plumbing from Spanish, French and English words", () => {
    for (const q of ["fontanería", "plomberie", "plumbing"]) expect(matchCategoryIds(q), q).toContain("plumbing");
  });
});

import { getTranslator, loadDictionary } from "./i18n";
describe("lazy dictionaries", () => {
  it("fall back to English until a locale is loaded, then use it", async () => {
    expect(getTranslator("ro")("categories.plumbing")).toBe(getTranslator("en")("categories.plumbing"));
    await loadDictionary("ro");
    expect(getTranslator("ro")("categories.plumbing")).toBe("Instalații sanitare");
  });
});
