import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicArticle, getPublicJob, getPublicWorker, listPublicJobs } from "./public-api";

afterEach(() => vi.unstubAllGlobals());
const respond = (status: number, body: unknown = {}) => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));

describe("public API lookups when the API is down", () => {
  it("network failure and 5xx are 'unavailable' (a 503 page), 404 stays missing and 410 stays gone", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fetch failed: ECONNREFUSED")));
    for (const get of [getPublicJob, getPublicArticle, getPublicWorker]) expect(await get("x")).toEqual({ status: "unavailable" });
    for (const code of [500, 502, 503, 429]) { respond(code); expect(await getPublicJob("x")).toEqual({ status: "unavailable" }); }
    respond(404); expect(await getPublicJob("x")).toEqual({ status: "missing" });
    respond(410); expect(await getPublicJob("x")).toEqual({ status: "gone" });
    respond(200, { id: "1" }); expect(await getPublicJob("x")).toEqual({ status: "ok", data: { id: "1" } });
  });
  it("lists still throw (the page catches them and answers 503; the sitemap treats them as empty)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    await expect(listPublicJobs()).rejects.toThrow();
    respond(500);
    await expect(listPublicJobs()).rejects.toThrow();
  });
});
