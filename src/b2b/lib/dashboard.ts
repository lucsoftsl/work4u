import type { JobFilters } from "@/b2b/api/endpoints";
import type { Job, JobStatus } from "@/b2b/api/types";
import { LIVE_STATUSES, OPEN_STATUSES } from "./status";
import { DEFAULT_FILTERS, serializeJobFilters, type JobListFilters } from "./job-filters";

// Pure derivations for the ops dashboard. There is no summary endpoint, so everything is computed from job pages.

const HOUR = 3_600_000;
export const SLA_RISK_WINDOW_MS = 2 * HOUR;
export const UNASSIGNED_SOON_WINDOW_MS = 4 * HOUR;
const PRE_START: JobStatus[] = ["SCHEDULED", "DISPATCHED", "READY_TO_SCHEDULE"];
const IN_FIELD: JobStatus[] = ["EN_ROUTE", "IN_PROGRESS"];
const FINISHED: JobStatus[] = ["COMPLETED", "CLOSED", "CANCELLED"];
/** Statuses where "no assignee" is a problem worth listing. */
export const UNASSIGNED_STATUSES: JobStatus[] = ["NEW", "PLANNING", "READY_TO_SCHEDULE", "SCHEDULED", "WAITING_FOR_PARTS"];

// ---- time zone helpers

function offsetMs(instant: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
  }).formatToParts(new Date(instant));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - Math.floor(instant / 1000) * 1000;
}

