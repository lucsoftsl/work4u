"use client";

import { useId, type Ref } from "react";
import Link from "next/link";
import type { Figures, FinanceJobItem, FinanceKind, FinanceMissing } from "@/b2b/api/finance";
import { useAmountFormat } from "./finance-currency";
import { useMediaQuery } from "@/b2b/lib/useMediaQuery";
import { useTr } from "@/b2b/setup/i18n";
import { btnClass, fieldClass, Skeleton } from "@/b2b/components/workspace/ui";
import { cn } from "@/lib/utils";
import { Blank, Signed } from "./Figures";
import { ScrollRegion } from "./ScrollRegion";

const KINDS: readonly FinanceKind[] = ["all", "earned", "pipeline"];
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent";
const NUM = "px-3 py-2 text-right text-sm [font-variant-numeric:tabular-nums]";

export interface JobsListProps {
  orgId: string;
  items: readonly FinanceJobItem[];
  totals: Figures | undefined;
  total: number;
  status: "pending" | "error" | "success";
  hasMore: boolean;
  loadingMore: boolean;
  kind: FinanceKind;
  missing: FinanceMissing | undefined;
  headingRef: Ref<HTMLHeadingElement>;
  actions: React.ReactNode;
  onKind: (k: FinanceKind) => void;
  onMissing: (m: FinanceMissing | undefined) => void;
  onLoadMore: () => void;
  onRetry: () => void;
}

/** "Counts as": text always, plus a solid green chip for earned and a dashed sky chip for expected, so colour is never the only cue. */
function CountsAs({ kind }: { kind: FinanceJobItem["kind"] }) {
  const { tr } = useTr();
  return kind === "EARNED"
    ? <span className="inline-block rounded border border-sig-green-ink bg-sig-green-tint px-1.5 py-0.5 text-xs font-bold text-sig-green-ink">{tr("b2b.finance.kind.earned", "Earned")}</span>
    : <span className="inline-block rounded border border-dashed border-sig-sky-ink bg-sig-sky-tint px-1.5 py-0.5 text-xs font-bold text-sig-sky-ink">{tr("b2b.finance.kind.pipeline", "Expected")}</span>;
}

function Amount({ value }: { value: number | null }) {
  const amount = useAmountFormat();
  return value === null ? <Blank /> : <>{amount(value)}</>;
}
function MarginAmount({ value }: { value: number | null }) {
  const amount = useAmountFormat();
  return <Signed value={value}>{value === null ? null : amount(value)}</Signed>;
}

