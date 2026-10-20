import { SIMPLE_EVENTS } from "./timeline-events";
import { personName } from "./person";
import type { Assignment, AttachmentCategory, Conflict, JobWorkspace, TimelineEntry } from "@/b2b/api/types";
import type { JobForTransitions } from "@/b2b/lib/transitions";
import { fallback, fmt, type Translate } from "./plural";
import { jobStatusLabel } from "./status-label";
import { dateLocale } from "./tz-format";

// Pure helpers for the job workspace (no React, no network).

/** Optional translator + language for the sentences below. Without it everything reads as English, exactly as before. */
export interface I18n { t?: Translate; locale?: string }
const say = (i: I18n | undefined, key: string, fallback: string, vars?: Record<string, string | number>): string => fmt((i?.t ?? ((_k, f) => f))(key, fallback), vars);
const tOf = (i: I18n | undefined): Translate => i?.t ?? ((_k, f) => f);

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
  TEAM_TIME_OVERLAP: fallback("Team double-booked"),
  MEMBER_TIME_OVERLAP: fallback("Technician double-booked"),
  SKILL_MISSING: fallback("Skill missing"),
  ALREADY_ASSIGNED: fallback("Already assigned"),
};

export interface ConflictView { type: Conflict["type"]; label: string; message: string }

export function describeConflict(c: Conflict, i18n?: I18n): ConflictView {
  const label = c.type in CONFLICT_LABEL ? say(i18n, `b2b.conflict.${c.type}`, CONFLICT_LABEL[c.type]) : say(i18n, "b2b.conflict.OTHER", "Conflict");
  const message = c.message?.trim() || (c.jobNumber ? say(i18n, "b2b.conflict.overlaps", "Overlaps JOB-{n}", { n: c.jobNumber }) : label);
  return { type: c.type, label, message };
}
export const describeConflicts = (list: readonly Conflict[], i18n?: I18n): ConflictView[] => list.map((c) => describeConflict(c, i18n));

/** Conflict types that have a label, for the locale guard. */
export const CONFLICT_LABELS: Readonly<Record<string, string>> = CONFLICT_LABEL;

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
  // DRAFT_INCOMPLETE uses the API's field names
  title: "a title", customerId: "a client", locationId: "a location", category: "a job type",
};
export const missingLabel = (key: string, i18n?: I18n): string => (key in MISSING_LABEL ? say(i18n, `b2b.job.missing.${key}`, MISSING_LABEL[key]) : key);
export const listMissing = (keys: readonly string[], i18n?: I18n): string => keys.map((k) => missingLabel(k, i18n)).join(", ");

