import { B2bError, newIdempotencyKey, isB2bError } from "@/b2b/api/client";
import type { ActionBody, PartInput, PartWriteResponse } from "@/b2b/api/endpoints";
import type { Job, PauseReason, TechAction } from "@/b2b/api/types";
import { classifyError } from "./classify";
import { plural, type Translate } from "@/b2b/lib/plural";
import { serverNowIso } from "@/b2b/lib/server-clock";
import { deleteItem, getDb, listQueue, notifyQueue, putItem, setMeta } from "./store";
import type { FlushResult, PartOp, QueueItem } from "./types";

/** The network calls the queue replays. Injected so tests don't need a server. */
export interface Runners {
  runAction(orgId: string, jobId: string, action: TechAction, body: ActionBody, idempotencyKey: string): Promise<Job>;
  toggleChecklist(orgId: string, jobId: string, itemId: string, done: boolean): Promise<unknown>;
  uploadPhoto(orgId: string, jobId: string, file: File): Promise<{ key: string; version?: number }>;
  /** Best effort: attachments aren't available before the migration, which is not an error. */
  uploadSignature(orgId: string, jobId: string, file: File): Promise<unknown>;
  pauseWork(orgId: string, jobId: string, body: { reason: PauseReason; note?: string; clientOccurredAt?: string }, idempotencyKey: string): Promise<unknown>;
  resumeWork(orgId: string, jobId: string, body: { clientOccurredAt?: string }, idempotencyKey: string): Promise<unknown>;
  undoJob(orgId: string, jobId: string, body: { undoId?: number; clientOccurredAt?: string }, idempotencyKey: string): Promise<unknown>;
  savePart(orgId: string, jobId: string, op: PartOp, partId: string, input: Partial<PartInput> | undefined, idempotencyKey: string, clientOccurredAt?: string): Promise<PartWriteResponse>;
}

// Sorts in creation order even for several taps in the same millisecond (the queue orders by createdAt, then id).
let counter = 0;
const newId = () => `${Date.now().toString(36).padStart(9, "0")}-${String(counter++ % 1_000_000).padStart(6, "0")}-${Math.random().toString(36).slice(2, 6)}`;

type NewItem = Omit<QueueItem, "id" | "status" | "attempts" | "createdAt" | "idempotencyKey"> & { idempotencyKey?: string; createdAt?: string };

export async function enqueue(input: NewItem): Promise<QueueItem> {
  const item: QueueItem = {
    ...input,
    id: newId(),
    status: "waiting",
    attempts: 0,
    createdAt: input.createdAt ?? serverNowIso(), // server-corrected: a wrong phone clock must not distort the work clock
    idempotencyKey: input.idempotencyKey ?? newIdempotencyKey(),
  };
  // A checklist tap replaces an earlier unsent tap on the same item: only the last state matters.
  if (item.kind === "checklist") {
    const same = (await listQueue(item.orgId)).filter((i) => i.kind === "checklist" && i.jobId === item.jobId && i.itemId === item.itemId && i.status === "waiting");
    await Promise.all(same.map((i) => deleteItem(i.id)));
  }
  // Parts: an add that never synced absorbs later edits and disappears on delete, so nothing half-baked is sent.
  if (item.kind === "part" && item.partId) {
    const waitingAdd = (await listQueue(item.orgId)).find((i) => i.kind === "part" && i.partOp === "add" && i.partId === item.partId && i.status === "waiting");
    if (waitingAdd && item.partOp === "edit") { await putItem({ ...waitingAdd, part: { ...waitingAdd.part, ...item.part } }); return item; } // `item` itself is not stored: nothing to undo separately
    if (waitingAdd && item.partOp === "delete") { await deleteItem(waitingAdd.id); return item; }
  }
  await putItem(item);
  return item;
}

/** Offline undo: drop an item that has not been sent. False when it is already sending/synced (queue a compensating undo instead). */
export async function removeWaiting(id: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.get("queue", id);
  if (!row || row.status !== "waiting") return false;
  await db.delete("queue", id);
  notifyQueue();
  return true;
}

