import { describe, expect, it } from "vitest";
import { B2bError } from "@/b2b/api/client";
import type { Job } from "@/b2b/api/types";
import { missingForCompletion, splitToday, techErrorMessage, techPlan } from "./tech-actions";

const job = (over: Partial<Job> = {}): Job => ({
  id: "j1", number: 1045, reference: "JOB-1045", title: "AC repair", status: "IN_PROGRESS", customerId: "c", locationId: "l",
  requirements: { checklist: true, notes: true, photo: true, signature: true, review: false },
  checklist: [{ id: "a", text: "x", done: true }, { id: "b", text: "y", done: false }],
  reopenedCount: 0, version: 3, createdAt: "", updatedAt: "", timestamps: {}, ...over,
});

describe("techPlan", () => {
  it("follows Start journey → Arrived → Start job → Complete, with Blocked only in the field", () => {
    expect(techPlan("DISPATCHED").primary?.action).toBe("start-journey");
    expect(techPlan("DISPATCHED").canBlock).toBe(false);
    expect(techPlan("EN_ROUTE")).toMatchObject({ primary: { action: "arrived", to: "ON_SITE" }, canBlock: true });
    expect(techPlan("ON_SITE").primary?.action).toBe("start");
    expect(techPlan("IN_PROGRESS")).toMatchObject({ primary: { action: "complete" }, canBlock: true });
    expect(techPlan("BLOCKED").primary?.action).toBe("resume");
  });

  it("offers nothing before dispatch or after the job is finished", () => {
    for (const s of ["SCHEDULED", "PLANNING", "NEW"] as const) expect(techPlan(s).primary).toBeNull();
    expect(techPlan("SCHEDULED").idleMessage).toMatch(/waiting for dispatch/i);
    expect(techPlan("COMPLETED").idleMessage).toMatch(/finished/i);
    expect(techPlan("CANCELLED").idleMessage).toMatch(/cancelled/i);
  });
});

describe("missingForCompletion", () => {
  it("lists what the job's requirement flags still need", () => {
    expect(missingForCompletion(job(), { notes: "", signatureName: "", newPhotoKeys: [] })).toEqual(["checklist", "notes", "photo", "signature"]);
  });

  it("is satisfied by notes, a signature name, a new or existing photo and a finished checklist", () => {
    const done = job({ checklist: [{ id: "a", text: "x", done: true }] });
    expect(missingForCompletion(done, { notes: "Replaced capacitor", signatureName: "Ana Ruiz", newPhotoKeys: ["k1"] })).toEqual([]);
    expect(missingForCompletion({ ...done, photoKeys: ["old"], completionNotes: "n", signature: { name: "A", signedAt: "" } }, { notes: "", signatureName: "", newPhotoKeys: [] })).toEqual([]);
  });

  it("with a signature pad, the name alone isn't enough; drawn + name is; queued photos count", () => {
    const j = job({ checklist: [], requirements: { checklist: false, notes: false, photo: true, signature: true, review: false } });
    const base = { notes: "", signatureName: "Ana", newPhotoKeys: [] as string[] };
    expect(missingForCompletion(j, { ...base, signatureDrawn: false })).toEqual(["photo", "signature"]);
    expect(missingForCompletion(j, { ...base, signatureDrawn: true, queuedPhotos: 1 })).toEqual([]);
    expect(missingForCompletion(j, { ...base, signatureName: " ", signatureDrawn: true, queuedPhotos: 1 })).toEqual(["signature"]);
  });

  it("ignores requirements the job doesn't have", () => {
    const loose = job({ requirements: { checklist: false, notes: false, photo: false, signature: false, review: false } });
    expect(missingForCompletion(loose, { notes: "", signatureName: "", newPhotoKeys: [] })).toEqual([]);
  });
});

describe("techErrorMessage", () => {
  it("maps stale versions and invalid transitions to a reload", () => {
    expect(techErrorMessage(new B2bError(409, "VERSION_CONFLICT", "x", { currentVersion: 5 })).stale).toBe(true);
    expect(techErrorMessage(new B2bError(409, "INVALID_TRANSITION", "x")).stale).toBe(true);
  });

  it("explains missing completion items in words, not codes", () => {
    const e = new B2bError(409, "COMPLETION_REQUIREMENTS_MISSING", "x", { missing: ["checklist", "signature"] });
    expect(techErrorMessage(e).message).toBe("Not complete yet: Finish the checklist, Get the customer's name and signature.");
  });

  it("handles offline, permission and unknown errors", () => {
    expect(techErrorMessage(new B2bError(0, "NETWORK", "x")).message).toMatch(/offline/i);
    expect(techErrorMessage(new B2bError(403, "FORBIDDEN", "x")).message).toMatch(/permission/i);
    expect(techErrorMessage(new Error("boom")).message).toBe("Something went wrong.");
  });
});

describe("splitToday", () => {
  const at = (id: string, status: Job["status"], start: string) => job({ id, reference: id, status, scheduledStart: start });
  it("puts the in-field job first, the rest by start time, finished jobs apart", () => {
    const r = splitToday([at("B", "SCHEDULED", "2026-10-14T16:00:00Z"), at("A", "DISPATCHED", "2026-10-14T14:00:00Z"), at("C", "COMPLETED", "2026-10-14T08:00:00Z"), at("D", "IN_PROGRESS", "2026-10-14T17:30:00Z")]);
    expect(r.next?.id).toBe("D");
    expect(r.later.map((j) => j.id)).toEqual(["A", "B"]);
    expect(r.done.map((j) => j.id)).toEqual(["C"]);
  });

  it("next is the earliest unfinished job when nothing is in the field; empty list is safe", () => {
    expect(splitToday([at("B", "SCHEDULED", "16"), at("A", "DISPATCHED", "14")]).next?.id).toBe("A");
    expect(splitToday([])).toEqual({ next: null, later: [], done: [] });
  });
});

describe("custom translate function", () => {
  it("is used by techPlan, techErrorMessage and completionLabel", async () => {
    const { techPlan, techErrorMessage, completionLabel } = await import("./tech-actions");
    const { B2bError } = await import("@/b2b/api/client");
    const t = (key: string) => `T:${key}`;
    expect(techPlan("DISPATCHED", t).primary?.label).toBe("T:b2b.tech.step.startJourney");
    expect(techPlan("CANCELLED", t).idleMessage).toBe("T:b2b.tech.step.idle.cancelled");
    expect(completionLabel("photo", t)).toBe("T:b2b.tech.completion.photo");
    expect(techErrorMessage(new B2bError(0, "NETWORK", "x"), t).message).toBe("T:b2b.tech.err.network");
    expect(techErrorMessage(new Error("x")).message).toBe("Something went wrong.");
  });
});
