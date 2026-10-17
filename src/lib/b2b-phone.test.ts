import { describe, expect, it } from "vitest";
import { compactPhone, isPlausiblePhone } from "./b2b-phone";

describe("company phone check", () => {
  it("accepts international numbers in any common format, and empty", () => {
    for (const v of ["+34 600 555 021", "+40 (721) 555-021", "+34600555021", ""]) expect(isPlausiblePhone(v), v).toBe(true);
  });
  it("accepts a national number only when the country is known", () => {
    expect(isPlausiblePhone("600 555 021", "ES")).toBe(true);
    expect(isPlausiblePhone("0721 555 021", "RO")).toBe(true);
    expect(isPlausiblePhone("600 555 021", "")).toBe(false);
    expect(isPlausiblePhone("600 555 021", null)).toBe(false);
  });
  it("refuses junk like '12', 'call me' and too-short or too-long numbers", () => {
    for (const v of ["12", "call me", "+12", "+1234567890123456", "abc123456"]) expect(isPlausiblePhone(v, "ES"), v).toBe(false);
  });
  it("compacts separators", () => {
    expect(compactPhone("+34 600-555.021")).toBe("+34600555021");
  });
});
