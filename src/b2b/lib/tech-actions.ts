import type { Job, JobStatus, TechAction } from "@/b2b/api/types";
import { B2bError } from "@/b2b/api/client";
import { fallback } from "./plural";

/** Translate function shape: (key, English fallback). Default returns the fallback. */
export type Translate = (key: string, fallback: string) => string;
export const identityT: Translate = (_key, fallback) => fallback;

// Technician flow (spec §8): Start journey → Arrived → Start job → Pause/Blocked → Complete.
// Pure helpers so the screen stays thin and the rules are testable.

export interface TechStep {
  action: TechAction;
  label: string;
  /** The job status this action moves to (for optimistic wording / tests). */
  to: JobStatus;
}

export interface TechPlan {
  primary: TechStep | null;
  /** "Blocked…" is offered while the job is active in the field; it needs a reason. */
  canBlock: boolean;
  /** Why there is nothing to do right now (waiting for dispatch, finished…). */
  idleMessage: string | null;
}

export function techPlan(status: JobStatus, t: Translate = identityT): TechPlan {
  const step = (action: TechAction, key: string, label: string, to: JobStatus): TechStep => ({ action, label: t(`b2b.tech.step.${key}`, label), to });
  switch (status) {
    case "DISPATCHED": return { primary: step("start-journey", "startJourney", "Start journey", "EN_ROUTE"), canBlock: false, idleMessage: null };
    case "EN_ROUTE": return { primary: step("arrived", "arrived", "I've arrived", "ON_SITE"), canBlock: true, idleMessage: null };
    case "ON_SITE": return { primary: step("start", "startJob", "Start job", "IN_PROGRESS"), canBlock: true, idleMessage: null };
    case "IN_PROGRESS": return { primary: step("complete", "completeJob", "Complete job", "COMPLETED"), canBlock: true, idleMessage: null };
    case "BLOCKED": return { primary: step("resume", "resumeJob", "Resume job", "IN_PROGRESS"), canBlock: false, idleMessage: null };
    case "COMPLETED":
    case "REVIEW":
    case "CLOSED": return { primary: null, canBlock: false, idleMessage: t("b2b.tech.step.idle.finished", "This job is finished.") };
    case "CANCELLED": return { primary: null, canBlock: false, idleMessage: t("b2b.tech.step.idle.cancelled", "This job was cancelled.") };
    default: return { primary: null, canBlock: false, idleMessage: t("b2b.tech.step.idle.waiting", "Waiting for dispatch. You'll be able to start once the job is dispatched.") };
  }
}

export type CompletionItem = "checklist" | "notes" | "photo" | "signature";

export interface CompletionInput {
  notes: string;
  signatureName: string;
  /** Photos uploaded in this session (keys returned by the API). */
  newPhotoKeys: readonly string[];
  /** Photos taken in this session that are still queued on the phone (count toward the requirement). */
  queuedPhotos?: number;
  /** Whether the customer has drawn on the signature pad. Leave undefined when the screen has no pad. */
  signatureDrawn?: boolean;
}

/** A signature needs the customer's name and, when the screen shows a pad, a drawn signature. */
export const signatureComplete = (input: Pick<CompletionInput, "signatureName" | "signatureDrawn">) =>
  input.signatureName.trim().length > 0 && input.signatureDrawn !== false;

/** What is still missing before COMPLETED, per the job's requirement flags (mirrors the API's guard). */
export function missingForCompletion(job: Pick<Job, "requirements" | "checklist" | "photoKeys" | "completionNotes" | "signature">, input: CompletionInput): CompletionItem[] {
  const missing: CompletionItem[] = [];
  if (job.requirements.checklist && job.checklist.some((item) => !item.done)) missing.push("checklist");
  if (job.requirements.notes && !(input.notes.trim() || job.completionNotes?.trim())) missing.push("notes");
  if (job.requirements.photo && (job.photoKeys?.length ?? 0) + input.newPhotoKeys.length + (input.queuedPhotos ?? 0) === 0) missing.push("photo");
  if (job.requirements.signature && !job.signature && !signatureComplete(input)) missing.push("signature");
  return missing;
}

