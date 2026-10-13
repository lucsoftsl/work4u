import type { Grant, Scope } from "@/b2b/api/types";

// Client-side mirror of the API's RBAC. This only decides what to SHOW: the API remains the enforcer
// (it returns 404 for what you cannot see and 403 for what you cannot do).

export type PermissionKey =
  | "job.view" | "job.create" | "job.update" | "job.assign" | "job.schedule" | "job.transition" | "job.execute"
  | "job.complete" | "job.close" | "job.cancel" | "dispatch.view" | "dispatch.override_conflict"
  | "team.view" | "team.manage" | "team.status" | "customer.view" | "customer.manage" | "member.view"
  | "member.manage" | "role.view" | "report.view" | "settings.manage" | (string & {});

/** How the viewer relates to a specific resource (a job). Omit for list-level checks ("can I use this at all?"). */
export interface Relation {
  /** The job is assigned to me directly or to a team I am on. */
  assignedToMe?: boolean;
  /** Teams the job is assigned to. */
  teamIds?: string[];
}

export interface Viewer {
  grants: readonly Grant[];
  /** My team ids (from /me). */
  teamIds: readonly string[];
}

function scopeOf(grants: readonly Grant[], permission: string): Scope | null {
  return grants.find((g) => g.permission === permission)?.scope ?? null;
}

/**
 * can(viewer, "job.assign", relation?):
 *  - no grant → false
 *  - ALL → true
 *  - TEAM → true for list-level checks, otherwise the job must be in one of my teams (or assigned to me)
 *  - ASSIGNED → true for list-level checks, otherwise the job must be assigned to me
 */
export function can(viewer: Viewer, permission: PermissionKey, relation?: Relation): boolean {
  const scope = scopeOf(viewer.grants, permission);
  if (!scope) return false;
  if (scope === "ALL" || !relation) return true;
  if (relation.assignedToMe) return true;
  if (scope === "TEAM") return (relation.teamIds ?? []).some((id) => viewer.teamIds.includes(id));
  return false;
}

export const canAny = (viewer: Viewer, permissions: readonly PermissionKey[]) => permissions.some((p) => can(viewer, p));

export type GuardState = "loading" | "not-member" | "error" | "forbidden" | "allowed";

/** Pure decision used by <RequirePermission>: the loading/membership/permission cases, in that order. */
export function guardDecision(input: { status: "loading" | "ready" | "not-member" | "error"; viewer?: Viewer; permission?: PermissionKey; anyOf?: readonly PermissionKey[] }): GuardState {
  if (input.status === "loading") return "loading";
  if (input.status === "error") return "error"; // a failed request (network, rate limit, 5xx) is not "no access"
  if (input.status === "not-member" || !input.viewer) return "not-member";
  if (input.permission && !can(input.viewer, input.permission)) return "forbidden";
  if (input.anyOf && !canAny(input.viewer, input.anyOf)) return "forbidden";
  return "allowed";
}
