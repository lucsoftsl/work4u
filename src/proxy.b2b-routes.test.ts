import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

// Guard: every real screen of the logged-in B2B app must get through the proxy. A section missing from the allow-list in
// lib/i18n-routing.ts is rewritten to the not-found page (this broke /ops/{org}/finance in the real build).

const APP = path.join(__dirname, "app", "(b2b)");
const req = (p: string) => new NextRequest(`http://localhost:3000${p}`, { headers: { "user-agent": "Mozilla/5.0" } });
const isNotFound = (p: string) => (proxy(req(p)).headers.get("x-middleware-rewrite") ?? "").includes("not-found-page");

/** Every page.tsx under `dir`, as a URL path: route groups "(x)" vanish, "[param]" gets a sample value, catch-alls are skipped. */
function pagePaths(dir: string, prefix: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && /^page\.(tsx|ts)$/.test(entry.name)) out.push(prefix || "/");
    if (!entry.isDirectory() || entry.name.startsWith("[...") || entry.name.startsWith("_") || entry.name === "api") continue;
    const seg = entry.name.startsWith("(") ? "" : entry.name.startsWith("[") ? "sample-1" : entry.name;
    out.push(...pagePaths(path.join(dir, entry.name), seg ? `${prefix}/${seg}` : prefix));
  }
  return out;
}

const opsPaths = pagePaths(path.join(APP, "ops"), "/ops").filter((p) => p.split("/").length >= 4); // /ops/{org}/{section}...
const techPaths = pagePaths(path.join(APP, "tech"), "/tech").filter((p) => p.split("/").length >= 4);

describe("the proxy lets every real /ops and /tech screen through", () => {
  it("finds the screens (so this guard cannot pass by finding nothing)", () => {
    expect(opsPaths).toEqual(expect.arrayContaining(["/ops/sample-1/finance", "/ops/sample-1/settings/job-types", "/ops/sample-1/jobs/new", "/ops/sample-1/jobs/sample-1", "/ops/sample-1/jobs"]));
    expect(techPaths.length).toBeGreaterThan(0);
  });
  it.each(opsPaths)("%s", (p) => { expect(isNotFound(p)).toBe(false); });
  it.each(techPaths)("%s", (p) => { expect(isNotFound(p)).toBe(false); });
  it("also with the query strings the app links to (drafts, finance filters)", () => {
    for (const p of ["/ops/o1/jobs?status=DRAFT&mine=true", "/ops/o1/finance?view=table&by=technician&missing=any", "/ops/o1/finance/"]) expect(isNotFound(p)).toBe(false);
  });
  it("still sends a section that does not exist to the 404 page", () => {
    for (const p of ["/ops/o1/zzz", "/ops/o1/financ", "/tech/o1/zzz"]) expect(isNotFound(p)).toBe(true);
  });
});
