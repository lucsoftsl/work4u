import type { Translate } from "./plural";
import type { Conflict, ConflictCheck, DispatchBoard, Job, JobStatus } from "@/b2b/api/types";

// Pure dispatch-board logic: drop decisions, optimistic board updates, lane badges, error messages.

export const ASSIGNABLE_STATUSES: readonly JobStatus[] = [
  "NEW", "PLANNING", "WAITING_FOR_PARTS", "READY_TO_SCHEDULE", "SCHEDULED", "DISPATCHED",
];
export const UNASSIGNED_LANE = "unassigned";
export const MIN_OVERRIDE_REASON = 3;
export const DEFAULT_CAPACITY_HOURS = 8;

export function canDragJob(job: Pick<Job, "status">, canAssign: boolean): boolean {
  return canAssign && ASSIGNABLE_STATUSES.includes(job.status);
}

// ---- drop decision
export type DropKind = "assign" | "confirm-override" | "blocked" | "noop";
export interface DropDecision { kind: DropKind; conflicts: Conflict[] }
export interface DropTarget { laneId: string; currentLaneId: string }

export function decideDrop(input: {
  job: Pick<Job, "id">;
  target: DropTarget;
  check: ConflictCheck | null;
  viewerCanOverride: boolean;
}): DropDecision {
  const { target, check, viewerCanOverride } = input;
  if (target.laneId === UNASSIGNED_LANE || target.laneId === target.currentLaneId) return { kind: "noop", conflicts: [] };
  if (!check || check.conflicts.length === 0) return { kind: "assign", conflicts: [] };
  const kind: DropKind = check.canOverride && viewerCanOverride ? "confirm-override" : "blocked";
  return { kind, conflicts: check.conflicts };
}

export function isValidOverrideReason(reason: string): boolean {
  return reason.trim().length >= MIN_OVERRIDE_REASON;
}

// ---- optimistic board
function byStart(a: Job, b: Job): number {
  const sa = a.scheduledStart ?? "9999";
  const sb = b.scheduledStart ?? "9999";
  return sa < sb ? -1 : sa > sb ? 1 : a.number - b.number;
}

export function findJob(board: DispatchBoard, jobId: string): Job | undefined {
  return (
    board.unassigned.find((j) => j.id === jobId) ??
    board.teams.flatMap((t) => t.jobs).find((j) => j.id === jobId) ??
    board.individuals.find((j) => j.id === jobId)
  );
}

export function laneOfJob(board: DispatchBoard, jobId: string): string {
  const team = board.teams.find((t) => t.jobs.some((j) => j.id === jobId));
  if (team) return team.id;
  return board.individuals.some((j) => j.id === jobId) ? "individuals" : UNASSIGNED_LANE;
}

/** Returns a NEW board with the job moved into `teamId` (removed from wherever it was). Input is untouched. */
export function applyAssignmentToBoard(board: DispatchBoard, jobId: string, teamId: string): DispatchBoard {
  const job = findJob(board, jobId);
  if (!job || !board.teams.some((t) => t.id === teamId)) return board;
  return {
    ...board,
    unassigned: board.unassigned.filter((j) => j.id !== jobId),
    individuals: board.individuals.filter((j) => j.id !== jobId),
    teams: board.teams.map((t) => {
      const without = t.jobs.filter((j) => j.id !== jobId);
      return t.id === teamId ? { ...t, jobs: [...without, job].sort(byStart) } : { ...t, jobs: without };
    }),
  };
}

/** Rollback = restore the snapshot taken before the optimistic update (undefined snapshot keeps current). */
export function rollback<T>(current: T, snapshot: T | undefined): T {
  return snapshot === undefined ? current : snapshot;
}

// ---- hours
export function jobHours(job: Pick<Job, "scheduledStart" | "scheduledEnd" | "estimatedDurationMin">): number {
  if (job.scheduledStart && job.scheduledEnd) {
    const ms = Date.parse(job.scheduledEnd) - Date.parse(job.scheduledStart);
    if (Number.isFinite(ms) && ms > 0) return ms / 3_600_000;
  }
  return job.estimatedDurationMin ? job.estimatedDurationMin / 60 : 0;
}

export interface TeamHours { count: number; hours: number; capacity: number; hasHours: boolean }
export function teamHours(jobs: readonly Job[], capacity = DEFAULT_CAPACITY_HOURS): TeamHours {
  const hours = jobs.reduce((sum, j) => sum + jobHours(j), 0);
  return { count: jobs.length, hours: Math.round(hours * 10) / 10, capacity, hasHours: hours > 0 };
}

// ---- lane badge
export type LaneBadgeTone = "fits" | "conflict" | "skill" | "checking";
export interface LaneBadge { tone: LaneBadgeTone; text: string }

