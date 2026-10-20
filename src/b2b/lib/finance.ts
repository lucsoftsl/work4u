import type { BreakdownItem, FinanceBasis, FinanceBy, FinanceFilters, FinanceKind, FinanceMissing, FinancePeriod, FinanceSummary, SeriesBucket } from "@/b2b/api/finance";

// Pure logic of the Finance overview (01267d10): company-local dates, period presets, the URL state, sorting and the chart model.

export const MAX_RANGE_DAYS = 400;
const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isRealDate(v: string): boolean {
  const m = DATE_RE.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}
const toMs = (date: string) => Date.parse(`${date}T00:00:00Z`);
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The calendar day it is in the company's timezone (YYYY-MM-DD). An unknown zone falls back to UTC. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}
export const addDays = (date: string, n: number): string => fromMs(toMs(date) + n * DAY_MS);
export const daysInclusive = (from: string, to: string): number => Math.round((toMs(to) - toMs(from)) / DAY_MS) + 1;

export type PeriodPreset = "month" | "lastMonth" | "quarter" | "custom";
const firstOfMonth = (y: number, m0: number) => fromMs(Date.UTC(y, m0, 1));
const lastOfMonth = (y: number, m0: number) => fromMs(Date.UTC(y, m0 + 1, 0));

export function periodRange(preset: Exclude<PeriodPreset, "custom">, today: string): { from: string; to: string } {
  const y = +today.slice(0, 4);
  const m0 = +today.slice(5, 7) - 1;
  if (preset === "month") return { from: firstOfMonth(y, m0), to: lastOfMonth(y, m0) };
  if (preset === "lastMonth") return { from: firstOfMonth(y, m0 - 1), to: lastOfMonth(y, m0 - 1) };
  const q0 = Math.floor(m0 / 3) * 3;
  return { from: firstOfMonth(y, q0), to: lastOfMonth(y, q0 + 2) };
}

export function detectPreset(from: string, to: string, today: string): PeriodPreset {
  for (const p of ["month", "lastMonth", "quarter"] as const) {
    const r = periodRange(p, today);
    if (r.from === from && r.to === to) return p;
  }
  return "custom";
}

export function rangeProblem(from: string, to: string): "invalid" | "order" | "tooLong" | null {
  if (!isRealDate(from) || !isRealDate(to)) return "invalid";
  if (from > to) return "order";
  return daysInclusive(from, to) > MAX_RANGE_DAYS ? "tooLong" : null;
}

// ---- URL state
export type BreakdownSort = "name" | "jobs" | "revenue" | "cost" | "margin" | "marginPct";
export type SortDir = "asc" | "desc";
export type ChartView = "chart" | "table";
export interface FinanceState {
  from: string; to: string; basis: FinanceBasis; view: ChartView; by: FinanceBy; kind: FinanceKind;
  sort: BreakdownSort; dir: SortDir;
  /** Jobs list + CSV: only jobs with no price / no cost / either (server-side). */
  missing?: FinanceMissing;
  customerId?: string; teamId?: string; memberId?: string; jobTypeId?: string;
}

const BYS: readonly FinanceBy[] = ["client", "team", "jobType", "technician"];
const SORTS: readonly BreakdownSort[] = ["name", "jobs", "revenue", "cost", "margin", "marginPct"];
const KINDS: readonly FinanceKind[] = ["all", "earned", "pipeline"];
const MISSINGS: readonly FinanceMissing[] = ["price", "cost", "any"];

/** Technicians start in alphabetical order, never "best first": a revenue ranking of people is not what this view is for. */
export function defaultSort(by: FinanceBy): { sort: BreakdownSort; dir: SortDir } {
  return by === "technician" ? { sort: "name", dir: "asc" } : { sort: "revenue", dir: "desc" };
}
export const defaultDir = (sort: BreakdownSort): SortDir => (sort === "name" ? "asc" : "desc");

