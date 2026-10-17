import { describe, expect, it } from "vitest";
import { afterSignInTarget, b2bSignInPath, b2bSignUpPath, isB2bAppPath, safeB2bRedirect, B2B_PUBLIC_HOME } from "./b2b-paths";

const org = (id: string, landing = `/ops/${id}/dashboard`) => ({ id, name: id, landing });

describe("B2B redirect allow-list", () => {
  it("accepts only the B2B app: /ops/*, /tech/*, the invite page", () => {
    for (const ok of ["/ops", "/ops/o1/dashboard", "/ops/o1/jobs?q=ab", "/tech/o1/today", "/b2b/invite/abc_DEF-123"]) expect(safeB2bRedirect(ok), ok).toBe(ok);
    expect(safeB2bRedirect(encodeURIComponent("/ops/o1/jobs?x=1"))).toBe("/ops/o1/jobs?x=1");
  });
  it("refuses everything else: marketplace, other origins, protocol-relative, auth pages, look-alikes, junk", () => {
    for (const bad of ["/dashboard", "/jobs", "/admin", "/signin", "//evil.com/ops", "https://evil.com/ops", "/\\evil.com", "/ops/signin", "/ops/signin?redirect=/ops", "/ops/start", "/opsx", "/tech-sw.js", "/b2b/other", "javascript:alert(1)", "", null, undefined, "%E0%A4%A"]) {
      expect(safeB2bRedirect(bad as string), String(bad)).toBeNull();
    }
  });
});

describe("paths", () => {
  it("sign-in and start keep a safe redirect only", () => {
    expect(b2bSignInPath()).toBe("/ops/signin");
    expect(b2bSignInPath("/ops/o1/jobs")).toBe("/ops/signin?redirect=%2Fops%2Fo1%2Fjobs");
    expect(b2bSignInPath("/dashboard")).toBe("/ops/signin");
    expect(b2bSignUpPath("/b2b/invite/t1")).toBe("/ops/start?redirect=%2Fb2b%2Finvite%2Ft1");
    expect(b2bSignUpPath("//evil.com")).toBe("/ops/start");
    expect(B2B_PUBLIC_HOME).toBe("/field-service");
  });
  it("recognises the B2B app", () => {
    for (const p of ["/ops", "/ops/o1/dashboard", "/tech/o1/today", "/b2b/invite/x"]) expect(isB2bAppPath(p), p).toBe(true);
    for (const p of ["/", "/field-service", "/ro/field-service", "/opsx", "/dashboard"]) expect(isB2bAppPath(p), p).toBe(false);
  });
});

describe("where to go after B2B sign-in", () => {
  it("a safe ?redirect= wins (invite flow, deep link), even with several orgs", () => {
    expect(afterSignInTarget([org("a"), org("b")], "/b2b/invite/t1")).toBe("/b2b/invite/t1");
    expect(afterSignInTarget([org("a")], "/ops/a/jobs")).toBe("/ops/a/jobs");
  });
  it("an unsafe redirect is ignored", () => {
    expect(afterSignInTarget([org("a")], "/dashboard")).toBe("/ops/a/dashboard");
    expect(afterSignInTarget([org("a")], "//evil.com")).toBe("/ops/a/dashboard");
  });
  it("one org → its landing (technicians go to the field app, never /dashboard)", () => {
    expect(afterSignInTarget([org("a", "/tech/a/today")], null)).toBe("/tech/a/today");
    expect(afterSignInTarget([org("a")], undefined)).toBe("/ops/a/dashboard");
  });
  it("several orgs → the workspace chooser; none → the company wizard", () => {
    expect(afterSignInTarget([org("a"), org("b")], null)).toBe("/ops");
    expect(afterSignInTarget([], null)).toBe("/ops/start");
  });
  it("a landing from the API that is not a B2B path is distrusted", () => {
    expect(afterSignInTarget([{ id: "a", name: "a", landing: "https://evil.com" }], null)).toBe("/ops/a/dashboard");
    expect(afterSignInTarget([{ id: "a", name: "a", landing: "/dashboard" }], null)).toBe("/ops/a/dashboard");
  });
});
