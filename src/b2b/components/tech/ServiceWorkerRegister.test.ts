import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { offlinePages } from "./ServiceWorkerRegister";

describe("offlinePages", () => {
  it("Today and Sync of the workspace being used, from any /tech screen (also a job page)", () => {
    expect(offlinePages("/tech/o1/jobs/j9")).toEqual(["/tech/o1/today", "/tech/o1/sync"]);
    expect(offlinePages("/tech/o1/today")).toEqual(["/tech/o1/today", "/tech/o1/sync"]);
    expect(offlinePages("/tech/org_2")).toEqual(["/tech/org_2/today", "/tech/org_2/sync"]);
  });
  it("nothing outside /tech", () => {
    expect(offlinePages("/dashboard")).toEqual([]);
    expect(offlinePages(null)).toEqual([]);
    expect(offlinePages("/tech")).toEqual([]);
  });
});

/** Runs public/tech-sw.js against fakes and returns its listeners. */
function loadWorker(fetchImpl: (u: string, init?: unknown) => Promise<Response>) {
  const stores = new Map<string, Map<string, Response>>();
  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name)!;
    return { put: async (k: string, v: Response) => void m.set(String(k), v), match: async (k: string) => m.get(String(k)) };
  };
  const listeners: Record<string, (e: unknown) => void> = {};
  const self = { location: { origin: "http://x" }, addEventListener: (t: string, f: (e: unknown) => void) => void (listeners[t] = f), skipWaiting: vi.fn(), clients: { claim: vi.fn() } };
  const caches = { open, keys: async () => [...stores.keys()], delete: async () => true, match: async () => undefined };
  new Function("self", "caches", "fetch", "URL", "Response", readFileSync(join(process.cwd(), "public/tech-sw.js"), "utf8"))(self, caches, fetchImpl, URL, Response);
  return { listeners, stores };
}
const html = (body: string) => new Response(body, { status: 200, headers: { "content-type": "text/html" } });

describe("service worker: cache-pages (cold offline Today after a job page)", () => {
  it("stores the HTML of Today and Sync and the build files they reference", async () => {
    const calls: string[] = [];
    const { listeners, stores } = loadWorker(async (u) => {
      calls.push(String(u));
      return String(u).startsWith("/_next/") ? new Response("js", { status: 200 }) : html('<script src="/_next/static/chunks/today-abc.js"></script><link href="/_next/static/css/a.css">');
    });
    let done: Promise<unknown> = Promise.resolve();
    listeners.message({ data: { type: "cache-pages", paths: ["/tech/o1/today", "/tech/o1/sync"] }, waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
    expect([...stores.get("tech-shell-v3")!.keys()].sort()).toEqual(["/tech/o1/sync", "/tech/o1/today"]);
    expect([...stores.get("tech-static-v3")!.keys()].sort()).toEqual(["/_next/static/chunks/today-abc.js", "/_next/static/css/a.css"]);
  });
  it("ignores any path outside the allowed screens and non-HTML or failed responses", async () => {
    const { listeners, stores } = loadWorker(async () => new Response("x", { status: 500 }));
    let done: Promise<unknown> = Promise.resolve();
    listeners.message({ data: { type: "cache-pages", paths: ["/dashboard", "/tech/o1/jobs/j1", "https://evil.test/tech/o1/today", "/tech/o1/today"] }, waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
    expect(stores.get("tech-shell-v3")?.size ?? 0).toBe(0);
  });
});
