"use client";

import type { FinanceSummary } from "@/b2b/api/finance";
import { bucketLabel } from "@/b2b/lib/finance";
import { formatAmount } from "@/b2b/lib/money";
import { useTr } from "@/b2b/setup/i18n";
import { Blank, Signed } from "./Figures";
import { bucketWord } from "./bucketWord";
import { ScrollRegion } from "./ScrollRegion";

const TH = "px-3 py-2 text-right text-xs font-bold uppercase tracking-wide text-ops-ink-muted";
const TD = "px-3 py-2 text-right text-sm [font-variant-numeric:tabular-nums]";

/** The keyboard and screen-reader path to the chart: the same numbers, one row per bucket, totals equal to the key figures. */
export function ChartTable({ summary }: { summary: FinanceSummary }) {
  const { tr, locale } = useTr();
  const { earned, pipeline, currency, period } = summary;
  const caption = tr("b2b.finance.table.caption", "Revenue, cost and expected pipeline by {bucket}, {currency}", { bucket: bucketWord(tr, period), currency });
  const amount = (n: number) => formatAmount(n, locale, currency);
  return (
    <ScrollRegion label={tr("b2b.finance.table.regionLabel", "Table: {caption}", { caption })} className="border-0">
      <table className="w-full min-w-[520px] border-collapse">
        <caption className="px-3 py-2 text-left text-xs text-ops-ink-muted">{caption}</caption>
        <thead>
          <tr className="border-b border-ops-border bg-ops-canvas">
            <th scope="col" className={`${TH} text-left`}>{tr("b2b.finance.table.period", "Period")}</th>
            <th scope="col" className={TH}>{tr("b2b.finance.legend.earned", "Earned revenue")}</th>
            <th scope="col" className={TH}>{tr("b2b.finance.col.cost", "Cost")}</th>
            <th scope="col" className={TH}>{tr("b2b.finance.col.margin", "Margin")}</th>
            <th scope="col" className={TH}>{tr("b2b.finance.legend.expected", "Expected (pipeline)")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ops-border">
          {summary.series.map((b) => {
            const idle = b.earned.jobs === 0 && b.pipeline.jobs === 0;
            const dash = <><span aria-hidden="true">–</span><span className="sr-only">{tr("b2b.finance.table.noJobs", "no jobs")}</span></>;
            return (
              <tr key={b.start}>
                <th scope="row" className="px-3 py-2 text-left text-sm font-bold text-ops-ink">{bucketLabel(b.start, period, locale)}</th>
                <td className={TD}>{idle ? dash : amount(b.earned.revenue)}</td>
                <td className={TD}>{idle ? dash : amount(b.earned.cost)}</td>
                <td className={TD}>{idle ? dash : <Signed value={b.earned.margin}>{b.earned.margin === null ? null : amount(b.earned.margin)}</Signed>}</td>
                <td className={TD}>{idle ? dash : amount(b.pipeline.revenue)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-ops-ink bg-ops-canvas font-bold">
            <th scope="row" className="px-3 py-2 text-left text-sm text-ops-ink">{tr("b2b.finance.table.total", "Total")}</th>
            <td className={TD}>{amount(earned.revenue)}</td>
            <td className={TD}>{amount(earned.cost)}</td>
            <td className={TD}>{earned.margin === null ? <Blank /> : <Signed value={earned.margin}>{amount(earned.margin)}</Signed>}</td>
            <td className={TD}>{amount(pipeline.revenue)}</td>
          </tr>
        </tfoot>
      </table>
    </ScrollRegion>
  );
}
