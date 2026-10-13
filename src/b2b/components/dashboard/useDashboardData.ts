import { useMemo } from "react";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { listJobs, listTeams, qk } from "@/b2b/api/endpoints";
import type { Job } from "@/b2b/api/types";
import { readTotal, type JobListWithTotal } from "@/b2b/lib/paging";
import { TOTAL_BUCKET_FILTERS, TOTAL_BUCKET_KEYS, UNASSIGNED_STATUSES, type BucketKey } from "@/b2b/lib/dashboard";

export const PAGE_LIMIT = 100;
export const MAX_PAGES = 5;

export interface FetchedJobs { jobs: Job[]; capped: boolean; /** Server-side total when GET /jobs reports one. */ total?: number }

/** Pages through GET /jobs (no summary endpoint exists). `capped` = there may be more than we loaded. */
export async function fetchJobPages(orgId: string, extra: Parameters<typeof listJobs>[1], signal?: AbortSignal, maxPages: number = MAX_PAGES): Promise<FetchedJobs> {
  const jobs: Job[] = [];
  let total: number | undefined;
  for (let page = 0; page < maxPages; page++) {
    const res = await listJobs(orgId, { ...extra, limit: PAGE_LIMIT, offset: page * PAGE_LIMIT }, signal);
    jobs.push(...res.items);
    total = readTotal(res as JobListWithTotal) ?? total;
    const done = total !== undefined ? jobs.length >= total : res.items.length < PAGE_LIMIT;
    if (done || res.items.length === 0) return { jobs, capped: false, total };
  }
  return { jobs, capped: true, total };
}

export function useDashboardData(orgId: string, canViewTeams: boolean) {
  const all = useQuery({
    queryKey: qk.jobs(orgId, { view: "dashboard-all" }),
    queryFn: ({ signal }) => fetchJobPages(orgId, {}, signal),
    placeholderData: keepPreviousData,
  });
  const unassigned = useQuery({
    queryKey: qk.jobs(orgId, { view: "dashboard-unassigned" }),
    // Alerts only need the soonest ones; the exact count is the response's `total`.
    queryFn: ({ signal }) => fetchJobPages(orgId, { unassigned: true, status: UNASSIGNED_STATUSES, sort: "scheduledStart", dir: "asc" }, signal, 1),
    placeholderData: keepPreviousData,
  });
  // Status-only buckets: the count is `total` of a limit=1 query (no paging through jobs).
  const totalQueries = useQueries({
    queries: TOTAL_BUCKET_KEYS.map((key) => ({
      queryKey: qk.jobs(orgId, { view: "dashboard-total", key }),
      queryFn: async ({ signal }: { signal: AbortSignal }) => (await listJobs(orgId, { ...TOTAL_BUCKET_FILTERS[key], limit: 1 }, signal)).total,
      placeholderData: keepPreviousData,
    })),
  });
  const totalsSignature = totalQueries.map((q) => q.data ?? "").join("|");
  const totals = useMemo(() => {
    const out: Partial<Record<BucketKey, number | undefined>> = {};
    TOTAL_BUCKET_KEYS.forEach((key, i) => { out[key] = totalQueries[i]?.data; });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalsSignature]);
  const teams = useQuery({
    queryKey: qk.teams(orgId),
    queryFn: () => listTeams(orgId),
    enabled: canViewTeams,
    placeholderData: keepPreviousData,
  });
  return { all, unassigned, teams, totals };
}
