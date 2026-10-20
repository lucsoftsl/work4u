"use client";

import { useCallback, useId, useMemo, useRef, type KeyboardEvent } from "react";
import type { BreakdownItem, Figures, FinanceBy } from "@/b2b/api/finance";
import { barShare, sortBreakdown, type BreakdownSort, type SortDir } from "@/b2b/lib/finance";
import { formatPercent } from "@/b2b/lib/money";
import { useAmountFormat } from "./finance-currency";
import { usePersonName } from "@/b2b/lib/usePersonName";
import { useTr } from "@/b2b/setup/i18n";
import { btnClass, Skeleton } from "@/b2b/components/workspace/ui";
import { cn } from "@/lib/utils";
import { Blank, Signed } from "./Figures";
import { ScrollRegion } from "./ScrollRegion";

const TABS: readonly FinanceBy[] = ["client", "team", "jobType", "technician"];
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent";

interface Props {
  by: FinanceBy;
  items: readonly BreakdownItem[] | undefined;
  status: "pending" | "error" | "success";
  sort: BreakdownSort;
  dir: SortDir;
  stale?: boolean;
  /** Real totals over EVERY group (not just the loaded rows) and the number of groups. */
  totals?: Figures;
  total?: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onBy: (by: FinanceBy) => void;
  onSort: (sort: BreakdownSort) => void;
  onRetry: () => void;
}

const COLUMNS: ReadonlyArray<{ sort: BreakdownSort; key: string; fallback: string; numeric: boolean }> = [
  { sort: "name", key: "b2b.finance.col.name", fallback: "Name", numeric: false },
  { sort: "jobs", key: "b2b.finance.col.jobs", fallback: "Jobs", numeric: true },
  { sort: "revenue", key: "b2b.finance.col.revenue", fallback: "Revenue", numeric: true },
  { sort: "cost", key: "b2b.finance.col.cost", fallback: "Cost", numeric: true },
  { sort: "margin", key: "b2b.finance.col.margin", fallback: "Margin", numeric: true },
  { sort: "marginPct", key: "b2b.finance.col.marginPct", fallback: "Margin %", numeric: true },
];

function useRowLabel(by: FinanceBy) {
  const { tr } = useTr();
  const personName = usePersonName();
  return useCallback((i: BreakdownItem): string => {
    if (by === "technician") return i.key === null ? tr("b2b.finance.null.unassigned", "Unassigned") : personName(i.name);
    if (i.name) return i.name;
    if (by === "client") return tr("b2b.finance.null.client", "No client");
    if (by === "team") return tr("b2b.finance.null.team", "No team");
    return tr("b2b.finance.null.jobType", "No job type");
  }, [by, tr, personName]);
}

