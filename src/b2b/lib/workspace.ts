import type { Assignment, AttachmentCategory, Conflict, JobWorkspace, TimelineEntry } from "@/b2b/api/types";
import type { JobForTransitions } from "@/b2b/lib/transitions";
import { JOB_STATUS_META } from "@/b2b/lib/status";

// Pure helpers for the job workspace (no React, no network).

// ---------- reasons
export const MIN_REASON_LENGTH = 3;
export const isValidReason = (value: string): boolean => value.trim().length >= MIN_REASON_LENGTH;

// ---------- transitions input
export function toTransitionJob(job: JobWorkspace, me: { memberId?: string; teamIds?: readonly string[] }): JobForTransitions {
  const assignments = job.assignments ?? [];
  const myTeams = me.teamIds ?? [];
  const assignedToMe = assignments.some(
    (a) => (!!a.memberId && a.memberId === me.memberId) || (!!a.teamId && myTeams.includes(a.teamId))
  );
  return {
    status: job.status,
    blockedFromStatus: job.blockedFromStatus,
    scheduledStart: job.scheduledStart,
    scheduledEnd: job.scheduledEnd,
    assignmentCount: assignments.length,
    requirements: { review: !!job.requirements?.review },
    assignedToMe,
    teamIds: assignments.map((a: Assignment) => a.teamId).filter((id): id is string => !!id),
  };
}

// ---------- conflicts
const CONFLICT_LABEL: Record<string, string> = {
  TEAM_TIME_OVERLAP: "Team double-booked",
  MEMBER_TIME_OVERLAP: "Technician double-booked",
  SKILL_MISSING: "Skill missing",
  ALREADY_ASSIGNED: "Already assigned",
};

export interface ConflictView { type: Conflict["type"]; label: string; message: string }

export function describeConflict(c: Conflict): ConflictView {
  const label = CONFLICT_LABEL[c.type] ?? "Conflict";
  const message = c.message?.trim() || (c.jobNumber ? `Overlaps JOB-${c.jobNumber}` : label);
  return { type: c.type, label, message };
}
export const describeConflicts = (list: readonly Conflict[]): ConflictView[] => list.map(describeConflict);

// ---------- errors
export type ErrorKind = "stale" | "conflict" | "missing" | "forbidden" | "notFound" | "generic";
export interface DescribedError {
  kind: ErrorKind;
  message: string;
  code?: string;
  conflicts?: Conflict[];
  missing?: string[];
  currentStatus?: string;
  /** Override was refused (403 OVERRIDE_FORBIDDEN) */
  overrideForbidden?: boolean;
  scheduleRequired?: boolean;
}

interface ErrorLike { name?: string; message?: string; status?: number; code?: string; body?: Record<string, unknown> }

const MISSING_LABEL: Record<string, string> = {
  schedule: "a scheduled time window", assignment: "an assigned team or technician", checklist: "the checklist completed",
  notes: "completion notes", photo: "an After photo", signature: "the customer signature",
};
export const missingLabel = (key: string): string => MISSING_LABEL[key] ?? key;
export const listMissing = (keys: readonly string[]): string => keys.map(missingLabel).join(", ");

