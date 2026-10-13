import type { Job, MyApplication, WorkerListing } from "@/api/types";
import { isApplicationActive } from "@/components/dashboard/application-state";

export type AttentionKind = "applicants" | "review" | "continue";

export interface AttentionItem {
  key: string;
  kind: AttentionKind;
  jobId: string;
  title: string;
  budget: number;
  currency: string;
  hourly: boolean;
  /** Number of new applicants (kind "applicants"). */
  count: number;
  href: string;
}

/** Jobs the poster has to act on: new applicants, or work finished and awaiting review and payment. */
export function hiringAttention(jobs: readonly Job[]): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const job of jobs) {
    const base = {
      jobId: job.id,
      title: job.title,
      budget: job.budget,
      currency: job.budgetCurrency,
      hourly: job.budgetType === "HOURLY",
    };
    if (job.lifecycleStatus === "IN_PROGRESS" && job.workStage === "AWAITING_REVIEW") {
      items.push({ ...base, key: `review-${job.id}`, kind: "review", count: 0, href: `/jobs/${job.id}` });
    } else if (job.lifecycleStatus === "OPEN" && job.applicants > 0) {
      items.push({ ...base, key: `applicants-${job.id}`, kind: "applicants", count: job.applicants, href: `/my-jobs/${job.id}/applicants` });
    }
  }
  // Review & pay first: money is waiting on the poster.
  return items.sort((a, b) => Number(b.kind === "review") - Number(a.kind === "review"));
}

/** Jobs the worker was hired for and that are still running. */
export function workingAttention(applications: readonly MyApplication[]): AttentionItem[] {
  return applications
    .filter((a) => a.status === "ACCEPTED" && a.job.lifecycleStatus === "IN_PROGRESS")
    .map((a) => ({
      key: `continue-${a.id}`,
      kind: "continue" as const,
      jobId: a.jobId,
      title: a.job.title,
      budget: a.job.budget,
      currency: a.job.budgetCurrency,
      hourly: a.job.budgetType === "HOURLY",
      count: 0,
      href: `/jobs/${a.jobId}`,
    }));
}

export function activeJobs(jobs: readonly Job[]): Job[] {
  return jobs.filter((j) => j.lifecycleStatus === "OPEN" || j.lifecycleStatus === "IN_PROGRESS");
}

export function activeApplications(applications: readonly MyApplication[]): MyApplication[] {
  return applications.filter(isApplicationActive);
}

export interface ChecklistItem {
  key: "email" | "phone" | "onboarding" | "firstJob" | "firstService";
  done: boolean;
  href: string;
}

interface ChecklistInput {
  view: "hiring" | "working";
  emailVerified: boolean;
  phoneVerified: boolean;
  onboardingCompleted: boolean;
  /** Undefined while activity could not be loaded: the data-backed step is then omitted, not guessed. */
  jobs?: readonly Job[];
  listings?: readonly WorkerListing[];
}

export function buildChecklist(input: ChecklistInput): ChecklistItem[] {
  const items: ChecklistItem[] = [
    { key: "email", done: input.emailVerified, href: "/profile" },
    { key: "phone", done: input.phoneVerified, href: "/profile" },
    { key: "onboarding", done: input.onboardingCompleted, href: "/signup" },
  ];
  if (input.view === "hiring" && input.jobs) items.push({ key: "firstJob", done: input.jobs.length > 0, href: "/post-job" });
  if (input.view === "working" && input.listings) items.push({ key: "firstService", done: input.listings.length > 0, href: "/post-service" });
  return items;
}
