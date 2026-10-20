import type { JobStatus } from "@/b2b/api/types";
import { can, type PermissionKey, type Relation, type Viewer } from "./permissions";

// Mirrors the API state machine (src/b2b/lib/stateMachine.ts, impl-log-backend §3) so the UI offers only
// moves the server would accept. The server stays the authority: it answers 409 INVALID_TRANSITION otherwise.

export const GRAPH: Record<JobStatus, readonly JobStatus[]> = {
  // DRAFT -> NEW only through POST /promote (never /transitions); a draft is discarded with DRAFT -> CANCELLED.
  DRAFT: ["CANCELLED"],
  NEW: ["PLANNING", "CANCELLED"],
  PLANNING: ["WAITING_FOR_PARTS", "READY_TO_SCHEDULE", "CANCELLED"],
  WAITING_FOR_PARTS: ["READY_TO_SCHEDULE", "CANCELLED"],
  READY_TO_SCHEDULE: ["SCHEDULED", "PLANNING", "CANCELLED"],
  SCHEDULED: ["DISPATCHED", "READY_TO_SCHEDULE", "CANCELLED"],
  DISPATCHED: ["EN_ROUTE", "SCHEDULED", "CANCELLED"],
  EN_ROUTE: ["ON_SITE", "BLOCKED", "CANCELLED"],
  ON_SITE: ["IN_PROGRESS", "BLOCKED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "BLOCKED", "CANCELLED"],
  BLOCKED: ["PLANNING", "CANCELLED"], // plus "resume": back to blockedFromStatus (see allowedTransitions)
  COMPLETED: ["REVIEW", "CLOSED"],
  REVIEW: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
  CANCELLED: [],
};

const FIELD_MOVES: ReadonlySet<JobStatus> = new Set(["EN_ROUTE", "ON_SITE", "IN_PROGRESS", "BLOCKED"]);

/** Permission the target status needs (impl-log-backend §3 "Permissions"). */
export function permissionForTransition(from: JobStatus, to: JobStatus): PermissionKey {
  if (to === "CANCELLED") return "job.cancel";
  if (to === "COMPLETED") return "job.complete";
  if (to === "CLOSED" || to === "REVIEW" || (from === "REVIEW" && to === "IN_PROGRESS")) return "job.close";
  if (FIELD_MOVES.has(to) || (from === "BLOCKED" && !["PLANNING", "CANCELLED"].includes(to))) return "job.execute";
  return "job.transition";
}

export const REASON_REQUIRED_TARGETS: ReadonlySet<JobStatus> = new Set(["BLOCKED", "CANCELLED"]);

export interface TransitionOption {
  to: JobStatus;
  permission: PermissionKey;
  /** The API requires a reason for this move (BLOCKED, CANCELLED, REVIEW → IN_PROGRESS). */
  needsReason: boolean;
  /** Moves backwards in the flow; shown as secondary. */
  isBackStep: boolean;
}

const BACK_STEPS: ReadonlyArray<readonly [JobStatus, JobStatus]> = [
  ["READY_TO_SCHEDULE", "PLANNING"], ["SCHEDULED", "READY_TO_SCHEDULE"], ["DISPATCHED", "SCHEDULED"], ["BLOCKED", "PLANNING"], ["REVIEW", "IN_PROGRESS"],
];

export interface JobForTransitions {
  status: JobStatus;
  blockedFromStatus?: JobStatus | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  assignmentCount?: number;
  requirements?: { review?: boolean };
  assignedToMe?: boolean;
  teamIds?: string[];
}

/**
 * Transitions the current viewer can offer for a job: graph-allowed AND permitted, with the client-side
 * guards the API enforces (SCHEDULED needs a window + an assignee, DISPATCHED needs an assignee, COMPLETED →
 * REVIEW only when the job requires review, otherwise → CLOSED).
 */
export function allowedTransitions(job: JobForTransitions, viewer: Viewer): TransitionOption[] {
  const relation: Relation = { assignedToMe: job.assignedToMe, teamIds: job.teamIds };
  const targets = new Set<JobStatus>(GRAPH[job.status]);
  if (job.status === "BLOCKED" && job.blockedFromStatus) targets.add(job.blockedFromStatus); // resume

  const out: TransitionOption[] = [];
  for (const to of targets) {
    if (job.status === "COMPLETED") {
      const needsReview = !!job.requirements?.review;
      if (to === "REVIEW" && !needsReview) continue;
      if (to === "CLOSED" && needsReview) continue;
    }
    if (to === "SCHEDULED" && (!job.scheduledStart || !job.scheduledEnd || !(job.assignmentCount ?? 0))) continue;
    if (to === "DISPATCHED" && !(job.assignmentCount ?? 0)) continue;
    const permission = permissionForTransition(job.status, to);
    if (!can(viewer, permission, relation)) continue;
    out.push({
      to,
      permission,
      needsReason: REASON_REQUIRED_TARGETS.has(to) || (job.status === "REVIEW" && to === "IN_PROGRESS"),
      isBackStep: BACK_STEPS.some(([f, t]) => f === job.status && t === to),
    });
  }
  // forward moves first, back-steps and cancel last
  const rank = (o: TransitionOption) => (o.to === "CANCELLED" ? 2 : o.isBackStep ? 1 : 0);
  return out.sort((a, b) => rank(a) - rank(b));
}

/** Why a move is not offered (for a disabled state or tooltip), e.g. "SCHEDULED needs a time window and an assignee". */
export function blockedReason(job: JobForTransitions, to: JobStatus, t: (key: string, fallback: string) => string = (_k, f) => f): string | null {
  if (!GRAPH[job.status].includes(to) && !(job.status === "BLOCKED" && job.blockedFromStatus === to)) return null;
  if (to === "SCHEDULED" && (!job.scheduledStart || !job.scheduledEnd)) return t("b2b.job.block.window", "Set a time window first");
  if (to === "SCHEDULED" && !(job.assignmentCount ?? 0)) return t("b2b.job.block.assign", "Assign a team or technician first");
  if (to === "DISPATCHED" && !(job.assignmentCount ?? 0)) return t("b2b.job.block.assign", "Assign a team or technician first");
  return null;
}
