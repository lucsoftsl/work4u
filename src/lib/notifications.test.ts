import { describe, expect, it } from "vitest";
import en from "@/locales/en.json";
import {
  badgeText,
  describeNotification,
  interpolate,
  isB2cNotification,
  notificationHref,
  notificationText,
} from "@/lib/notifications";

const t = (key: string) => (en as Record<string, string>)[key] ?? key;

describe("badgeText", () => {
  it("caps at 9+", () => {
    expect(badgeText(0)).toBe("0");
    expect(badgeText(9)).toBe("9");
    expect(badgeText(10)).toBe("9+");
    expect(badgeText(250)).toBe("9+");
  });
});

describe("describeNotification / notificationText", () => {
  it("translates application kinds with the job title", () => {
    const n = { kind: "APPLICATION_RECEIVED", data: { jobId: "j1", jobTitle: "Fix sink" }, message: "x" };
    expect(notificationText(n, t)).toBe('New application for "Fix sink"');
  });

  it("flags worker-left as urgent in both shapes", () => {
    expect(describeNotification({ kind: "JOB_WORKER_LEFT", data: { jobId: "j", reason: "WITHDRAWN", jobTitle: "A" } }).urgent).toBe(true);
    const open = describeNotification({ kind: "JOB_WORKER_LEFT", data: { jobId: "j", outcome: "OPEN" } });
    const cancelled = describeNotification({ kind: "JOB_WORKER_LEFT", data: { jobId: "j", outcome: "CANCELLED" } });
    expect(open.key).toBe("notif.workerLeftOpen");
    expect(cancelled.key).toBe("notif.workerLeftCancelled");
    expect(open.urgent).toBe(true);
  });

  it("falls back to the server message for unknown kinds", () => {
    expect(notificationText({ kind: "SOMETHING_NEW", data: null, message: "Hello" }, t)).toBe("Hello");
  });

  it("uses the no-title variant when the title is missing", () => {
    expect(describeNotification({ kind: "JOB_CANCELLED", data: { jobId: "j" } }).key).toBe("notif.jobCancelledNoTitle");
  });

  it("every key it can return exists in en", () => {
    const kinds = ["APPLICATION_RECEIVED", "APPLICATION_ACCEPTED", "APPLICATION_REJECTED", "JOB_CANCELLED", "JOB_WORKER_LEFT", "COMPANY_ROSTER_INVITE", "COMPANY_ROSTER_ACCEPTED", "COMPANY_ROSTER_DECLINED"];
    for (const kind of kinds) {
      for (const data of [{ jobTitle: "T" }, {}, { reason: "WITHDRAWN", jobTitle: "T" }, { reason: "WITHDRAWN" }, { outcome: "CANCELLED" }]) {
        const key = describeNotification({ kind, data }).key;
        expect(key && (en as Record<string, string>)[key]).toBeTruthy();
      }
    }
  });
});

describe("notificationHref", () => {
  it("sends the owner to the applicants page", () => {
    expect(notificationHref({ kind: "APPLICATION_RECEIVED", data: { jobId: "j1" } })).toBe("/my-jobs/j1/applicants");
    expect(notificationHref({ kind: "JOB_WORKER_LEFT", data: { jobId: "j1" } })).toBe("/my-jobs/j1/applicants");
  });
  it("sends applicants to the job", () => {
    expect(notificationHref({ kind: "APPLICATION_ACCEPTED", data: { jobId: "j1" } })).toBe("/jobs/j1");
    expect(notificationHref({ kind: "JOB_CANCELLED", data: { jobId: "j 1" } })).toBe("/jobs/j%201");
  });
  it("returns null without a jobId or for unknown kinds", () => {
    expect(notificationHref({ kind: "APPLICATION_ACCEPTED", data: {} })).toBeNull();
    expect(notificationHref({ kind: "COMPANY_ROSTER_INVITE", data: { jobId: "j" } })).toBeNull();
  });
});

describe("helpers", () => {
  it("skips XP/achievement rows (kind null)", () => {
    expect(isB2cNotification({ kind: null })).toBe(false);
    expect(isB2cNotification({ kind: "JOB_CANCELLED" })).toBe(true);
  });
  it("interpolates missing params to empty string", () => {
    expect(interpolate("{count} unread", { count: "9+" })).toBe("9+ unread");
    expect(interpolate("a {x} b", {})).toBe("a  b");
  });
});
