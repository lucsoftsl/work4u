import type { Job, JobStatus, Part, TechAction } from "@/b2b/api/types";
import { applyQueuedClock } from "@/b2b/lib/work-time";
import type { ActionBody } from "@/b2b/api/endpoints";
import type { QueueItem } from "./types";

const STATUS_AFTER: Record<TechAction, JobStatus> = {
  "start-journey": "EN_ROUTE",
  arrived: "ON_SITE",
  start: "IN_PROGRESS",
  block: "BLOCKED",
  resume: "IN_PROGRESS",
  complete: "COMPLETED",
};

/** Items that still count as "what the technician did", i.e. not discarded and not a held conflict. */
const isPending = (i: QueueItem) => i.status !== "conflict";

export interface PendingView<T extends Job> {
  job: T;
  pendingCount: number;
  pendingPhotos: number;
  /** Status the technician sees but the server hasn't confirmed yet. */
  unconfirmed: boolean;
}

/**
 * The job as the technician left it: the last server state plus everything still waiting in the queue,
 * so the next step is offered offline. Pure; never mutates its input.
 */
export function applyPending<T extends Job>(job: T, items: readonly QueueItem[]): PendingView<T> {
  const mine = items.filter((i) => i.jobId === job.id && isPending(i));
  let next: T = job;
  let pendingPhotos = 0;
  let unconfirmed = false;
  for (const item of mine) {
    if (item.kind === "action" && item.action) {
      const body: ActionBody = item.body ?? {};
      next = {
        ...next,
        status: STATUS_AFTER[item.action],
        version: next.version + 1,
        blockedFromStatus: item.action === "block" ? next.status : null,
        statusReason: item.action === "block" ? body.reason ?? null : item.action === "resume" ? null : next.statusReason,
        completionNotes: item.action === "complete" && body.notes ? body.notes : next.completionNotes,
      };
      unconfirmed = true;
    } else if (item.kind === "checklist" && item.itemId) {
      next = { ...next, checklist: next.checklist.map((c) => (c.id === item.itemId ? { ...c, done: item.done ?? c.done } : c)) };
    } else if (item.kind === "photo") {
      pendingPhotos += 1;
    } else if (item.kind === "part" && item.partId) {
      next = { ...next, parts: applyPart(next.parts ?? [], item) };
    }
  }
  const time = applyQueuedClock(next.time, mine, job.id);
  if (time !== (next.time ?? null)) next = { ...next, time };
  return { job: next, pendingCount: mine.length, pendingPhotos, unconfirmed };
}

/** A queued parts write as the technician sees it before it syncs. */
function applyPart(parts: readonly Part[], item: QueueItem): Part[] {
  const at = item.createdAt;
  if (item.partOp === "add") {
    const p = item.part ?? {};
    return [...parts, { id: item.partId!, jobId: item.jobId, name: p.name ?? "", sku: p.sku ?? null, quantity: p.quantity ?? 0, unit: p.unit ?? null, note: p.note ?? null, createdAt: at, updatedAt: at }];
  }
  if (item.partOp === "edit") return parts.map((x) => (x.id === item.partId ? { ...x, ...item.part, updatedAt: at } : x));
  if (item.partOp === "delete") return parts.filter((x) => x.id !== item.partId);
  return [...parts];
}

export const statusAfter = (action: TechAction): JobStatus => STATUS_AFTER[action];
