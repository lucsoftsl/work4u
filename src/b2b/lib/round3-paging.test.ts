import { describe, expect, it } from "vitest";
import { parseJobFilters, serializeJobFilters, toApiFilters, withFilterChange } from "./job-filters";
import { reviewPageHref, parseReviewPage } from "./review";

describe("round 3 cursor navigation", () => {
  it("round-trips the opaque jobs cursor into the API request", () => {
    const f = parseJobFilters("page=2&cursor=opaque%2B%2F%3D&sort=title");
    expect(toApiFilters(f)).toMatchObject({ cursor: "opaque+/=", sort: "title", limit: 25 });
    expect(parseJobFilters(serializeJobFilters(f))).toEqual(f);
  });
  it("clears the cursor and returns to page one when sorting or filtering", () => {
    const f = parseJobFilters("page=3&cursor=old");
    expect(withFilterChange(f, { sort: "title", dir: "asc" })).toMatchObject({ page: 1, cursor: undefined });
    expect(withFilterChange(f, { q: "boiler" })).toMatchObject({ page: 1, cursor: undefined });
    expect(withFilterChange(f, { page: 2 }).cursor).toBeUndefined();
  });
  it("keeps review direction while paging and encodes the API cursor", () => {
    const href = reviewPageHref("/ops/o/review", "desc", 2, "opaque+/=");
    expect(parseReviewPage(new URLSearchParams(href.split("?")[1]))).toEqual({ dir: "desc", page: 2, cursor: "opaque+/=" });
    expect(parseReviewPage(new URLSearchParams("page=-1&dir=invalid"))).toEqual({ dir: "asc", page: 1, cursor: undefined });
  });
});