export function parseFinanceParams(input: string | URLSearchParams, today: string): FinanceState {
  const sp = typeof input === "string" ? new URLSearchParams(input) : input;
  const month = periodRange("month", today);
  const f = sp.get("from") ?? "";
  const t = sp.get("to") ?? "";
  const range = isRealDate(f) && isRealDate(t) ? { from: f, to: t } : month;
  const by = (BYS as readonly string[]).includes(sp.get("by") ?? "") ? (sp.get("by") as FinanceBy) : "client";
  const rawSort = sp.get("sort") ?? "";
  const dflt = defaultSort(by);
  const sort = (SORTS as readonly string[]).includes(rawSort) ? (rawSort as BreakdownSort) : dflt.sort;
  const rawDir = sp.get("dir");
  const dir: SortDir = rawDir === "asc" || rawDir === "desc" ? rawDir : sort === dflt.sort ? dflt.dir : defaultDir(sort);
  const text = (k: string) => sp.get(k)?.trim() || undefined;
  return {
    ...range,
    basis: sp.get("basis") === "scheduled" ? "scheduled" : "completed",
    view: sp.get("view") === "table" ? "table" : "chart",
    by,
    kind: (KINDS as readonly string[]).includes(sp.get("kind") ?? "") ? (sp.get("kind") as FinanceKind) : "all",
    sort,
    dir,
    ...((MISSINGS as readonly string[]).includes(sp.get("missing") ?? "") ? { missing: sp.get("missing") as FinanceMissing } : {}),
    ...(text("customer") ? { customerId: text("customer") } : {}),
    ...(text("team") ? { teamId: text("team") } : {}),
    ...(text("member") ? { memberId: text("member") } : {}),
    ...(text("type") ? { jobTypeId: text("type") } : {}),
  };
}

/** Canonical query string without "?": defaults are left out so equal states give equal URLs. */
export function serializeFinanceParams(s: FinanceState, today: string): string {
  const sp = new URLSearchParams();
  const month = periodRange("month", today);
  if (s.from !== month.from || s.to !== month.to) { sp.set("from", s.from); sp.set("to", s.to); }
  if (s.basis === "scheduled") sp.set("basis", "scheduled");
  if (s.customerId) sp.set("customer", s.customerId);
  if (s.teamId) sp.set("team", s.teamId);
  if (s.memberId) sp.set("member", s.memberId);
  if (s.jobTypeId) sp.set("type", s.jobTypeId);
  if (s.view === "table") sp.set("view", "table");
  if (s.by !== "client") sp.set("by", s.by);
  if (s.kind !== "all") sp.set("kind", s.kind);
  if (s.missing) sp.set("missing", s.missing);
  const dflt = defaultSort(s.by);
  if (s.sort !== dflt.sort) sp.set("sort", s.sort);
  if (s.dir !== (s.sort === dflt.sort ? dflt.dir : defaultDir(s.sort))) sp.set("dir", s.dir);
  return sp.toString();
}

export function toApiFilters(s: FinanceState): FinanceFilters {
  return {
    from: s.from, to: s.to, basis: s.basis,
    ...(s.customerId ? { customerId: s.customerId } : {}),
    ...(s.teamId ? { teamId: s.teamId } : {}),
    ...(s.memberId ? { memberId: s.memberId } : {}),
    ...(s.jobTypeId ? { jobTypeId: s.jobTypeId } : {}),
  };
}

// ---- breakdown table
const numericOf = (i: BreakdownItem, sort: Exclude<BreakdownSort, "name">): number | null => i[sort];

/** Sorted copy. A blank margin always sorts last, in either direction; ties fall back to the name. */
export function sortBreakdown(items: readonly BreakdownItem[], sort: BreakdownSort, dir: SortDir, nullLabel: string, locale = "en"): BreakdownItem[] {
  const label = (i: BreakdownItem) => i.name ?? nullLabel;
  const byName = (a: BreakdownItem, b: BreakdownItem) => label(a).localeCompare(label(b), locale, { sensitivity: "base" });
  const sign = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    if (sort === "name") return sign * byName(a, b);
    const x = numericOf(a, sort);
    const y = numericOf(b, sort);
    if (x === null && y === null) return byName(a, b);
    if (x === null) return 1;
    if (y === null) return -1;
    return x === y ? byName(a, b) : sign * (x - y);
  });
}