export function describeB2bError(err: unknown): DescribedError {
  const e = (err ?? {}) as ErrorLike;
  if (e.name !== "B2bError") return { kind: "generic", message: "Something went wrong. Please try again." };
  const body = e.body ?? {};
  const details = (body.details && typeof body.details === "object" ? body.details : {}) as Record<string, unknown>;
  const missingSrc = Array.isArray(body.missing) ? body.missing : Array.isArray(details.missing) ? details.missing : [];
  const missing = missingSrc as string[];
  const conflicts = Array.isArray(body.conflicts) ? (body.conflicts as Conflict[]) : [];
  const currentStatus = typeof body.currentStatus === "string" ? body.currentStatus : undefined;
  const base = { code: e.code, conflicts, missing, currentStatus };
  const statusLabel = currentStatus && currentStatus in JOB_STATUS_META ? JOB_STATUS_META[currentStatus as keyof typeof JOB_STATUS_META].label : currentStatus;

  switch (e.code) {
    case "VERSION_CONFLICT":
      return { ...base, kind: "stale", message: `This job was changed by someone else${statusLabel ? ` — now ${statusLabel}` : ""}. Reload to continue.` };
    case "ASSIGNMENT_CONFLICT":
      return { ...base, kind: "conflict", message: "This assignment conflicts with existing bookings." };
    case "OVERRIDE_FORBIDDEN":
      return { ...base, kind: "forbidden", overrideForbidden: true, message: "Your role can't override conflicts. Choose another team or time, or ask a dispatcher with override rights." };
    case "GUARD_FAILED":
      return { ...base, kind: "missing", message: missing.length ? `Can't move yet. Needs ${listMissing(missing)}.` : "This move isn't allowed yet." };
    case "COMPLETION_REQUIREMENTS_MISSING":
      return { ...base, kind: "missing", message: missing.length ? `Can't complete yet. Still missing: ${listMissing(missing)}.` : "Completion requirements are missing." };
    case "EVIDENCE_UNAVAILABLE":
      return { ...base, kind: "generic", message: "Evidence can't be checked right now; try again later or ask an administrator." };
    case "EVIDENCE_REQUIRED":
      return { ...base, kind: "missing", message: `The server refused approval: required evidence is missing${missing.length ? `: ${listMissing(missing)}` : ""}. Send the job back so the team can add it.` };
    case "INVALID_TRANSITION":
      return { ...base, kind: "stale", message: `That move isn't available${statusLabel ? ` — the job is now ${statusLabel}` : ""}. Reload to continue.` };
    case "ASSIGNMENT_LOCKED":
      return { ...base, kind: "generic", message: "Assignments are locked once the job is en route or later." };
    case "SCHEDULE_REQUIRED":
      return { ...base, kind: "generic", scheduleRequired: true, message: "Set a time window first, then assign." };
    case "REASON_REQUIRED":
      return { ...base, kind: "generic", message: "A reason is required (at least 3 characters)." };
    case "PRECONDITION_REQUIRED":
      return { ...base, kind: "generic", message: "Couldn't save safely. Reload the job and try again." };
    case "NOT_FOUND":
      return { ...base, kind: "notFound", message: "Job not found or you don't have access." };
    case "FORBIDDEN":
      return { ...base, kind: "forbidden", message: "You don't have permission to do that." };
    default:
  }
  if (e.status === 403) return { ...base, kind: "forbidden", message: "You don't have permission to do that." };
  if (e.status === 404) return { ...base, kind: "notFound", message: "Job not found or you don't have access." };
  if (e.status === 0) return { ...base, kind: "generic", message: e.message ?? "Can't reach the server." };
  return { ...base, kind: "generic", message: e.message || "Something went wrong. Please try again." };
}

// ---------- time zones
const dtfCache = new Map<string, Intl.DateTimeFormat>();
function dtf(tz: string): Intl.DateTimeFormat {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    dtfCache.set(tz, f);
  }
  return f;
}

function zoneParts(ts: number, tz: string): { y: number; mo: number; d: number; h: number; mi: number; s: number } {
  const out: Record<string, number> = {};
  for (const p of dtf(tz).formatToParts(new Date(ts))) if (p.type !== "literal") out[p.type] = Number(p.value);
  return { y: out.year, mo: out.month, d: out.day, h: out.hour === 24 ? 0 : out.hour, mi: out.minute, s: out.second };
}

/** Offset (ms) of `tz` at instant `ts`: local wall time minus UTC. */
export function tzOffsetMs(ts: number, tz: string): number {
  const p = zoneParts(ts, tz);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ts / 1000) * 1000;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO UTC → "YYYY-MM-DDTHH:mm" wall time in tz (value for <input type=datetime-local>). */
export function isoToZonedInput(iso: string | null | undefined, tz: string): string {
  if (!iso) return "";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  const p = zoneParts(ts, tz);
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

/** "YYYY-MM-DDTHH:mm" wall time in tz → ISO UTC. Returns null for invalid input. */
export function zonedInputToIso(local: string, tz: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  let ts = asUtc - tzOffsetMs(asUtc, tz);
  ts = asUtc - tzOffsetMs(ts, tz); // second pass handles DST edges
  return new Date(ts).toISOString();
}

export function validateWindow(startLocal: string, endLocal: string, tz: string): { ok: true; start: string; end: string } | { ok: false; message: string } {
  const start = zonedInputToIso(startLocal, tz);
  const end = zonedInputToIso(endLocal, tz);
  if (!start || !end) return { ok: false, message: "Enter a start and end date and time." };
  if (Date.parse(end) <= Date.parse(start)) return { ok: false, message: "The end must be after the start." };
  return { ok: true, start, end };
}

export function formatInZone(iso: string | null | undefined, tz: string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...opts }).format(d);
}

