import type { JobStatus, TeamStatus } from "@/b2b/api/types";
import { JOB_STATUS_META, TEAM_STATUS_LABEL } from "./status";
import type { Translate } from "./plural";

// Status names for text, in the active language. The English words in status.ts are only the fallback: every status has a locale key
// (b2b.status.job.<STATUS> / b2b.status.team.<STATUS>), so a status inside a sentence, a pill, a filter or a toast is translated the same way.
// Sentences put the name in with a placeholder ("Move to {status}"), never by gluing words together, so each language can word them.

export const jobStatusKey = (s: string) => `b2b.status.job.${s}`;
export const teamStatusKey = (s: string) => `b2b.status.team.${s}`;

/** Translated job status name; an unknown value (a status newer than this build) is shown as received, readable. */
export function jobStatusLabel(t: Translate, status: JobStatus | string): string {
  const meta = JOB_STATUS_META[status as JobStatus];
  return meta ? t(jobStatusKey(status), meta.label) : status.toLowerCase().replace(/_/g, " ");
}

export function teamStatusLabel(t: Translate, status: TeamStatus | string): string {
  const label = TEAM_STATUS_LABEL[status as TeamStatus];
  return label ? t(teamStatusKey(status), label) : status.toLowerCase().replace(/_/g, " ");
}
