import { describe, expect, it } from "vitest";
import { B2bError } from "@/b2b/api/client";
import type { JobWorkspace, TimelineEntry } from "@/b2b/api/types";
import { allowedTransitions, type JobForTransitions } from "./transitions";
import type { Viewer } from "./permissions";
import {
  checkableWindow, describeB2bError, describeConflict, movesBackToScheduled, scheduleGate, describeTimelineEntry, groupByDay, isExpired, isValidReason, isoToZonedInput,
  toTransitionJob, validateUpload, validateWindow, zonedInputToIso,
} from "./workspace";

const ws = (over: Partial<JobWorkspace> = {}): JobWorkspace =>
  ({
    id: "j1", status: "PLANNING", requirements: { review: false }, scheduledStart: null, scheduledEnd: null,
    assignments: [], ...over,
  }) as unknown as JobWorkspace;

const grant = (...p: string[]): Viewer => ({ grants: p.map((permission) => ({ permission, scope: "ALL" as const })), teamIds: ["t1"] });

describe("toTransitionJob", () => {
  it("counts assignments and detects assignedToMe via member or team", () => {
    const job = ws({ assignments: [{ id: "a", teamId: "t1" }, { id: "b", memberId: "m9" }] });
    const r = toTransitionJob(job, { memberId: "m1", teamIds: ["t1"] });
    expect(r.assignmentCount).toBe(2);
    expect(r.assignedToMe).toBe(true);
    expect(r.teamIds).toEqual(["t1"]);
    expect(toTransitionJob(job, { memberId: "m2", teamIds: [] }).assignedToMe).toBe(false);
    expect(toTransitionJob(ws({ assignments: [{ id: "x", memberId: "m1" }] }), { memberId: "m1" }).assignedToMe).toBe(true);
  });

  it("feeds allowedTransitions: SCHEDULED needs window + assignee; review flag drives COMPLETED", () => {
    const v = grant("job.transition", "job.close");
    const bare = toTransitionJob(ws({ status: "READY_TO_SCHEDULE" }), { memberId: "m" });
    expect(allowedTransitions(bare as JobForTransitions, v).map((o) => o.to)).not.toContain("SCHEDULED");
    const ready = toTransitionJob(
      ws({ status: "READY_TO_SCHEDULE", scheduledStart: "2026-01-01T10:00:00Z", scheduledEnd: "2026-01-01T11:00:00Z", assignments: [{ id: "a", teamId: "t" }] }),
      { memberId: "m" }
    );
    expect(allowedTransitions(ready, v).map((o) => o.to)).toContain("SCHEDULED");
    const done = toTransitionJob(ws({ status: "COMPLETED", requirements: { review: true } as never }), { memberId: "m" });
    expect(allowedTransitions(done, v).map((o) => o.to)).toEqual(["REVIEW"]);
  });
});

describe("isValidReason", () => {
  it("requires 3 trimmed characters", () => {
    expect(isValidReason("  ab ")).toBe(false);
    expect(isValidReason("abc")).toBe(true);
    expect(isValidReason("")).toBe(false);
  });
});

describe("describeB2bError", () => {
  const err = (status: number, code: string, body: Record<string, unknown> = {}) => new B2bError(status, code as never, "msg", body);

  it("maps VERSION_CONFLICT to stale with current status", () => {
    const d = describeB2bError(err(409, "VERSION_CONFLICT", { currentVersion: 4, currentStatus: "ON_SITE" }));
    expect(d.kind).toBe("stale");
    expect(d.message).toContain("changed by someone else");
    expect(d.message).toContain("On site");
  });
  it("maps ASSIGNMENT_CONFLICT with conflicts", () => {
    const d = describeB2bError(err(409, "ASSIGNMENT_CONFLICT", { conflicts: [{ type: "TEAM_TIME_OVERLAP", message: "x" }] }));
    expect(d.kind).toBe("conflict");
    expect(d.conflicts).toHaveLength(1);
  });
  it("maps GUARD_FAILED and COMPLETION_REQUIREMENTS_MISSING to missing lists", () => {
    const g = describeB2bError(err(409, "GUARD_FAILED", { missing: ["schedule", "assignment"] }));
    expect(g.kind).toBe("missing");
    expect(g.message).toContain("a scheduled time window");
    expect(g.message).toContain("an assigned team or technician");
    const c = describeB2bError(err(409, "COMPLETION_REQUIREMENTS_MISSING", { missing: ["photo", "signature"] }));
    expect(c.missing).toEqual(["photo", "signature"]);
    expect(c.message).toContain("After photo");
  });
  it("maps OVERRIDE_FORBIDDEN, 403, NOT_FOUND, SCHEDULE_REQUIRED", () => {
    expect(describeB2bError(err(403, "OVERRIDE_FORBIDDEN")).overrideForbidden).toBe(true);
    expect(describeB2bError(err(403, "FORBIDDEN")).kind).toBe("forbidden");
    expect(describeB2bError(err(403, "UNKNOWN")).kind).toBe("forbidden");
    expect(describeB2bError(err(404, "NOT_FOUND")).kind).toBe("notFound");
    expect(describeB2bError(err(409, "SCHEDULE_REQUIRED")).scheduleRequired).toBe(true);
  });
  it("falls back to generic", () => {
    expect(describeB2bError(new Error("boom")).kind).toBe("generic");
    expect(describeB2bError(err(500, "UNKNOWN")).kind).toBe("generic");
    expect(describeB2bError(err(428, "PRECONDITION_REQUIRED")).kind).toBe("generic");
  });
});

