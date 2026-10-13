import type { MyApplication } from "@/api/types";

/** An application is "active" while it can still lead to work: undecided, or accepted on a job that is not finished. */
export function isApplicationActive(application: Pick<MyApplication, "status" | "job">): boolean {
  const jobLive = application.job.lifecycleStatus === "OPEN" || application.job.lifecycleStatus === "IN_PROGRESS";
  if (!jobLive) return false;
  return application.status !== "REJECTED" && application.status !== "WITHDRAWN";
}
