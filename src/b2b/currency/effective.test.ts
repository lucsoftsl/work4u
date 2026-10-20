import { describe, expect, it } from "vitest";
import { effectiveCurrency } from "./effective";

describe("effectiveCurrency: company, then the user's last pick, then EUR", () => {
  it("a chosen company currency always wins", () => {
    expect(effectiveCurrency({ company: "RON", preferred: "USD", api: "USD" })).toBe("RON");
    expect(effectiveCurrency({ company: "JPY" })).toBe("JPY");
  });
  it("company not chosen: the user's remembered currency", () => {
    expect(effectiveCurrency({ company: null, preferred: "GBP" })).toBe("GBP");
    expect(effectiveCurrency({ preferred: "GBP", api: "EUR" })).toBe("GBP");
  });
  it("neither: EUR", () => {
    expect(effectiveCurrency({})).toBe("EUR");
    expect(effectiveCurrency({ company: null, preferred: null })).toBe("EUR");
  });
  it("the API's own answer fills in when nothing else is known yet", () => {
    expect(effectiveCurrency({ api: "CHF" })).toBe("CHF");
  });
});