export const pendingForJob = async (orgId: string, jobId: string) => (await listQueue(orgId)).filter((i) => i.jobId === jobId);

export async function discardItem(id: string) { await deleteItem(id); }
/** Drop every held item of a job (the "Discard draft" button). */
export async function discardJob(orgId: string, jobId: string) {
  for (const i of await pendingForJob(orgId, jobId)) await deleteItem(i.id);
}
/**
 * "Retry with latest" on a job held after a real conflict: re-target its held actions at the job's current
 * version (new Idempotency-Key: the old request was refused, so nothing was applied) and queue everything again.
 * The fetch happens first, so a failed fetch leaves the draft untouched.
 */
export async function resolveWithFreshData(orgId: string, jobId: string, getFresh: () => Promise<{ version: number }>) {
  const fresh = await getFresh();
  const held = (await pendingForJob(orgId, jobId)).filter((i) => i.status === "conflict" || i.status === "failed");
  for (const i of held) {
    const retarget = i.kind === "action" ? { expectedVersion: fresh.version, idempotencyKey: newIdempotencyKey() } : {};
    await putItem({ ...i, ...retarget, status: "waiting", attempts: 0, error: undefined });
  }
}
/** "Retry" on a failed item: wait for the next flush again. */
export async function retryItem(id: string, orgId: string) {
  const item = (await listQueue(orgId)).find((i) => i.id === id);
  if (item) await putItem({ ...item, status: "waiting", error: undefined });
}

const versionOf = (r: unknown): number | undefined => {
  if (!r || typeof r !== "object") return undefined;
  const o = r as { version?: unknown; jobVersion?: unknown };
  return typeof o.version === "number" ? o.version : typeof o.jobVersion === "number" ? o.jobVersion : undefined;
};

/**
 * Keeps the version the queued actions will carry. A response only moves it by this job's own write
 * (same version, or exactly +1): a bigger jump means someone else changed the job, so we leave it alone
 * and let the server's 409 surface as a real conflict instead of silently overriding them.
 */
export const threadVersion = (known: number | undefined, response: unknown, sentWith = known): number | undefined => {
  const v = versionOf(response);
  if (v === undefined || sentWith === undefined) return known;
  return v === sentWith || v === sentWith + 1 ? v : known;
};

async function send(item: QueueItem, run: Runners) {
  switch (item.kind) {
    case "action":
      return run.runAction(item.orgId, item.jobId, item.action!, { ...item.body, expectedVersion: item.expectedVersion, clientOccurredAt: item.createdAt }, item.idempotencyKey);
    case "checklist":
      return run.toggleChecklist(item.orgId, item.jobId, item.itemId!, item.done ?? false);
    case "photo":
      return run.uploadPhoto(item.orgId, item.jobId, new File([item.file!], item.fileName ?? "photo.jpg", { type: item.file!.type }));
    case "pause":
      return run.pauseWork(item.orgId, item.jobId, { reason: item.pauseReason!, note: item.pauseNote, clientOccurredAt: item.createdAt }, item.idempotencyKey);
    case "resume-work":
      return run.resumeWork(item.orgId, item.jobId, { clientOccurredAt: item.createdAt }, item.idempotencyKey);
    case "undo":
      return run.undoJob(item.orgId, item.jobId, { undoId: item.undoId, clientOccurredAt: item.createdAt }, item.idempotencyKey);
    case "part":
      return run.savePart(item.orgId, item.jobId, item.partOp!, item.partId!, item.part as Partial<PartInput> | undefined, item.idempotencyKey, item.createdAt);
    case "signature":
      try {
        return await run.uploadSignature(item.orgId, item.jobId, new File([item.file!], item.fileName ?? "signature.png", { type: "image/png" }));
      } catch (err) {
        if (isB2bError(err) && (err.isMigrationPending || err.status === 400)) return undefined; // not supported yet: skip, never block the job
        throw err;
      }
  }
}