export function describeB2bError(err: unknown, i18n?: I18n): DescribedError {
  const m = (key: string, fallback: string, vars?: Record<string, string | number>) => say(i18n, key, fallback, vars);
  const e = (err ?? {}) as ErrorLike;
  if (e.name !== "B2bError") return { kind: "generic", message: m("b2b.job.err.generic", "Something went wrong. Please try again.") };
  const body = e.body ?? {};
  const details = (body.details && typeof body.details === "object" ? body.details : {}) as Record<string, unknown>;
  const missingSrc = Array.isArray(body.missing) ? body.missing : Array.isArray(details.missing) ? details.missing : [];
  const missing = missingSrc as string[];
  const conflicts = Array.isArray(body.conflicts) ? (body.conflicts as Conflict[]) : [];
  const currentStatus = typeof body.currentStatus === "string" ? body.currentStatus : undefined;
  const base = { code: e.code, conflicts, missing, currentStatus };
  const status = currentStatus ? jobStatusLabel(tOf(i18n), currentStatus) : undefined;
  const items = listMissing(missing, i18n);
  const denied = m("b2b.job.err.forbidden", "You don't have permission to do that.");
  const notFoundText = m("b2b.job.err.notFound", "Job not found or you don't have access.");

  switch (e.code) {
    case "VERSION_CONFLICT":
      return { ...base, kind: "stale", message: status ? m("b2b.job.err.changed", "This job was changed by someone else. Now: {status}. Reload to continue.", { status }) : m("b2b.job.err.changedNoStatus", "This job was changed by someone else. Reload to continue.") };
    case "ASSIGNMENT_CONFLICT":
      return { ...base, kind: "conflict", message: m("b2b.job.err.assignmentConflict", "This assignment conflicts with existing bookings.") };
    case "OVERRIDE_FORBIDDEN":
      return { ...base, kind: "forbidden", overrideForbidden: true, message: m("b2b.job.err.overrideForbidden", "Your role can't override conflicts. Choose another team or time, or ask a dispatcher with override rights.") };
    case "GUARD_FAILED":
      return { ...base, kind: "missing", message: missing.length ? m("b2b.job.err.guardItems", "Can't move yet. Needs: {items}.", { items }) : m("b2b.job.err.guard", "This move isn't allowed yet.") };
    case "COMPLETION_REQUIREMENTS_MISSING":
      return { ...base, kind: "missing", message: missing.length ? m("b2b.job.err.completionItems", "Can't complete yet. Still missing: {items}.", { items }) : m("b2b.job.err.completion", "Completion requirements are missing.") };
    case "EVIDENCE_UNAVAILABLE":
      return { ...base, kind: "generic", message: m("b2b.job.err.evidenceUnavailable", "Evidence can't be checked right now; try again later or ask an administrator.") };
    case "EVIDENCE_REQUIRED":
      return { ...base, kind: "missing", message: missing.length ? m("b2b.job.err.evidenceItems", "The server refused approval: required evidence is missing: {items}. Send the job back so the team can add it.", { items }) : m("b2b.job.err.evidence", "The server refused approval: required evidence is missing. Send the job back so the team can add it.") };
    case "INVALID_TRANSITION":
      return { ...base, kind: "stale", message: status ? m("b2b.job.err.moveGone", "That move isn't available. The job is now {status}. Reload to continue.", { status }) : m("b2b.job.err.moveGoneNoStatus", "That move isn't available. Reload to continue.") };
    case "ASSIGNMENT_LOCKED":
      return { ...base, kind: "generic", message: m("b2b.job.err.assignmentLocked", "Assignments are locked once the job is en route or later.") };
    case "SCHEDULE_REQUIRED":
      return { ...base, kind: "generic", scheduleRequired: true, message: m("b2b.job.err.scheduleRequired", "Set a time window first, then assign.") };
    case "REASON_REQUIRED":
      return { ...base, kind: "generic", message: m("b2b.job.err.reasonRequired", "A reason is required (at least 3 characters).") };
    case "PRECONDITION_REQUIRED":
      return { ...base, kind: "generic", message: m("b2b.job.err.precondition", "Couldn't save safely. Reload the job and try again.") };
    case "JOB_IS_DRAFT":
      return { ...base, kind: "generic", message: m("b2b.job.err.isDraft", "This is still a draft. Create the job first, then schedule or assign it.") };
    case "NOT_A_DRAFT":
      return { ...base, kind: "stale", message: m("b2b.job.err.notDraft", "This job was already created, so it is no longer a draft. Reload to continue.") };
    case "JOB_TYPE_ARCHIVED":
      return { ...base, kind: "generic", message: m("b2b.job.err.typeArchived", "That job type is archived. Choose another one.") };
    case "DRAFT_INCOMPLETE":
      return { ...base, kind: "missing", message: missing.length ? m("b2b.job.err.draftItems", "This draft isn't ready to become a job. Missing: {items}.", { items }) : m("b2b.job.err.draft", "This draft isn't ready to become a job.") };
    case "NOT_FOUND":
      return { ...base, kind: "notFound", message: notFoundText };
    case "FORBIDDEN":
      return { ...base, kind: "forbidden", message: denied };
    default:
  }
  if (e.status === 403) return { ...base, kind: "forbidden", message: denied };
  if (e.status === 404) return { ...base, kind: "notFound", message: notFoundText };
  if (e.status === 0) return { ...base, kind: "generic", message: e.message ?? m("b2b.job.err.network", "Can't reach the server.") };
  return { ...base, kind: "generic", message: e.message || m("b2b.job.err.generic", "Something went wrong. Please try again.") };
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

export function validateWindow(startLocal: string, endLocal: string, tz: string, i18n?: I18n): { ok: true; start: string; end: string } | { ok: false; message: string } {
  const start = zonedInputToIso(startLocal, tz);
  const end = zonedInputToIso(endLocal, tz);
  if (!start || !end) return { ok: false, message: say(i18n, "b2b.job.win.needBoth", "Enter a start and end date and time.") };
  if (Date.parse(end) <= Date.parse(start)) return { ok: false, message: say(i18n, "b2b.job.win.endAfter", "The end must be after the start.") };
  return { ok: true, start, end };
}

export function formatInZone(iso: string | null | undefined, tz: string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }, locale = "en"): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(dateLocale(locale), { timeZone: tz, ...opts }).format(d);
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
const statusLabel = (s: unknown, i18n?: I18n): string | undefined => {
  const raw = typeof s === "string" ? s : str(asRecord(s).status);
  return raw ? jobStatusLabel(tOf(i18n), raw) : undefined;
};

