import { describe, expect, it } from "vitest";
import type { Conflict, DispatchBoard, Job } from "@/b2b/api/types";
import {
  applyAssignmentToBoard, canDragJob, decideDrop, laneBadge, mapAssignError, rollback, shiftDate, teamHours, timelineBlock,
  todayInTimezone, isValidOverrideReason,
} from "./dispatch";

const job = (id: string, over: Partial<Job> = {}): Job => ({
  id, number: Number(id.replace(/\D/g, "")) || 1, reference: `JOB-${id}`, title: "t", status: "READY_TO_SCHEDULE",
  customerId: "c", locationId: "l", requirements: { checklist: false, notes: false, photo: false, signature: false, review: false },
  checklist: [], timestamps: {}, reopenedCount: 0, version: 1, createdAt: "", updatedAt: "", ...over,
});
const board = (): DispatchBoard => ({
  range: { from: "2026-10-12", to: "2026-10-12" },
  unassigned: [job("1"), job("2")],
  teams: [
    { id: "t1", name: "Team 1", status: "AVAILABLE", jobs: [job("3", { scheduledStart: "2026-10-12T10:00:00Z", scheduledEnd: "2026-10-12T12:00:00Z" })] },
    { id: "t2", name: "Team 2", status: "AVAILABLE", jobs: [] },
  ],
  individuals: [],
});
const overlap: Conflict = { type: "TEAM_TIME_OVERLAP", message: "Team 4 is already assigned to JOB-1038 between 13:00–16:00" };
const skill: Conflict = { type: "SKILL_MISSING", message: "Missing Plumbing" };
const target = { laneId: "t2", currentLaneId: "unassigned" };

describe("decideDrop", () => {
  it("assigns when it fits", () => {
    expect(decideDrop({ job: job("1"), target, check: { conflicts: [], canOverride: true }, viewerCanOverride: true }).kind).toBe("assign");
  });
  it("asks for override when allowed", () => {
    const d = decideDrop({ job: job("1"), target, check: { conflicts: [overlap], canOverride: true }, viewerCanOverride: true });
    expect(d).toEqual({ kind: "confirm-override", conflicts: [overlap] });
  });
  it("blocks when the viewer cannot override", () => {
    expect(decideDrop({ job: job("1"), target, check: { conflicts: [overlap], canOverride: true }, viewerCanOverride: false }).kind).toBe("blocked");
  });
  it("blocks when the API says not overridable", () => {
    expect(decideDrop({ job: job("1"), target, check: { conflicts: [overlap], canOverride: false }, viewerCanOverride: true }).kind).toBe("blocked");
  });
  it("shows skill missing as a conflict", () => {
    const d = decideDrop({ job: job("1"), target, check: { conflicts: [skill], canOverride: false }, viewerCanOverride: true });
    expect(d.kind).toBe("blocked");
    expect(d.conflicts).toEqual([skill]);
  });
  it("is a noop for unassigned or same lane", () => {
    const check = { conflicts: [], canOverride: true };
    expect(decideDrop({ job: job("1"), target: { laneId: "unassigned", currentLaneId: "t1" }, check, viewerCanOverride: true }).kind).toBe("noop");
    expect(decideDrop({ job: job("1"), target: { laneId: "t1", currentLaneId: "t1" }, check, viewerCanOverride: true }).kind).toBe("noop");
  });
});

describe("applyAssignmentToBoard", () => {
  it("moves an unassigned job into the team without mutating the input", () => {
    const before = board();
    const frozen = JSON.stringify(before);
    const after = applyAssignmentToBoard(before, "1", "t2");
    expect(JSON.stringify(before)).toBe(frozen);
    expect(after.unassigned.map((j) => j.id)).toEqual(["2"]);
    expect(after.teams[1].jobs.map((j) => j.id)).toEqual(["1"]);
    expect(after).not.toBe(before);
  });
  it("moves between teams and sorts by start", () => {
    const after = applyAssignmentToBoard(board(), "3", "t2");
    expect(after.teams[0].jobs).toEqual([]);
    expect(after.teams[1].jobs[0].id).toBe("3");
  });
  it("ignores unknown job or team", () => {
    const b = board();
    expect(applyAssignmentToBoard(b, "x", "t1")).toBe(b);
    expect(applyAssignmentToBoard(b, "1", "nope")).toBe(b);
  });
  it("rollback restores the snapshot", () => {
    const snap = board();
    const moved = applyAssignmentToBoard(snap, "1", "t1");
    expect(rollback(moved, snap)).toBe(snap);
    expect(rollback(moved, undefined)).toBe(moved);
  });
});