export const COMPLETION_LABEL: Record<CompletionItem, string> = {
  checklist: fallback("Finish the checklist"),
  notes: fallback("Add completion notes"),
  photo: fallback("Add at least one photo"),
  signature: fallback("Get the customer's name and signature"),
};

/** Translated completion hint; falls back to the English COMPLETION_LABEL. */
export const completionLabel = (item: CompletionItem, t: Translate = identityT): string => t(`b2b.tech.completion.${item}`, COMPLETION_LABEL[item]);

/** Human message for a failed action. Never shows raw codes. */
export function techErrorMessage(err: unknown, t: Translate = identityT): { message: string; stale: boolean } {
  if (err instanceof B2bError) {
    if (err.isVersionConflict) return { message: t("b2b.tech.err.versionConflict", "This job was changed by someone else. Reloading the latest version."), stale: true };
    if (err.code === "COMPLETION_REQUIREMENTS_MISSING") {
      const items = err.missing.map((m) => (m in COMPLETION_LABEL ? completionLabel(m as CompletionItem, t) : m)).join(", ");
      return { message: items ? t("b2b.tech.err.notCompleteItems", "Not complete yet: {items}.").replace("{items}", items) : t("b2b.tech.err.notComplete", "Not complete yet."), stale: false };
    }
    if (err.code === "INVALID_TRANSITION") return { message: t("b2b.tech.err.invalidTransition", "That step isn't available for this job any more. Reloading."), stale: true };
    if (err.code === "JOB_PAUSED") return { message: t("b2b.tech.err.jobPaused", "Resume work first, then complete the job."), stale: false };
    if (err.code === "ALREADY_PAUSED") return { message: t("b2b.tech.err.alreadyPaused", "Work is already paused."), stale: true };
    if (err.code === "NOT_PAUSED") return { message: t("b2b.tech.err.notPaused", "Work is not paused."), stale: true };
    if (err.code === "PARTS_LIMIT_REACHED") return { message: t("b2b.tech.err.partsLimit", "This job already has the maximum number of parts."), stale: false };
    if (err.code === "NOTHING_TO_UNDO" || err.code === "UNDO_NOT_ALLOWED" || err.code === "UNDO_NOT_POSSIBLE" || err.code === "UNDO_WINDOW_EXPIRED") return { message: t("b2b.tech.undo.failed", "Can't undo: this job changed."), stale: true };
    if (err.code === "REASON_REQUIRED") return { message: t("b2b.tech.err.reasonRequired", "Please say why."), stale: false };
    if (err.code === "IDEMPOTENCY_IN_PROGRESS") return { message: t("b2b.tech.err.inProgress", "Still saving the previous tap. Wait a moment."), stale: false };
    if (err.status === 403 || err.code === "FORBIDDEN") return { message: t("b2b.tech.err.forbidden", "You don't have permission to do that on this job."), stale: false };
    if (err.status === 404) return { message: t("b2b.tech.err.notFound", "This job isn't available to you."), stale: false };
    if (err.code === "NETWORK") return { message: t("b2b.tech.err.network", "You're offline. Try again when you have a connection."), stale: false };
    if (err.code === "RATE_LIMITED") return { message: t("b2b.tech.err.rateLimited", "Too many taps. Wait a few seconds."), stale: false };
    return { message: err.message || t("b2b.tech.err.generic", "Something went wrong."), stale: false };
  }
  return { message: t("b2b.tech.err.generic", "Something went wrong."), stale: false };
}

/** Today list: the next job (first not finished, by start time), the rest, and finished jobs. */
export function splitToday(jobs: readonly Job[]): { next: Job | null; later: Job[]; done: Job[] } {
  const finished = new Set<JobStatus>(["COMPLETED", "REVIEW", "CLOSED", "CANCELLED"]);
  const byStart = (a: Job, b: Job) => (a.scheduledStart ?? "9999").localeCompare(b.scheduledStart ?? "9999");
  const active = jobs.filter((j) => !finished.has(j.status)).sort(byStart);
  // an in-field job wins over a later-scheduled one
  const inField = active.find((j) => ["EN_ROUTE", "ON_SITE", "IN_PROGRESS", "BLOCKED"].includes(j.status));
  const next = inField ?? active[0] ?? null;
  return { next, later: active.filter((j) => j !== next), done: jobs.filter((j) => finished.has(j.status)).sort(byStart) };
}
