"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { isB2bError } from "@/b2b/api/client";
import { getTimeline, listAttachments, qk } from "@/b2b/api/endpoints";

const retryUnlessClientError = (count: number, err: unknown) => !(isB2bError(err) && err.status >= 400 && err.status < 500) && !(isB2bError(err) && err.isMigrationPending) && count < 2;

/** Timeline pages, newest first; `before` = last id of the previous page. */
export function useTimeline(orgId: string, jobId: string) {
  return useInfiniteQuery({
    queryKey: qk.timeline(orgId, jobId),
    queryFn: ({ pageParam }) => getTimeline(orgId, jobId, pageParam),
    initialPageParam: undefined as string | number | undefined,
    getNextPageParam: (last) => (last.length >= 100 ? last[last.length - 1]?.id : undefined),
    retry: retryUnlessClientError,
  });
}

export function useAttachments(orgId: string, jobId: string) {
  const query = useQuery({
    queryKey: qk.attachments(orgId, jobId),
    queryFn: () => listAttachments(orgId, jobId),
    retry: retryUnlessClientError,
  });
  const migrationPending = isB2bError(query.error) && query.error.isMigrationPending;
  return { ...query, migrationPending };
}
