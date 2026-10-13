import { describe, expect, it } from "vitest";
import { defaultCurrencyForLocale, firstErrorKey, hasRealCoordinates, parsePositiveAmount, stepProgress } from "./wizard";

describe("wizard helpers", () => {
  it("maps locale to currency with a USD fallback", () => {
    expect(defaultCurrencyForLocale("hu")).toBe("HUF");
    expect(defaultCurrencyForLocale("fr")).toBe("EUR");
    expect(defaultCurrencyForLocale("ro")).toBe("RON");
    expect(defaultCurrencyForLocale("xx")).toBe("USD");
    expect(defaultCurrencyForLocale(undefined)).toBe("USD");
  });

  it("rejects 0,0 and invalid coordinates", () => {
    expect(hasRealCoordinates(0, 0)).toBe(false);
    expect(hasRealCoordinates(null, 10)).toBe(false);
    expect(hasRealCoordinates(NaN, 10)).toBe(false);
    expect(hasRealCoordinates(91, 10)).toBe(false);
    expect(hasRealCoordinates(47.5, 19.04)).toBe(true);
    expect(hasRealCoordinates(0, 19)).toBe(true);
  });

  it("accepts only positive amounts", () => {
    expect(parsePositiveAmount("")).toBeNull();
    expect(parsePositiveAmount("0")).toBeNull();
    expect(parsePositiveAmount("-5")).toBeNull();
    expect(parsePositiveAmount("abc")).toBeNull();
    expect(parsePositiveAmount("12.5")).toBe(12.5);
  });

  it("computes step progress", () => {
    expect(stepProgress(1, 3)).toBe(33);
    expect(stepProgress(3, 3)).toBe(100);
    expect(stepProgress(5, 3)).toBe(100);
  });

  it("finds the first invalid field in order", () => {
    expect(firstErrorKey(["a", "b", "c"] as const, { c: "x", b: "y" })).toBe("b");
    expect(firstErrorKey(["a"] as const, {})).toBeNull();
  });
});