function JobsTable({ orgId, items, totals }: { orgId: string; items: readonly FinanceJobItem[]; totals: Figures | undefined }) {
  const { tr } = useTr();
  const th = "px-3 py-2 text-xs font-bold uppercase tracking-wide text-ops-ink-muted";
  return (
    <ScrollRegion label={tr("b2b.finance.jobs.regionLabel", "Table: jobs in this period")} className="bg-transparent">
      <table aria-label={tr("b2b.finance.jobs.title", "Jobs in this period")} className="w-full border-collapse">
        <thead>
          <tr className="border-b border-ops-border bg-ops-canvas">
            <th scope="col" className={`${th} text-left`}>{tr("b2b.finance.col.job", "Job")}</th>
            <th scope="col" className={`${th} text-left`}>{tr("b2b.finance.col.title", "Title")}</th>
            <th scope="col" className={`${th} text-left`}>{tr("b2b.finance.col.client", "Client")}</th>
            <th scope="col" className={`${th} text-left`}>{tr("b2b.finance.col.type", "Type")}</th>
            <th scope="col" className={`${th} text-right`}>{tr("b2b.finance.col.price", "Price")}</th>
            <th scope="col" className={`${th} text-right`}>{tr("b2b.finance.col.cost", "Cost")}</th>
            <th scope="col" className={`${th} text-right`}>{tr("b2b.finance.col.margin", "Margin")}</th>
            <th scope="col" className={`${th} text-left`}>{tr("b2b.finance.col.countsAs", "Counts as")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ops-border">
          {items.map((j) => (
            <tr key={j.id}>
              <td className="px-3 py-2 text-sm font-bold"><Link href={`/ops/${encodeURIComponent(orgId)}/jobs/${encodeURIComponent(j.id)}`} className={cn("inline-flex min-h-[44px] items-center text-ops-accent underline", FOCUS)}>{j.reference}</Link></td>
              <td className="max-w-[260px] px-3 py-2 text-sm text-ops-ink [overflow-wrap:anywhere]">{j.title}</td>
              <td className="px-3 py-2 text-sm text-ops-ink">{j.customer?.name ?? tr("b2b.finance.null.client", "No client")}</td>
              <td className="px-3 py-2 text-sm text-ops-ink">{j.jobType?.name ?? tr("b2b.finance.null.jobType", "No job type")}</td>
              <td className={NUM}><Amount value={j.price} /></td>
              <td className={NUM}><Amount value={j.cost} /></td>
              <td className={NUM}><MarginAmount value={j.margin} /></td>
              <td className="px-3 py-2"><CountsAs kind={j.kind} /></td>
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot>
            <tr className="border-t-2 border-ops-ink bg-ops-canvas font-bold">
              <th scope="row" colSpan={4} className="px-3 py-2 text-left text-sm text-ops-ink">{tr("b2b.finance.table.total", "Total")}</th>
              <td className={NUM}><TotalCell value={totals.revenue} /></td>
              <td className={NUM}><TotalCell value={totals.cost} /></td>
              <td className={NUM}><MarginAmount value={totals.margin} /></td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </ScrollRegion>
  );
}

function TotalCell({ value }: { value: number }) {
  const amount = useAmountFormat();
  return <>{amount(value)}</>;
}

function JobCards({ orgId, items, totals }: { orgId: string; items: readonly FinanceJobItem[]; totals: Figures | undefined }) {
  const { tr } = useTr();
  const label = "text-xs text-ops-ink-muted";
  return (
    <ul className="list-none space-y-2 p-0">
      {items.map((j) => (
        <li key={j.id} className="rounded border border-ops-border bg-ops-surface p-3">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/ops/${encodeURIComponent(orgId)}/jobs/${encodeURIComponent(j.id)}`} className={cn("inline-flex min-h-[44px] items-center text-sm font-bold text-ops-accent underline", FOCUS)}>{j.reference}</Link>
            <CountsAs kind={j.kind} />
          </div>
          <p className="text-sm font-bold text-ops-ink [overflow-wrap:anywhere]">{j.title}</p>
          <p className={label}>{j.customer?.name ?? tr("b2b.finance.null.client", "No client")} · {j.jobType?.name ?? tr("b2b.finance.null.jobType", "No job type")}</p>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-sm [font-variant-numeric:tabular-nums]">
            <div><dt className={label}>{tr("b2b.finance.col.price", "Price")}</dt><dd><Amount value={j.price} /></dd></div>
            <div><dt className={label}>{tr("b2b.finance.col.cost", "Cost")}</dt><dd><Amount value={j.cost} /></dd></div>
            <div><dt className={label}>{tr("b2b.finance.col.margin", "Margin")}</dt><dd><MarginAmount value={j.margin} /></dd></div>
          </dl>
        </li>
      ))}
      {totals && (
        <li className="rounded border-2 border-ops-ink bg-ops-canvas p-3">
          <p className="text-xs font-bold text-ops-ink">{tr("b2b.finance.table.total", "Total")}</p>
          <dl className="mt-1 grid grid-cols-3 gap-2 text-sm font-bold [font-variant-numeric:tabular-nums]">
            <div><dt className={label}>{tr("b2b.finance.col.price", "Price")}</dt><dd><TotalCell value={totals.revenue} /></dd></div>
            <div><dt className={label}>{tr("b2b.finance.col.cost", "Cost")}</dt><dd><TotalCell value={totals.cost} /></dd></div>
            <div><dt className={label}>{tr("b2b.finance.col.margin", "Margin")}</dt><dd><MarginAmount value={totals.margin} /></dd></div>
          </dl>
        </li>
      )}
    </ul>
  );
}

export function FinanceJobsList({ headingRef, ...p }: JobsListProps) {
  const { tr } = useTr();
  const headingId = useId();
  const wide = useMediaQuery("(min-width: 900px)");
  const visible = p.items;
  const kindLabel: Record<FinanceKind, string> = {
    all: tr("b2b.finance.jobs.showAll", "All"), earned: tr("b2b.finance.kind.earned", "Earned"), pipeline: tr("b2b.finance.kind.pipeline", "Expected"),
  };
  return (
    <section aria-labelledby={headingId} className="space-y-3 rounded border border-ops-border bg-ops-surface p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-xs font-bold uppercase tracking-wider text-ops-ink focus:outline-none">{tr("b2b.finance.jobs.title", "Jobs in this period")}</h2>
        {p.actions}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-sm font-bold text-ops-ink">
          {tr("b2b.finance.jobs.show", "Show")}
          <select value={p.kind} onChange={(e) => p.onKind(e.target.value as FinanceKind)} className={cn(fieldClass, "min-h-[44px] w-auto")}>
            {KINDS.map((k) => <option key={k} value={k}>{kindLabel[k]}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-bold text-ops-ink">
          {tr("b2b.finance.jobs.missing", "Missing")}
          <select value={p.missing ?? ""} onChange={(e) => p.onMissing((e.target.value || undefined) as FinanceMissing | undefined)} className={cn(fieldClass, "min-h-[44px] w-auto")}>
            <option value="">{tr("b2b.finance.jobs.missing.none", "Nothing (all jobs)")}</option>
            <option value="price">{tr("b2b.finance.jobs.missing.price", "A price")}</option>
            <option value="cost">{tr("b2b.finance.jobs.missing.cost", "A cost")}</option>
            <option value="any">{tr("b2b.finance.jobs.missing.any", "A price or a cost")}</option>
          </select>
        </label>
      </div>
      {p.status === "pending" && p.items.length === 0 ? (
        <div role="status" aria-busy="true" className="space-y-2">
          <span className="sr-only">{tr("b2b.finance.loading", "Loading finance figures")}</span>
          {[0, 1, 2].map((n) => <Skeleton key={n} className="h-12 w-full" />)}
        </div>
      ) : p.status === "error" && p.items.length === 0 ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded border-l-4 border-sig-vermilion-ink bg-sig-vermilion-tint p-3 text-sm text-sig-vermilion-ink">
          <p className="flex-1 font-bold">{tr("b2b.finance.error", "We couldn't load your finance figures.")}</p>
          <button type="button" onClick={p.onRetry} className={btnClass("secondary", "text-ops-ink")}>{tr("b2b.finance.tryAgain", "Try again")}</button>
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded border border-ops-border bg-ops-surface p-4 text-sm text-ops-ink-muted">
          {p.missing ? tr("b2b.finance.jobs.missing.empty", "Every job in this period has a price and a cost.") : tr("b2b.finance.jobs.empty", "No jobs match these filters in this period.")}
        </p>
      ) : wide ? <JobsTable orgId={p.orgId} items={visible} totals={p.totals} /> : <JobCards orgId={p.orgId} items={visible} totals={p.totals} />}
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ops-ink-muted">
        <span>{tr("b2b.finance.jobs.showing", "Showing {n} of {total}", { n: visible.length, total: p.total })}</span>
        {p.hasMore && (
          <button type="button" onClick={p.onLoadMore} disabled={p.loadingMore} className={cn("inline-flex min-h-[44px] items-center font-bold text-ops-accent underline disabled:opacity-50", FOCUS)}>
            {p.loadingMore ? tr("b2b.finance.loadingMore", "Loading…") : tr("b2b.finance.loadMore", "Load more")}
          </button>
        )}
        <span>{tr("b2b.finance.csvNote", "The CSV has every job in the period.")}</span>
      </p>
    </section>
  );
}
