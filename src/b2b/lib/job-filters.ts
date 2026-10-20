import type { JobFilters } from "@/b2b/api/endpoints";
import type { JobSortKey, JobStatus } from "@/b2b/api/types";
import { LIVE_STATUSES } from "./status";

// Jobs-list filters <-> URL query string. Pure so the URL stays the single source of truth.

export const JOB_STATUSES: readonly JobStatus[] = [
  "DRAFT", "NEW", "PLANNING", "WAITING_FOR_PARTS", "READY_TO_SCHEDULE", "SCHEDULED", "DISPATCHED",
  "EN_ROUTE", "ON_SITE", "IN_PROGRESS", "BLOCKED", "COMPLETED", "REVIEW", "CLOSED", "CANCELLED",
];
/** The status chips of the filter bar: drafts have their own view, not a chip among real statuses. */
export const CHIP_STATUSES: readonly JobStatus[] = JOB_STATUSES.filter((s) => s !== "DRAFT");
export const PAGE_SIZE = 25;

export const PRIORITIES = ["URGENT", "HIGH", "NORMAL", "LOW"] as const;
export type PriorityKey = (typeof PRIORITIES)[number];
const isPriority = (v: string): v is PriorityKey => (PRIORITIES as readonly string[]).includes(v);

/** Parse `priority` params (repeated or comma separated); unknown values are dropped, order is canonical. */
export function parsePriorities(sp: URLSearchParams): PriorityKey[] {
  const wanted = new Set(sp.getAll("priority").flatMap((s) => s.split(",")).map((s) => s.trim().toUpperCase()));
  return PRIORITIES.filter((p) => wanted.has(p) && isPriority(p));
}

/** Server-side sort keys of GET /jobs. */
export type JobSort = JobSortKey;
export type SortDir = "asc" | "desc";
export const JOB_SORTS: readonly JobSort[] = ["scheduledStart", "createdAt", "updatedAt", "number", "title", "priority", "status"];
const isSort = (v: string): v is JobSort => (JOB_SORTS as readonly string[]).includes(v);
/** Old URLs used ?sort=updated|scheduled. */
const LEGACY_SORT: Record<string, JobSort> = { updated: "updatedAt", scheduled: "scheduledStart" };

/** Direction a column starts with when first clicked: A-Z / soonest first, newest / highest first otherwise. */
export const defaultDir = (sort: JobSort): SortDir =>
  sort === "scheduledStart" || sort === "title" || sort === "status" || sort === "number" ? "asc" : "desc";

/** Next sort after a header click: same column flips direction, a new column starts at its default. */
export function nextSort(current: { sort: JobSort; dir: SortDir }, clicked: JobSort): { sort: JobSort; dir: SortDir } {
  return current.sort === clicked ? { sort: clicked, dir: current.dir === "asc" ? "desc" : "asc" } : { sort: clicked, dir: defaultDir(clicked) };
}

/** aria-sort value for a column header. */
export const ariaSort = (col: JobSort, current: { sort: JobSort; dir: SortDir }): "ascending" | "descending" | "none" =>
  current.sort !== col ? "none" : current.dir === "asc" ? "ascending" : "descending";

export interface JobListFilters {
  status: JobStatus[];
  teamId?: string;
  unassigned: boolean;
  /** Drafts view: only the ones I created (GET /jobs?mine=true). */
  mine: boolean;
  from?: string; // YYYY-MM-DD
  to?: string;
  q?: string;
  /** GET /jobs has no priority filter param (priority is only a sort): applied client-side to the loaded page. */
  priority: PriorityKey[];
  sort: JobSort;
  dir: SortDir;
  page: number; // 1-based
  cursor?: string;
}

export const DEFAULT_FILTERS: JobListFilters = { status: [], unassigned: false, mine: false, priority: [], sort: "updatedAt", dir: "desc", page: 1 };

export type PresetKey = "all" | "live" | "unassigned" | "scheduled" | "completed" | "review" | "drafts";
type PresetPatch = Pick<JobListFilters, "status" | "unassigned" | "mine">;

/** Spec §25 sub-nav, expressed as filter patches. */
export const PRESETS: ReadonlyArray<{ key: PresetKey; label: string; patch: PresetPatch }> = [
  { key: "all", label: "All", patch: { status: [], unassigned: false, mine: false } },
  { key: "live", label: "Live", patch: { status: [...LIVE_STATUSES], unassigned: false, mine: false } },
  { key: "unassigned", label: "Unassigned", patch: { status: [], unassigned: true, mine: false } },
  { key: "scheduled", label: "Scheduled", patch: { status: ["SCHEDULED"], unassigned: false, mine: false } },
  { key: "completed", label: "Completed", patch: { status: ["COMPLETED", "CLOSED"], unassigned: false, mine: false } },
  { key: "review", label: "Review", patch: { status: ["REVIEW"], unassigned: false, mine: false } },
  // Drafts are hidden from every other list; this view opens on "created by me" (the person's own work in progress).
  { key: "drafts", label: "Drafts", patch: { status: ["DRAFT"], unassigned: false, mine: true } },
];

/** The Drafts view is on: draft-only layout, "Created by" switch, no scheduling columns. */
export const isDraftsView = (f: Pick<JobListFilters, "status">): boolean => f.status.length === 1 && f.status[0] === "DRAFT";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isStatus = (v: string): v is JobStatus => (JOB_STATUSES as readonly string[]).includes(v);
const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

