"use client";

import type { ReactNode } from "react";
import type { FinanceSummary } from "@/b2b/api/finance";
import { formatPercent, moneyParts } from "@/b2b/lib/money";
import { useTr } from "@/b2b/setup/i18n";
import { cn } from "@/lib/utils";
import { Blank, Signed } from "./Figures";

function Tile({ label, note, className, children }: { label: string; note: string; className?: string; children: ReactNode }) {
  return (
    // A size container: the figure's font follows the tile's width (cqw), so an amount never has to break to fit.
    <li className={cn("min-w-0 rounded border border-ops-border bg-ops-surface p-3 [container-type:inline-size] md:p-4", className)}>
      <p className="text-xs font-bold text-ops-ink">{label}</p>
      <p className="mt-1 text-[clamp(1rem,11cqw,1.625rem)] font-bold leading-tight text-ops-ink [font-variant-numeric:tabular-nums]">{children}</p>
      <p className="mt-1 text-xs text-ops-ink-muted">{note}</p>
    </li>
  );
}

/** The currency code as a small label above the figure; the figure itself is never broken across lines. */
function Amount({ minor, currency, locale }: { minor: number; currency: string; locale: string }) {
  const { code, figure } = moneyParts(minor, currency, locale);
  return (
    <>
      <span className="block text-xs font-bold leading-tight text-ops-ink-muted">{code}</span>
      <span className="whitespace-nowrap">{figure}</span>
    </>
  );
}

/** Six figures in reading order. Earned and expected are separate tiles: the pipeline is never added into earned. */
export function KpiTiles({ summary }: { summary: FinanceSummary }) {
  const { tr, trn, locale } = useTr();
  const { earned, pipeline, currency } = summary;
  const money = (n: number) => <Amount minor={n} currency={currency} locale={locale} />;
  // Completed jobs but no price (or no cost) on any of them: the sum is not zero, it is unknown.
  const noPrices = earned.jobs > 0 && earned.jobsWithoutPrice === earned.jobs;
  const noCosts = earned.jobs > 0 && earned.jobsWithoutCost === earned.jobs;
  const costNote = earned.jobsWithoutCost > 0
    ? tr("b2b.finance.kpi.costGap", "Without a cost: {n}", { n: earned.jobsWithoutCost })
    : tr("b2b.finance.kpi.costNote", "Cost of completed jobs");
  return (
    <ul aria-label={tr("b2b.finance.kpi.label", "Key figures")} className="grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-3 lg:grid-cols-6">
      <Tile label={tr("b2b.finance.kpi.revenue", "Earned revenue")} note={trn("b2b.finance.kpi.revenueNote", { one: "{n} job completed", other: "{n} jobs completed" }, earned.jobs)} className="border-t-4 border-t-ops-accent">
        {noPrices ? <Blank /> : money(earned.revenue)}
      </Tile>
      <Tile label={tr("b2b.finance.kpi.cost", "Cost")} note={costNote} className="border-t-4 border-t-sig-vermilion-ink">
        {noCosts ? <Blank /> : money(earned.cost)}
      </Tile>
      <Tile label={tr("b2b.finance.kpi.margin", "Margin")} note={tr("b2b.finance.kpi.marginNote", "Revenue minus cost")} className="border-t-4 border-t-sig-green-ink">
        <Signed value={earned.margin} loss>{earned.margin === null ? null : money(earned.margin)}</Signed>
      </Tile>
      <Tile label={tr("b2b.finance.kpi.marginPct", "Margin %")} note={tr("b2b.finance.kpi.pctNote", "of revenue")}>
        <Signed value={earned.marginPct}>{earned.marginPct === null ? null : formatPercent(earned.marginPct, locale)}</Signed>
      </Tile>
      <Tile label={tr("b2b.finance.kpi.jobs", "Jobs completed")} note={summary.basis === "scheduled" ? tr("b2b.finance.kpi.jobsScheduled", "by scheduled date") : tr("b2b.finance.kpi.jobsCompleted", "by completion date")}>
        {earned.jobs}
      </Tile>
      <Tile label={tr("b2b.finance.kpi.pipeline", "Pipeline (expected)")} note={trn("b2b.finance.kpi.pipelineNote", { one: "{n} job scheduled or in progress", other: "{n} jobs scheduled or in progress" }, pipeline.jobs)} className="border-2 border-dashed border-sig-sky-ink bg-sig-sky-tint">
        {money(pipeline.revenue)}
      </Tile>
    </ul>
  );
}