/** YYYY-MM-DD of `instant` in `tz`. */
export function localDate(instant: Date | number, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(instant));
  const g = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${g("year")}-${g("month")}-${g("day")}`;
}

/** UTC instant (ms) of 00:00 local on `ymd` in `tz` (DST-safe). */
function startOfLocalDay(ymd: string, tz: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  let t = guess - offsetMs(guess, tz);
  t = guess - offsetMs(t, tz);
  return t;
}

export interface DayRange { date: string; start: number; end: number }

/** Today's [start, end) in the org timezone. */
export function todayRange(now: Date, tz: string): DayRange {
  const date = localDate(now, tz);
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return { date, start: startOfLocalDay(date, tz), end: startOfLocalDay(next, tz) };
}

const ms = (iso?: string | null): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
};
const inRange = (t: number | null, r: DayRange) => t !== null && t >= r.start && t < r.end;

// ---- predicates

export function isDelayed(job: Job, nowMs: number): boolean {
  const start = ms(job.scheduledStart);
  const end = ms(job.scheduledEnd);
  if (PRE_START.includes(job.status) && start !== null && start < nowMs) return true;
  return IN_FIELD.includes(job.status) && end !== null && end < nowMs;
}

export function isSlaAtRisk(job: Job, nowMs: number): boolean {
  const due = ms(job.slaDueAt);
  return due !== null && !FINISHED.includes(job.status) && due - nowMs <= SLA_RISK_WINDOW_MS;
}

// ---- buckets

export type BucketKey =
  | "live" | "scheduledToday" | "upcoming" | "unassigned" | "delayed" | "waitingParts" | "review" | "blocked" | "completedToday" | "cancelled";

export type BucketCounts = Record<BucketKey, number>;

export interface BucketOptions { unassignedCount?: number }

export function bucketCounts(jobs: readonly Job[], now: Date, tz: string, opts: BucketOptions = {}): BucketCounts {
  const nowMs = now.getTime();
  const today = todayRange(now, tz);
  const c: BucketCounts = {
    live: 0, scheduledToday: 0, upcoming: 0, unassigned: opts.unassignedCount ?? 0, delayed: 0,
    waitingParts: 0, review: 0, blocked: 0, completedToday: 0, cancelled: 0,
  };
  for (const j of jobs) {
    const start = ms(j.scheduledStart);
    if (LIVE_STATUSES.includes(j.status)) c.live++;
    if (OPEN_STATUSES.includes(j.status) && inRange(start, today)) c.scheduledToday++;
    if (OPEN_STATUSES.includes(j.status) && start !== null && start >= today.end) c.upcoming++;
    if (isDelayed(j, nowMs)) c.delayed++;
    if (j.status === "WAITING_FOR_PARTS") c.waitingParts++;
    if (j.status === "REVIEW") c.review++;
    if (j.status === "BLOCKED") c.blocked++;
    if ((j.status === "COMPLETED" || j.status === "CLOSED") && inRange(ms(j.timestamps?.completedAt), today)) c.completedToday++;
    if (j.status === "CANCELLED" && inRange(ms(j.timestamps?.cancelledAt ?? j.updatedAt), today)) c.cancelled++;
  }
  return c;
}

/**
 * Buckets that are a pure status filter: their count is `total` of a cheap `limit=1` query instead of a count over loaded jobs.
 * (Unassigned also has an exact total, from the page that feeds the alerts. Date-based buckets still need loaded jobs.)
 */
export const TOTAL_BUCKET_FILTERS: Partial<Record<BucketKey, JobFilters>> = {
  live: { status: [...LIVE_STATUSES] },
  waitingParts: { status: ["WAITING_FOR_PARTS"] },
  review: { status: ["REVIEW"] },
  blocked: { status: ["BLOCKED"] },
};
export const TOTAL_BUCKET_KEYS = Object.keys(TOTAL_BUCKET_FILTERS) as BucketKey[];

/** Server totals win over counts derived from the loaded jobs; keys without a number keep the derived count. */
export function mergeBucketTotals(counts: BucketCounts, totals: Partial<Record<BucketKey, number | undefined>>): BucketCounts {
  const next = { ...counts };
  for (const [key, n] of Object.entries(totals) as Array<[BucketKey, number | undefined]>) if (typeof n === "number") next[key] = n;
  return next;
}

/** Jobs-list filters a bucket card links to (date window = today in the org timezone). */
export function bucketFilters(key: BucketKey, now: Date, tz: string): JobListFilters {
  const today = todayRange(now, tz);
  const base = { ...DEFAULT_FILTERS };
  switch (key) {
    case "live": return { ...base, status: [...LIVE_STATUSES] };
    case "scheduledToday": return { ...base, from: today.date, to: today.date, sort: "scheduledStart", dir: "asc" };
    case "upcoming": return { ...base, status: ["SCHEDULED", "DISPATCHED", "READY_TO_SCHEDULE"], from: today.date, sort: "scheduledStart", dir: "asc" };
    case "unassigned": return { ...base, unassigned: true };
    case "delayed": return { ...base, status: ["SCHEDULED", "DISPATCHED", "READY_TO_SCHEDULE", "EN_ROUTE", "IN_PROGRESS"], to: today.date };
    case "waitingParts": return { ...base, status: ["WAITING_FOR_PARTS"] };
    case "review": return { ...base, status: ["REVIEW"] };
    case "blocked": return { ...base, status: ["BLOCKED"] };
    case "completedToday": return { ...base, status: ["COMPLETED", "CLOSED"] };
    case "cancelled": return { ...base, status: ["CANCELLED"] };
  }
}

export const bucketHref = (orgId: string, key: BucketKey, now: Date, tz: string): string => {
  const qs = serializeJobFilters(bucketFilters(key, now, tz));
  return `/ops/${orgId}/jobs${qs ? `?${qs}` : ""}`;
};

// ---- alerts

export type AlertKind = "running_late" | "blocked" | "unassigned_soon" | "waiting_parts" | "sla_risk";
export type AlertSeverity = "critical" | "warning" | "info";
export interface DashboardAlert { id: string; kind: AlertKind; severity: AlertSeverity; job: Job; at: number | null }

const SEVERITY_RANK: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

/**
 * One alert per (job, kind). `unassigned` is the list of jobs that currently have no assignee
 * (GET /jobs?unassigned=true); overlapping assignments are not derivable from job lists and are omitted.
 */
export function alerts(jobs: readonly Job[], now: Date, _tz: string, unassigned: readonly Job[] = []): DashboardAlert[] {
  void _tz;
  const nowMs = now.getTime();
  const out: DashboardAlert[] = [];
  const add = (kind: AlertKind, severity: AlertSeverity, job: Job, at: number | null) =>
    out.push({ id: `${kind}:${job.id}`, kind, severity, job, at });

  for (const j of jobs) {
    if (j.status === "BLOCKED") add("blocked", "critical", j, ms(j.updatedAt));
    if (isDelayed(j, nowMs)) add("running_late", "warning", j, ms(IN_FIELD.includes(j.status) ? j.scheduledEnd : j.scheduledStart));
    if (j.status === "WAITING_FOR_PARTS") add("waiting_parts", "warning", j, ms(j.updatedAt));
    if (isSlaAtRisk(j, nowMs)) add("sla_risk", ms(j.slaDueAt)! < nowMs ? "critical" : "warning", j, ms(j.slaDueAt));
  }
  for (const j of unassigned) {
    const start = ms(j.scheduledStart);
    if (start !== null && start - nowMs <= UNASSIGNED_SOON_WINDOW_MS && !FINISHED.includes(j.status)) {
      add("unassigned_soon", start < nowMs ? "critical" : "warning", j, start);
    }
  }
  return out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || (a.at ?? Infinity) - (b.at ?? Infinity) || a.id.localeCompare(b.id));
}
