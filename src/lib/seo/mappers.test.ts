import { describe, expect, it } from "vitest";
import { toJobCard, toJobSeed } from "./mappers";
import type { PublicJob } from "./public-api";

const pj: PublicJob = { id: "9", slug: "fix-tap", canonicalPath: "fix-tap-9", title: "Fix a tap", category: "plumbing", summary: "Short", description: "Long text",
  budget: 40, budgetType: "FIXED", budgetCurrency: "EUR", location: "Budapest", remote: false, employerName: "Ana", postedByCompany: false, jobPostingEligible: false,
  validThrough: null, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-02T00:00:00Z", contentLanguage: null };

describe("public job mappers", () => {
  it("list card links by canonical path and claims nothing about applicants or poster ratings", () => {
    const c = toJobCard(pj);
    expect(c.canonicalPath).toBe("fix-tap-9");
    expect(c.applicants).toBeUndefined();
    expect(c.createdBy).toBeUndefined();
  });
  it("detail seed is flagged, uses the full description, and never invents an owner", () => {
    const s = toJobSeed(pj);
    expect(s.isSeed).toBe(true);
    expect(s.description).toBe("Long text");
    expect(s.createdByUserId).toBe("");
    expect(s.lifecycleStatus).toBe("OPEN");
  });
  it("falls back to the summary when the description is absent (list item)", () => {
    expect(toJobSeed({ ...pj, description: undefined }).description).toBe("Short");
  });
});
