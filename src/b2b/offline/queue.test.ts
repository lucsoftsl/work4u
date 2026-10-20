import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { B2bError } from "@/b2b/api/client";
import type { Job } from "@/b2b/api/types";
import { applyPending } from "./apply";
import { classifyError } from "./classify";
import { discardJob, enqueue, flushQueue, retryItem, type Runners } from "./queue";
import { listQueue, resetDbHandle, getMeta } from "./store";

const ORG = "org1";
const job = (over: Partial<Job> = {}): Job => ({
  id: "j1", number: 1, reference: "JOB-1", title: "AC", status: "DISPATCHED", customerId: "c", locationId: "l",
  requirements: { checklist: false, notes: false, photo: false, signature: false, review: false }, checklist: [{ id: "a", text: "x", done: false }],
  reopenedCount: 0, version: 4, createdAt: "", updatedAt: "", timestamps: {}, ...over,
});
const runners = (over: Partial<Runners> = {}): Runners => ({
  runAction: vi.fn(async () => job()),
  toggleChecklist: vi.fn(async () => ({})),
  uploadPhoto: vi.fn(async () => ({ key: "k1" })),
  uploadSignature: vi.fn(async () => ({})),
  pauseWork: vi.fn(async () => ({})),
  resumeWork: vi.fn(async () => ({})),
  undoJob: vi.fn(async () => ({})),
  savePart: vi.fn(async () => ({ part: null, deleted: false, jobVersion: 0 })),
  ...over,
});
const act = (action: "start-journey" | "arrived" | "start" | "complete", extra = {}) =>
  enqueue({ orgId: ORG, jobId: "j1", kind: "action", action, label: action, expectedVersion: 4, ...extra });

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbHandle();
});

describe("queue + flush", () => {
  it("queues actions with a persisted Idempotency-Key and sends them in order with clientOccurredAt", async () => {
    const a = await act("start-journey");
    const b = await act("arrived", { expectedVersion: 5 });
    const run = runners();
    const res = await flushQueue(ORG, run);
    expect(res).toMatchObject({ sent: 2, offline: false, remaining: 0 });
    const calls = (run.runAction as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.map((c) => c[2])).toEqual(["start-journey", "arrived"]);
    expect(calls[0][3]).toMatchObject({ expectedVersion: 4, clientOccurredAt: a.createdAt });
    expect(calls[1][4]).toBe(b.idempotencyKey);
    expect(await getMeta<string>("lastSync")).toBeTruthy();
  });

  it("keeps items waiting on a network error and replays the SAME Idempotency-Key next time", async () => {
    const item = await act("start-journey");
    const down = runners({ runAction: vi.fn().mockRejectedValue(new B2bError(0, "NETWORK", "offline")) });
    const first = await flushQueue(ORG, down);
    expect(first).toMatchObject({ sent: 0, offline: true, remaining: 1 });
    expect((await listQueue(ORG))[0]).toMatchObject({ status: "waiting", attempts: 1 });
    const up = runners();
    await flushQueue(ORG, up);
    expect((up.runAction as ReturnType<typeof vi.fn>).mock.calls[0][4]).toBe(item.idempotencyKey);
    expect(await listQueue(ORG)).toEqual([]);
  });

  it("holds a reassigned job as a draft: item + the rest of that job become conflicts, other jobs still send", async () => {
    await act("start-journey");
    await enqueue({ orgId: ORG, jobId: "j1", kind: "photo", label: "photo", file: new Blob(["x"], { type: "image/jpeg" }) });
    await enqueue({ orgId: ORG, jobId: "j2", kind: "action", action: "start-journey", label: "other", expectedVersion: 1 });
    const run = runners({
      runAction: vi.fn(async (_o, jobId) => { if (jobId === "j1") throw new B2bError(404, "NOT_FOUND", "x"); return job(); }),
    });
    const res = await flushQueue(ORG, run);
    expect(res).toMatchObject({ sent: 1, conflicts: 1 });
    const left = await listQueue(ORG);
    expect(left.map((i) => i.status)).toEqual(["conflict", "conflict"]);
    expect(left[0].error).toMatch(/reassigned/i);
    expect(left[0].error).toMatch(/1 photo is saved as a draft/);
    expect(run.uploadPhoto).not.toHaveBeenCalled();
    // the held draft isn't retried by the next flush
    await flushQueue(ORG, run);
    expect(run.runAction).toHaveBeenCalledTimes(2);
  });

  it("marks a version conflict with the job's current status and a refusal as failed (retry works)", async () => {
    await act("complete");
    const stale = runners({ runAction: vi.fn().mockRejectedValue(new B2bError(409, "VERSION_CONFLICT", "x", { currentStatus: "CANCELLED", currentVersion: 9 })) });
    await flushQueue(ORG, stale);
    expect((await listQueue(ORG))[0]).toMatchObject({ status: "conflict" });
    expect((await listQueue(ORG))[0].error).toMatch(/now Cancelled/);

    await discardJob(ORG, "j1");
    const item = await act("complete");
    const refuse = runners({ runAction: vi.fn().mockRejectedValue(new B2bError(409, "COMPLETION_REQUIREMENTS_MISSING", "x", { missing: ["photo"] })) });
    expect(await flushQueue(ORG, refuse)).toMatchObject({ failed: 1 });
    expect((await listQueue(ORG))[0]).toMatchObject({ status: "failed", error: "Not complete yet: Add at least one photo." });
    await retryItem(item.id, ORG);
    expect((await listQueue(ORG))[0].status).toBe("waiting");
    expect(await flushQueue(ORG, runners())).toMatchObject({ sent: 1, remaining: 0 });
  });

  it("coalesces unsent taps on the same checklist item and uploads photos before the completing action", async () => {
    await enqueue({ orgId: ORG, jobId: "j1", kind: "checklist", itemId: "a", done: true, label: "c" });
    await enqueue({ orgId: ORG, jobId: "j1", kind: "checklist", itemId: "a", done: false, label: "c" });
    expect(await listQueue(ORG)).toHaveLength(1);
    await enqueue({ orgId: ORG, jobId: "j1", kind: "photo", label: "p", file: new Blob(["x"], { type: "image/png" }) });
    await act("complete");
    const order: string[] = [];
    const run = runners({
      toggleChecklist: vi.fn(async () => { order.push("checklist"); }),
      uploadPhoto: vi.fn(async () => { order.push("photo"); return { key: "k" }; }),
      runAction: vi.fn(async () => { order.push("complete"); return job(); }),
    });
    await flushQueue(ORG, run);
    expect(order).toEqual(["checklist", "photo", "complete"]);
    expect((run.toggleChecklist as ReturnType<typeof vi.fn>).mock.calls[0][3]).toBe(false);
  });

  it("never blocks the job on a signature image the server can't store", async () => {
    await enqueue({ orgId: ORG, jobId: "j1", kind: "signature", label: "sig", file: new Blob(["x"], { type: "image/png" }) });
    await act("complete");
    const run = runners({ uploadSignature: vi.fn().mockRejectedValue(new B2bError(503, "MIGRATION_PENDING", "x")) });
    expect(await flushQueue(ORG, run)).toMatchObject({ sent: 2, remaining: 0 });
  });

  it("concurrent flushes share one run (no double send)", async () => {
    await act("start-journey");
    const run = runners();
    await Promise.all([flushQueue(ORG, run), flushQueue(ORG, run)]);
    expect(run.runAction).toHaveBeenCalledTimes(1);
  });
});

