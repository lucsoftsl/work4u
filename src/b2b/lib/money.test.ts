import { describe, expect, it } from "vitest";
import { MONEY_MAX_MINOR, computeMargin, formatAmount, formatMoney, formatPercent, minorUnitsOf, moneyParts, moneyToInput, parseMoney } from "./money";

const flat = (s: string) => s.replace(/[\s  ]/g, " ");

describe("parseMoney: user text -> integer minor units, never floats on the wire", () => {
  it.each([
    ["450", "en", 45000],
    ["450.00", "en", 45000],
    ["450,00", "ro", 45000],
    ["450,5", "ro", 45050],
    ["0.07", "en", 7],
    ["1,234.56", "en", 123456],
    ["1.234,56", "ro", 123456],
    ["1 234,56", "ro", 123456],
    ["1.234", "ro", 123400], // a dot followed by 3 digits is a thousands separator where the dot is the group sign
    ["450.50", "ro", 45050], // ...but two decimals after a dot is a decimal point
    ["10000000.00", "en", 1_000_000_000],
    ["0", "en", 0],
  ])("%s (%s) -> %i", (text, locale, minor) => {
    expect(parseMoney(text, locale)).toEqual({ ok: true, minor });
  });
  it("empty means 'not set' (null), not zero", () => {
    expect(parseMoney("", "en")).toEqual({ ok: true, minor: null });
    expect(parseMoney("   ", "ro")).toEqual({ ok: true, minor: null });
  });
  it.each(["abc", "-5", "1.2.3,4", "12,345,67", "4 5 0 a", "1e3", "450.123"])("%s is a format problem", (text) => {
    expect(parseMoney(text, "en")).toEqual({ ok: false, reason: "format" });
  });
  it("more than 10,000,000.00 is out of range", () => {
    expect(parseMoney("10000000.01", "en")).toEqual({ ok: false, reason: "range" });
    expect(MONEY_MAX_MINOR).toBe(1_000_000_000);
  });
  it("round-trips exactly: 450.00 <-> 45000, including awkward cents", () => {
    for (const minor of [0, 1, 7, 10, 99, 45000, 123456, 1_000_000_000, 29999, 1999]) {
      for (const locale of ["en", "ro", "es", "hu"]) {
        expect(parseMoney(moneyToInput(minor, locale), locale)).toEqual({ ok: true, minor });
      }
    }
  });
});

describe("formatting", () => {
  it("uses the company currency and the user's locale", () => {
    expect(flat(formatMoney(45000, "RON", "ro"))).toMatch(/^450,00 RON$/);
    expect(flat(formatMoney(45000, "EUR", "en"))).toBe("€450.00");
    expect(flat(formatMoney(123456, "RON", "en"))).toBe("RON 1,234.56");
  });
  it("a negative amount keeps its minus sign", () => {
    expect(formatMoney(-16000, "EUR", "en")).toContain("-");
  });
  it("moneyToInput has two decimals, the locale's decimal sign and no grouping", () => {
    expect(moneyToInput(45000, "en")).toBe("450.00");
    expect(moneyToInput(45000, "ro")).toBe("450,00");
    expect(moneyToInput(123456, "ro")).toBe("1234,56");
    expect(moneyToInput(null, "en")).toBe("");
    expect(moneyToInput(undefined, "en")).toBe("");
  });
  it("formats a percentage with one decimal in the locale", () => {
    expect(formatPercent(35.6, "en")).toBe("35.6%");
    expect(flat(formatPercent(35.6, "ro"))).toBe("35,6%");
    expect(formatPercent(-4, "en")).toBe("-4.0%");
  });
});

describe("computeMargin", () => {
  it("is price minus cost, with one decimal of price", () => {
    expect(computeMargin(45000, 29000)).toEqual({ margin: 16000, pct: 35.6 });
  });
  it("is a loss when cost exceeds price", () => {
    expect(computeMargin(10000, 12000)).toEqual({ margin: -2000, pct: -20 });
  });
  it("is blank (null), never a guessed zero, when a side is missing or price is 0", () => {
    expect(computeMargin(null, 100)).toBeNull();
    expect(computeMargin(100, null)).toBeNull();
    expect(computeMargin(undefined, undefined)).toBeNull();
    expect(computeMargin(0, 100)).toEqual({ margin: -100, pct: null });
  });
});

