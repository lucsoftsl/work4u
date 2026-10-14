import { describe, expect, it } from "vitest";
import { CORE_PATHS, SITEMAP_CHUNK, parseSitemapId, planSitemaps, toSitemapEntry } from "./sitemap-plan";
import { isPrivatePath } from "./private-routes";

describe("sitemap plan", () => {
  it("always has a core file and splits each kind into chunks", () => {
    expect(planSitemaps({ articles: 0, workers: 0, jobs: 0 })).toEqual(["core"]);
    expect(planSitemaps({ articles: 3, workers: 0, jobs: SITEMAP_CHUNK + 1 })).toEqual(["core", "articles-0", "jobs-0", "jobs-1"]);
    expect(planSitemaps({ articles: 0, workers: 7, jobs: 0 }, 5)).toEqual(["core", "workers-0", "workers-1"]);
  });
  it("parses ids and rejects garbage", () => {
    expect(parseSitemapId("jobs-12")).toEqual({ kind: "jobs", page: 12 });
    expect(parseSitemapId("core")).toEqual({ kind: "core", page: 0 });
    for (const bad of ["jobs", "jobs-x", "../etc", "users-0", ""]) expect(parseSitemapId(bad)).toBeNull();
  });
  it("uses the canonical slug path and a real lastmod only", () => {
    const e = toSitemapEntry("https://w4u.test", "jobs", { id: "9", slug: "fix-tap", canonicalPath: "fix-tap-9", updatedAt: "2026-10-01T10:00:00Z" });
    expect(e.url).toBe("https://w4u.test/jobs/fix-tap-9");
    expect(e.lastModified?.toISOString()).toBe("2026-10-01T10:00:00.000Z");
    expect("lastModified" in toSitemapEntry("https://w4u.test", "workers", { id: "1", slug: "a", canonicalPath: "a-1", updatedAt: "nope" })).toBe(false);
  });
  it("never lists a private path in the static entries", () => {
    for (const p of CORE_PATHS) expect(isPrivatePath(p.path), p.path).toBe(false);
  });
});
