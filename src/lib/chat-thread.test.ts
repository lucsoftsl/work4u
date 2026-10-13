import { describe, expect, it } from "vitest";
import { NO_JOB_KEY, jobKeyOf, pickJobKey } from "./chat-thread";

const jobs = (...keys: string[]) => keys.map((jobKey) => ({ jobKey }));

describe("pickJobKey", () => {
  it("does not lock in General before the history has loaded", () => {
    expect(pickJobKey({ currentKey: null, jobs: [], historyLoaded: false })).toBeNull();
  });

  it("picks the most recent job thread when history arrives after the user was selected", () => {
    // Arrange: user selected on reload, nothing picked yet; then history lands
    const beforeHistory = pickJobKey({ currentKey: null, jobs: [], historyLoaded: false });

    // Act
    const afterHistory = pickJobKey({ currentKey: beforeHistory, jobs: jobs("job-2", "job-1"), historyLoaded: true });

    // Assert
    expect(afterHistory).toBe("job-2");
  });

  it("replaces a stale General pick with the real thread once history shows it has no General messages", () => {
    expect(pickJobKey({ currentKey: NO_JOB_KEY, jobs: jobs("job-1"), historyLoaded: true })).toBe("job-1");
  });

  it("keeps an explicitly deep-linked job selected even before history loads", () => {
    expect(pickJobKey({ currentKey: "job-9", jobs: [], historyLoaded: false, explicitKey: "job-9" })).toBe("job-9");
  });

  it("keeps an explicitly deep-linked job with no messages yet when other threads exist", () => {
    expect(
      pickJobKey({ currentKey: "job-9", jobs: jobs("job-2", NO_JOB_KEY), historyLoaded: true, explicitKey: "job-9" })
    ).toBe("job-9");
  });

  it("opens General when the history only has messages without a job", () => {
    expect(pickJobKey({ currentKey: null, jobs: jobs(NO_JOB_KEY), historyLoaded: true })).toBe(NO_JOB_KEY);
  });

  it("opens General for a conversation with no messages at all", () => {
    expect(pickJobKey({ currentKey: null, jobs: [], historyLoaded: true })).toBe(NO_JOB_KEY);
  });

  it("keeps a user-chosen thread that still exists", () => {
    expect(pickJobKey({ currentKey: "job-1", jobs: jobs("job-2", "job-1"), historyLoaded: true })).toBe("job-1");
  });

  it("falls back to the most recent thread when the current one no longer exists", () => {
    expect(pickJobKey({ currentKey: "gone", jobs: jobs("job-2", "job-1"), historyLoaded: true })).toBe("job-2");
  });
});

describe("jobKeyOf", () => {
  it("uses the job id when present", () => {
    expect(jobKeyOf("job-1", "other")).toBe("job-1");
  });

  it("falls back to a precomputed key, then General", () => {
    expect(jobKeyOf(null, "job-2")).toBe("job-2");
    expect(jobKeyOf(undefined, undefined)).toBe(NO_JOB_KEY);
  });

  it("treats an empty job id as General", () => {
    expect(jobKeyOf("", "")).toBe(NO_JOB_KEY);
  });
});
