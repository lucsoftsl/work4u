import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { B2bError } from "@/b2b/api/client";
import { loadMyJobs, withNetworkTimeout } from "./read";
const m = vi.hoisted(() => ({ getMyJobs: vi.fn(), readMyJobs: vi.fn(), getJob: vi.fn(), readJob: vi.fn() }));
vi.mock("@/b2b/api/endpoints", () => ({ getMyJobs: m.getMyJobs, getJob: m.getJob }));
vi.mock("./store", () => ({ cacheMyJobs: vi.fn(async () => undefined), cacheJob: vi.fn(async () => undefined), readMyJobs: m.readMyJobs, readJob: m.readJob }));
const saved = { data: { items: [{ id: "j1" }], serverTime: "2026-10-13T08:00:00Z" }, savedAt: "2026-10-13T07:00:00Z" };
beforeEach(() => { m.readMyJobs.mockResolvedValue(saved); });
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe("offline reads", () => {
  it("while the browser is offline, shows the saved list without waiting on the network", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    m.getMyJobs.mockReturnValue(new Promise(() => undefined)); // would hang forever
    const res = await loadMyJobs("org");
    expect(res.cachedAt).toBe(saved.savedAt);
    expect(res.items).toHaveLength(1);
    expect(m.getMyJobs).not.toHaveBeenCalled();
  });
  it("online but unresponsive: falls back to the saved list after the timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", { onLine: true });
    m.getMyJobs.mockReturnValue(new Promise(() => undefined));
    const p = loadMyJobs("org");
    await vi.advanceTimersByTimeAsync(10_000);
    expect((await p).cachedAt).toBe(saved.savedAt);
  });
  it("offline with nothing saved still reports NETWORK (connect once)", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    m.readMyJobs.mockResolvedValue(null);
    await expect(loadMyJobs("org")).rejects.toMatchObject({ code: "NETWORK" });
  });
  it("withNetworkTimeout passes results and server errors through untouched", async () => {
    await expect(withNetworkTimeout(Promise.resolve(5))).resolves.toBe(5);
    await expect(withNetworkTimeout(Promise.reject(new B2bError(403, "FORBIDDEN", "x")))).rejects.toMatchObject({ status: 403 });
  });
});
