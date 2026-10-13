import { describe, expect, it } from "vitest";
import { customersHref, hasNextPage, pageOffset, pageRange, parsePage, pageTokens, readTotal, totalPages } from "./paging";

describe("readTotal", () => {
  it("reads a numeric total", () => expect(readTotal({ total: 137 })).toBe(137));
  it("ignores missing or invalid totals", () => {
    expect(readTotal({})).toBeUndefined();
    expect(readTotal({ total: "9" })).toBeUndefined();
    expect(readTotal({ total: -1 })).toBeUndefined();
    expect(readTotal(undefined)).toBeUndefined();
  });
});
describe("paging", () => {
  it("computes pages and ranges", () => {
    expect(totalPages(0, 25)).toBe(1);
    expect(totalPages(51, 25)).toBe(3);
    expect(pageRange(2, 25, 25)).toEqual({ from: 26, to: 50 });
    expect(pageRange(3, 25, 1)).toEqual({ from: 51, to: 51 });
    expect(pageRange(1, 25, 0)).toBeNull();
  });
  it("builds numbered tokens with gaps", () => {
    expect(pageTokens(1, 3)).toEqual([1, 2, 3]);
    expect(pageTokens(6, 20)).toEqual([1, "gap", 5, 6, 7, "gap", 20]);
    expect(pageTokens(2, 20)).toEqual([1, 2, 3, "gap", 20]);
  });
  it("uses total when present, else page fullness", () => {
    expect(hasNextPage(1, 25, 25, 25)).toBe(false);
    expect(hasNextPage(1, 25, 25, 26)).toBe(true);
    expect(hasNextPage(1, 25, 25, undefined)).toBe(true);
    expect(hasNextPage(1, 25, 10, undefined)).toBe(false);
  });
});

describe("page params", () => {
  it("parses the page and falls back to 1", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("x")).toBe(1);
    expect(parsePage(null)).toBe(1);
  });
  it("converts a page to an offset", () => {
    expect(pageOffset(1, 25)).toBe(0);
    expect(pageOffset(3, 25)).toBe(50);
  });
  it("builds the customers URL without defaults", () => {
    expect(customersHref("/c", "", 1)).toBe("/c");
    expect(customersHref("/c", "ann & co", 2)).toBe("/c?q=ann+%26+co&page=2");
  });
});
