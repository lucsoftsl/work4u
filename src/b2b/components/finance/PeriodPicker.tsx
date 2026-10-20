"use client";

import { useState } from "react";
import { detectPreset, periodRange, rangeProblem, type PeriodPreset } from "@/b2b/lib/finance";
import { useTr } from "@/b2b/setup/i18n";
import { fieldClass } from "@/b2b/components/workspace/ui";
import { Segmented } from "./Segmented";

interface Props { from: string; to: string; today: string; onChange: (range: { from: string; to: string }) => void }

function CustomRange({ from, to, onChange }: Pick<Props, "from" | "to" | "onChange">) {
  const { tr } = useTr();
  const [draft, setDraft] = useState({ from, to });
  const problem = rangeProblem(draft.from, draft.to);
  const message = problem === "tooLong" ? tr("b2b.finance.err.range", "That date range is too long. Choose up to 400 days.")
    : problem === "order" ? tr("b2b.finance.err.order", "The end date is before the start date.")
    : problem === "invalid" ? tr("b2b.finance.err.invalid", "Enter both dates.") : null;

  // Only a valid range reaches the URL, so a bad one never produces a request and the last good figures stay on screen.
  const edit = (patch: Partial<typeof draft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (!rangeProblem(next.from, next.to) && (next.from !== from || next.to !== to)) onChange(next);
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-bold text-ops-ink">
          {tr("b2b.finance.from", "From")}
          <input type="date" value={draft.from} onChange={(e) => edit({ from: e.target.value })} aria-invalid={problem !== null} className={`${fieldClass} mt-1 block min-h-[44px]`} />
        </label>
        <label className="text-xs font-bold text-ops-ink">
          {tr("b2b.finance.to", "To")}
          <input type="date" value={draft.to} onChange={(e) => edit({ to: e.target.value })} aria-invalid={problem !== null} className={`${fieldClass} mt-1 block min-h-[44px]`} />
        </label>
      </div>
      {message && <p role="alert" className="text-sm font-bold text-sig-vermilion-ink">{message}</p>}
    </div>
  );
}

export function PeriodPicker({ from, to, today, onChange }: Props) {
  const { tr } = useTr();
  const [customOpen, setCustomOpen] = useState(false);
  const preset = detectPreset(from, to, today);
  const value: PeriodPreset = customOpen ? "custom" : preset;

  const pick = (p: PeriodPreset) => {
    if (p === "custom") return setCustomOpen(true);
    setCustomOpen(false);
    onChange(periodRange(p, today));
  };

  return (
    <div className="flex max-w-full flex-col gap-2 sm:items-end">
      <Segmented
        label={tr("b2b.finance.period", "Period")}
        value={value}
        onChange={pick}
        options={[
          { value: "month", label: tr("b2b.finance.period.month", "This month") },
          { value: "lastMonth", label: tr("b2b.finance.period.lastMonth", "Last month") },
          { value: "quarter", label: tr("b2b.finance.period.quarter", "Quarter") },
          { value: "custom", label: tr("b2b.finance.period.custom", "Custom") },
        ]}
      />
      {value === "custom" && <CustomRange key={`${from}|${to}`} from={from} to={to} onChange={onChange} />}
    </div>
  );
}
