import { afterEach, describe, expect, it, vi } from "vitest";
import { apiJson } from "./http";
import { runLimited } from "./concurrency";

afterEach(() => vi.unstubAllGlobals());
const okJson = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("apiJson: concurrent identical GETs share one request", () => {
  it("two simultaneous reads of the same URL hit the network once; each caller gets its own copy", async () => {
    const fetchMock = vi.fn(async () => { await new Promise((r) => setTimeout(r, 10)); return okJson({ items: [1] }); });
    vi.stubGlobal("fetch", fetchMock);
    const [a, b] = await Promise.all([apiJson<{ items: number[] }>("/api/messages?withUserId=u1"), apiJson<{ items: number[] }>("/api/messages?withUserId=u1")]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    a.items.push(2);
    expect(b.items).toEqual([1]);
  });
  it("is not a cache: after it settles, the next call is a fresh request", async () => {
    const fetchMock = vi.fn(async () => okJson({ n: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    await apiJson("/api/x");
    await apiJson("/api/x");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("different URLs, writes and aborted-able requests are never merged", async () => {
    const fetchMock = vi.fn(async () => okJson({}));
    vi.stubGlobal("fetch", fetchMock);
    await Promise.all([apiJson("/api/a"), apiJson("/api/b"), apiJson("/api/a", { method: "POST", json: { x: 1 } }), apiJson("/api/a", { method: "POST", json: { x: 1 } }), apiJson("/api/a", { signal: new AbortController().signal })]);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
  it("a failing shared request fails every waiter and is cleared", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 500 })).mockResolvedValue(okJson({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const results = await Promise.allSettled([apiJson("/api/y"), apiJson("/api/y")]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    await expect(apiJson("/api/y")).resolves.toEqual({ ok: true });
  });
});

describe("runLimited", () => {
  it("never has more than `limit` calls in flight and processes everything", async () => {
    let active = 0; let peak = 0; let done = 0;
    await runLimited(Array.from({ length: 12 }, (_, i) => i), 3, async () => { active++; peak = Math.max(peak, active); await new Promise((r) => setTimeout(r, 2)); active--; done++; });
    expect(peak).toBeLessThanOrEqual(3);
    expect(done).toBe(12);
  });
  it("keeps going when one call fails", async () => {
    const seen: number[] = [];
    await runLimited([1, 2, 3], 2, async (n) => { seen.push(n); if (n === 2) throw new Error("x"); });
    expect(seen.sort()).toEqual([1, 2, 3]);
  });
});
