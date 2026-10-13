"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { JobStatus, Team } from "@/b2b/api/types";
import { JOB_STATUSES, PRESETS, PRIORITIES, type PriorityKey, activeFilterCount, activePreset, type JobListFilters } from "@/b2b/lib/job-filters";
import { JOB_STATUS_META } from "@/b2b/lib/status";

const DEBOUNCE_MS = 350;
const FIELD = "min-h-[44px] rounded border border-ops-border-strong bg-ops-surface px-2 text-sm text-ops-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-ink";

interface Props {
  filters: JobListFilters;
  teams?: Team[];
  onChange: (patch: Partial<JobListFilters>) => void;
  onPreset: (patch: Pick<JobListFilters, "status" | "unassigned">) => void;
  onClear: () => void;
}

export function JobFiltersBar({ filters, teams, onChange, onPreset, onClear }: Props) {
  const { t } = useTranslation();
  const [q, setQ] = useState(filters.q ?? "");
  const urlQ = filters.q ?? "";
  // URL changed externally (shell search box, back button): adopt it during render.
  const [seenUrlQ, setSeenUrlQ] = useState(urlQ);
  if (seenUrlQ !== urlQ) { setSeenUrlQ(urlQ); setQ(urlQ); }
  useEffect(() => {
    if (q.trim() === urlQ) return;
    const id = setTimeout(() => onChange({ q: q.trim() || undefined }), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [q, urlQ, onChange]);

  const preset = activePreset(filters);
  const count = activeFilterCount(filters);
  const toggle = (s: JobStatus) =>
    onChange({ status: filters.status.includes(s) ? filters.status.filter((x) => x !== s) : [...filters.status, s] });

  const togglePriority = (p: PriorityKey) =>
    onChange({ priority: filters.priority.includes(p) ? filters.priority.filter((x) => x !== p) : [...filters.priority, p] });

  return (
    <div className="space-y-3">
      <nav aria-label={t("b2b.jobs.presets", "Job views")}>
        <ul className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <li key={p.key}>
              <button
                type="button"
                aria-pressed={preset === p.key}
                onClick={() => onPreset(p.patch)}
                className={cn(
                  "min-h-[44px] rounded px-4 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-ink",
                  preset === p.key ? "bg-ops-ink text-white" : "border border-ops-border bg-ops-surface text-ops-ink hover:border-ops-border-strong"
                )}
              >
                {t(`b2b.jobs.preset.${p.key}`, p.label)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <form role="search" aria-label="Filter jobs" onSubmit={(e) => { e.preventDefault(); onChange({ q: q.trim() || undefined }); }} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[220px] flex-1 basis-60 flex-col gap-1 text-xs font-bold text-ops-ink-muted">
          {t("b2b.jobs.filter.search", "Job number or title")}
          <span className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ops-ink-subtle" aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className={cn(FIELD, "w-full pl-8")} placeholder="JOB-1001" />
          </span>
        </label>
        {teams && (
          <label className="flex min-w-[160px] flex-col gap-1 text-xs font-bold text-ops-ink-muted">
            {t("b2b.jobs.filter.team", "Team")}
            <select value={filters.teamId ?? ""} onChange={(e) => onChange({ teamId: e.target.value || undefined })} className={FIELD}>
              <option value="">{t("b2b.jobs.filter.anyTeam", "Any team")}</option>
              {teams.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs font-bold text-ops-ink-muted">
          {t("b2b.jobs.filter.from", "From")}
          <input type="date" value={filters.from ?? ""} max={filters.to} onChange={(e) => onChange({ from: e.target.value || undefined })} className={FIELD} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-ops-ink-muted">
          {t("b2b.jobs.filter.to", "To")}
          <input type="date" value={filters.to ?? ""} min={filters.from} onChange={(e) => onChange({ to: e.target.value || undefined })} className={FIELD} />
        </label>
        <label className="flex min-h-[44px] items-center gap-2 text-sm font-bold text-ops-ink">
          <input type="checkbox" checked={filters.unassigned} onChange={(e) => onChange({ unassigned: e.target.checked })} className="h-5 w-5" />
          {t("b2b.jobs.filter.unassigned", "Unassigned only")}
        </label>
        <button
          type="button"
          onClick={onClear}
          disabled={count === 0}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded border border-ops-border-strong px-3 text-sm font-bold text-ops-ink enabled:hover:bg-ops-canvas disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {t("b2b.jobs.clear", "Clear all")}{count > 0 && <span className="font-mono text-xs">({count})</span>}
        </button>
      </form>

      <fieldset className="min-w-0">
        <legend className="mb-1 text-xs font-bold text-ops-ink-muted">{t("b2b.jobs.filter.priority", "Priority")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {PRIORITIES.map((p) => {
            const on = filters.priority.includes(p);
            return (
              <label key={p} className={cn("inline-flex min-h-[44px] cursor-pointer items-center rounded border px-3 text-xs font-bold focus-within:outline focus-within:outline-2 focus-within:outline-ops-ink", on ? "border-ops-ink bg-ops-ink text-white" : "border-ops-border bg-ops-surface text-ops-ink hover:border-ops-border-strong")}>
                <input type="checkbox" checked={on} onChange={() => togglePriority(p)} className="sr-only" />
                {t(`b2b.jobs.priority.${p}`, p.charAt(0) + p.slice(1).toLowerCase())}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="mb-1 text-xs font-bold text-ops-ink-muted">{t("b2b.jobs.filter.status", "Status")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {JOB_STATUSES.map((s) => {
            const on = filters.status.includes(s);
            return (
              <label key={s} className={cn("inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded border px-3 text-xs font-bold focus-within:outline focus-within:outline-2 focus-within:outline-ops-ink", on ? "border-ops-ink bg-ops-ink text-white" : "border-ops-border bg-ops-surface text-ops-ink hover:border-ops-border-strong")}>
                <input type="checkbox" checked={on} onChange={() => toggle(s)} className="sr-only" />
                {JOB_STATUS_META[s].label}
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