describe("applyPending", () => {
  it("shows the next step offline: status, version and checklist follow the queued actions; conflicts are ignored", async () => {
    const items = [
      await act("start-journey"),
      await act("arrived", { expectedVersion: 5 }),
      await enqueue({ orgId: ORG, jobId: "j1", kind: "checklist", itemId: "a", done: true, label: "c" }),
      await enqueue({ orgId: ORG, jobId: "j1", kind: "photo", label: "p", file: new Blob(["x"]) }),
    ];
    const view = applyPending(job(), items);
    expect(view).toMatchObject({ pendingCount: 4, pendingPhotos: 1, unconfirmed: true });
    expect(view.job).toMatchObject({ status: "ON_SITE", version: 6 });
    expect(view.job.checklist[0].done).toBe(true);
    const held = applyPending(job(), items.map((i) => ({ ...i, status: "conflict" as const })));
    expect(held.job.status).toBe("DISPATCHED");
  });

  it("block carries its reason and resume clears it", () => {
    const base = { orgId: ORG, jobId: "j1", kind: "action" as const, status: "waiting" as const, attempts: 0, createdAt: "", idempotencyKey: "k", label: "" };
    const blocked = applyPending(job({ status: "IN_PROGRESS" }), [{ ...base, id: "1", action: "block", body: { reason: "No access" } }]);
    expect(blocked.job).toMatchObject({ status: "BLOCKED", statusReason: "No access", blockedFromStatus: "IN_PROGRESS" });
    const resumed = applyPending(blocked.job, [{ ...base, id: "2", action: "resume" }]);
    expect(resumed.job).toMatchObject({ status: "IN_PROGRESS", statusReason: null });
  });
});

describe("classifyError", () => {
  it("retries network/5xx/429, holds 404/403/409, fails other 4xx", () => {
    expect(classifyError(new B2bError(0, "NETWORK", "x")).kind).toBe("retry");
    expect(classifyError(new B2bError(503, "UNKNOWN", "x")).kind).toBe("retry");
    expect(classifyError(new B2bError(409, "IDEMPOTENCY_IN_PROGRESS", "x")).kind).toBe("retry");
    expect(classifyError(new B2bError(404, "NOT_FOUND", "x")).kind).toBe("conflict");
    expect(classifyError(new B2bError(409, "INVALID_TRANSITION", "x")).kind).toBe("conflict");
    expect(classifyError(new B2bError(422, "IDEMPOTENCY_KEY_REUSED", "x")).kind).toBe("failed");
    expect(classifyError(new Error("boom")).kind).toBe("retry");
  });
});

describe("classifyError translation", () => {
  it("uses a custom t for messages", () => {
    const t = (key: string) => `T:${key}`;
    expect(classifyError(new B2bError(0, "NETWORK", "x"), undefined, t).message).toBe("T:b2b.tech.err.waitingConnection");
    expect(classifyError(new Error("boom"), undefined, t).message).toBe("T:b2b.tech.err.sendRetry");
    expect(classifyError(new B2bError(422, "IDEMPOTENCY_KEY_REUSED", "x"), undefined, t).kind).toBe("failed");
  });
});
