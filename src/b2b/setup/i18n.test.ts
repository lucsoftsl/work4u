import { describe, expect, it } from "vitest";
import { fmt, pluralForm } from "./i18n";

describe("plural forms", () => {
  it("English: one for 1, other otherwise (so '1 people' cannot happen)", () => {
    expect(pluralForm("en", 1)).toBe("one");
    for (const n of [0, 2, 5, 21]) expect(pluralForm("en", n)).toBe("other");
  });
  it("Romanian has a 'few' form (2-19) and 'de' numbers (20+)", () => {
    expect(pluralForm("ro", 1)).toBe("one");
    for (const n of [0, 2, 7, 19, 101]) expect(pluralForm("ro", n), String(n)).toBe("few");
    for (const n of [20, 45, 100]) expect(pluralForm("ro", n), String(n)).toBe("other");
  });
  it("Spanish: one for 1, other otherwise (million-scale 'many' folds into other)", () => {
    expect(pluralForm("es", 1)).toBe("one");
    expect(pluralForm("es", 3)).toBe("other");
    expect(pluralForm("es", 1_000_000)).toBe("other");
  });
  it("fills placeholders", () => {
    expect(fmt("{n} of {m}", { n: 1, m: 2 })).toBe("1 of 2");
  });
});
