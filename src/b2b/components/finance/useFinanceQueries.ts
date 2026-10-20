"use client";

import { useMemo } from "react";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fk, getFinanceBreakdown, getFinanceJobs, getFinanceSummary } from "@/b2b/api/finance";
import { isB2bError } from "@/b2b/api/client";
import { toApiFilters, type FinanceState } from "@/b2b/lib/finance";

export const JOBS_PAGE_SIZE = 50;
const MAX_ATTEMPTS = 2;

/** A 4xx will not get better by asking again; network and 5xx errors get a couple of tries. */
export const shouldRetry = (attempt: number, error: unknown): boolean =>
  !(isB2bError(error) && error.status >= 400 && error.status < 500) && attempt < MAX_ATTEMPTS;

export function useFinanceQueries(orgId: string, s: FinanceState, enabled: boolean) {
  const filters = useMemo(() => toApiFilters(s), [s]);
  const common = { enabled, retry: shouldRetry, placeholderData: keepPreviousData } as const;

  const summary = useQuery({ ...common, queryKey: fk.summary(orgId, filters), queryFn: ({ signal }) => getFinanceSummary(orgId, filters, signal) });
  // The API returns up to 500 groups per page with the true `totals`; "Load more" asks for the next page when it was truncated.
  const breakdown = useInfiniteQuery({
    ...common,
    queryKey: fk.breakdown(orgId, s.by, filters),
    queryFn: ({ pageParam, signal }) => getFinanceBreakdown(orgId, s.by, { ...filters, ...(pageParam ? { offset: pageParam } : {}) }, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore && last.nextOffset !== null ? last.nextOffset : undefined),
  });
  const jobs = useInfiniteQuery({
    ...common,
    queryKey: fk.jobs(orgId, { ...filters, kind: s.kind, missing: s.missing }),
    queryFn: ({ pageParam, signal }) => getFinanceJobs(orgId, { ...filters, kind: s.kind, ...(s.missing ? { missing: s.missing } : {}), limit: JOBS_PAGE_SIZE, offset: pageParam }, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore && last.nextOffset !== null ? last.nextOffset : undefined),
  });
  return { filters, summary, breakdown, jobs };
}