/** Width of the inline bar in a table cell (0..1). Decorative: the number is the value. */
export const barShare = (value: number, max: number): number => (max > 0 && value > 0 ? Math.min(1, value / max) : 0);

// ---- chart
export interface NiceScale { max: number; ticks: number[] }

/** A round maximum and up to five equal steps from zero. */
export function niceScale(value: number): NiceScale {
  if (!(value > 0)) return { max: 1, ticks: [0, 1] };
  const exp = Math.floor(Math.log10(value));
  for (const e of [exp - 1, exp, exp + 1]) {
    for (const m of [1, 2, 2.5, 5, 10]) {
      const step = m * 10 ** e;
      const intervals = Math.ceil(value / step);
      if (intervals <= 5) return { max: intervals * step, ticks: Array.from({ length: intervals + 1 }, (_, i) => i * step) };
    }
  }
  return { max: value, ticks: [0, value] };
}

export interface ChartBucket { key: string; start: string; earned: number; expected: number; cost: number; empty: boolean }
export interface ChartModel { buckets: ChartBucket[]; max: number; ticks: number[]; todayIndex: number | null }

function bucketEnd(start: string, period: FinancePeriod): string {
  if (period === "day") return addDays(start, 1);
  if (period === "week") return addDays(start, 7);
  return firstOfMonth(+start.slice(0, 4), +start.slice(5, 7));
}

/** Earned = solid bar, expected = hatched bar stacked on it, cost = the line. An empty bucket is a gap, not a labelled zero. */
export function buildChart(series: readonly SeriesBucket[], today: string, period: FinancePeriod = "day"): ChartModel {
  const buckets: ChartBucket[] = series.map((b) => ({
    key: b.start, start: b.start, earned: b.earned.revenue, expected: b.pipeline.revenue, cost: b.earned.cost,
    empty: b.earned.jobs === 0 && b.pipeline.jobs === 0,
  }));
  const top = Math.max(0, ...buckets.map((b) => Math.max(b.earned + b.expected, b.cost)));
  const scale = niceScale(top);
  const todayIndex = series.findIndex((b) => b.start <= today && today < bucketEnd(b.start, period));
  return { buckets, max: scale.max, ticks: scale.ticks, todayIndex: todayIndex >= 0 ? todayIndex : null };
}

/** English dates read "5 Oct" (day first), like the rest of the ops console. */
const dateLocale = (locale: string) => (locale === "en" ? "en-GB" : locale);

export function bucketLabel(start: string, period: FinancePeriod, locale: string): string {
  const d = new Date(`${start}T12:00:00Z`);
  const opts: Intl.DateTimeFormatOptions = period === "month" ? { month: "short", year: "numeric", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" };
  return new Intl.DateTimeFormat(dateLocale(locale), opts).format(d);
}

export function rangeLabel(from: string, to: string, locale: string): string {
  const f = new Intl.DateTimeFormat(dateLocale(locale), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return `${f.format(new Date(`${from}T12:00:00Z`))} – ${f.format(new Date(`${to}T12:00:00Z`))}`;
}

// ---- states and hints
/** "6 jobs have no cost and 3 have no price": counted over earned and expected work. null when the data is complete. */
export function dataGaps(s: Pick<FinanceSummary, "earned" | "pipeline">): { noPrice: number; noCost: number } | null {
  const noPrice = s.earned.jobsWithoutPrice + s.pipeline.jobsWithoutPrice;
  const noCost = s.earned.jobsWithoutCost + s.pipeline.jobsWithoutCost;
  return noPrice || noCost ? { noPrice, noCost } : null;
}

/** "nothing": no job counted at all. "noPrice": jobs were done but none has a price. Otherwise there is something to show. */
export function financeEmptyKind(s: Pick<FinanceSummary, "earned" | "pipeline">): "nothing" | "noPrice" | null {
  if (s.earned.jobs === 0 && s.pipeline.jobs === 0) return "nothing";
  if (s.earned.jobs > 0 && s.earned.jobsWithoutPrice === s.earned.jobs) return "noPrice";
  return null;
}
