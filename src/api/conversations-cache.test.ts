import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchConversations, invalidateConversations, markMessageRead, sendMessageHttp } from "./index";
const apiJson = vi.hoisted(() => vi.fn());
vi.mock("@/lib/http", () => ({ apiJson }));
beforeEach(() => { apiJson.mockReset(); apiJson.mockResolvedValue([]); invalidateConversations(); vi.useRealTimers(); });

describe("fetchConversations sharing", () => {
  it("shares one request between simultaneous callers", async () => {
    await Promise.all([fetchConversations("t"), fetchConversations("t"), fetchConversations("t")]);
    expect(apiJson).toHaveBeenCalledTimes(1);
  });
  it("serves a fresh result from cache, then refetches once it is stale", async () => {
    vi.useFakeTimers();
    await fetchConversations("t");
    await fetchConversations("t");
    expect(apiJson).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(11_000);
    await fetchConversations("t");
    expect(apiJson).toHaveBeenCalledTimes(2);
  });
  it("does not share across users/tokens", async () => {
    await fetchConversations("a");
    await fetchConversations("b");
    expect(apiJson).toHaveBeenCalledTimes(2);
  });
  it("force bypasses the cache; a send or read invalidates it", async () => {
    await fetchConversations("t");
    await fetchConversations("t", { force: true });
    expect(apiJson).toHaveBeenCalledTimes(2);
    apiJson.mockResolvedValue({});
    await sendMessageHttp("t", { toUserId: "u", text: "hi" });
    await fetchConversations("t");
    await markMessageRead("t", "m1");
    await fetchConversations("t");
    expect(apiJson.mock.calls.filter((c) => String(c[0]).endsWith("/conversations")).length).toBe(4);
  });
  it("does not cache failures", async () => {
    apiJson.mockRejectedValueOnce(new Error("429")).mockResolvedValue([]);
    await expect(fetchConversations("t")).rejects.toThrow();
    await expect(fetchConversations("t")).resolves.toEqual([]);
  });
});