export function laneBadge(check: ConflictCheck | null | undefined, t: Translate = (_k, f) => f): LaneBadge {
  if (!check) return { tone: "checking", text: t("b2b.dispatch.badge.checking", "Checking…") };
  if (check.conflicts.length === 0) return { tone: "fits", text: t("b2b.dispatch.badge.fits", "Fits") };
  const nonSkill = check.conflicts.find((c) => c.type !== "SKILL_MISSING");
  if (nonSkill) return { tone: "conflict", text: t("b2b.dispatch.badge.conflict", "Conflict: {message}").replace("{message}", nonSkill.message) };
  return { tone: "skill", text: t("b2b.dispatch.badge.skill", "Missing skill") };
}

export const checkCacheKey = (jobId: string, laneId: string) => `${jobId}:${laneId}`;

// ---- errors
export interface AssignErrorInfo {
  message: string;
  /** Fresh conflicts from a race (409 ASSIGNMENT_CONFLICT): re-show them in the dialog. */
  conflicts?: Conflict[];
  /** Offer a link to the job workspace. */
  linkToJob?: boolean;
  retryable?: boolean;
}

interface ErrLike { code?: string; status?: number; conflicts?: Conflict[] }

export function mapAssignError(err: unknown, t: Translate = (_k, f) => f): AssignErrorInfo {
  const e = (err ?? {}) as ErrLike;
  switch (e.code) {
    case "ASSIGNMENT_CONFLICT":
      return { message: t("b2b.dispatch.err.conflict", "Someone changed this team's schedule. Review the new conflicts."), conflicts: e.conflicts ?? [] };
    case "SCHEDULE_REQUIRED":
      return { message: t("b2b.dispatch.err.schedule", "Set a time window first"), linkToJob: true };
    case "ASSIGNMENT_LOCKED":
      return { message: t("b2b.dispatch.err.locked", "This job has already started; its team can't be changed") };
    case "OVERRIDE_FORBIDDEN":
      return { message: t("b2b.dispatch.err.override", "You don't have permission to override scheduling conflicts.") };
    case "FORBIDDEN":
      return { message: t("b2b.dispatch.err.forbidden", "You don't have permission to assign jobs.") };
    case "NETWORK":
      return { message: t("b2b.dispatch.err.network", "Can't reach the server. Check your connection and try again."), retryable: true };
    default:
      if (e.status === 403) return { message: t("b2b.dispatch.err.denied", "You don't have permission to do that.") };
      return { message: t("b2b.dispatch.err.generic", "The job could not be assigned. Please try again."), retryable: true };
  }
}

// ---- date helpers (org timezone)
export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function isIsoDate(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatTime(iso: string | null | undefined, timezone: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
  } catch {
    return "";
  }
}

// ---- timeline geometry (08:00-18:00 window in org tz)
export const TIMELINE_START_H = 8;
export const TIMELINE_END_H = 18;

export function minutesInTz(iso: string, timezone: string): number {
  const [h, m] = formatTime(iso, timezone).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Left/width percentages for a job block inside the timeline window, or null when outside / unscheduled. */
export function timelineBlock(job: Pick<Job, "scheduledStart" | "scheduledEnd">, timezone: string): { left: number; width: number } | null {
  if (!job.scheduledStart || !job.scheduledEnd) return null;
  const from = TIMELINE_START_H * 60;
  const span = (TIMELINE_END_H - TIMELINE_START_H) * 60;
  const start = Math.max(minutesInTz(job.scheduledStart, timezone), from);
  const end = Math.min(minutesInTz(job.scheduledEnd, timezone) || TIMELINE_END_H * 60, TIMELINE_END_H * 60);
  if (end <= start) return null;
  return { left: ((start - from) / span) * 100, width: ((end - start) / span) * 100 };
}

/** Track index per block so overlapping blocks stack instead of drawing over each other. Input order is kept. */
export function assignTracks(blocks: ReadonlyArray<{ left: number; width: number }>): number[] {
  const order = blocks.map((_, i) => i).sort((a, b) => blocks[a].left - blocks[b].left);
  const trackEnds: number[] = [];
  const track = new Array<number>(blocks.length).fill(0);
  for (const i of order) {
    const { left, width } = blocks[i];
    let t = trackEnds.findIndex((end) => end <= left);
    if (t === -1) { t = trackEnds.length; trackEnds.push(0); }
    trackEnds[t] = left + width;
    track[i] = t;
  }
  return track;
}

/** Left % of "now" inside the timeline window, or null when outside it. */
export function nowPercent(nowMs: number, timezone: string): number | null {
  const from = TIMELINE_START_H * 60;
  const span = (TIMELINE_END_H - TIMELINE_START_H) * 60;
  const m = minutesInTz(new Date(nowMs).toISOString(), timezone);
  return m < from || m > from + span ? null : ((m - from) / span) * 100;
}
