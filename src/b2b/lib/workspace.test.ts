import ro from "@/locales/ro.json";
import es from "@/locales/es.json";
import { describe, expect, it } from "vitest";
import { B2bError } from "@/b2b/api/client";
import type { JobWorkspace, TimelineEntry } from "@/b2b/api/types";
import { allowedTransitions, type JobForTransitions } from "./transitions";
import type { Viewer } from "./permissions";
import {
  checkableWindow, describeB2bError, describeConflict, movesBackToScheduled, scheduleGate, describeTimelineEntry, groupByDay, isExpired, isValidReason, isoToZonedInput,
  toTransitionJob, validateUpload, validateWindow, zonedInputToIso, formatInZone, actorName,
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
  it("explains the draft and job type errors in plain words (4718e5f9, ce3173a7)", () => {
    expect(describeB2bError(err(409, "JOB_IS_DRAFT")).message).toBe("This is still a draft. Create the job first, then schedule or assign it.");
    expect(describeB2bError(err(409, "NOT_A_DRAFT"))).toMatchObject({ kind: "stale", message: expect.stringContaining("no longer a draft") });
    expect(describeB2bError(err(409, "JOB_TYPE_ARCHIVED")).message).toBe("That job type is archived. Choose another one.");
    const d = describeB2bError(err(422, "DRAFT_INCOMPLETE", { missing: ["customerId", "locationId"] }));
    expect(d.kind).toBe("missing");
    expect(d.message).toBe("This draft isn't ready to become a job. Missing: a client, a location.");
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
  it("describes drafts, and a money edit only names the fields, never their values", () => {
    expect(describeTimelineEntry(e("job.draft_saved")).text).toBe("Draft saved");
    expect(describeTimelineEntry(e("job.promoted")).text).toBe("Draft turned into a job");
    const money = describeTimelineEntry(e("job.updated", { oldValue: { price: 45000 }, newValue: { price: 50025, cost: 29000 } }));
    expect(money.text).toBe("Updated price, cost");
    expect(JSON.stringify(money)).not.toMatch(/45000|50025|29000/);
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


import { actorName as actorNameFor } from "./workspace";
describe("timeline names (d886968d)", () => {
  const entry = (actor: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({ id: 1, occurredAt: "2026-10-18T08:00:00Z", category: "TEAM", action: "job.assigned", actor, ...extra }) as never;
  it("a person without a real name is 'Team member' (translated label passed in), never an email", () => {
    expect(actorNameFor(entry({ type: "USER", memberId: "m1", name: null }), "Membru al echipei")).toBe("Membru al echipei");
    expect(actorNameFor(entry({ type: "USER", memberId: "m1", name: "ana@x.es" }))).toBe("Team member");
    expect(actorNameFor(entry({ type: "USER", name: "Ana Pop" }))).toBe("Ana Pop");
    expect(actorNameFor(entry({ type: "SYSTEM" }))).toBe("System");
    expect(actorNameFor(entry({ type: "CUSTOMER" }))).toBe("Customer");
  });
  it("assignment sentences never show an email as the assignee", () => {
    expect(describeTimelineEntry(entry({ type: "USER" }, { newValue: { memberId: "m1", memberName: null } })).text).toBe("Assigned a team member");
    expect(describeTimelineEntry(entry({ type: "USER" }, { newValue: { memberId: "m1", memberName: "ana@x.es" } })).text).toBe("Assigned a team member");
    expect(describeTimelineEntry(entry({ type: "USER" }, { newValue: { memberName: "Ana Pop" } })).text).toBe("Assigned Ana Pop");
  });
});

describe("translated messages (status names inside sentences, no English left)", () => {
  const T = (d: unknown) => (k: string, f: string) => (d as Record<string, string>)[k] ?? f;
  const ROI = { t: T(ro), locale: "ro" }, ESI = { t: T(es), locale: "es" };
  const err = (status: number, code: string, body: Record<string, unknown> = {}) => new B2bError(status, code as never, "msg", body);
  const e = (action: string, extra: Partial<TimelineEntry> = {}): TimelineEntry => ({ id: 1, occurredAt: "2026-07-01T08:00:00Z", category: "TEAM", actor: { type: "USER", name: "Ana" }, action, ...extra });

  it("a stale job names the new status in the language, inside a template (quoted), not by gluing words", () => {
    const d = describeB2bError(err(409, "VERSION_CONFLICT", { currentStatus: "EN_ROUTE" }), ROI);
    expect(d.message).toBe("Această lucrare a fost modificată de altcineva. Acum: „În drum”. Reîncarcă pentru a continua.");
    expect(describeB2bError(err(409, "INVALID_TRANSITION", { currentStatus: "EN_ROUTE" }), ESI).message).toContain("«En camino»");
    expect(describeB2bError(err(409, "INVALID_TRANSITION", { currentStatus: "EN_ROUTE" })).message).toBe("That move isn't available. The job is now En route. Reload to continue.");
  });
  it("the missing-things lists are translated", () => {
    expect(describeB2bError(err(409, "GUARD_FAILED", { missing: ["schedule", "assignment"] }), ROI).message).toBe("Nu se poate trece mai departe încă. Lipsește: o fereastră de timp programată, o echipă sau un tehnician alocat.");
    expect(describeB2bError(err(409, "COMPLETION_REQUIREMENTS_MISSING", { missing: ["photo", "signature"] }), ESI).message).toContain("una foto");
  });
  it("other errors have a Romanian and a Spanish text", () => {
    for (const code of ["ASSIGNMENT_CONFLICT", "OVERRIDE_FORBIDDEN", "EVIDENCE_UNAVAILABLE", "ASSIGNMENT_LOCKED", "SCHEDULE_REQUIRED", "REASON_REQUIRED", "PRECONDITION_REQUIRED", "JOB_IS_DRAFT", "NOT_A_DRAFT", "JOB_TYPE_ARCHIVED", "NOT_FOUND", "FORBIDDEN"]) {
      const en = describeB2bError(err(409, code)).message;
      expect(describeB2bError(err(409, code), ROI).message, `ro ${code}`).not.toBe(en);
      expect(describeB2bError(err(409, code), ESI).message, `es ${code}`).not.toBe(en);
    }
    expect(describeB2bError(new Error("x"), ROI).message).toBe("Ceva nu a mers. Încearcă din nou.");
  });
  it("timeline sentences: status changes use the translated names, the rest is translated", () => {
    expect(describeTimelineEntry(e("job.status_changed", { oldValue: "SCHEDULED", newValue: "EN_ROUTE" }), "UTC", ROI).text).toBe("Stare schimbată din „Programată” în „În drum”");
    expect(describeTimelineEntry(e("job.status_changed", { oldValue: "SCHEDULED", newValue: "EN_ROUTE" }), "UTC", ESI).text).toBe("Estado cambiado de «Programado» a «En camino»");
    expect(describeTimelineEntry(e("job.created"), "UTC", ROI).text).toBe("Lucrare creată");
    expect(describeTimelineEntry(e("job.assigned", { newValue: { teamName: "Echipa 4" } }), "UTC", ROI).text).toBe("Alocat: Echipa 4");
    expect(describeTimelineEntry(e("job.assigned", { newValue: { memberId: "m" } }), "UTC", ESI).text).toBe("Asignado: un miembro del equipo");
    expect(describeTimelineEntry(e("job.rescheduled", { newValue: { scheduledStart: "2026-10-20T10:00:00Z" } }), "UTC", ROI).text).toMatch(/^Reprogramată pentru .*oct/i);
    expect(describeTimelineEntry(e("job.attachment_added", { newValue: { name: "a.jpg", category: "AFTER" } }), "UTC", ROI).text).toBe("Adăugat a.jpg (După)");
    expect(describeTimelineEntry(e("job.status_changed", { oldValue: "A", newValue: "B" })).text).toBe("Status changed from a to b");
  });
  it("English output without a translator is exactly what it was", () => {
    expect(describeTimelineEntry(e("job.status_changed", { oldValue: "SCHEDULED", newValue: "DISPATCHED" })).text).toBe("Status changed from Scheduled to Team dispatched");
    expect(formatInZone("2026-10-20T10:00:00Z", "UTC", { timeStyle: "short" })).toBe("10:00");
    expect(formatInZone("2026-10-20T10:00:00Z", "UTC", { dateStyle: "medium" }, "ro")).toMatch(/oct/i);
    expect(actorName(e("x", { actor: { type: "CUSTOMER" } }), "Team member", ROI)).toBe("Client");
    expect(actorName(e("x", { actor: { type: "SYSTEM" } }), "Team member", ESI)).toBe("Sistema");
  });
});
