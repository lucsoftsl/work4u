import type { JobStatus } from "@/b2b/api/types";
import { fmt, type Translate } from "./plural";
import { jobStatusLabel } from "./status-label";

// Wording of status moves. The status name goes into a template ("Move to {status}"), so each language words the sentence itself
// (Romanian and Spanish put the name in quotes: it may be a phrase like "În drum" / "En camino").

/** Button / menu text for moving a job to `to`. */
export function transitionVerb(t: Translate, to: JobStatus): string {
  if (to === "CANCELLED") return t("b2b.job.cancelJob", "Cancel job");
  if (to === "BLOCKED") return t("b2b.job.markBlocked", "Mark blocked");
  return fmt(t("b2b.job.moveTo", "Move to {status}"), { status: jobStatusLabel(t, to) });
}

/** Toast / screen-reader text after the move succeeded. */
export function transitionDone(t: Translate, reference: string, to: JobStatus): string {
  return fmt(t("b2b.job.nowStatus", "{ref} is now {status}"), { ref: reference, status: jobStatusLabel(t, to) });
}
