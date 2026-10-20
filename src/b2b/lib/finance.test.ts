import { describe, expect, it } from "vitest";
import type { BreakdownItem, FinanceSummary, SeriesBucket } from "@/b2b/api/finance";
import {
  MAX_RANGE_DAYS, addDays, buildChart, dataGaps, daysInclusive, defaultSort, detectPreset, financeEmptyKind, niceScale, parseFinanceParams, periodRange, rangeProblem,
  serializeFinanceParams, sortBreakdown, todayIn, toApiFilters, bucketLabel, barShare,
} from "./finance";

const TODAY = "2026-10-19";

describe("dates in the company timezone", () => {
  it("todayIn gives the local calendar day, not the UTC one", () => {
    const lateUtc = new Date("2026-10-18T22:30:00Z");
    expect(todayIn("UTC", lateUtc)).toBe("2026-10-18");
    expect(todayIn("Europe/Bucharest", lateUtc)).toBe("2026-10-19"); // UTC+3 in October
    expect(todayIn("not/a-zone", lateUtc)).toBe("2026-10-18"); // unknown zone falls back to UTC
  });
  it("addDays and daysInclusive handle month ends and leap days", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(daysInclusive("2026-10-01", "2026-10-31")).toBe(31);
    expect(daysInclusive("2026-10-19", "2026-10-19")).toBe(1);
  });
});

