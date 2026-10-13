import { describe, expect, it } from "vitest";
import type { WorkTime } from "@/b2b/api/types";
import type { QueueItem } from "@/b2b/offline/types";
import { applyQueuedClock, formatHms, pausedSecondsNow, shownSeconds, timerSpeech } from "./work-time";

const T0 = Date.parse("2026-10-13T10:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();
const time = (over: Partial<WorkTime> = {}): WorkTime => ({ state: "RUNNING", workedSeconds: 600, pausedSeconds: 0, correctionSeconds: 0, runningSince: iso(T0), pausedSince: null, pauseReason: null, pauseNote: null, workStartedAt: iso(T0 - 600_000), workEndedAt: null, serverTime: iso(T0), ...over });
const item = (over: Partial<QueueItem>): QueueItem => ({ id: "i", orgId: "o", jobId: "j", kind: "action", status: "waiting", attempts: 0, createdAt: iso(T0), idempotencyKey: "k", label: "x", ...over });

describe("shownSeconds", () => {
  it("adds wall time since serverTime while running, never counting ticks", () => {
    expect(shownSeconds(time(), T0 + 30_000)).toBe(630);
    expect(shownSeconds(time(), T0 + 3_600_000)).toBe(4200); // a reload after an hour is still exact
  });
  it("freezes while paused or stopped, and is never negative or NaN", () => {
    expect(shownSeconds(time({ state: "PAUSED" }), T0 + 99_000)).toBe(600);
    expect(shownSeconds(time({ state: "STOPPED" }), T0 + 99_000)).toBe(600);
    expect(shownSeconds(time({ workedSeconds: 5 }), T0 - 3_600_000)).toBe(5); // device clock behind server: no negative drift
    expect(shownSeconds(null, T0)).toBeNull();
  });
});

describe("pausedSecondsNow", () => {
  it("includes the pause in progress", () => {
    expect(pausedSecondsNow(time({ state: "PAUSED", pausedSeconds: 60 }), T0 + 120_000)).toBe(180);
    expect(pausedSecondsNow(time({ state: "RUNNING", pausedSeconds: 60 }), T0 + 120_000)).toBe(60);
  });
});

describe("formatHms / speech", () => {
  it("formats h:mm:ss", () => {
    expect(formatHms(0)).toBe("0:00:00");
    expect(formatHms(4325)).toBe("1:12:05");
  });
  it("speaks time in words, not digits", () => {
    expect(timerSpeech(4325)).toBe("1 hour 12 minutes");
    expect(timerSpeech(60)).toBe("1 minute");
    expect(timerSpeech(20)).toBe("less than a minute");
  });
});

describe("applyQueuedClock (offline overlay from the items' own timestamps)", () => {
  it("a queued start begins the clock at the tap time", () => {
    const out = applyQueuedClock(time({ state: "NOT_STARTED", workedSeconds: 0, runningSince: null, serverTime: iso(T0 - 5000) }), [item({ action: "start", createdAt: iso(T0) })]);
    expect(out?.state).toBe("RUNNING");
    expect(shownSeconds(out!, T0 + 60_000)).toBe(60);
  });
  it("a queued pause freezes the worked time at the pause moment, with its reason", () => {
    const out = applyQueuedClock(time(), [item({ kind: "pause", pauseReason: "PARTS", pauseNote: "n", createdAt: iso(T0 + 120_000) })]);
    expect(out).toMatchObject({ state: "PAUSED", pauseReason: "PARTS", pauseNote: "n" });
    expect(shownSeconds(out!, T0 + 999_000)).toBe(720);
  });
  it("pause then resume excludes the paused interval", () => {
    const out = applyQueuedClock(time(), [
      item({ id: "a", kind: "pause", pauseReason: "BREAK", createdAt: iso(T0 + 60_000) }),
      item({ id: "b", kind: "resume-work", createdAt: iso(T0 + 360_000) }),
    ]);
    expect(out?.state).toBe("RUNNING");
    expect(out?.pausedSeconds).toBe(300);
    expect(shownSeconds(out!, T0 + 420_000)).toBe(600 + 60 + 60);
  });
  it("block stops the clock, resume from blocked restarts it, complete stops it", () => {
    const blocked = applyQueuedClock(time(), [item({ action: "block", createdAt: iso(T0 + 60_000) })]);
    expect(blocked?.state).toBe("STOPPED");
    expect(shownSeconds(blocked!, T0 + 900_000)).toBe(660);
    const resumed = applyQueuedClock(blocked, [item({ action: "resume", createdAt: iso(T0 + 900_000) })]);
    expect(resumed?.state).toBe("RUNNING");
    expect(applyQueuedClock(time(), [item({ action: "complete", createdAt: iso(T0 + 30_000) })])?.state).toBe("STOPPED");
  });
  it("ignores held (conflict) items, other jobs, and a missing clock", () => {
    expect(applyQueuedClock(time(), [item({ kind: "pause", pauseReason: "BREAK", status: "conflict" })])?.state).toBe("RUNNING");
    expect(applyQueuedClock(time(), [item({ kind: "pause", pauseReason: "BREAK", jobId: "other" })], "j")?.state).toBe("RUNNING");
    expect(applyQueuedClock(null, [])).toBeNull();
  });
});
