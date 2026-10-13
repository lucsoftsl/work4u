import { b2b, orgPath } from "./client";
import type { Job, Paged, SortDirection } from "./types";

export type AttachmentCounts = Record<"BEFORE" | "DURING" | "AFTER" | "CUSTOMER_PROVIDED" | "INTERNAL", number>;

export interface ReviewQueueItem extends Job {
  awaitingSince: string;
  inReview?: boolean;
  /** null while the attachments migration is pending (503). */
  attachmentCounts: AttachmentCounts | null;
}

export const reviewQueueKey = (orgId: string, dir?: SortDirection) =>
  (dir ? (["org", orgId, "review-queue", dir] as const) : (["org", orgId, "review-queue"] as const));

export type ReviewQueuePage = Paged<ReviewQueueItem> & { dir?: SortDirection };

/** `dir` sorts on awaiting-since: asc = oldest first (default), desc = newest first. */
export interface ReviewPaging { limit?: number; offset?: number; cursor?: string }
export const listReviewQueue = (orgId: string, dir: SortDirection = "asc", paging: ReviewPaging = {}, signal?: AbortSignal) =>
  b2b<ReviewQueuePage>(orgPath(orgId, "/jobs/review-queue"), { query: { dir, ...paging }, signal });