describe("moneyParts: the currency code apart from the figure", () => {
  it("splits code and figure whatever side the language puts the code on", () => {
    expect(moneyParts(585000, "RON", "en")).toEqual({ code: "RON", figure: "5,850.00" });
    expect(moneyParts(585000, "RON", "ro")).toEqual({ code: "RON", figure: "5.850,00" });
    expect(moneyParts(585000, "EUR", "es")).toEqual({ code: "EUR", figure: "5850,00" });
  });
  it("keeps the minus sign with the figure", () => {
    const p = moneyParts(-16000, "RON", "en");
    expect(p.figure).toMatch(/^-160\.00$/);
    expect(p.code).toBe("RON");
  });
});

describe("minor units follow the currency (JPY 0, EUR 2, KWD 3)", () => {
  it("knows the digits of a currency", () => {
    expect(minorUnitsOf("EUR")).toBe(2);
    expect(minorUnitsOf("JPY")).toBe(0);
    expect(minorUnitsOf("KWD")).toBe(3);
    expect(minorUnitsOf("ZZZ")).toBe(2); // unknown code: the usual two
  });
  it("a minor-unit integer shows as the right major amount", () => {
    expect(flat(formatMoney(12345, "EUR", "en"))).toBe("€123.45");
    expect(flat(formatMoney(12345, "JPY", "en"))).toBe("¥12,345");
    expect(flat(formatMoney(12345, "KWD", "en"))).toBe("KWD 12.345");
    expect(flat(formatAmount(12345, "en", "JPY"))).toBe("12,345");
    expect(flat(formatAmount(12345, "en", "KWD"))).toBe("12.345");
    expect(flat(formatAmount(12345, "en"))).toBe("123.45");
  });
  it.each([
    ["1500", "JPY", 1500],
    ["1,500", "JPY", 1500],
    ["12.345", "KWD", 12345],
    ["12.3", "KWD", 12300],
    ["450.5", "EUR", 45050],
  ])("parses %s as %s", (text, currency, minor) => {
    expect(parseMoney(text, "en", currency)).toEqual({ ok: true, minor });
  });
  it("refuses decimals the currency does not have, and too many for it", () => {
    expect(parseMoney("1500.5", "en", "JPY")).toEqual({ ok: false, reason: "format" });
    expect(parseMoney("12.3456", "en", "KWD")).toEqual({ ok: false, reason: "format" });
    expect(parseMoney("450.123", "en", "EUR")).toEqual({ ok: false, reason: "format" });
  });
  it("the limit is on minor units whatever the currency", () => {
    expect(parseMoney("1000000000", "en", "JPY")).toEqual({ ok: true, minor: 1_000_000_000 });
    expect(parseMoney("1000000001", "en", "JPY")).toEqual({ ok: false, reason: "range" });
    expect(parseMoney("1000000.000", "en", "KWD")).toEqual({ ok: true, minor: 1_000_000_000 });
  });
  it.each(["JPY", "EUR", "KWD", "USD"])("%s: input text round-trips exactly", (currency) => {
    for (const minor of [0, 1, 7, 99, 1000, 12345, 1_000_000_000]) {
      for (const locale of ["en", "ro", "es"]) {
        expect(parseMoney(moneyToInput(minor, locale, currency), locale, currency), `${currency} ${locale} ${minor}`).toEqual({ ok: true, minor });
      }
    }
  });
  it("moneyParts splits the code from the figure for any digits", () => {
    expect(moneyParts(12345, "JPY", "en")).toEqual({ code: "JPY", figure: "12,345" });
    expect(moneyParts(12345, "KWD", "en")).toEqual({ code: "KWD", figure: "12.345" });
  });
});