export function BreakdownTabs({ by, items, status, sort, dir, stale, totals, total, hasMore, loadingMore, onLoadMore, onBy, onSort, onRetry }: Props) {
  const { tr } = useTr();
  const uid = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabLabel: Record<FinanceBy, string> = {
    client: tr("b2b.finance.by.client", "By client"), team: tr("b2b.finance.by.team", "By team"),
    jobType: tr("b2b.finance.by.jobType", "By job type"), technician: tr("b2b.finance.by.technician", "By technician"),
  };

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const last = TABS.length - 1;
    const next = e.key === "ArrowRight" ? (index === last ? 0 : index + 1) : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault();
    onBy(TABS[next]);
    refs.current[next]?.focus();
  };

  return (
    <section className="space-y-3">
      <div role="tablist" aria-label={tr("b2b.finance.by.label", "Break down by")} className="flex flex-wrap gap-x-1 border-b border-ops-border">
        {TABS.map((t, i) => (
          <button
            key={t} ref={(el) => { refs.current[i] = el; }} type="button" role="tab" id={`${uid}-tab-${t}`} aria-selected={t === by} aria-controls={`${uid}-panel`}
            tabIndex={t === by ? 0 : -1} onClick={() => onBy(t)} onKeyDown={(e) => onKeyDown(e, i)}
            className={cn("-mb-px min-h-[44px] shrink-0 whitespace-nowrap border-b-4 px-4 text-sm font-bold", FOCUS, t === by ? "border-ops-accent text-ops-ink" : "border-transparent text-ops-ink-muted hover:text-ops-ink")}
          >
            {tabLabel[t]}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${by}`} className={cn("space-y-2", stale && "opacity-70")}>
        <PanelBody by={by} items={items} status={status} sort={sort} dir={dir} totals={totals} total={total} hasMore={hasMore} loadingMore={loadingMore} onLoadMore={onLoadMore} onSort={onSort} onRetry={onRetry} />
      </div>
    </section>
  );
}

function PanelBody({ by, items, status, sort, dir, totals, total, hasMore, loadingMore, onLoadMore, onSort, onRetry }: Pick<Props, "by" | "items" | "status" | "sort" | "dir" | "totals" | "total" | "hasMore" | "loadingMore" | "onLoadMore" | "onSort" | "onRetry">) {
  const { tr, locale } = useTr();
  const amount = useAmountFormat();
  const rowLabel = useRowLabel(by);
  const rows = useMemo(() => sortBreakdown((items ?? []).map((i) => ({ ...i, name: rowLabel(i) })), sort, dir, "", locale), [items, sort, dir, locale, rowLabel]);
  const dimension = { client: tr("b2b.finance.dim.client", "client"), team: tr("b2b.finance.dim.team", "team"), jobType: tr("b2b.finance.dim.jobType", "job type"), technician: tr("b2b.finance.dim.technician", "technician") }[by];
  const region = tr("b2b.finance.breakdown.label", "Breakdown by {dimension}", { dimension });

  if (status === "pending" && !items?.length) {
    return (
      <div role="status" aria-busy="true" className="space-y-2">
        <span className="sr-only">{tr("b2b.finance.loading", "Loading finance figures")}</span>
        {[0, 1, 2].map((n) => <Skeleton key={n} className="h-10 w-full" />)}
      </div>
    );
  }
  if (status === "error" && !items?.length) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded border-l-4 border-sig-vermilion-ink bg-sig-vermilion-tint p-3 text-sm text-sig-vermilion-ink">
        <p className="flex-1 font-bold">{tr("b2b.finance.error", "We couldn't load your finance figures.")}</p>
        <button type="button" onClick={onRetry} className={btnClass("secondary", "text-ops-ink")}>{tr("b2b.finance.tryAgain", "Try again")}</button>
      </div>
    );
  }
  if (rows.length === 0) return <p className="rounded border border-ops-border bg-ops-surface p-4 text-sm text-ops-ink-muted">{tr("b2b.finance.breakdown.empty", "Nothing to break down in this period.")}</p>;

  // People are not a leaderboard: no bars, and the table starts in name order (see defaultSort).
  const showBars = by !== "technician";
  const maxRevenue = Math.max(0, ...rows.map((r) => r.revenue));
  const splits = by === "team" || by === "technician";
  // Only when the API cut the list (total groups > rows loaded): "Showing n of total" and Load more. Otherwise everything is on screen.
  const truncated = typeof total === "number" && total > rows.length;
  return (
    <>
      <ScrollRegion label={tr("b2b.finance.table.regionLabel", "Table: {caption}", { caption: region })}>
        <table aria-label={region} className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-ops-border bg-ops-canvas">
              {COLUMNS.map((c) => (
                <th
                  key={c.sort} scope="col" aria-sort={c.sort === sort ? (dir === "asc" ? "ascending" : "descending") : undefined}
                  className={cn("p-0 text-xs font-bold uppercase tracking-wide text-ops-ink-muted", c.numeric ? "text-right" : "sticky left-0 bg-ops-canvas text-left")}
                >
                  <button type="button" onClick={() => onSort(c.sort)} className={cn("inline-flex min-h-[44px] items-center gap-1 px-3 font-bold uppercase tracking-wide", FOCUS)}>
                    {tr(c.key, c.fallback)}
                    {c.sort === sort && <span aria-hidden="true">{dir === "asc" ? "▲" : "▼"}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ops-border">
            {rows.map((r, i) => (
              <tr key={`${r.key ?? "none"}-${i}`}>
                <th scope="row" className="sticky left-0 max-w-[260px] bg-ops-surface px-3 py-2 text-left text-sm font-bold text-ops-ink [overflow-wrap:anywhere]">{r.name}</th>
                <td className="px-3 py-2 text-right text-sm [font-variant-numeric:tabular-nums]">{r.jobs}</td>
                <td className="px-3 py-2 text-right text-sm [font-variant-numeric:tabular-nums]">
                  {amount(r.revenue)}
                  {showBars && (
                    <span aria-hidden="true" data-bar className="mt-1 block h-1.5 rounded-sm bg-ops-border">
                      <span className="block h-full rounded-sm bg-ops-accent" style={{ width: `${Math.round(barShare(r.revenue, maxRevenue) * 100)}%` }} />
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-sm [font-variant-numeric:tabular-nums]">{amount(r.cost)}</td>
                <td className="px-3 py-2 text-right text-sm [font-variant-numeric:tabular-nums]"><Signed value={r.margin}>{r.margin === null ? null : amount(r.margin)}</Signed></td>
                <td className="px-3 py-2 text-right text-sm [font-variant-numeric:tabular-nums]">{r.marginPct === null ? <Blank /> : <Signed value={r.marginPct}>{formatPercent(r.marginPct, locale)}</Signed>}</td>
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot>
              <tr className="border-t-2 border-ops-ink bg-ops-canvas font-bold">
                <th scope="row" className="sticky left-0 bg-ops-canvas px-3 py-2 text-left text-sm text-ops-ink">{tr("b2b.finance.table.total", "Total")}</th>
                <td className="px-3 py-2 text-right text-sm [font-variant-numeric:tabular-nums]">{totals.jobs}</td>
                <td className="px-3 py-2 text-right text-sm [font-variant-numeric:tabular-nums]">{amount(totals.revenue)}</td>
                <td className="px-3 py-2 text-right text-sm [font-variant-numeric:tabular-nums]">{amount(totals.cost)}</td>
                <td className="px-3 py-2 text-right text-sm [font-variant-numeric:tabular-nums]"><Signed value={totals.margin}>{totals.margin === null ? null : amount(totals.margin)}</Signed></td>
                <td className="px-3 py-2 text-right text-sm [font-variant-numeric:tabular-nums]">{totals.marginPct === null ? <Blank /> : <Signed value={totals.marginPct}>{formatPercent(totals.marginPct, locale)}</Signed>}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </ScrollRegion>
      {splits && <p className="text-xs text-ops-ink-muted">{tr("b2b.finance.split.note", "Team and technician figures split a job's amounts equally between the people assigned.")}</p>}
      {truncated && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ops-ink-muted">
          <span>{tr("b2b.finance.jobs.showing", "Showing {n} of {total}", { n: rows.length, total })}</span>
          {hasMore && (
            <button type="button" onClick={onLoadMore} disabled={loadingMore} className={cn("inline-flex min-h-[44px] items-center font-bold text-ops-accent underline disabled:opacity-50", FOCUS)}>
              {loadingMore ? tr("b2b.finance.loadingMore", "Loading…") : tr("b2b.finance.loadMore", "Load more")}
            </button>
          )}
          <span>{tr("b2b.finance.breakdown.sortNote", "Sorting applies to the rows shown. The totals row covers all of them.")}</span>
        </p>
      )}
    </>
  );
}