describe("describeConflict", () => {
  it("labels by type and keeps the API message", () => {
    const v = describeConflict({ type: "SKILL_MISSING", message: "Missing HVAC" });
    expect(v.label).toBe("Skill missing");
    expect(v.message).toBe("Missing HVAC");
    expect(describeConflict({ type: "MEMBER_TIME_OVERLAP", message: "", jobNumber: 1038 }).message).toBe("Overlaps JOB-1038");
  });
});

describe("timezone conversion", () => {
  it("converts Madrid summer and winter wall time to UTC", () => {
    expect(zonedInputToIso("2026-07-01T10:00", "Europe/Madrid")).toBe("2026-07-01T08:00:00.000Z");
    expect(zonedInputToIso("2026-01-15T10:00", "Europe/Madrid")).toBe("2026-01-15T09:00:00.000Z");
    expect(zonedInputToIso("2026-07-01T10:00", "America/New_York")).toBe("2026-07-01T14:00:00.000Z");
  });
  it("round-trips and handles day rollover", () => {
    expect(isoToZonedInput("2026-07-01T23:30:00.000Z", "Europe/Madrid")).toBe("2026-07-02T01:30");
    const iso = zonedInputToIso("2026-03-10T09:15", "Asia/Tokyo")!;
    expect(isoToZonedInput(iso, "Asia/Tokyo")).toBe("2026-03-10T09:15");
  });
  it("rejects invalid input and reversed windows", () => {
    expect(zonedInputToIso("nope", "UTC")).toBeNull();
    expect(isoToZonedInput(null, "UTC")).toBe("");
    expect(validateWindow("2026-07-01T10:00", "2026-07-01T09:00", "UTC").ok).toBe(false);
    expect(validateWindow("2026-07-01T10:00", "2026-07-01T11:00", "UTC")).toMatchObject({ ok: true, start: "2026-07-01T10:00:00.000Z" });
  });
});

describe("timeline", () => {
  const e = (action: string, extra: Partial<TimelineEntry> = {}): TimelineEntry => ({
    id: 1, occurredAt: "2026-07-01T08:00:00Z", category: "TEAM", actor: { type: "USER", name: "Ana" }, action, ...extra,
  });
  it("describes status changes", () => {
    expect(describeTimelineEntry(e("job.status_changed", { oldValue: "SCHEDULED", newValue: "DISPATCHED" })).text).toBe("Status changed from Scheduled to Team dispatched");
  });
  it("highlights overrides with reason", () => {
    const s = describeTimelineEntry(e("job.assigned", { newValue: { teamName: "Team 4" }, metadata: { conflictOverridden: true, overrideReason: "Customer emergency" } }));
    expect(s.highlight).toBe(true);
    expect(s.detail).toContain("Customer emergency");
  });
  it("describes attachments and unknown actions", () => {
    expect(describeTimelineEntry(e("job.attachment_added", { newValue: { name: "a.jpg", category: "AFTER" } })).text).toBe("Added a.jpg (After)");
    expect(describeTimelineEntry(e("job.something_new")).text).toBe("Something new");
  });
  it("groups by day in the org timezone", () => {
    const groups = groupByDay([e("a", { occurredAt: "2026-07-01T23:30:00Z" }), e("b", { occurredAt: "2026-07-01T10:00:00Z" })], "Europe/Madrid");
    expect(groups.map((g) => g.day)).toEqual(["2026-07-02", "2026-07-01"]);
  });
});

