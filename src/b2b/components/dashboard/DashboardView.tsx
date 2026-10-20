"use client";

import { useMemo } from "react";
import { TriangleAlert } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useOrg } from "@/b2b/context/OrgContext";
import { alerts as deriveAlerts, bucketCounts, mergeBucketTotals, type BucketKey } from "@/b2b/lib/dashboard";
import { RoleEmptyState } from "@/b2b/components/RoleEmptyState";
import { emptyCaps, noJobsVariant, noTeamsVariant } from "@/b2b/lib/empty-states";
import { AlertsPanel } from "./AlertsPanel";
import { BucketCards } from "./BucketCards";
import { LiveIndicator } from "./LiveIndicator";
import { TeamStrip } from "./TeamStrip";
import { TOTAL_BUCKET_KEYS } from "@/b2b/lib/dashboard";
import { useDashboardData, MAX_PAGES, PAGE_LIMIT } from "./useDashboardData";
import { useNow } from "./useNow";
import { SetupChecklist } from "@/b2b/setup/SetupChecklist";
import { plural } from "@/b2b/lib/plural";

const EMPTY: ReadonlySet<BucketKey> = new Set();
const ALL_KEYS: BucketKey[] = ["live", "scheduledToday", "upcoming", "delayed", "waitingParts", "review", "blocked", "completedToday", "cancelled"];

export function DashboardView() {
  const { t, locale } = useTranslation();
  const org = useOrg();
  const tz = org.me?.org.timezone ?? "UTC";
  const nowMs = useNow();
  const now = useMemo(() => new Date(nowMs), [nowMs]);
  const { all, unassigned, teams, totals } = useDashboardData(org.orgId, org.can("team.view"));

  const caps = emptyCaps(org.can);
  const jobs = all.data?.jobs;
  const counts = useMemo(
    () => (jobs ? mergeBucketTotals(bucketCounts(jobs, now, tz, { unassignedCount: unassigned.data?.total ?? unassigned.data?.jobs.length ?? 0 }), totals) : null),
    [jobs, now, tz, unassigned.data, totals]
  );
  const alertList = useMemo(() => (jobs ? deriveAlerts(jobs, now, tz, unassigned.data?.jobs ?? []) : null), [jobs, now, tz, unassigned.data]);

  const capped = all.data?.capped ?? false;
  const cappedKeys = useMemo<ReadonlySet<BucketKey>>(() => {
    const s = new Set<BucketKey>(capped ? ALL_KEYS : EMPTY);
    for (const key of TOTAL_BUCKET_KEYS) if (typeof totals[key] === "number") s.delete(key); // exact server total
    return s;
  }, [capped, totals]);

  const failed = all.isError && !all.data;
  const updatedAt = Math.max(all.dataUpdatedAt, unassigned.dataUpdatedAt);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold text-ops-ink">{t("b2b.dashboard.title", "Operations dashboard")}</h1>
        <LiveIndicator live={org.live} updatedAt={updatedAt} nowMs={nowMs} fetching={all.isFetching || unassigned.isFetching} />
      </div>

      <SetupChecklist />

      {failed ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-sig-vermilion-ink bg-ops-surface p-4">
          <TriangleAlert className="h-5 w-5 text-sig-vermilion-ink" aria-hidden="true" />
          <p className="flex-1 text-sm text-ops-ink">{t("b2b.dashboard.error", "The dashboard could not be loaded. Your jobs are unaffected.")}</p>
          <button type="button" onClick={() => { void all.refetch(); void unassigned.refetch(); }} className="min-h-[44px] rounded bg-ops-ink px-4 text-sm font-bold text-white">
            {t("b2b.common.retry", "Retry")}
          </button>
        </div>
      ) : (
        <>
          {all.isError && (
            <p role="status" className="text-xs text-ops-ink-muted">{t("b2b.dashboard.stale", "Showing the last loaded data; refresh failed.")}</p>
          )}
          {jobs && jobs.length === 0 && !capped && <RoleEmptyState variant={noJobsVariant(caps)} orgId={org.orgId} />}
          {/* Attention first: critical alerts must not sit below four rows of tiles (OPS-M1). */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <AlertsPanel orgId={org.orgId} tz={tz} alerts={alertList} canDispatch={org.can("dispatch.view")} />
            {org.can("team.view") && teams.data && teams.data.length === 0 ? (
              <RoleEmptyState variant={noTeamsVariant(caps)} orgId={org.orgId} />
            ) : org.can("team.view") && (
              <TeamStrip teams={teams.data} loading={teams.isPending} failed={teams.isError && !teams.data} onRetry={() => void teams.refetch()} />
            )}
          </div>
          <BucketCards orgId={org.orgId} counts={counts} cappedKeys={cappedKeys} now={now} tz={tz} canReview={org.can("job.close")} />
          {capped && (
            <p className="text-xs text-ops-ink-muted">
              {plural(t, locale, "b2b.dashboard.capped", { one: "Counts are based on the first {n} job; there are more, so totals may be higher.", other: "Counts are based on the first {n} jobs; there are more, so totals may be higher." }, MAX_PAGES * PAGE_LIMIT)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
