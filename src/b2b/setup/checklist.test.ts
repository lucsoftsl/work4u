import { describe, expect, it } from "vitest";
import type { SetupProgress } from "./api";
import { checklistItems, doneSummary, parseWizardStep, requiredCounts, resumeStep } from "./checklist";

const progress = (done: Record<string, boolean>): SetupProgress => ({
  steps: [
    { key: "profile", required: true, done: !!done.profile }, { key: "team", required: true, done: !!done.team },
    { key: "employees", required: true, done: !!done.employees }, { key: "invites", required: false, done: !!done.invites },
    { key: "clients", required: true, done: !!done.clients }, { key: "first_job", required: false, done: !!done.first_job },
  ],
  completed: false, percent: 0,
});

describe("setup checklist", () => {
  it("lists the API's six steps in the designed order with their destinations", () => {
    const items = checklistItems(progress({}));
    expect(items.map((i) => i.key)).toEqual(["profile", "team", "employees", "invites", "clients", "first_job"]);
    expect(items.find((i) => i.key === "clients")?.to).toBe("customers");
    expect(items.find((i) => i.key === "profile")?.to).toBe("settings/profile");
    expect(items.filter((i) => !i.required).map((i) => i.key)).toEqual(["invites", "first_job"]);
  });
  it("the first job waits for the first client ('After step 4')", () => {
    expect(checklistItems(progress({})).find((i) => i.key === "first_job")?.waiting).toBe(true);
    expect(checklistItems(progress({ clients: true })).find((i) => i.key === "first_job")?.waiting).toBe(false);
  });
  it("counts required steps only", () => {
    expect(requiredCounts(progress({ profile: true, invites: true }))).toEqual({ done: 1, total: 4 });
  });
  it("ignores steps from a newer API and tolerates missing ones", () => {
    const p = progress({}); p.steps.push({ key: "future" as never, required: true, done: false });
    expect(checklistItems(p)).toHaveLength(6);
    expect(checklistItems({ steps: [], completed: true, percent: 100 })).toEqual([]);
  });
  it("resumes at the first unfinished wizard step", () => {
    expect(resumeStep(progress({}))).toBe("employees");
    expect(resumeStep(progress({ employees: true }))).toBe("clients");
    expect(resumeStep(progress({ employees: true, clients: true }))).toBe("done");
    expect(resumeStep(undefined)).toBe("done");
  });
  it("parses ?step= and summarises what is set up and what is open", () => {
    expect(parseWizardStep("clients")).toBe("clients");
    expect(parseWizardStep("zzz")).toBeNull();
    const s = doneSummary(progress({ profile: true, employees: true }));
    expect(s.ready.map((x) => x.key)).toEqual(["profile", "employees"]);
    expect(s.open.map((x) => x.key)).toEqual(["team", "clients"]);
  });
});
