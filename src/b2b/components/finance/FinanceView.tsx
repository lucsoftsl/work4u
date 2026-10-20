"use client";

import { useCallback, useRef } from "react";
import { useOrg } from "@/b2b/context/OrgContext";
import { isB2bError } from "@/b2b/api/client";
import { dataGaps, defaultDir, defaultSort, financeEmptyKind, periodRange, rangeLabel, type BreakdownSort } from "@/b2b/lib/finance";
import { useOnlineStatus } from "@/b2b/setup/useOnlineStatus";
import { useTr } from "@/b2b/setup/i18n";
import type { FinanceBasis, FinanceBy, FinanceKind, FinanceMissing } from "@/b2b/api/finance";
import { BreakdownTabs } from "./BreakdownTabs";
import { ChartCard } from "./ChartCard";
import { DataGapHint } from "./DataGapHint";
import { ExportCsvButton } from "./ExportCsvButton";
import { FinanceFilters } from "./FinanceFilters";
import { FinanceJobsList } from "./FinanceJobsList";
import { FinanceCurrencyProvider } from "./finance-currency";
import { EmptyNoCurrency, EmptyNoPrice, EmptyNothing, FinanceDenied, FinanceError, FinanceSkeleton, OfflineBanner } from "./FinanceStates";
import { KpiTiles } from "./KpiTiles";
import { PeriodPicker } from "./PeriodPicker";
import { Segmented } from "./Segmented";
import { useFinanceQueries } from "./useFinanceQueries";
import { useFinanceState } from "./useFinanceState";

export function FinanceView() {
  const { tr, trn, locale } = useTr();
  const org = useOrg();
  const can = org.can;
  const online = useOnlineStatus();
  const allowed = org.can("finance.view");
  const { state, queryState, today, change } = useFinanceState(org.me?.org.timezone ?? "UTC");
  const { filters, summary, breakdown, jobs } = useFinanceQueries(org.orgId, queryState, allowed);

  const jobsHeading = useRef<HTMLHeadingElement>(null);
  // "Show them": the server filters the jobs list (and the CSV) to jobs missing a price or a cost.
  const showGaps = useCallback(() => {
    change({ missing: "any" });
    jobsHeading.current?.scrollIntoView?.({ block: "start" });
    jobsHeading.current?.focus();
  }, [change]);

  const onBy = (by: FinanceBy) => change({ by, ...defaultSort(by) });
  const onSort = (sort: BreakdownSort) => change(sort === state.sort ? { dir: state.dir === "asc" ? "desc" : "asc" } : { sort, dir: defaultDir(sort) });

  if (!allowed) return <FinanceDenied />;

  const sum = summary.data;
  const pages = jobs.data?.pages;
  const items = pages?.flatMap((p) => p.items) ?? [];
  const jobsTotal = pages?.[0]?.total;
  const empty = sum ? financeEmptyKind(sum) : null;
  const gaps = sum ? dataGaps(sum) : null;
  const lastMonth = periodRange("lastMonth", today);
  const refreshing = summary.isPlaceholderData || (summary.isFetching && !!sum);
  const status = (s: { isPending: boolean; isError: boolean }) => (s.isError ? "error" : s.isPending ? "pending" : "success");

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ops-ink">{tr("b2b.finance.title", "Finance")}</h1>
          <p className="text-sm text-ops-ink-muted">
            {rangeLabel(queryState.from, queryState.to, locale)}
            {sum && sum.currencyIsSet !== false && ` · ${tr("b2b.finance.amountsIn", "amounts in {currency}", { currency: sum.currency })}`}
            {refreshing && <span className="ml-2 text-xs">{tr("b2b.finance.updating", "Updating…")}</span>}
          </p>
        </div>
        <PeriodPicker from={state.from} to={state.to} today={today} onChange={change} />
      </header>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <FinanceFilters orgId={org.orgId} state={state} onChange={change} />
        <Segmented
          label={tr("b2b.finance.basis.label", "Count jobs")}
          value={state.basis}
          onChange={(basis: FinanceBasis) => change({ basis })}
          options={[{ value: "completed", label: tr("b2b.finance.basis.completed", "By completion date") }, { value: "scheduled", label: tr("b2b.finance.basis.scheduled", "By scheduled date") }]}
        />
      </div>

      <p aria-live="polite" className="sr-only">
        {jobsTotal !== undefined && !jobs.isPlaceholderData ? trn("b2b.finance.live", { one: "Showing {n} job", other: "Showing {n} jobs" }, jobsTotal) : ""}
      </p>

      {!sum ? (
        summary.isError ? (isB2bError(summary.error) && summary.error.status === 403 ? <FinanceDenied /> : <FinanceError onRetry={() => void summary.refetch()} />)
        : !online ? <OfflineBanner savedAt={null} locale={locale} />
        : <FinanceSkeleton />
      ) : (
        <div className={refreshing ? "space-y-4 opacity-80" : "space-y-4"}>
          {!online && <OfflineBanner savedAt={summary.dataUpdatedAt} locale={locale} />}
          {summary.isError && online && <FinanceError onRetry={() => void summary.refetch()} />}
          {sum.currencyIsSet === false ? <EmptyNoCurrency orgId={org.orgId} canChoose={can("org.manage")} /> : <FinanceCurrencyProvider value={sum.currency}>
          {gaps && <DataGapHint noPrice={gaps.noPrice} noCost={gaps.noCost} onShow={showGaps} />}
          {empty === "nothing" ? (
            <EmptyNothing canShowLastMonth={queryState.from !== lastMonth.from || queryState.to !== lastMonth.to} onLastMonth={() => change(lastMonth)} />
          ) : (
            <>
              <KpiTiles summary={sum} />
              {empty === "noPrice" ? <EmptyNoPrice orgId={org.orgId} jobs={sum.earned.jobs} /> : (
                <>
                  <ChartCard summary={sum} today={today} view={state.view} onView={(view) => change({ view })} />
                  <BreakdownTabs
                    by={state.by} items={breakdown.data?.pages.flatMap((p) => p.items)} totals={breakdown.data?.pages[0]?.totals} total={breakdown.data?.pages[0]?.total}
                    hasMore={breakdown.hasNextPage} loadingMore={breakdown.isFetchingNextPage} onLoadMore={() => void breakdown.fetchNextPage()}
                    status={status(breakdown)} sort={state.sort} dir={state.dir}
                    stale={breakdown.isPlaceholderData} onBy={onBy} onSort={onSort} onRetry={() => void breakdown.refetch()}
                  />
                </>
              )}
              <FinanceJobsList
                orgId={org.orgId} items={items} totals={pages?.[0]?.totals} total={jobsTotal ?? 0} status={status(jobs)}
                hasMore={jobs.hasNextPage} loadingMore={jobs.isFetchingNextPage} kind={state.kind} missing={state.missing} headingRef={jobsHeading}
                onKind={(kind: FinanceKind) => change({ kind })} onMissing={(missing: FinanceMissing | undefined) => change({ missing })} onLoadMore={() => void jobs.fetchNextPage()} onRetry={() => void jobs.refetch()}
                actions={<ExportCsvButton orgId={org.orgId} filters={{ ...filters, kind: state.kind, ...(state.missing ? { missing: state.missing } : {}) }} online={online} />}
              />
            </>
          )}
          </FinanceCurrencyProvider>}
        </div>
      )}
    </div>
  );
}