/** "YYYY-MM-DD" day key in tz, for grouping. */
export function dayKey(iso: string, tz: string): string {
  const p = zoneParts(Date.parse(iso), tz);
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}`;
}

// ---------- timeline
export type TimelineCategory = "CUSTOMER" | "TEAM" | "SYSTEM" | "INTERNAL";
export interface TimelineSentence { text: string; detail?: string; highlight?: boolean }

const asRecord = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const statusLabel = (s: unknown): string | undefined => {
  const raw = typeof s === "string" ? s : str(asRecord(s).status);
  return raw ? (raw in JOB_STATUS_META ? JOB_STATUS_META[raw as keyof typeof JOB_STATUS_META].label : raw) : undefined;
};

export function actorName(entry: TimelineEntry): string {
  if (entry.actor?.name) return entry.actor.name;
  return entry.actor?.type === "CUSTOMER" ? "Customer" : "System";
}

export function describeTimelineEntry(entry: TimelineEntry, tz = "UTC"): TimelineSentence {
  const oldV = asRecord(entry.oldValue);
  const newV = asRecord(entry.newValue);
  const meta = asRecord(entry.metadata);
  const reason = str(meta.reason) ?? str(newV.reason) ?? str(meta.overrideReason);
  const a = entry.action;
  switch (a) {
    case "job.created": return { text: "Job created" };
    case "job.status_changed": case "job.transitioned": {
      const from = statusLabel(entry.oldValue), to = statusLabel(entry.newValue);
      return { text: from && to ? `Status changed from ${from} to ${to}` : to ? `Status changed to ${to}` : "Status changed", detail: reason };
    }
    case "job.review_started": return { text: "Review started" };
    case "job.assigned": {
      const who = str(newV.teamName) ?? str(newV.memberName) ?? str(meta.teamName) ?? str(meta.memberName);
      const overridden = !!(meta.conflictOverridden ?? newV.conflictOverridden);
      return overridden
        ? { text: `${who ? `Assigned ${who}` : "Assigned"} with a conflict override`, detail: reason ? `Reason: ${reason}` : undefined, highlight: true }
        : { text: who ? `Assigned ${who}` : "Assignment added" };
    }
    case "job.unassigned": {
      const who = str(oldV.teamName) ?? str(oldV.memberName) ?? str(meta.teamName) ?? str(meta.memberName);
      return { text: who ? `Unassigned ${who}` : "Assignment removed" };
    }
    case "job.rescheduled": {
      const s = str(newV.scheduledStart) ?? str(newV.start), e = str(newV.scheduledEnd) ?? str(newV.end);
      const overridden = !!(meta.conflictOverridden ?? newV.conflictOverridden);
      const when = s ? `${formatInZone(s, tz)}${e ? ` – ${formatInZone(e, tz, { timeStyle: "short" })}` : ""}` : undefined;
      return { text: when ? `Rescheduled to ${when}` : "Rescheduled", detail: overridden && reason ? `Conflict override: ${reason}` : undefined, highlight: overridden };
    }
    case "job.updated": {
      const keys = Object.keys(newV);
      if (keys.includes("internalNotes") || keys.includes("customerNotes")) return { text: "Notes updated" };
      return { text: keys.length ? `Updated ${keys.join(", ")}` : "Job updated" };
    }
    case "job.photo_added": return { text: "Photo added" };
    case "job.attachment_added": return { text: `Added ${str(newV.name) ?? "a file"}${str(newV.category) ? ` (${categoryLabel(newV.category as AttachmentCategory)})` : ""}` };
    case "job.attachment_removed": return { text: `Removed ${str(oldV.name) ?? str(newV.name) ?? "a file"}` };
    case "job.note_added": return { text: "Note added", detail: str(newV.text) ?? str(newV.note) };
    default: {
      const human = a.replace(/^job\./, "").replace(/[._]/g, " ").trim();
      return { text: human ? human.charAt(0).toUpperCase() + human.slice(1) : "Event", detail: reason };
    }
  }
}

export function normalizeCategory(c: string): TimelineCategory {
  const up = c?.toUpperCase();
  return up === "CUSTOMER" || up === "TEAM" || up === "INTERNAL" ? up : "SYSTEM";
}

export interface DayGroup<T> { day: string; items: T[] }
/** Groups already-ordered entries by day in tz, keeping order. */
export function groupByDay(entries: readonly TimelineEntry[], tz: string): DayGroup<TimelineEntry>[] {
  const groups: DayGroup<TimelineEntry>[] = [];
  for (const entry of entries) {
    const day = dayKey(entry.occurredAt, tz);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(entry);
    else groups.push({ day, items: [entry] });
  }
  return groups;
}

// ---------- attachments
export const ATTACHMENT_CATEGORIES: readonly AttachmentCategory[] = ["BEFORE", "DURING", "AFTER", "CUSTOMER_PROVIDED", "INTERNAL"];
const CAT_LABEL: Record<AttachmentCategory, string> = { BEFORE: "Before", DURING: "During", AFTER: "After", CUSTOMER_PROVIDED: "Customer provided", INTERNAL: "Internal" };
export const categoryLabel = (c: AttachmentCategory): string => CAT_LABEL[c] ?? c;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];

export function validateUpload(file: { type: string; size: number }, category: AttachmentCategory): string | null {
  if (file.size > MAX_UPLOAD_BYTES) return "That file is larger than 8 MB.";
  const pdfOk = category === "CUSTOMER_PROVIDED" || category === "INTERNAL";
  if (IMAGE_MIMES.includes(file.type) || (pdfOk && file.type === "application/pdf")) return null;
  return pdfOk ? "Use a JPEG, PNG, WebP or PDF file." : "Use a JPEG, PNG or WebP photo for this category.";
}
export const isImageMime = (mime: string): boolean => IMAGE_MIMES.includes(mime);
export const isExpired = (urlExpiresAt: string, now = Date.now()): boolean => Date.parse(urlExpiresAt) - 5_000 <= now;

// ---------- schedule pre-check (POST /jobs/:id/schedule/check)
export const SCHEDULE_CHECK_DEBOUNCE_MS = 400;

export type ScheduleBlock = "checking" | "cannot-override" | "reason-required" | null;
export interface ScheduleGateInput {
  /** Conflicts from the dry run, or from the save's 409 if another dispatcher won meanwhile. */
  conflicts: readonly Conflict[];
  /** The API said an override is possible for this caller (dry run `canOverride`). */
  apiCanOverride: boolean;
  /** `can('dispatch.override_conflict')`: UI hint only. */
  roleCanOverride: boolean;
  reason: string;
  /** A dry run for the current window is still in flight. */
  checking: boolean;
}
export interface ScheduleGate { showOverride: boolean; canSave: boolean; block: ScheduleBlock }

/** Decides what the schedule form shows and whether Save is allowed. */
export function scheduleGate(i: ScheduleGateInput): ScheduleGate {
  if (i.checking) return { showOverride: false, canSave: false, block: "checking" };
  if (i.conflicts.length === 0) return { showOverride: false, canSave: true, block: null };
  if (!(i.apiCanOverride && i.roleCanOverride)) return { showOverride: false, canSave: false, block: "cannot-override" };
  if (!isValidReason(i.reason)) return { showOverride: true, canSave: false, block: "reason-required" };
  return { showOverride: true, canSave: true, block: null };
}

/** True when saving would move the job back to Scheduled (e.g. a Dispatched job being re-timed). */
export const movesBackToScheduled = (c: { status: string; resultingStatus: string } | undefined | null): boolean =>
  !!c && !!c.resultingStatus && c.resultingStatus !== c.status;

/** The window to dry-run, or null while the inputs are incomplete/invalid. */
export function checkableWindow(startLocal: string, endLocal: string, tz: string): { start: string; end: string } | null {
  const w = validateWindow(startLocal, endLocal, tz);
  return w.ok ? { start: w.start, end: w.end } : null;
}
