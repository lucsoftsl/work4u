"use client";

import type { FinanceSummary } from "@/b2b/api/finance";
import type { ChartView } from "@/b2b/lib/finance";
import { useTr } from "@/b2b/setup/i18n";
import { Card } from "@/b2b/components/workspace/ui";
import { ChartTable } from "./ChartTable";
import { RevenueChart } from "./RevenueChart";
import { Segmented } from "./Segmented";
import { bucketWord } from "./bucketWord";

export function ChartCard({ summary, today, view, onView }: { summary: FinanceSummary; today: string; view: ChartView; onView: (v: ChartView) => void }) {
  const { tr } = useTr();
  const title = tr("b2b.finance.chart.title", "Revenue and cost by {bucket}", { bucket: bucketWord(tr, summary.period) });
  return (
    <Card
      title={title}
      action={
        <Segmented
          label={tr("b2b.finance.chart.view", "Show as")}
          value={view}
          onChange={onView}
          options={[{ value: "chart", label: tr("b2b.finance.chart.view.chart", "Chart") }, { value: "table", label: tr("b2b.finance.chart.view.table", "Table") }]}
        />
      }
    >
      {view === "table" ? <ChartTable summary={summary} /> : <RevenueChart summary={summary} today={today} />}
    </Card>
  );
}
