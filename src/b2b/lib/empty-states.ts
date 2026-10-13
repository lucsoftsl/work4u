// Which role-aware empty state to show. Pure so the can()-based choice is testable.

export interface EmptyCaps { canCreateJob: boolean; canManageTeams: boolean }

export type EmptyVariant =
  | "create-first-job" | "ask-manager-jobs"
  | "set-up-teams" | "ask-manager-teams"
  | "filtered" | "page-overflow" | "day-empty-create" | "day-empty" | "all-assigned";

/** Derive capabilities from any can()-like function (OrgContext.can or permissions.can bound to a viewer). */
export const emptyCaps = (can: (permission: "job.create" | "team.manage") => boolean): EmptyCaps => ({
  canCreateJob: can("job.create"),
  canManageTeams: can("team.manage"),
});

export const noJobsVariant = (c: EmptyCaps): EmptyVariant => (c.canCreateJob ? "create-first-job" : "ask-manager-jobs");
export const noTeamsVariant = (c: EmptyCaps): EmptyVariant => (c.canManageTeams ? "set-up-teams" : "ask-manager-teams");
export const dayEmptyVariant = (c: EmptyCaps): EmptyVariant => (c.canCreateJob ? "day-empty-create" : "day-empty");

export function jobsListVariant(c: EmptyCaps, s: { filtered: boolean; page: number }): EmptyVariant {
  if (s.page > 1) return "page-overflow";
  return s.filtered ? "filtered" : noJobsVariant(c);
}
