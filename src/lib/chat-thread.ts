/**
 * Pure helpers for choosing which job thread of a chat conversation is open.
 *
 * A conversation with one user is split into job threads keyed by job id, plus a
 * "General" thread (NO_JOB_KEY) for messages without a job.
 */

export const NO_JOB_KEY = "nojob";

export interface JobThreadSummary {
  jobKey: string;
}

export interface PickJobKeyInput {
  /** Currently selected job key (null = nothing selected yet). */
  currentKey: string | null;
  /** Job threads for the selected user, most recent first. */
  jobs: readonly JobThreadSummary[];
  /** Whether the message history for the selected user has been fetched at least once. */
  historyLoaded: boolean;
  /** Job key requested explicitly by a deep link (?jobId=); always kept while selected. */
  explicitKey?: string | null;
}

/**
 * Decide which job thread to show.
 *
 * - An explicitly deep-linked job stays selected even if it has no messages yet.
 * - Before the history has loaded nothing is locked in (a placeholder "General" pick
 *   would hide the real threads once they arrive).
 * - Once loaded, a current key that still exists is kept; otherwise the most recent
 *   thread wins, or "General" for a conversation without any messages.
 */
export function pickJobKey({ currentKey, jobs, historyLoaded, explicitKey }: PickJobKeyInput): string | null {
  if (currentKey && explicitKey && currentKey === explicitKey) return currentKey;
  if (!historyLoaded) return currentKey;
  if (jobs.length === 0) return currentKey ?? NO_JOB_KEY;
  if (currentKey && jobs.some((job) => job.jobKey === currentKey)) return currentKey;
  return jobs[0].jobKey;
}

/** Job key of a raw chat message: its job id, a precomputed jobKey, or the General key. */
export function jobKeyOf(jobId: string | null | undefined, precomputedKey?: unknown): string {
  if (jobId) return String(jobId);
  if (typeof precomputedKey === "string" && precomputedKey) return precomputedKey;
  return NO_JOB_KEY;
}
