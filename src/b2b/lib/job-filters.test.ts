import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS, PRESETS, ariaSort, defaultDir, nextSort, activeFilterCount, activePreset, clearFilters, parseJobFilters, serializeJobFilters, toApiFilters, withFilterChange,
} from "./job-filters";

describe("job-filters", () => {
  it("round-trips a full filter set", () => {
    const f = { ...DEFAULT_FILTERS, status: ["BLOCKED", "SCHEDULED"] as const, teamId: "t1", unassigned: true, from: "2026-10-01", to: "2026-10-12", q: "boiler", sort: "scheduledStart" as const, dir: "asc" as const, page: 3 };
    const input = { ...f, status: [...f.status] };
    expect(parseJobFilters(serializeJobFilters(input))).toEqual(input);
  });
  it("defaults give an empty query string", () => {
    expect(serializeJobFilters(DEFAULT_FILTERS)).toBe("");
    expect(parseJobFilters("")).toEqual(DEFAULT_FILTERS);
  });
  it("ignores unknown params and drops invalid values", () => {
    const f = parseJobFilters("foo=1&status=BOGUS&status=blocked&status=BLOCKED&from=yesterday&page=-4&sort=x");
    expect(f).toEqual({ ...DEFAULT_FILTERS, status: ["BLOCKED"] });
  });
  it("accepts comma separated statuses", () => {
    expect(parseJobFilters("status=NEW,REVIEW").status).toEqual(["NEW", "REVIEW"]);
  });
  it("resets the page when a filter changes but not when paging", () => {
    const f = { ...DEFAULT_FILTERS, page: 4 };
    expect(withFilterChange(f, { q: "x" }).page).toBe(1);
    expect(withFilterChange(f, { page: 5 }).page).toBe(5);
    // A different server order starts at page one; a cursor from the old order is no longer valid.
    expect(withFilterChange(f, { sort: "scheduledStart" }).page).toBe(1);
    expect(withFilterChange(f, { q: undefined }).page).toBe(4);
  });
  it("counts active filters and clears them keeping sort", () => {
    const f = { ...DEFAULT_FILTERS, status: ["NEW" as const], q: "a", sort: "scheduledStart" as const, page: 2 };
    expect(activeFilterCount(f)).toBe(2);
    expect(clearFilters(f)).toEqual({ ...DEFAULT_FILTERS, sort: "scheduledStart" });
  });
  it("detects presets", () => {
    for (const p of PRESETS) expect(activePreset({ ...DEFAULT_FILTERS, ...p.patch, status: [...p.patch.status] })).toBe(p.key);
    expect(activePreset({ ...DEFAULT_FILTERS, status: ["NEW"] })).toBeNull();
    expect(activePreset({ ...DEFAULT_FILTERS, q: "x" })).toBeNull();
  });
  it("builds API filters with offset", () => {
    expect(toApiFilters({ ...DEFAULT_FILTERS, page: 3, unassigned: true }, 25)).toEqual({ unassigned: true, sort: "updatedAt", dir: "desc", limit: 25, offset: 50 });
  });
});

describe("server-side sort", () => {
  it("round-trips every sort key with its direction", () => {
    for (const sort of ["scheduledStart", "createdAt", "updatedAt", "number", "title", "priority", "status"] as const) {
      for (const dir of ["asc", "desc"] as const) {
        const f = { ...DEFAULT_FILTERS, sort, dir };
        expect(parseJobFilters(serializeJobFilters(f))).toEqual(f);
      }
    }
  });
  it("puts sort and dir in the URL only when they differ from the defaults", () => {
    expect(serializeJobFilters({ ...DEFAULT_FILTERS, sort: "title", dir: "asc" })).toBe("sort=title");
    expect(serializeJobFilters({ ...DEFAULT_FILTERS, sort: "title", dir: "desc" })).toBe("sort=title&dir=desc");
  });
  it("reads the old ?sort=scheduled|updated links", () => {
    expect(parseJobFilters("sort=scheduled").sort).toBe("scheduledStart");
    expect(parseJobFilters("sort=updated").sort).toBe("updatedAt");
  });
  it("flips direction on the same column and uses the default direction on a new one", () => {
    expect(nextSort({ sort: "updatedAt", dir: "desc" }, "updatedAt")).toEqual({ sort: "updatedAt", dir: "asc" });
    expect(nextSort({ sort: "updatedAt", dir: "desc" }, "title")).toEqual({ sort: "title", dir: "asc" });
    expect(defaultDir("priority")).toBe("desc");
  });
  it("reports aria-sort only for the sorted column", () => {
    const cur = { sort: "title", dir: "asc" } as const;
    expect(ariaSort("title", cur)).toBe("ascending");
    expect(ariaSort("status", cur)).toBe("none");
    expect(ariaSort("title", { sort: "title", dir: "desc" })).toBe("descending");
  });
});

describe("priority filter", () => {
  it("round-trips through the URL and counts as an active filter", async () => {
    const { parseJobFilters, serializeJobFilters, activeFilterCount, filterByPriority, withFilterChange } = await import("./job-filters");
    const f = parseJobFilters("priority=high&priority=URGENT&priority=zzz&page=3");
    expect(f.priority).toEqual(["URGENT", "HIGH"]);
    expect(serializeJobFilters(f)).toBe("priority=URGENT&priority=HIGH&page=3");
    expect(activeFilterCount(f)).toBe(1);
    expect(withFilterChange(f, { priority: ["LOW"] }).page).toBe(1);
    expect(filterByPriority([{ priority: "LOW" }, {}, { priority: "HIGH" }], ["NORMAL", "HIGH"])).toEqual([{}, { priority: "HIGH" }]);
    expect(filterByPriority([{ priority: "LOW" }], [])).toHaveLength(1);
  });
});
