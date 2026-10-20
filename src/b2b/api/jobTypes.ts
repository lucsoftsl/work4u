import { b2b, orgPath } from "./client";

// Job types (ce3173a7). Base /api/b2b/orgs/:orgId. Everyone with job.view / job.create / jobType.manage may read; jobType.manage writes.
// `defaultPrice` only exists for viewers with finance.view. Empty-bodied POSTs send {} (an empty JSON body is a 400).

export interface JobType {
  id: string;
  name: string;
  position: number;
  defaultDurationMin: number | null;
  /** Minor units; the key is absent without finance.view. */
  defaultPrice?: number | null;
  archived: boolean;
  archivedAt?: string | null;
  jobCount: number;
}

export interface JobTypeInput { name?: string; defaultDurationMin?: number | null; defaultPrice?: number | null; /** Only with the first price while the company has no currency. */ currency?: string }

export const jtk = {
  all: (orgId: string) => ["org", orgId, "job-types"] as const,
  list: (orgId: string, includeArchived: boolean) => ["org", orgId, "job-types", includeArchived ? "all" : "active"] as const,
};

export const JOB_TYPES_MAX = 200;

export const listJobTypes = (orgId: string, includeArchived = false, signal?: AbortSignal) =>
  b2b<JobType[]>(orgPath(orgId, "/job-types"), { query: { includeArchived: includeArchived || undefined }, signal });
export const createJobType = (orgId: string, input: JobTypeInput & { name: string }) =>
  b2b<JobType>(orgPath(orgId, "/job-types"), { method: "POST", json: input });
export const updateJobType = (orgId: string, id: string, patch: JobTypeInput) =>
  b2b<JobType>(orgPath(orgId, `/job-types/${id}`), { method: "PATCH", json: patch });
export const archiveJobType = (orgId: string, id: string) =>
  b2b<JobType>(orgPath(orgId, `/job-types/${id}/archive`), { method: "POST", json: {} });
export const unarchiveJobType = (orgId: string, id: string) =>
  b2b<JobType>(orgPath(orgId, `/job-types/${id}/unarchive`), { method: "POST", json: {} });
/** These first, in this order; every other type keeps its relative order after them. Returns the full list. */
export const reorderJobTypes = (orgId: string, ids: string[]) =>
  b2b<JobType[]>(orgPath(orgId, "/job-types/order"), { method: "PUT", json: { ids } });
