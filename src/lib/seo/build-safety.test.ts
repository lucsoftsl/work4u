import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLandingServer } from "./landing";

afterEach(() => vi.unstubAllGlobals());

describe("builds without the API", () => {
  it("the home page payload fails soft (null → static landing), it never throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fetch failed: ECONNREFUSED")));
    await expect(fetchLandingServer()).resolves.toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 503 })));
    await expect(fetchLandingServer()).resolves.toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ hero: {} }), { status: 200 })));
    await expect(fetchLandingServer()).resolves.toBeNull(); // invalid payload is also just "no data"
  });
  it("list pages are rendered per request, never prerendered at build, and their API fetches revalidate at runtime", async () => {
    for (const page of ["blog/page.tsx", "jobs/page.tsx", "workers/page.tsx"].map((p) => `(public)/[lang]/${p}`)) {
      expect(readFileSync(join(process.cwd(), "src/app", page), "utf8"), page).toMatch(/export const dynamic = "force-dynamic"/);
    }
    const calls: Array<{ next?: { revalidate?: number } }> = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: { next?: { revalidate?: number } }) => { calls.push(init); return new Response(JSON.stringify({ items: [], total: 0, limit: 1, offset: 0 }), { status: 200 }); }));
    const api = await import("./public-api");
    await api.listPublicJobs();
    await api.listPublicArticles();
    await api.listPublicWorkers();
    expect(calls.map((c) => c.next?.revalidate)).toEqual([300, 600, 60]);
  });
});