/** The technician's language for the messages kept on queued items (English when absent). */
export interface FlushI18n { t?: Translate; locale?: string }

const inFlight = new Map<string, Promise<FlushResult>>();

/**
 * Replays the queue for an org: oldest first, one job at a time, in order within a job.
 * - network/server trouble stops the whole flush (items stay waiting, same Idempotency-Key)
 * - a conflict holds all remaining items of that job as a draft
 * - a refusal marks the item failed and holds the rest of that job until the technician acts
 * Concurrent calls share one run.
 */
export function flushQueue(orgId: string, run: Runners, i18n: FlushI18n = {}): Promise<FlushResult> {
  const running = inFlight.get(orgId);
  if (running) return running;
  const p = doFlush(orgId, run, i18n).finally(() => inFlight.delete(orgId));
  inFlight.set(orgId, p);
  return p;
}

async function doFlush(orgId: string, run: Runners, i18n: FlushI18n): Promise<FlushResult> {
  const t: Translate = i18n.t ?? ((_key, fallback) => fallback);
  const result: FlushResult = { sent: 0, offline: false, conflicts: 0, failed: 0, remaining: 0, undoRejected: 0 };
  const all = await listQueue(orgId);
  const jobs = [...new Set(all.map((i) => i.jobId))];

  jobsLoop: for (const jobId of jobs) {
    const group = all.filter((i) => i.jobId === jobId);
    const queued = group.map((i) => i.expectedVersion).filter((v): v is number => v !== undefined);
    let known = queued.length ? Math.min(...queued) : undefined; // the version the job had when the first queued action was taken
    for (let idx = 0; idx < group.length; idx++) {
      let item = group[idx];
      if (item.status === "conflict" || item.status === "failed") break; // held until the technician decides
      // A first attempt takes the newest version our own earlier writes produced; a retry keeps its body (same Idempotency-Key).
      if (item.kind === "action" && item.attempts === 0 && known !== undefined && known > (item.expectedVersion ?? 0)) item = { ...item, expectedVersion: known };
      await putItem({ ...item, status: "sending", lastAttemptAt: new Date().toISOString(), attempts: item.attempts + 1 });
      try {
        const response = await send(item, run);
        known = threadVersion(known, response, item.kind === "action" ? item.expectedVersion : known);
        await deleteItem(item.id);
        result.sent += 1;
        await setMeta("lastSync", new Date().toISOString());
      } catch (err) {
        // A refused undo (state moved on / window over) just means "nothing to undo": drop it, keep the job moving.
        if (item.kind === "undo" && err instanceof B2bError && err.status >= 400 && err.status < 500 && err.status !== 429 && err.status !== 408 && err.status !== 401 && err.code !== "IDEMPOTENCY_IN_PROGRESS") {
          await deleteItem(item.id);
          result.undoRejected += 1;
          continue;
        }
        const rest = group.slice(idx + 1);
        const photos = group.filter((i) => i.kind === "photo").length;
        const summary = photos
          ? plural(t, i18n.locale ?? "en", "b2b.tech.err.draftPhotos", { one: "Your notes and {n} photo is saved as a draft.", other: "Your notes and {n} photos are saved as a draft." }, photos)
          : t("b2b.tech.err.draftSaved", "Your changes are saved as a draft.");
        const verdict = classifyError(err, summary, t);
        if (verdict.kind === "retry") {
          await putItem({ ...item, status: "waiting", attempts: item.attempts + 1, lastAttemptAt: new Date().toISOString(), error: verdict.message });
          result.offline = true;
          break jobsLoop;
        }
        const status = verdict.kind === "conflict" ? "conflict" : "failed";
        await putItem({ ...item, status, attempts: item.attempts + 1, error: verdict.message });
        if (status === "conflict") {
          result.conflicts += 1;
          for (const r of rest) await putItem({ ...r, status: "conflict", error: verdict.message });
        } else result.failed += 1;
        break;
      }
    }
  }
  result.remaining = (await listQueue(orgId)).length;
  return result;
}