export function parseJobFilters(input: string | URLSearchParams): JobListFilters {
  const sp = typeof input === "string" ? new URLSearchParams(input) : input;
  const status: JobStatus[] = [];
  for (const raw of sp.getAll("status").flatMap((s) => s.split(","))) {
    const v = raw.trim().toUpperCase();
    if (isStatus(v) && !status.includes(v)) status.push(v);
  }
  const rawSort = sp.get("sort") ?? "";
  const sortParam: JobSort = isSort(rawSort) ? rawSort : (LEGACY_SORT[rawSort] ?? DEFAULT_FILTERS.sort);
  const pageNum = Number.parseInt(sp.get("page") ?? "", 10);
  const date = (k: string) => { const v = sp.get(k); return v && DATE_RE.test(v) ? v : undefined; };
  const text = (k: string) => { const v = sp.get(k)?.trim(); return v ? v : undefined; };
  return {
    status,
    teamId: text("team"),
    unassigned: sp.get("unassigned") === "true" || sp.get("unassigned") === "1",
    mine: sp.get("mine") === "true" || sp.get("mine") === "1",
    from: date("from"),
    to: date("to"),
    q: text("q"),
    priority: parsePriorities(sp),
    sort: sortParam,
    dir: sp.get("dir") === "asc" ? "asc" : sp.get("dir") === "desc" ? "desc" : sortParam === DEFAULT_FILTERS.sort ? DEFAULT_FILTERS.dir : defaultDir(sortParam),
    page: Number.isFinite(pageNum) && pageNum > 1 ? pageNum : 1,
    ...(sp.get("cursor") ? { cursor: sp.get("cursor")! } : {}),
  };
}

/** Canonical query string (no leading "?"); defaults are omitted so equal filters give equal URLs. */
export function serializeJobFilters(f: JobListFilters): string {
  const sp = new URLSearchParams();
  for (const s of f.status) sp.append("status", s);
  if (f.teamId) sp.set("team", f.teamId);
  if (f.unassigned) sp.set("unassigned", "true");
  if (f.mine) sp.set("mine", "true");
  if (f.from) sp.set("from", f.from);
  if (f.to) sp.set("to", f.to);
  if (f.q) sp.set("q", f.q);
  for (const p of f.priority) sp.append("priority", p);
  if (f.sort !== DEFAULT_FILTERS.sort) sp.set("sort", f.sort);
  if (f.dir !== (f.sort === DEFAULT_FILTERS.sort ? DEFAULT_FILTERS.dir : defaultDir(f.sort))) sp.set("dir", f.dir);
  if (f.page > 1) sp.set("page", String(f.page));
  if (f.cursor) sp.set("cursor", f.cursor);
  return sp.toString();
}

/** Filter/order changes reset paging. Offset jumps clear the forward cursor. */
export function withFilterChange(f: JobListFilters, patch: Partial<JobListFilters>): JobListFilters {
  const next = { ...f, ...patch };
  const touchesPage = "page" in patch;
  const filterChanged = (["status", "teamId", "unassigned", "mine", "from", "to", "q", "priority", "sort", "dir"] as const).some(
    (k) => JSON.stringify(f[k]) !== JSON.stringify(next[k])
  );
  if (filterChanged) return { ...next, page: 1, cursor: undefined };
  return touchesPage && !("cursor" in patch) ? { ...next, cursor: undefined } : next;
}

export function activeFilterCount(f: JobListFilters): number {
  return (f.status.length ? 1 : 0) + (f.teamId ? 1 : 0) + (f.unassigned ? 1 : 0) + (f.from ? 1 : 0) + (f.to ? 1 : 0) + (f.q ? 1 : 0) + (f.priority.length ? 1 : 0);
}

export function clearFilters(f: JobListFilters): JobListFilters {
  return { ...DEFAULT_FILTERS, sort: f.sort, dir: f.dir };
}

/** The preset tab that exactly matches the current filters, if any (other filters like q must be empty). */
export function activePreset(f: JobListFilters): PresetKey | null {
  if (f.teamId || f.from || f.to || f.q) return null;
  const hit = PRESETS.find((p) => p.patch.unassigned === f.unassigned && sameSet(p.patch.status, f.status));
  return hit ? hit.key : null;
}

/** Keep jobs whose priority is selected (no selection = keep all). Jobs without a priority count as NORMAL. */
export function filterByPriority<T extends { priority?: string }>(items: readonly T[], selected: readonly string[]): T[] {
  if (selected.length === 0) return [...items];
  return items.filter((j) => selected.includes((j.priority ?? "NORMAL").toUpperCase()));
}

/** Server-side filters, sort and paging. Cursor wins over offset on the API. */
export function toApiFilters(f: JobListFilters, pageSize: number = PAGE_SIZE): JobFilters {
  return {
    ...(f.status.length ? { status: f.status } : {}),
    ...(f.teamId ? { teamId: f.teamId } : {}),
    ...(f.unassigned ? { unassigned: true } : {}),
    ...(f.mine ? { mine: true } : {}),
    ...(f.from ? { from: f.from } : {}),
    ...(f.to ? { to: f.to } : {}),
    ...(f.q ? { q: f.q } : {}),
    sort: f.sort,
    dir: f.dir,
    limit: pageSize,
    offset: (f.page - 1) * pageSize,
    ...(f.cursor ? { cursor: f.cursor } : {}),
  };
}
