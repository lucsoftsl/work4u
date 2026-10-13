import { describe, expect, it } from "vitest";
import { classifyReviewError, formatAbsolute, formatWaiting, parseReviewDir, removeFromQueue, restoreToQueue, reviewActionVisibility, reviewDirHref, totalAttachments, validateSendBackReason } from "./review";

const now = Date.parse("2026-10-12T12:00:00Z");
const ago = (min: number) => new Date(now - min * 60_000).toISOString();

describe("formatWaiting", () => {
  it("formats minutes, hours and days", () => {
    expect(formatWaiting(ago(0), now)).toBe("just now");
    expect(formatWaiting(ago(12), now)).toBe("12 min");
    expect(formatWaiting(ago(185), now)).toBe("3 h 5 min");
    expect(formatWaiting(ago(120), now)).toBe("2 h");
    expect(formatWaiting(ago(60 * 52), now)).toBe("2 d 4 h");
    expect(formatWaiting("garbage", now)).toBe("—");
  });
  it("never goes negative on clock skew", () => expect(formatWaiting(ago(-5), now)).toBe("just now"));
});

describe("formatAbsolute", () => {
  it("uses the org timezone and survives a bad tz", () => {
    expect(formatAbsolute("2026-10-12T12:05:00Z", "Europe/Budapest")).toBe("12 Oct, 14:05");
    expect(formatAbsolute("2026-10-12T12:05:00Z", "Nope/Zone")).toBe("12 Oct, 12:05");
  });
});

describe("validateSendBackReason", () => {
  it("requires 3+ trimmed chars", () => {
    expect(validateSendBackReason("  ab ").ok).toBe(false);
    expect(validateSendBackReason("abc").ok).toBe(true);
    expect(validateSendBackReason("").message).toMatch(/at least 3/);
  });
});

describe("optimistic queue", () => {
  const q = [{ id: "a" }, { id: "b" }, { id: "c" }];
  it("removes and restores at the same position without mutating", () => {
    const r = removeFromQueue(q, "b");
    expect(r.next.map((i) => i.id)).toEqual(["a", "c"]);
    expect(q).toHaveLength(3);
    expect(restoreToQueue(r.next, r).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
  it("is a no-op for unknown ids and does not duplicate on restore", () => {
    const r = removeFromQueue(q, "zz");
    expect(r.removed).toBeNull();
    expect(restoreToQueue(q, removeFromQueue(q, "a"))).toHaveLength(3);
  });
});

describe("misc", () => {
  it("totals attachments, null when unavailable", () => {
    expect(totalAttachments(null)).toBeNull();
    expect(totalAttachments({ BEFORE: 2, AFTER: 3 })).toBe(5);
  });
  it("gates actions on job.close", () => {
    expect(reviewActionVisibility((p) => p === "job.close")).toEqual({ approve: true, sendBack: true });
    expect(reviewActionVisibility(() => false)).toEqual({ approve: false, sendBack: false });
  });
  it("classifies errors", () => {
    expect(classifyReviewError({ status: 409, code: "VERSION_CONFLICT" }).kind).toBe("stale");
    expect(classifyReviewError({ status: 403 }).kind).toBe("forbidden");
    expect(classifyReviewError({ status: 428 }).kind).toBe("precondition");
    expect(classifyReviewError({ status: 500 }).kind).toBe("generic");
  });
});

describe("review queue order", () => {
  it("defaults to oldest first and accepts only asc|desc", () => {
    expect(parseReviewDir(null)).toBe("asc");
    expect(parseReviewDir("bogus")).toBe("asc");
    expect(parseReviewDir("desc")).toBe("desc");
  });
  it("keeps the URL clean for the default order", () => {
    expect(reviewDirHref("/ops/o1/review", "asc")).toBe("/ops/o1/review");
    expect(reviewDirHref("/ops/o1/review", "desc")).toBe("/ops/o1/review?dir=desc");
  });
});