describe("canDragJob", () => {
  it("requires permission and an assignable status", () => {
    expect(canDragJob(job("1"), true)).toBe(true);
    expect(canDragJob(job("1"), false)).toBe(false);
    for (const status of ["EN_ROUTE", "ON_SITE", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CLOSED", "CANCELLED"] as const) {
      expect(canDragJob(job("1", { status }), true)).toBe(false);
    }
    expect(canDragJob(job("1", { status: "DISPATCHED" }), true)).toBe(true);
  });
});

describe("laneBadge", () => {
  it("covers fits, conflict, skill and checking", () => {
    expect(laneBadge({ conflicts: [], canOverride: false })).toEqual({ tone: "fits", text: "Fits" });
    expect(laneBadge({ conflicts: [overlap], canOverride: true })).toEqual({ tone: "conflict", text: `Conflict: ${overlap.message}` });
    expect(laneBadge({ conflicts: [skill], canOverride: false })).toEqual({ tone: "skill", text: "Missing skill" });
    expect(laneBadge(null).tone).toBe("checking");
  });
});

describe("mapAssignError", () => {
  it("maps known codes", () => {
    expect(mapAssignError({ code: "ASSIGNMENT_CONFLICT", conflicts: [overlap] }).conflicts).toEqual([overlap]);
    expect(mapAssignError({ code: "SCHEDULE_REQUIRED" })).toMatchObject({ message: "Set a time window first", linkToJob: true });
    expect(mapAssignError({ code: "ASSIGNMENT_LOCKED" }).message).toBe("This job has already started; its team can't be changed");
    expect(mapAssignError({ code: "OVERRIDE_FORBIDDEN" }).message).toMatch(/permission/);
    expect(mapAssignError({ code: "FORBIDDEN" }).message).toMatch(/permission/);
    expect(mapAssignError({ code: "NETWORK" }).retryable).toBe(true);
    expect(mapAssignError(new Error("x")).retryable).toBe(true);
  });
});

describe("helpers", () => {
  it("teamHours sums scheduled windows or estimates", () => {
    const jobs = [
      job("1", { scheduledStart: "2026-10-12T10:00:00Z", scheduledEnd: "2026-10-12T12:30:00Z" }),
      job("2", { estimatedDurationMin: 90 }),
    ];
    expect(teamHours(jobs)).toEqual({ count: 2, hours: 4, capacity: 8, hasHours: true });
    expect(teamHours([]).hasHours).toBe(false);
  });
  it("validates override reasons", () => {
    expect(isValidOverrideReason("  ab ")).toBe(false);
    expect(isValidOverrideReason("abc")).toBe(true);
  });
  it("shifts dates across month ends and computes tz today", () => {
    expect(shiftDate("2026-10-31", 1)).toBe("2026-11-01");
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(todayInTimezone("Europe/Madrid", new Date("2026-10-12T23:30:00Z"))).toBe("2026-10-13");
  });
  it("positions timeline blocks", () => {
    const b = timelineBlock({ scheduledStart: "2026-10-12T09:00:00Z", scheduledEnd: "2026-10-12T10:00:00Z" }, "UTC");
    expect(b).toEqual({ left: 10, width: 10 });
    expect(timelineBlock({ scheduledStart: null, scheduledEnd: null }, "UTC")).toBeNull();
  });
});

import { assignTracks, nowPercent } from "./dispatch";
describe("timeline tracks and now line", () => {
  it("puts overlapping blocks on separate tracks and reuses a free track", () => {
    const blocks = [{ left: 0, width: 30 }, { left: 10, width: 30 }, { left: 20, width: 5 }, { left: 50, width: 10 }];
    expect(assignTracks(blocks)).toEqual([0, 1, 2, 0]);
  });
  it("keeps touching blocks on one track", () => {
    expect(assignTracks([{ left: 0, width: 10 }, { left: 10, width: 10 }])).toEqual([0, 0]);
  });
  it("places the now line inside the 08-18 window, else null", () => {
    expect(nowPercent(Date.parse("2026-10-12T13:00:00Z"), "UTC")).toBeCloseTo(50);
    expect(nowPercent(Date.parse("2026-10-12T06:00:00Z"), "UTC")).toBeNull();
    expect(nowPercent(Date.parse("2026-10-12T19:00:00Z"), "UTC")).toBeNull();
  });
});
