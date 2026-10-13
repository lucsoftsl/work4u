import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { B2bError } from "@/b2b/api/client";
import type { Job } from "@/b2b/api/types";
import { enqueue, flushQueue, resolveWithFreshData, type Runners } from "./queue";
import { listQueue, resetDbHandle } from "./store";

const ORG = "org1";
const jobAt = (version: number) => ({ id: "j1", version, status: "IN_PROGRESS" }) as unknown as Job;
const photo = () => enqueue({ orgId: ORG, jobId: "j1", kind: "photo", label: "p", file: new Blob(["x"], { type: "image/jpeg" }) });
const tick = (done = true) => enqueue({ orgId: ORG, jobId: "j1", kind: "checklist", itemId: "a", done, label: "c" });
const complete = (expectedVersion = 7) => enqueue({ orgId: ORG, jobId: "j1", kind: "action", action: "complete", label: "complete", expectedVersion, body: { notes: "n" } });
const runners = (over: Partial<Runners> = {}): Runners => ({
  runAction: vi.fn(async () => jobAt(8)),
  toggleChecklist: vi.fn(async () => ({ version: 7 })),
  uploadPhoto: vi.fn(async () => ({ key: "k", version: 7 })),
  uploadSignature: vi.fn(async () => ({})),
  pauseWork: vi.fn(async () => ({})),
  resumeWork: vi.fn(async () => ({})),
  undoJob: vi.fn(async () => ({})),
  savePart: vi.fn(async () => ({ part: null, deleted: false, jobVersion: 0 })),
  ...over,
});
beforeEach(() => { globalThis.indexedDB = new IDBFactory(); resetDbHandle(); });

describe("offline completion replay", () => {
  it("replays evidence then complete in order, and complete carries the unchanged version after IN_PROGRESS evidence writes", async () => {
    await tick(); await photo(); await complete(7);
    const order: string[] = [];
    const run = runners({
      toggleChecklist: vi.fn(async () => { order.push("checklist"); return { version: 7 }; }),
      uploadPhoto: vi.fn(async () => { order.push("photo"); return { key: "k", version: 7 }; }),
      runAction: vi.fn(async () => { order.push("complete"); return jobAt(8); }),
    });
    expect(await flushQueue(ORG, run)).toMatchObject({ sent: 3, conflicts: 0, remaining: 0 });
    expect(order).toEqual(["checklist", "photo", "complete"]);
    expect((run.runAction as ReturnType<typeof vi.fn>).mock.calls[0][3]).toMatchObject({ expectedVersion: 7 });
  });

  it("threads the version a write returns into the next queued request (own one-step bump)", async () => {
    await tick(); await photo(); await complete(7);
    const run = runners({
      toggleChecklist: vi.fn(async () => ({ version: 8 })),
      uploadPhoto: vi.fn(async () => ({ key: "k", version: 9 })),
      runAction: vi.fn(async () => jobAt(10)),
    });
    await flushQueue(ORG, run);
    expect((run.runAction as ReturnType<typeof vi.fn>).mock.calls[0][3]).toMatchObject({ expectedVersion: 9 });
  });

  it("does not paper over a real concurrent change: a version jump keeps the stored version and the server's 409 holds the draft", async () => {
    await tick(); await complete(7);
    const run = runners({
      toggleChecklist: vi.fn(async () => ({ version: 12 })),
      runAction: vi.fn().mockRejectedValue(new B2bError(409, "VERSION_CONFLICT", "x", { currentVersion: 12, currentStatus: "IN_PROGRESS" })),
    });
    const res = await flushQueue(ORG, run);
    expect((run.runAction as ReturnType<typeof vi.fn>).mock.calls[0][3]).toMatchObject({ expectedVersion: 7 });
    expect(res).toMatchObject({ conflicts: 1 });
    expect((await listQueue(ORG)).map((i) => i.status)).toEqual(["conflict"]);
  });

  it("sends each item exactly once, with its own persisted key, across a mid-flush network drop and a second flush", async () => {
    const t = await tick(); const p = await photo(); const c = await complete(7);
    const run = runners({ uploadPhoto: vi.fn().mockRejectedValueOnce(new B2bError(0, "NETWORK", "x")).mockResolvedValue({ key: "k", version: 7 }) });
    expect(await flushQueue(ORG, run)).toMatchObject({ offline: true, sent: 1, remaining: 2 });
    expect(await flushQueue(ORG, run)).toMatchObject({ offline: false, sent: 2, remaining: 0 });
    expect(run.toggleChecklist).toHaveBeenCalledTimes(1);
    expect(run.uploadPhoto).toHaveBeenCalledTimes(2);
    expect(run.runAction).toHaveBeenCalledTimes(1);
    expect((run.runAction as ReturnType<typeof vi.fn>).mock.calls[0][4]).toBe(c.idempotencyKey);
    expect(new Set([t.idempotencyKey, p.idempotencyKey, c.idempotencyKey]).size).toBe(3);
  });

  it("retry with fresh data: re-targets held actions to the latest version with a new key, then they send", async () => {
    const c = await complete(7);
    await flushQueue(ORG, runners({ runAction: vi.fn().mockRejectedValue(new B2bError(409, "VERSION_CONFLICT", "x", { currentVersion: 9 })) }));
    expect((await listQueue(ORG))[0].status).toBe("conflict");
    await resolveWithFreshData(ORG, "j1", async () => ({ version: 9 }));
    const [held] = await listQueue(ORG);
    expect(held).toMatchObject({ status: "waiting", expectedVersion: 9, attempts: 0 });
    expect(held.idempotencyKey).not.toBe(c.idempotencyKey);
    const run = runners();
    await flushQueue(ORG, run);
    expect((run.runAction as ReturnType<typeof vi.fn>).mock.calls[0][3]).toMatchObject({ expectedVersion: 9 });
  });

  it("retry with fresh data leaves the draft untouched when the fresh fetch fails", async () => {
    await complete(7);
    await flushQueue(ORG, runners({ runAction: vi.fn().mockRejectedValue(new B2bError(409, "VERSION_CONFLICT", "x")) }));
    await expect(resolveWithFreshData(ORG, "j1", async () => { throw new B2bError(0, "NETWORK", "x"); })).rejects.toBeTruthy();
    expect((await listQueue(ORG))[0].status).toBe("conflict");
  });
});
