import { formatClock } from "./tz-format";
import { isValidReason } from "./workspace";
import { parsePage } from "./paging";

export const MIN_SEND_BACK_REASON = 3;

/** "12 min", "3 h 5 min", "2 d 4 h" — time spent waiting for review. */
export function formatWaiting(sinceIso: string, now: number = Date.now()): string {
  const ms = now - new Date(sinceIso).getTime();
  if (!Number.isFinite(ms)) return "—";
  const min = Math.max(0, Math.floor(ms / 60_000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return min % 60 ? `${h} h ${min % 60} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d} d ${h % 24} h` : `${d} d`;
}

/** "12 Oct, 14:05" in the org timezone. */
export function formatAbsolute(iso: string, tz: string): string {
  let day: string;
  try {
    day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: tz }).format(new Date(iso));
  } catch {
    day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(iso));
  }
  return `${day}, ${formatClock(iso, tz)}`;
}

export function validateSendBackReason(value: string): { ok: boolean; message: string | null } {
  if (isValidReason(value)) return { ok: true, message: null };
  return { ok: false, message: `Tell the team what to fix (at least ${MIN_SEND_BACK_REASON} characters).` };
}

export interface Removal<T> { next: T[]; removed: T | null; index: number }

/** Optimistic removal; keeps the removed item + position so a failure can restore it. */
export function removeFromQueue<T extends { id: string }>(items: readonly T[], id: string): Removal<T> {
  const index = items.findIndex((i) => i.id === id);
  if (index < 0) return { next: [...items], removed: null, index: -1 };
  return { next: items.filter((_, i) => i !== index), removed: items[index], index };
}

export function restoreToQueue<T extends { id: string }>(items: readonly T[], removal: Removal<T>): T[] {
  const { removed, index } = removal;
  if (!removed || items.some((i) => i.id === removed.id)) return [...items];
  const next = [...items];
  next.splice(Math.min(index, next.length), 0, removed);
  return next;
}

export function totalAttachments(counts: Record<string, number> | null | undefined): number | null {
  if (!counts) return null;
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

export function reviewActionVisibility(can: (p: string) => boolean): { approve: boolean; sendBack: boolean } {
  const allowed = can("job.close");
  return { approve: allowed, sendBack: allowed };
}

export type ReviewErrorKind = "stale" | "forbidden" | "precondition" | "generic";

export function classifyReviewError(e: { status?: number; code?: string; body?: Record<string, unknown> }): { kind: ReviewErrorKind; message: string } {
  if (e.code === "EVIDENCE_UNAVAILABLE") return { kind: "generic", message: "Evidence can't be checked right now; try again later or ask an administrator." };
  if (e.code === "EVIDENCE_REQUIRED") {
    const details = (e.body?.details ?? {}) as { missing?: unknown };
    const missing = Array.isArray(details.missing) ? details.missing.map(String) : [];
    return { kind: "generic", message: `Required evidence is missing${missing.length ? `: ${missing.join(", ")}` : ""}. Send the job back so the team can add it.` };
  }
  if (e.code === "VERSION_CONFLICT" || e.status === 409) return { kind: "stale", message: "Someone else changed this job. Refresh the queue to see its current state." };
  if (e.status === 403 || e.code === "FORBIDDEN") return { kind: "forbidden", message: "You don't have permission to review this job." };
  if (e.status === 428 || e.code === "PRECONDITION_REQUIRED") return { kind: "precondition", message: "Couldn't save safely. Refresh the queue and try again." };
  return { kind: "generic", message: "Something went wrong. Please try again." };
}

// ---- order (GET /jobs/review-queue?dir=): asc = oldest first (default), desc = newest first
export type ReviewDir = "asc" | "desc";
export const parseReviewDir = (v: string | null | undefined): ReviewDir => (v === "desc" ? "desc" : "asc");
/** `?dir=desc` only when it differs from the default. */
export const reviewDirHref = (pathname: string, dir: ReviewDir): string => (dir === "desc" ? `${pathname}?dir=desc` : pathname);

export function parseReviewPage(params: URLSearchParams) {
  return { dir: parseReviewDir(params.get("dir")), page: parsePage(params.get("page")), cursor: params.get("cursor") || undefined };
}

export function reviewPageHref(pathname: string, dir: ReviewDir, page: number, cursor?: string): string {
  const params = new URLSearchParams();
  if (dir === "desc") params.set("dir", dir);
  if (page > 1) params.set("page", String(page));
  if (cursor) params.set("cursor", cursor);
  return params.size ? `${pathname}?${params}` : pathname;
}
