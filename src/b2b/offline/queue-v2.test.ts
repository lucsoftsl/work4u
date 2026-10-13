import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { B2bError } from "@/b2b/api/client";
import type { Job } from "@/b2b/api/types";
import { enqueue, flushQueue, removeWaiting, type Runners } from "./queue";
import { listQueue, resetDbHandle } from "./store";

const ORG = "org1";
const job = (version = 7) => ({ id: "j1", version, status: "IN_PROGRESS" }) as unknown as Job;
const runners = (over: Partial<Runners> = {}): Runners => ({
  runAction: vi.fn(async () => job(8)),
  toggleChecklist: vi.fn(async () => ({ version: 7 })),
  uploadPhoto: vi.fn(async () => ({ key: "k", version: 7 })),
  uploadSignature: vi.fn(async () => ({})),
  pauseWork: vi.fn(async () => job(7)),
  resumeWork: vi.fn(async () => job(7)),
  undoJob: vi.fn(async () => ({ undone: { kind: "pause" }, job: job(7), undo: null })),
  savePart: vi.fn(async () => ({ part: null, deleted: false, jobVersion: 7 })),
  ...over,
});
const at = (n: number) => new Date(Date.parse("2026-10-13T10:00:00Z") + n * 1000).toISOString();
const base = { orgId: ORG, jobId: "j1" };
beforeEach(() => { globalThis.indexedDB = new IDBFactory(); resetDbHandle(); });

describe("tech v2 queue items", () => {
  it("replays pause → resume → complete in order with their own keys and device timestamps; complete keeps its version", async () => {
    const p = await enqueue({ ...base, kind: "pause", pauseReason: "PARTS", pauseNote: "van", label: "Pause", createdAt: at(1) });
    const r = await enqueue({ ...base, kind: "resume-work", label: "Resume", createdAt: at(2) });
    const c = await enqueue({ ...base, kind: "action", action: "complete", label: "Complete", expectedVersion: 7, createdAt: at(3) });
    const order: string[] = [];
    const run = runners({
      pauseWork: vi.fn(async () => { order.push("pause"); return job(7); }),
      resumeWork: vi.fn(async () => { order.push("resume"); return job(7); }),
      runAction: vi.fn(async () => { order.push("complete"); return job(8); }),
    });
    expect(await flushQueue(ORG, run)).toMatchObject({ sent: 3, remaining: 0 });
    expect(order).toEqual(["pause", "resume", "complete"]);
    expect(run.pauseWork).toHaveBeenCalledWith(ORG, "j1", { reason: "PARTS", note: "van", clientOccurredAt: at(1) }, p.idempotencyKey);
    expect(run.resumeWork).toHaveBeenCalledWith(ORG, "j1", { clientOccurredAt: at(2) }, r.idempotencyKey);
    expect((run.runAction as ReturnType<typeof vi.fn>).mock.calls[0][3]).toMatchObject({ expectedVersion: 7 });
    expect((run.runAction as ReturnType<typeof vi.fn>).mock.calls[0][4]).toBe(c.idempotencyKey);
  });

  it("sends parts add/edit/delete with the client id and an idempotency key each", async () => {
    await enqueue({ ...base, kind: "part", partOp: "add", partId: "p1", part: { name: "Valve", quantity: 2 }, label: "Part", createdAt: at(1) });
    await enqueue({ ...base, kind: "part", partOp: "edit", partId: "p0", part: { quantity: 3 }, label: "Part", createdAt: at(2) });
    await enqueue({ ...base, kind: "part", partOp: "delete", partId: "p9", label: "Part", createdAt: at(3) });
    const run = runners();
    await flushQueue(ORG, run);
    const calls = (run.savePart as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.map((c) => [c[2], c[3]])).toEqual([["add", "p1"], ["edit", "p0"], ["delete", "p9"]]);
    expect(new Set(calls.map((c) => c[5])).size).toBe(3);
    expect(calls[0][4]).toEqual({ name: "Valve", quantity: 2 });
  });

  it("an add that never synced absorbs a later edit and vanishes on delete (nothing is sent)", async () => {
    await enqueue({ ...base, kind: "part", partOp: "add", partId: "p1", part: { name: "Valve", quantity: 1 }, label: "Part" });
    await enqueue({ ...base, kind: "part", partOp: "edit", partId: "p1", part: { quantity: 4 }, label: "Part" });
    const q = await listQueue(ORG);
    expect(q).toHaveLength(1);
    expect(q[0].part).toEqual({ name: "Valve", quantity: 4 });
    await enqueue({ ...base, kind: "part", partOp: "delete", partId: "p1", label: "Part" });
    expect(await listQueue(ORG)).toEqual([]);
  });

  it("a rejected undo is dropped (not held as a conflict), reported, and later items still send", async () => {
    await enqueue({ ...base, kind: "undo", undoId: 5, label: "Undo", createdAt: at(1) });
    await enqueue({ ...base, kind: "pause", pauseReason: "BREAK", label: "Pause", createdAt: at(2) });
    const run = runners({ undoJob: vi.fn().mockRejectedValue(new B2bError(409, "UNDO_NOT_POSSIBLE", "x")) });
    const res = await flushQueue(ORG, run);
    expect(res).toMatchObject({ undoRejected: 1, conflicts: 0, sent: 1, remaining: 0 });
    expect(run.pauseWork).toHaveBeenCalledTimes(1);
  });

  it("complete refused with JOB_PAUSED is a failure the technician can act on, not a version conflict", async () => {
    await enqueue({ ...base, kind: "action", action: "complete", label: "Complete", expectedVersion: 7 });
    const run = runners({ runAction: vi.fn().mockRejectedValue(new B2bError(409, "JOB_PAUSED", "Resume work before completing the job")) });
    const res = await flushQueue(ORG, run);
    expect(res).toMatchObject({ failed: 1, conflicts: 0 });
    expect((await listQueue(ORG))[0].error).toMatch(/Resume work first/);
  });

  it("removeWaiting deletes only an unsent item (offline undo) and refuses one already sending/synced", async () => {
    const a = await enqueue({ ...base, kind: "pause", pauseReason: "BREAK", label: "Pause" });
    expect(await removeWaiting(a.id)).toBe(true);
    expect(await listQueue(ORG)).toEqual([]);
    expect(await removeWaiting("gone")).toBe(false);
  });
});
