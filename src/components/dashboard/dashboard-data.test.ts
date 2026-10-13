import { describe, expect, it } from "vitest";
import type { Job, MyApplication } from "@/api/types";
import { activeJobs, buildChecklist, hiringAttention, workingAttention } from "./dashboard-data";

const job = (over: Partial<Job>): Job => ({ id: "j1", title: "Fix tap", budget: 50, budgetCurrency: "EUR", budgetType: "FIXED", applicants: 0, lifecycleStatus: "OPEN", workStage: "HIRED", ...over }) as Job;
const application = (over: Partial<MyApplication["job"]>, status: MyApplication["status"] = "ACCEPTED"): MyApplication =>
  ({ id: "a1", jobId: "j1", status, job: { id: "j1", title: "Paint", budget: 10, budgetCurrency: "EUR", budgetType: "HOURLY", category: "x", lifecycleStatus: "IN_PROGRESS", ...over } }) as MyApplication;

describe("dashboard data", () => {
  it("lists review-and-pay before new applicants and ignores quiet jobs", () => {
    const items = hiringAttention([
      job({ id: "a", applicants: 2 }),
      job({ id: "b", lifecycleStatus: "IN_PROGRESS", workStage: "AWAITING_REVIEW" }),
      job({ id: "c" }),
    ]);
    expect(items.map((i) => [i.jobId, i.kind])).toEqual([["b", "review"], ["a", "applicants"]]);
    expect(items[1].count).toBe(2);
  });

  it("flags only accepted applications on running jobs for workers", () => {
    expect(workingAttention([application({}), application({}, "PENDING"), application({ lifecycleStatus: "COMPLETED" })])).toHaveLength(1);
  });

  it("keeps only open and in-progress jobs as active", () => {
    expect(activeJobs([job({}), job({ lifecycleStatus: "CANCELLED" }), job({ lifecycleStatus: "IN_PROGRESS" })])).toHaveLength(2);
  });

  it("omits the data-backed step when activity is unknown", () => {
    const base = { view: "hiring" as const, emailVerified: true, phoneVerified: false, onboardingCompleted: true };
    expect(buildChecklist(base)).toHaveLength(3);
    const withJobs = buildChecklist({ ...base, jobs: [job({})] });
    expect(withJobs[3]).toMatchObject({ key: "firstJob", done: true });
  });
});