describe("attachments", () => {
  it("validates size and type per category", () => {
    expect(validateUpload({ type: "image/png", size: 100 }, "BEFORE")).toBeNull();
    expect(validateUpload({ type: "application/pdf", size: 100 }, "BEFORE")).not.toBeNull();
    expect(validateUpload({ type: "application/pdf", size: 100 }, "INTERNAL")).toBeNull();
    expect(validateUpload({ type: "image/png", size: 9 * 1024 * 1024 }, "AFTER")).toContain("8 MB");
  });
  it("detects expired URLs", () => {
    expect(isExpired("2026-01-01T00:00:00Z", Date.parse("2026-01-01T00:00:01Z"))).toBe(true);
    expect(isExpired("2026-01-01T00:05:00Z", Date.parse("2026-01-01T00:00:00Z"))).toBe(false);
  });
});

describe("schedule pre-check gate", () => {
  const conflict = { type: "MEMBER_TIME_OVERLAP", message: "Ben is busy" } as const;
  const base = { conflicts: [], apiCanOverride: false, roleCanOverride: false, reason: "", checking: false };

  it("allows saving when nothing conflicts", () => {
    expect(scheduleGate(base)).toEqual({ showOverride: false, canSave: true, block: null });
  });
  it("blocks saving while the dry run is in flight", () => {
    expect(scheduleGate({ ...base, checking: true }).block).toBe("checking");
    expect(scheduleGate({ ...base, checking: true }).canSave).toBe(false);
  });
  it("blocks when conflicts exist and the API says no override", () => {
    expect(scheduleGate({ ...base, conflicts: [conflict], roleCanOverride: true })).toEqual({ showOverride: false, canSave: false, block: "cannot-override" });
  });
  it("blocks when the role lacks dispatch.override_conflict even if the API allows it", () => {
    expect(scheduleGate({ ...base, conflicts: [conflict], apiCanOverride: true }).block).toBe("cannot-override");
  });
  it("asks for a reason (>= 3 chars) before an override can be saved", () => {
    const o = { ...base, conflicts: [conflict], apiCanOverride: true, roleCanOverride: true };
    expect(scheduleGate({ ...o, reason: " a " })).toEqual({ showOverride: true, canSave: false, block: "reason-required" });
    expect(scheduleGate({ ...o, reason: "Customer asked" })).toEqual({ showOverride: true, canSave: true, block: null });
  });
  it("detects the move back to Scheduled", () => {
    expect(movesBackToScheduled({ status: "DISPATCHED", resultingStatus: "SCHEDULED" })).toBe(true);
    expect(movesBackToScheduled({ status: "SCHEDULED", resultingStatus: "SCHEDULED" })).toBe(false);
    expect(movesBackToScheduled(undefined)).toBe(false);
  });
  it("only dry-runs a valid window", () => {
    expect(checkableWindow("", "", "UTC")).toBeNull();
    expect(checkableWindow("2026-10-12T10:00", "2026-10-12T09:00", "UTC")).toBeNull();
    expect(checkableWindow("2026-10-12T09:00", "2026-10-12T10:00", "UTC")).toEqual({ start: "2026-10-12T09:00:00.000Z", end: "2026-10-12T10:00:00.000Z" });
  });
});

describe("describeB2bError evidence policy", () => {
  const e = (code: string, body: Record<string, unknown>) => ({ name: "B2bError", status: 409, code, body });
  it("reads missing items from details and names the cause", () => {
    const unavailable = describeB2bError(e("EVIDENCE_UNAVAILABLE", { details: { missing: [] } }));
    expect(unavailable).toMatchObject({ kind: "generic", code: "EVIDENCE_UNAVAILABLE" });
    expect(unavailable.message).toMatch(/can't be checked right now/);
    const required = describeB2bError(e("EVIDENCE_REQUIRED", { details: { missing: ["photo"] } }));
    expect(required).toMatchObject({ code: "EVIDENCE_REQUIRED", missing: ["photo"] });
    expect(required.message).toMatch(/an After photo/);
  });
});
