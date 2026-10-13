import { describe, expect, it } from "vitest";
import type { Job, Part } from "@/b2b/api/types";
import { applyPending } from "./apply";
import type { QueueItem } from "./types";

const T0 = Date.parse("2026-10-13T10:00:00Z");
const iso = (s: number) => new Date(T0 + s * 1000).toISOString();
const part = (id: string, name: string, quantity = 1): Part => ({ id, jobId: "j", name, sku: null, quantity, unit: null, note: null, createdAt: iso(0), updatedAt: iso(0) });
const job = { id: "j", status: "IN_PROGRESS", version: 4, checklist: [], parts: [part("a", "Valve", 2)], time: { state: "RUNNING", workedSeconds: 0, pausedSeconds: 0, correctionSeconds: 0, runningSince: iso(0), pausedSince: null, pauseReason: null, pauseNote: null, workStartedAt: iso(0), workEndedAt: null, serverTime: iso(0) } } as unknown as Job;
const item = (over: Partial<QueueItem>): QueueItem => ({ id: String(Math.random()), orgId: "o", jobId: "j", kind: "part", status: "waiting", attempts: 0, createdAt: iso(10), idempotencyKey: "k", label: "x", ...over });

describe("applyPending: tech v2", () => {
  it("overlays queued parts add/edit/delete", () => {
    const out = applyPending(job, [
      item({ partOp: "add", partId: "n", part: { name: "Pipe", quantity: 3, unit: "m" } }),
      item({ partOp: "edit", partId: "a", part: { quantity: 5 } }),
      item({ partOp: "delete", partId: "zzz" }),
    ]).job;
    expect(out.parts?.map((p) => [p.id, p.name, p.quantity])).toEqual([["a", "Valve", 5], ["n", "Pipe", 3]]);
    expect(applyPending(job, [item({ partOp: "delete", partId: "a" })]).job.parts).toEqual([]);
  });
  it("overlays queued pause/resume on the clock without bumping the version", () => {
    const paused = applyPending(job, [item({ kind: "pause", pauseReason: "BREAK", createdAt: iso(60) })]);
    expect(paused.job.time?.state).toBe("PAUSED");
    expect(paused.job.version).toBe(4);
    expect(paused.pendingCount).toBe(1);
    const resumed = applyPending(job, [item({ kind: "pause", pauseReason: "BREAK", createdAt: iso(60) }), item({ kind: "resume-work", createdAt: iso(120) })]);
    expect(resumed.job.time?.state).toBe("RUNNING");
  });
  it("a queued undo item is not shown as a new step", () => {
    expect(applyPending(job, [item({ kind: "undo" })]).job.status).toBe("IN_PROGRESS");
  });
});