/** Who did it. A person without a real name (null, or an email from an older API) is "Team member", never the email. */
/** A member name only if it is a real name (never an email). */
const realName = (v: unknown): string | undefined => (typeof v === "string" ? personName(v, "") || undefined : undefined);

export function actorName(entry: TimelineEntry, unnamedName?: string, i18n?: I18n): string {
  const unnamed = unnamedName ?? say(i18n, "b2b.member.unnamed", "Team member");
  const real = personName(entry.actor?.name, "");
  if (real) return real;
  if (entry.actor?.type === "CUSTOMER") return say(i18n, "b2b.timeline.customer", "Customer");
  return entry.actor?.type === "USER" || entry.actor?.memberId ? unnamed : say(i18n, "b2b.timeline.system", "System");
}

export function describeTimelineEntry(entry: TimelineEntry, tz = "UTC", i18n?: I18n): TimelineSentence {
  const m = (key: string, fallback: string, vars?: Record<string, string | number>) => say(i18n, key, fallback, vars);
  const locale = i18n?.locale ?? "en";
  const oldV = asRecord(entry.oldValue);
  const newV = asRecord(entry.newValue);
  const meta = asRecord(entry.metadata);
  const reason = str(meta.reason) ?? str(newV.reason) ?? str(meta.overrideReason);
  const a = entry.action;
  const aTeamMember = m("b2b.timeline.aTeamMember", "a team member");
  const aFile = m("b2b.timeline.aFile", "a file");
  const simple = SIMPLE_EVENTS[a];
  if (simple) return { text: m(simple[0], simple[1]), detail: reason ?? str(newV.name) ?? str(oldV.name) ?? str(newV.text) };
  switch (a) {
    case "job.created": return { text: m("b2b.timeline.created", "Job created") };
    case "job.draft_saved": return { text: m("b2b.timeline.draftSaved", "Draft saved") };
    case "job.promoted": return { text: m("b2b.timeline.promoted", "Draft turned into a job") };
    case "job.status_changed": case "job.transitioned": {
      const from = statusLabel(entry.oldValue, i18n), to = statusLabel(entry.newValue, i18n);
      const text = from && to ? m("b2b.timeline.statusFromTo", "Status changed from {from} to {to}", { from, to }) : to ? m("b2b.timeline.statusTo", "Status changed to {to}", { to }) : m("b2b.timeline.status", "Status changed");
      return { text, detail: reason };
    }
    case "job.review_started": return { text: m("b2b.timeline.reviewStarted", "Review started") };
    case "job.assigned": case "job.assigned_with_override": {
      const who = str(newV.teamName) ?? realName(newV.memberName) ?? str(meta.teamName) ?? realName(meta.memberName) ?? (newV.memberId || meta.memberId ? aTeamMember : undefined);
      const overridden = a.endsWith("_with_override") || !!(meta.conflictOverridden ?? newV.conflictOverridden);
      return overridden
        ? { text: who ? m("b2b.timeline.assignedOverride", "Assigned {who} with a conflict override", { who }) : m("b2b.timeline.assignedOverrideNobody", "Assigned with a conflict override"), detail: reason ? m("b2b.timeline.reason", "Reason: {reason}", { reason }) : undefined, highlight: true }
        : { text: who ? m("b2b.timeline.assigned", "Assigned {who}", { who }) : m("b2b.timeline.assignmentAdded", "Assignment added") };
    }
    case "job.unassigned": {
      const who = str(oldV.teamName) ?? realName(oldV.memberName) ?? str(meta.teamName) ?? realName(meta.memberName) ?? (oldV.memberId || meta.memberId ? aTeamMember : undefined);
      return { text: who ? m("b2b.timeline.unassigned", "Unassigned {who}", { who }) : m("b2b.timeline.assignmentRemoved", "Assignment removed") };
    }
    case "job.rescheduled": case "job.rescheduled_with_override": {
      const s = str(newV.scheduledStart) ?? str(newV.start), e = str(newV.scheduledEnd) ?? str(newV.end);
      const overridden = a.endsWith("_with_override") || !!(meta.conflictOverridden ?? newV.conflictOverridden);
      const when = s ? `${formatInZone(s, tz, undefined, locale)}${e ? ` – ${formatInZone(e, tz, { timeStyle: "short" }, locale)}` : ""}` : undefined;
      return { text: when ? m("b2b.timeline.rescheduledTo", "Rescheduled to {when}", { when }) : m("b2b.timeline.rescheduled", "Rescheduled"), detail: overridden && reason ? m("b2b.timeline.overrideReason", "Conflict override: {reason}", { reason }) : undefined, highlight: overridden };
    }
    case "job.updated": {
      const keys = Object.keys(newV);
      if (keys.includes("internalNotes") || keys.includes("customerNotes")) return { text: m("b2b.timeline.notesUpdated", "Notes updated") };
      return { text: keys.length ? m("b2b.timeline.updatedFields", "Updated {fields}", { fields: keys.join(", ") }) : m("b2b.timeline.updated", "Job updated") };
    }
    case "job.photo_added": return { text: m("b2b.timeline.photoAdded", "Photo added") };
    case "job.attachment_added": {
      const name = str(newV.name) ?? aFile;
      const category = str(newV.category);
      return { text: category ? m("b2b.timeline.attachmentAddedCat", "Added {name} ({category})", { name, category: categoryLabel(category as AttachmentCategory, i18n) }) : m("b2b.timeline.attachmentAdded", "Added {name}", { name }) };
    }
    case "job.attachment_removed": return { text: m("b2b.timeline.attachmentRemoved", "Removed {name}", { name: str(oldV.name) ?? str(newV.name) ?? aFile }) };
    case "job.note_added": return { text: m("b2b.timeline.noteAdded", "Note added"), detail: str(newV.text) ?? str(newV.note) };
    default: {
      // An event this app does not know yet: English readers get the readable code, other languages a translated generic word.
      const human = a.replace(/^job\./, "").replace(/[._]/g, " ").trim();
      const english = !i18n?.locale || i18n.locale === "en";
      return { text: english && human ? human.charAt(0).toUpperCase() + human.slice(1) : m("b2b.timeline.event", "Event"), detail: reason };
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
const CAT_LABEL: Record<AttachmentCategory, string> = { BEFORE: fallback("Before"), DURING: fallback("During"), AFTER: fallback("After"), CUSTOMER_PROVIDED: fallback("Customer provided"), INTERNAL: fallback("Internal") };
export const categoryLabel = (c: AttachmentCategory, i18n?: I18n): string => (c in CAT_LABEL ? say(i18n, `b2b.files.cat.${c}`, CAT_LABEL[c]) : c);
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];

export function validateUpload(file: { type: string; size: number }, category: AttachmentCategory, i18n?: I18n): string | null {
  if (file.size > MAX_UPLOAD_BYTES) return say(i18n, "b2b.files.tooBig", "That file is larger than 8 MB.");
  const pdfOk = category === "CUSTOMER_PROVIDED" || category === "INTERNAL";
  if (IMAGE_MIMES.includes(file.type) || (pdfOk && file.type === "application/pdf")) return null;
  return pdfOk ? say(i18n, "b2b.files.useAnyPdf", "Use a JPEG, PNG, WebP or PDF file.") : say(i18n, "b2b.files.useImage", "Use a JPEG, PNG or WebP photo for this category.");
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
