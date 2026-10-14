import { describe, expect, it } from "vitest";
import { canonicalRedirectPath } from "./canonical";

describe("canonicalRedirectPath", () => {
  it("is null for the canonical slug-id URL", () => {
    expect(canonicalRedirectPath("/jobs", "fix-tap-9", "fix-tap-9")).toBeNull();
  });
  it("redirects bare ids and stale slugs to the canonical path", () => {
    expect(canonicalRedirectPath("/jobs", "9", "fix-tap-9")).toBe("/jobs/fix-tap-9");
    expect(canonicalRedirectPath("/blog", "old-title-a1", "new-title-a1")).toBe("/blog/new-title-a1");
  });
  it("decodes percent-encoding before comparing and survives malformed input", () => {
    expect(canonicalRedirectPath("/workers", "ana%2Dw1", "ana-w1")).toBeNull();
    expect(canonicalRedirectPath("/workers", "%E0%A4%A", "ana-w1")).toBe("/workers/ana-w1");
  });
});
