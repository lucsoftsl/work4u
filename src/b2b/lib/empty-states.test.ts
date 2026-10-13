import { describe, expect, it } from "vitest";
import { dayEmptyVariant, emptyCaps, jobsListVariant, noJobsVariant, noTeamsVariant } from "./empty-states";
import { can, type Viewer } from "./permissions";

const manager = { canCreateJob: true, canManageTeams: true };
const viewer = { canCreateJob: false, canManageTeams: false };

describe("empty-state variants", () => {
  it("offers creation only to those who can create jobs", () => {
    expect(noJobsVariant(manager)).toBe("create-first-job");
    expect(noJobsVariant(viewer)).toBe("ask-manager-jobs");
  });
  it("links to Teams only for team.manage", () => {
    expect(noTeamsVariant(manager)).toBe("set-up-teams");
    expect(noTeamsVariant(viewer)).toBe("ask-manager-teams");
  });
  it("day-empty follows job.create", () => {
    expect(dayEmptyVariant(manager)).toBe("day-empty-create");
    expect(dayEmptyVariant(viewer)).toBe("day-empty");
  });
  it("jobs list prefers page overflow, then filtered, then role variant", () => {
    expect(jobsListVariant(manager, { filtered: true, page: 3 })).toBe("page-overflow");
    expect(jobsListVariant(manager, { filtered: true, page: 1 })).toBe("filtered");
    expect(jobsListVariant(viewer, { filtered: false, page: 1 })).toBe("ask-manager-jobs");
  });
  it("is driven by the real can() helper", () => {
    const mk = (permission: string): Viewer => ({ grants: [{ permission, scope: "ALL" }], teamIds: [] });
    const capsFor = (v: Viewer) => emptyCaps((p) => can(v, p));
    expect(noJobsVariant(capsFor(mk("job.create")))).toBe("create-first-job");
    expect(noJobsVariant(capsFor(mk("job.view")))).toBe("ask-manager-jobs");
    expect(noTeamsVariant(capsFor(mk("team.manage")))).toBe("set-up-teams");
    expect(noTeamsVariant(capsFor(mk("team.view")))).toBe("ask-manager-teams");
  });
});