describe("period presets", () => {
  it("this month, last month, quarter", () => {
    expect(periodRange("month", TODAY)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(periodRange("lastMonth", TODAY)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(periodRange("quarter", TODAY)).toEqual({ from: "2026-10-01", to: "2026-12-31" });
    expect(periodRange("quarter", "2026-02-10")).toEqual({ from: "2026-01-01", to: "2026-03-31" });
  });
  it("last month crosses the year", () => {
    expect(periodRange("lastMonth", "2026-01-15")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });
  it("recognises which preset a range is, else custom", () => {
    expect(detectPreset("2026-10-01", "2026-10-31", TODAY)).toBe("month");
    expect(detectPreset("2026-09-01", "2026-09-30", TODAY)).toBe("lastMonth");
    expect(detectPreset("2026-10-01", "2026-12-31", TODAY)).toBe("quarter");
    expect(detectPreset("2026-10-05", "2026-10-09", TODAY)).toBe("custom");
  });
  it("a range is limited to 400 days and must be ordered", () => {
    expect(rangeProblem("2026-01-01", "2026-12-31")).toBeNull();
    expect(rangeProblem("2026-10-10", "2026-10-01")).toBe("order");
    expect(rangeProblem("2025-01-01", "2026-12-31")).toBe("tooLong");
    expect(rangeProblem("2025-01-01", addDays("2025-01-01", MAX_RANGE_DAYS - 1))).toBeNull();
    expect(rangeProblem("2025-01-01", addDays("2025-01-01", MAX_RANGE_DAYS))).toBe("tooLong");
    expect(rangeProblem("nope", "2026-10-01")).toBe("invalid");
  });
});

describe("URL state", () => {
  it("defaults to this month by completion date, chart, by client", () => {
    expect(parseFinanceParams("", TODAY)).toMatchObject({ from: "2026-10-01", to: "2026-10-31", basis: "completed", view: "chart", by: "client", kind: "all", sort: "revenue", dir: "desc" });
  });
  it("round-trips, omitting defaults", () => {
    const s = parseFinanceParams("from=2026-09-01&to=2026-09-30&basis=scheduled&view=table&by=team&customer=c1&type=t1&kind=earned&sort=jobs&dir=asc", TODAY);
    expect(s).toMatchObject({ from: "2026-09-01", to: "2026-09-30", basis: "scheduled", view: "table", by: "team", customerId: "c1", jobTypeId: "t1", kind: "earned", sort: "jobs", dir: "asc" });
    expect(parseFinanceParams(serializeFinanceParams(s, TODAY), TODAY)).toEqual(s);
    expect(serializeFinanceParams(parseFinanceParams("", TODAY), TODAY)).toBe("");
  });
  it("keeps the server-side 'missing' filter of the jobs list in the URL", () => {
    const s = parseFinanceParams("missing=cost", TODAY);
    expect(s.missing).toBe("cost");
    expect(serializeFinanceParams(s, TODAY)).toBe("missing=cost");
    expect(parseFinanceParams("missing=nope", TODAY).missing).toBeUndefined();
    expect(toApiFilters(s)).not.toHaveProperty("missing"); // it belongs to the jobs list and the CSV, not to the summary
  });
  it("ignores unknown or broken values", () => {
    const s = parseFinanceParams("from=zzz&to=2026-13-40&basis=x&view=pie&by=status&kind=q&sort=hax&dir=up", TODAY);
    expect(s).toMatchObject({ from: "2026-10-01", to: "2026-10-31", basis: "completed", view: "chart", by: "client", kind: "all" });
  });
  it("technicians start sorted by name (no ranking), the others by revenue", () => {
    expect(defaultSort("technician")).toEqual({ sort: "name", dir: "asc" });
    expect(defaultSort("client")).toEqual({ sort: "revenue", dir: "desc" });
    expect(parseFinanceParams("by=technician", TODAY)).toMatchObject({ sort: "name", dir: "asc" });
  });
  it("builds the API filters from the state", () => {
    const s = parseFinanceParams("customer=c1&team=t2&member=m3&type=jt4&basis=scheduled", TODAY);
    expect(toApiFilters(s)).toEqual({ from: "2026-10-01", to: "2026-10-31", basis: "scheduled", customerId: "c1", teamId: "t2", memberId: "m3", jobTypeId: "jt4" });
  });
});

const item = (key: string | null, name: string | null, o: Partial<BreakdownItem> = {}): BreakdownItem => ({ key, name, jobs: 1, revenue: 0, cost: 0, margin: null, marginPct: null, ...o });

describe("sortBreakdown", () => {
  const items = [
    item("a", "Beta SA", { revenue: 500, margin: 100, marginPct: 20, jobs: 2 }),
    item("b", "alfa SRL", { revenue: 900, margin: null, jobs: 1 }),
    item(null, null, { revenue: 700, margin: 300, marginPct: 43, jobs: 3 }),
  ];
  const label = "No client";
  it("sorts by revenue descending", () => {
    expect(sortBreakdown(items, "revenue", "desc", label).map((i) => i.key)).toEqual(["b", null, "a"]);
  });
  it("sorts by name in the user's locale; the null key sorts by its label", () => {
    expect(sortBreakdown(items, "name", "asc", label, "en").map((i) => i.key)).toEqual(["b", "a", null]);
  });
  it("blank margins always sort last, in either direction", () => {
    expect(sortBreakdown(items, "margin", "desc", label).map((i) => i.key)).toEqual([null, "a", "b"]);
    expect(sortBreakdown(items, "margin", "asc", label).map((i) => i.key)).toEqual(["a", null, "b"]);
  });
  it("does not mutate its input", () => {
    const copy = [...items];
    sortBreakdown(items, "jobs", "desc", label);
    expect(items).toEqual(copy);
  });
  it("barShare scales to the biggest value and never goes below zero", () => {
    expect(barShare(450, 900)).toBe(0.5);
    expect(barShare(-5, 900)).toBe(0);
    expect(barShare(5, 0)).toBe(0);
  });
});

const F = (jobs = 0, revenue = 0, cost = 0) => ({ jobs, revenue, cost, margin: jobs ? revenue - cost : null, marginPct: null });
const bucket = (start: string, earned = 0, pipeline = 0, cost = 0): SeriesBucket => ({ period: start, start, earned: F(earned ? 1 : 0, earned, cost), pipeline: F(pipeline ? 1 : 0, pipeline, 0) });

describe("chart model", () => {
  it("nice scale: rounded maximum and ticks from zero", () => {
    expect(niceScale(0)).toEqual({ max: 1, ticks: [0, 1] });
    expect(niceScale(870)).toEqual({ max: 1000, ticks: [0, 200, 400, 600, 800, 1000] });
    expect(niceScale(45000)).toEqual({ max: 50000, ticks: [0, 10000, 20000, 30000, 40000, 50000] });
  });
  it("one bar per bucket: earned solid, pipeline stacked on top, cost on the line; empty buckets are gaps", () => {
    const series = [bucket("2026-10-17", 20000, 0, 12000), bucket("2026-10-18"), bucket("2026-10-20", 0, 30000)];
    const c = buildChart(series, TODAY);
    expect(c.buckets.map((b) => [b.earned, b.expected, b.cost, b.empty])).toEqual([[20000, 0, 12000, false], [0, 0, 0, true], [0, 30000, 0, false]]);
    expect(c.max).toBeGreaterThanOrEqual(30000);
  });
  it("puts the Today marker on the bucket that contains today (day buckets)", () => {
    const c = buildChart([bucket("2026-10-18"), bucket("2026-10-19"), bucket("2026-10-20")], TODAY);
    expect(c.todayIndex).toBe(1);
    expect(buildChart([bucket("2026-11-01")], TODAY).todayIndex).toBeNull();
  });
  it("week and month buckets contain a range of days", () => {
    const week = buildChart([bucket("2026-10-12"), bucket("2026-10-19")], TODAY, "week");
    expect(week.todayIndex).toBe(1);
    const month = buildChart([bucket("2026-09-01"), bucket("2026-10-01")], TODAY, "month");
    expect(month.todayIndex).toBe(1);
  });
  it("labels buckets by day, week start or month in the user's language", () => {
    expect(bucketLabel("2026-10-05", "day", "en")).toBe("5 Oct");
    expect(bucketLabel("2026-10-05", "week", "en")).toBe("5 Oct");
    expect(bucketLabel("2026-10-01", "month", "en")).toBe("Oct 2026");
    expect(bucketLabel("2026-10-05", "day", "ro")).toMatch(/5 oct/i);
  });
});

const summary = (e: Partial<FinanceSummary["earned"]>, p: Partial<FinanceSummary["pipeline"]> = {}): FinanceSummary => ({
  currency: "RON", basis: "completed", timezone: "Europe/Bucharest", from: "2026-10-01", to: "2026-10-31", period: "day",
  earned: { ...F(), jobsWithoutPrice: 0, jobsWithoutCost: 0, ...e }, pipeline: { ...F(), jobsWithoutPrice: 0, jobsWithoutCost: 0, ...p }, series: [],
});

describe("data quality hints and empty states", () => {
  it("adds up missing prices and costs across earned and pipeline; null when complete", () => {
    expect(dataGaps(summary({ jobsWithoutPrice: 3, jobsWithoutCost: 6 }, { jobsWithoutCost: 1 }))).toEqual({ noPrice: 3, noCost: 7 });
    expect(dataGaps(summary({}))).toBeNull();
  });
  it("nothing done, or done but without a price, or fine", () => {
    expect(financeEmptyKind(summary({}))).toBe("nothing");
    expect(financeEmptyKind(summary({ jobs: 4, jobsWithoutPrice: 4 }))).toBe("noPrice");
    expect(financeEmptyKind(summary({ jobs: 4, revenue: 1000, jobsWithoutPrice: 1 }))).toBeNull();
    expect(financeEmptyKind(summary({}, { jobs: 2, revenue: 500 }))).toBeNull(); // only expected work: still a page with figures
  });
});
