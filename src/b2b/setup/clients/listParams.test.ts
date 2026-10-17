import { describe, expect, it } from "vitest";
import { DEFAULT_LIST_STATE, hasActiveFilters, listHref, parseListState, toApiParams } from "./listParams";

const sp = (s: string) => new URLSearchParams(s);

describe("client list params", () => {
  it("parses defaults and rejects junk", () => {
    expect(parseListState(sp(""))).toEqual(DEFAULT_LIST_STATE);
    expect(parseListState(sp("archived=x&sort=y&page=-3"))).toEqual(DEFAULT_LIST_STATE);
  });
  it("round-trips a full state and omits defaults", () => {
    const s = { q: "ann & co", tag: "vip", archived: "all" as const, sort: "createdAt" as const, page: 3 };
    expect(parseListState(sp(listHref("/c", s).split("?")[1]))).toEqual(s);
    expect(listHref("/c", DEFAULT_LIST_STATE)).toBe("/c");
  });
  it("maps to API params with offset and sort direction", () => {
    const p = toApiParams({ ...DEFAULT_LIST_STATE, page: 2, sort: "createdAt", q: "x" });
    expect(p).toMatchObject({ q: "x", archived: "false", sort: "createdAt", dir: "desc", offset: 25, tag: undefined });
  });
  it("detects active filters", () => {
    expect(hasActiveFilters(DEFAULT_LIST_STATE)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_LIST_STATE, tag: "a" })).toBe(true);
  });
});
