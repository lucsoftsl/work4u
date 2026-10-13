import { describe, expect, it } from "vitest";

import { foldText, matchCategoryIds } from "./search-text";

describe("foldText", () => {
  it("lowercases and strips accents", () => {
    expect(foldText("Électricité Málaga Kőműves Ștefan")).toBe("electricite malaga komuves stefan");
  });
});

describe("matchCategoryIds", () => {
  it("matches category names from every locale, not just the UI one", () => {
    expect(matchCategoryIds("Plumbing")).toContain("plumbing");
    expect(matchCategoryIds("electricidad")).toContain("electrical");
  });

  it("is case and accent insensitive", () => {
    expect(matchCategoryIds("ELECTRICITE")).toContain("electrical");
    expect(matchCategoryIds("électricité")).toContain("electrical");
  });

  it("matches partial words", () => {
    expect(matchCategoryIds("plumb")).toContain("plumbing");
  });

  it("requires every word to appear in the same label", () => {
    expect(matchCategoryIds("plumbing zzzz")).toEqual([]);
  });

  it("ignores queries too short to be meaningful", () => {
    expect(matchCategoryIds("a")).toEqual([]);
    expect(matchCategoryIds("  ")).toEqual([]);
  });
});
