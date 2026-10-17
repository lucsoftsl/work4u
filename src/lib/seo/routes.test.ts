import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRIVATE_HEADER_SOURCES, PRIVATE_JOB_SUBPAGES, PRIVATE_ROUTE_PREFIXES, PUBLIC_ROUTES, isPrivatePath } from "./private-routes";

describe("private route classification", () => {
  it("marks the signed-in app, admin, B2B apps, auth, invites and /test private", () => {
    for (const p of ["/dashboard", "/chat", "/admin", "/admin/users", "/ops/o1/jobs", "/tech/o1/today", "/signin", "/signup", "/b2b/invite/abc", "/test", "/my-jobs/1/applicants", "/business/dashboard", "/jobs/abc/edit", "/jobs/abc/nearby-pros", "/profile", "/notifications"]) {
      expect(isPrivatePath(p), p).toBe(true);
    }
  });
  it("keeps marketing, blog, job and worker pages public", () => {
    for (const p of ["/", "/pricing", "/how-it-works", "/contact", "/business", "/blog", "/blog/a-title-1", "/jobs", "/jobs/fix-a-tap-123", "/workers", "/workers/ana-9", "/privacy", "/terms"]) {
      expect(isPrivatePath(p), p).toBe(false);
    }
  });
  it("does not treat look-alike prefixes as private (/profiles, /chatty)", () => {
    expect(isPrivatePath("/profiles")).toBe(false);
    expect(isPrivatePath("/chatty")).toBe(false);
  });
  it("generates header sources for every private prefix and the private job subpages", () => {
    for (const p of PRIVATE_ROUTE_PREFIXES) expect(PRIVATE_HEADER_SOURCES).toContain(`${p}/:path*`);
    expect(PRIVATE_HEADER_SOURCES).toContain("/jobs/:id/edit");
  });
  const dirsOf = (dir: string) => readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory());

  it("every top-level folder in src/app is a route group or a classified route handler", () => {
    const appDir = join(process.cwd(), "src/app");
    const groups = new Set(["(app)", "(public)", "(b2b)", "(b2b-public)"]);
    const privateTop = new Set(PRIVATE_ROUTE_PREFIXES.map((p) => p.split("/")[1]));
    const unclassified = dirsOf(appDir).filter((f) => !groups.has(f) && !privateTop.has(f) && !(PUBLIC_ROUTES as readonly string[]).includes(f));
    expect(unclassified).toEqual([]);
  });

  it("(app) holds only private routes (plus the 404 catch-all and the private job sub-pages); (public)/[lang] only public ones", () => {
    const appDir = join(process.cwd(), "src/app");
    const privateTop = new Set([...PRIVATE_ROUTE_PREFIXES.map((p) => p.split("/")[1]), "jobs", "[...missing]"]);
    expect(dirsOf(join(appDir, "(app)")).filter((f) => !privateTop.has(f))).toEqual([]);
    // (app)/jobs may only contain [id]/{edit,nearby-pros}
    expect(dirsOf(join(appDir, "(app)", "jobs", "[id]")).sort()).toEqual([...PRIVATE_JOB_SUBPAGES].sort());
    const publicTop = new Set([...(PUBLIC_ROUTES as readonly string[]).filter((r) => r && r !== "api" && r !== "sitemap" && r !== "sitemap.xml"), "not-found-page", "service-unavailable"]);
    expect(dirsOf(join(appDir, "(public)", "[lang]")).filter((f) => !publicTop.has(f))).toEqual([]);
  });

  it("(b2b) holds exactly the logged-in B2B app and (b2b-public)/[lang] only the public B2B pages", () => {
    const appDir = join(process.cwd(), "src/app");
    expect(dirsOf(join(appDir, "(b2b)")).sort()).toEqual(["b2b", "ops", "tech"]);
    expect(dirsOf(join(appDir, "(b2b-public)", "[lang]")).sort()).toEqual(["field-service"]);
    // every B2B app prefix is private (noindex), and nothing of the marketplace sits in the B2B groups
    for (const p of ["/ops", "/ops/signin", "/ops/start", "/tech", "/b2b"]) expect(PRIVATE_ROUTE_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`)), p).toBe(true);
    expect(isPrivatePath("/field-service")).toBe(false);
    expect(isPrivatePath("/ops/signin")).toBe(true);
    expect(isPrivatePath("/ops/start")).toBe(true);
  });

  it("the public tree is only reachable under a launch language: [lang] is static (dynamicParams = false)", () => {
    const layout = readFileSync(join(process.cwd(), "src/app/(public)/[lang]/layout.tsx"), "utf8");
    expect(layout).toMatch(/dynamicParams\s*=\s*false/);
    expect(layout).toMatch(/generateStaticParams/);
  });

  // A loading.tsx wraps the page in <Suspense> and makes Next stream: the HTTP status (200) is committed before notFound() /
  // permanentRedirect() run, which produced soft 404s and redirects without a Location header. Status-deciding routes must
  // have no loading.tsx on their path to the root; their client islands show their own skeletons below the status decision.
  it("no loading.tsx anywhere above the routes that decide a status code (404 / 308)", () => {
    const appDir = join(process.cwd(), "src/app");
    const statusRoutes = ["(public)/[lang]", "(public)/[lang]/blog/[id]", "(public)/[lang]/jobs/[id]", "(public)/[lang]/workers/[id]", "(app)/test"];
    for (const route of statusRoutes) {
      const parts = route.split("/");
      for (let i = 0; i <= parts.length; i++) {
        const dir = join(appDir, ...parts.slice(0, i));
        expect(existsSync(join(dir, "loading.tsx")), `loading.tsx at ${parts.slice(0, i).join("/") || "app root"} (affects ${route})`).toBe(false);
      }
    }
  });
});
