import { describe, expect, it } from "vitest";
import type { Job } from "@/b2b/api/types";
import { alerts, bucketCounts, bucketHref, isDelayed, isSlaAtRisk, localDate, mergeBucketTotals, TOTAL_BUCKET_FILTERS, todayRange } from "./dashboard";

const TZ = "Europe/Madrid"; // UTC+2 in October (DST)
const NOW = new Date("2026-10-12T10:00:00Z"); // 12:00 local

let n = 0;
const job = (o: Partial<Job>): Job => ({
  id: `j${++n}`, number: n, reference: `JOB-${n}`, title: "t", status: "SCHEDULED", customerId: "c", locationId: "l",
  requirements: { checklist: false, notes: false, photo: false, signature: false, review: false }, checklist: [], timestamps: {},
  reopenedCount: 0, version: 1, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-12T08:00:00Z", ...o,
});

describe("todayRange", () => {
  it("uses the org timezone boundaries", () => {
    const r = todayRange(NOW, TZ);
    expect(r.date).toBe("2026-10-12");
    expect(new Date(r.start).toISOString()).toBe("2026-10-11T22:00:00.000Z");
    expect(new Date(r.end).toISOString()).toBe("2026-10-12T22:00:00.000Z");
  });
  it("differs from UTC near midnight", () => {
    const late = new Date("2026-10-12T23:30:00Z"); // already 13th in Madrid
    expect(localDate(late, TZ)).toBe("2026-10-13");
    expect(localDate(late, "UTC")).toBe("2026-10-12");
  });
  it("handles a 25h DST day", () => {
    const r = todayRange(new Date("2026-10-25T12:00:00Z"), TZ); // fall back
    expect((r.end - r.start) / 3_600_000).toBe(25);
  });
});

describe("delayed / sla", () => {
  it("flags scheduled jobs past start and field jobs past end", () => {
    expect(isDelayed(job({ status: "SCHEDULED", scheduledStart: "2026-10-12T09:00:00Z" }), NOW.getTime())).toBe(true);
    expect(isDelayed(job({ status: "SCHEDULED", scheduledStart: "2026-10-12T11:00:00Z" }), NOW.getTime())).toBe(false);
    expect(isDelayed(job({ status: "IN_PROGRESS", scheduledStart: "2026-10-12T07:00:00Z", scheduledEnd: "2026-10-12T09:00:00Z" }), NOW.getTime())).toBe(true);
    expect(isDelayed(job({ status: "ON_SITE", scheduledEnd: "2026-10-12T09:00:00Z" }), NOW.getTime())).toBe(false);
  });
  it("sla at risk within 2h, not for finished jobs", () => {
    expect(isSlaAtRisk(job({ slaDueAt: "2026-10-12T11:30:00Z" }), NOW.getTime())).toBe(true);
    expect(isSlaAtRisk(job({ slaDueAt: "2026-10-12T12:30:00Z" }), NOW.getTime())).toBe(false);
    expect(isSlaAtRisk(job({ status: "COMPLETED", slaDueAt: "2026-10-12T11:30:00Z" }), NOW.getTime())).toBe(false);
  });
});

describe("bucketCounts", () => {
  it("counts each bucket", () => {
    const jobs = [
      job({ status: "EN_ROUTE", scheduledStart: "2026-10-12T09:30:00Z", scheduledEnd: "2026-10-12T12:00:00Z" }),
      job({ status: "BLOCKED" }),
      job({ status: "SCHEDULED", scheduledStart: "2026-10-12T14:00:00Z" }),
      job({ status: "SCHEDULED", scheduledStart: "2026-10-13T08:00:00Z" }),
      job({ status: "SCHEDULED", scheduledStart: "2026-10-12T21:59:00Z" }), // 23:59 local today
      job({ status: "SCHEDULED", scheduledStart: "2026-10-12T22:00:00Z" }), // 00:00 local tomorrow
      job({ status: "WAITING_FOR_PARTS" }),
      job({ status: "REVIEW" }),
      job({ status: "COMPLETED", timestamps: { completedAt: "2026-10-12T08:00:00Z" } }),
      job({ status: "CLOSED", timestamps: { completedAt: "2026-10-10T08:00:00Z" } }),
      job({ status: "CANCELLED", timestamps: { cancelledAt: "2026-10-12T07:00:00Z" } }),
    ];
    expect(bucketCounts(jobs, NOW, TZ, { unassignedCount: 3 })).toEqual({
      live: 2, scheduledToday: 3, upcoming: 2, unassigned: 3, delayed: 0, waitingParts: 1, review: 1, blocked: 1, completedToday: 1, cancelled: 1,
    });
  });
});

describe("alerts", () => {
  it("orders by severity and covers each kind", () => {
    const blocked = job({ status: "BLOCKED", statusReason: "no key" });
    const late = job({ status: "DISPATCHED", scheduledStart: "2026-10-12T09:00:00Z" });
    const parts = job({ status: "WAITING_FOR_PARTS" });
    const sla = job({ status: "IN_PROGRESS", slaDueAt: "2026-10-12T11:00:00Z" });
    const soon = job({ status: "SCHEDULED", scheduledStart: "2026-10-12T12:00:00Z" });
    const far = job({ status: "SCHEDULED", scheduledStart: "2026-10-14T12:00:00Z" });
    const out = alerts([blocked, late, parts, sla], NOW, TZ, [soon, far]);
    expect(out.map((a) => a.kind).sort()).toEqual(["blocked", "running_late", "sla_risk", "unassigned_soon", "waiting_parts"]);
    expect(out[0].severity).toBe("critical");
    expect(out.at(-1)!.severity).toBe("warning");
  });
});

describe("bucketHref", () => {
  it("links to the jobs list with filters", () => {
    expect(bucketHref("o1", "blocked", NOW, TZ)).toBe("/ops/o1/jobs?status=BLOCKED");
    expect(bucketHref("o1", "scheduledToday", NOW, TZ)).toContain("from=2026-10-12&to=2026-10-12");
  });
});

describe("bucket totals from the server", () => {
  const zero = { live: 1, scheduledToday: 2, upcoming: 3, unassigned: 4, delayed: 5, waitingParts: 6, review: 7, blocked: 8, completedToday: 9, cancelled: 10 };
  it("replaces a count only when the server sent a number", () => {
    const merged = mergeBucketTotals(zero, { live: 40, blocked: 0, review: undefined });
    expect(merged.live).toBe(40);
    expect(merged.blocked).toBe(0);
    expect(merged.review).toBe(7);
    expect(merged.delayed).toBe(5);
    expect(zero.live).toBe(1); // input untouched
  });
  it("uses status-only filters for cheap total queries", () => {
    expect(Object.keys(TOTAL_BUCKET_FILTERS).sort()).toEqual(["blocked", "live", "review", "waitingParts"]);
    expect(TOTAL_BUCKET_FILTERS.live?.status).toContain("IN_PROGRESS");
  });
});
