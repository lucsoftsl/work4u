import { describe, expect, it } from "vitest";
import type { JobCardJob } from "@/components/JobCard";
import { mergeLiveExtras } from "./merge-live";

const job = (id: string, over: Partial<JobCardJob> = {}): JobCardJob => ({ id, title: `Job ${id}`, category: "x", budget: 1, budgetType: "FIXED", budgetCurrency: "EUR", location: "Y", remote: false, ...over });

describe("mergeLiveExtras (no layout shift when live data arrives)", () => {
  const seeds = [job("a"), job("b"), job("c")];
  it("keeps the same jobs in the same order and only adds applicants / poster", () => {
    const live = [job("c", { applicants: 3 }), job("a", { applicants: 5, createdBy: { userId: "u", name: "Ana", rating: 4, reviews: 2 } }), job("zzz", { applicants: 9 })];
    const out = mergeLiveExtras(seeds, live);
    expect(out.map((j) => j.id)).toEqual(["a", "b", "c"]);
    expect(out[0]).toMatchObject({ applicants: 5, createdBy: { name: "Ana" } });
    expect(out[1].applicants).toBeUndefined(); // not in the live list: untouched
    expect(out[2].applicants).toBe(3);
  });
  it("never adds, removes or reorders jobs, and never adds a 'boosted' chip (it would change the card height)", () => {
    const live = [job("a", { boosted: true, applicants: 1, title: "Changed title", location: "Elsewhere" })];
    const out = mergeLiveExtras(seeds, live);
    expect(out).toHaveLength(3);
    expect(out[0].boosted).toBeUndefined();
    expect(out[0].title).toBe("Job a");
    expect(out[0].location).toBe("Y");
  });
});
