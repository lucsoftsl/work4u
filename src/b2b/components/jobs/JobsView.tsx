"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Plus, TriangleAlert } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { listJobs, listTeams, qk } from "@/b2b/api/endpoints";
import { isB2bError } from "@/b2b/api/client";
import { useOrg } from "@/b2b/context/OrgContext";
import { useNow } from "@/b2b/components/dashboard/useNow";
import {
  PAGE_SIZE, activeFilterCount, nextSort, filterByPriority, clearFilters, parseJobFilters, serializeJobFilters, toApiFilters, withFilterChange, type JobListFilters, type JobSort,
} from "@/b2b/lib/job-filters";
import { RoleEmptyState } from "@/b2b/components/RoleEmptyState";
import { emptyCaps, jobsListVariant } from "@/b2b/lib/empty-states";
import { hasNextPage, readTotal, type JobListWithTotal } from "@/b2b/lib/paging";
import { JobFiltersBar } from "./JobFiltersBar";
import { JobsPager } from "./JobsPager";
import { JobsTable, JobsTableSkeleton } from "./JobsTable";

const ACTION = "min-h-[44px] rounded bg-ops-ink px-4 text-sm font-bold text-white";

export function JobsView() {
  const { t } = useTranslation();
  const org = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nowMs = useNow(15_000);
  const tz = org.me?.org.timezone ?? "UTC";

  const spString = searchParams.toString();
  const filters = useMemo(() => parseJobFilters(spString), [spString]);

  const replace = useCallback(
    (next: JobListFilters) => {
      const qs = serializeJobFilters(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );
  const change = useCallback((patch: Partial<JobListFilters>) => replace(withFilterChange(parseJobFilters(window.location.search), patch)), [replace]);
  const preset = useCallback((p: Pick<JobListFilters, "status" | "unassigned">) => change({ ...p }), [change]);
  const clear = useCallback(() => replace(clearFilters(parseJobFilters(window.location.search))), [replace]);

  const api = useMemo(() => toApiFilters(filters), [filters]);
  const jobs = useQuery({
    queryKey: qk.jobs(org.orgId, { view: "list", ...api }),
    queryFn: ({ signal }) => listJobs(org.orgId, api, signal),
    placeholderData: keepPreviousData,
  });
  const canTeams = org.can("team.view");
  const teams = useQuery({ queryKey: qk.teams(org.orgId), queryFn: () => listTeams(org.orgId), enabled: canTeams });

  const onSort = (sort: JobSort) => change(nextSort(filters, sort));

  const items = jobs.data?.items;
  const total = readTotal(jobs.data as JobListWithTotal | undefined);
  // GET /jobs has no priority filter (only a priority sort), so the chips narrow the loaded page only.
  const shown = useMemo(() => (items ? filterByPriority(items, filters.priority) : undefined), [items, filters.priority]);
  const caps = emptyCaps(org.can);
  const filtered = activeFilterCount(filters) > 0;
  const errStatus = isB2bError(jobs.error) ? jobs.error.status : undefined;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ops-ink">{t("b2b.jobs.title", "Jobs")}</h1>
        {org.can("job.create") && (
          <Link href={`/ops/${encodeURIComponent(org.orgId)}/jobs/new`} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded bg-ops-ink px-4 text-sm font-bold text-white hover:bg-ops-chrome focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent">
            <Plus className="h-4 w-4" aria-hidden="true" />{t("b2b.jobs.new", "New job")}
          </Link>
        )}
      </div>
      <JobFiltersBar filters={filters} teams={canTeams ? teams.data : undefined} onChange={change} onPreset={preset} onClear={clear} />

      <div aria-live="polite" className={jobs.isFetching && items ? "opacity-80" : undefined}>
        {jobs.isPending ? (
          <JobsTableSkeleton />
        ) : jobs.isError && !items ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-sig-vermilion-ink bg-ops-surface p-4">
            <TriangleAlert className="h-5 w-5 text-sig-vermilion-ink" aria-hidden="true" />
            <p className="flex-1 text-sm text-ops-ink">
              {errStatus === 403 ? t("b2b.jobs.forbidden", "You don't have access to these jobs.") : t("b2b.jobs.error", "Jobs could not be loaded.")}
            </p>
            {errStatus !== 403 && (
              <button type="button" onClick={() => void jobs.refetch()} className="min-h-[44px] rounded bg-ops-ink px-4 text-sm font-bold text-white">{t("b2b.common.retry", "Retry")}</button>
            )}
          </div>
        ) : shown && shown.length === 0 ? (
          <RoleEmptyState
            variant={jobsListVariant(caps, { filtered, page: filters.page })}
            orgId={org.orgId}
            extra={
              filters.page > 1 ? <button type="button" onClick={() => change({ page: 1 })} className={ACTION}>{t("b2b.jobs.firstPage", "Back to first page")}</button>
              : filtered ? <button type="button" onClick={clear} className={ACTION}>{t("b2b.jobs.clear", "Clear all")}</button>
              : undefined
            }
          />
        ) : shown ? (
          <>
            {jobs.isError && <p role="status" className="mb-2 text-xs text-ops-ink-muted">{t("b2b.jobs.stale", "Showing the last loaded jobs; refresh failed.")}</p>}
            <JobsTable orgId={org.orgId} items={shown} tz={tz} sort={filters.sort} dir={filters.dir} nowMs={nowMs} onSort={onSort} />
          </>
        ) : null}
      </div>

      {items && (items.length > 0 || filters.page > 1) && (
        <JobsPager page={filters.page} pageSize={PAGE_SIZE} count={items.length} total={total} hasNext={jobs.data?.hasMore ?? hasNextPage(filters.page, PAGE_SIZE, items.length, total)} disabled={jobs.isFetching || jobs.isPlaceholderData} onPage={(p) => change({ page: p, cursor: p === filters.page + 1 ? jobs.data?.nextCursor ?? undefined : undefined })} />
      )}
    </div>
  );
}
