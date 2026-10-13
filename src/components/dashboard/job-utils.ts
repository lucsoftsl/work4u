import type { Job, JobLifecycleStatus } from "@/api/types";

/** An OPEN job whose visibility window has passed. */
export function isJobExpired(job: Pick<Job, "lifecycleStatus" | "expiresAt">, now: number = Date.now()): boolean {
  if (job.lifecycleStatus !== "OPEN" || !job.expiresAt) return false;
  return new Date(job.expiresAt).getTime() <= now;
}

/** Lifecycle value shown on a chip: expired open jobs read "Expired". */
export function displayLifecycle(job: Pick<Job, "lifecycleStatus" | "expiresAt">): JobLifecycleStatus {
  // StatusChip knows EXPIRED even though the API enum does not.
  return (isJobExpired(job) ? "EXPIRED" : job.lifecycleStatus) as JobLifecycleStatus;
}
