import { afterEach, describe, expect, it, vi } from "vitest";
import { setTokenProvider } from "@/lib/http";
import { checkSchedule, createJob, getBoard, listJobs, scheduleJob } from "./endpoints";
import { listReviewQueue } from "./review";

afterEach(() => { vi.unstubAllGlobals(); setTokenProvider(null); });
const capture = () => {
  setTokenProvider(async () => "mock-token");
  const fetch = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ items: [], total: 80, hasMore: true, nextCursor: "opaque" }), { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

describe("round 3 endpoint contracts", () => {
  it("sends jobs cursor, server sort and direction", async () => {
    const fetch = capture();
    const result = await listJobs("org", { cursor: "opaque+/=", limit: 25, sort: "priority", dir: "desc" });
    const url = new URL(fetch.mock.calls[0][0]);
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ cursor: "opaque+/=", sort: "priority", dir: "desc", limit: "25" });
    expect(result).toMatchObject({ total: 80, hasMore: true, nextCursor: "opaque" });
  });
  it("sends review cursor and oldest/newest ordering", async () => {
    const fetch = capture();
    await listReviewQueue("org", "desc", { limit: 25, cursor: "review+/=" });
    expect(Object.fromEntries(new URL(fetch.mock.calls[0][0]).searchParams)).toMatchObject({ cursor: "review+/=", limit: "25", dir: "desc" });
  });
  it("sends both dispatch filters to the API", async () => {
    const fetch = capture();
    await getBoard("org", "2026-10-20", { skillIds: ["s1", "s2"], priorities: ["HIGH", "URGENT"] });
    expect(Object.fromEntries(new URL(fetch.mock.calls[0][0]).searchParams)).toEqual({ date: "2026-10-20", skillId: "s1,s2", priority: "HIGH,URGENT" });
  });
  it("checks schedule without override and saves with version and reason", async () => {
    const fetch = capture();
    const window = { start: "2026-10-20T09:00:00Z", end: "2026-10-20T10:00:00Z" };
    await checkSchedule("org", "job", window);
    expect(new URL(fetch.mock.calls[0][0]).pathname).toContain("/jobs/job/schedule/check");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(window);
    await scheduleJob("org", "job", { ...window, expectedVersion: 3, override: { reason: "Urgent repair" } });
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ ...window, expectedVersion: 3, override: { reason: "Urgent repair" } });
  });
  it("posts the create-job fields to the org scoped route", async () => {
    const fetch = capture();
    const body = { title: "Repair", category: "Repair", customerId: "c", locationId: "l", priority: "URGENT" as const, requiredSkillIds: ["s"], requestedDate: "2026-10-20", estimatedDurationMin: 90 };
    await createJob("org", body);
    expect(new URL(fetch.mock.calls[0][0]).pathname).toContain("/orgs/org/jobs");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(body);
  });
});
