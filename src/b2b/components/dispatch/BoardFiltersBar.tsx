"use client";

import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PRIORITIES, hasBoardFilters, type BoardFilters } from "@/b2b/lib/dispatch-view";
import type { PriorityKey } from "@/b2b/lib/job-filters";

interface Props {
  filters: BoardFilters;
  skills: Array<{ id: string; name: string }>;
  onChange: (next: BoardFilters) => void;
}

/** Priority chips + skill select. Both are applied by the server; the skill list comes from GET /skills. */
export function BoardFiltersBar({ filters, skills, onChange }: Props) {
  const { t } = useTranslation();
  const toggle = (p: PriorityKey) =>
    onChange({ ...filters, priority: filters.priority.includes(p) ? filters.priority.filter((x) => x !== p) : [...filters.priority, p] });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <fieldset className="flex flex-wrap items-center gap-1.5">
        <legend className="sr-only">{t("b2b.dispatch.filter.priority", "Priority")}</legend>
        <span aria-hidden="true" className="text-xs font-bold text-ops-ink-muted">{t("b2b.dispatch.filter.priority", "Priority")}</span>
        {PRIORITIES.map((p) => {
          const on = filters.priority.includes(p);
          return (
            <label key={p} className={cn("inline-flex min-h-[44px] cursor-pointer items-center rounded border px-3 text-xs font-bold focus-within:outline focus-within:outline-2 focus-within:outline-ops-ink", on ? "border-ops-ink bg-ops-ink text-white" : "border-ops-border bg-ops-surface text-ops-ink hover:border-ops-border-strong")}>
              <input type="checkbox" checked={on} onChange={() => toggle(p)} className="sr-only" />
              {t(`b2b.jobs.priority.${p}`, p.charAt(0) + p.slice(1).toLowerCase())}
            </label>
          );
        })}
      </fieldset>
      {skills.length > 0 ? (
        <label className="flex items-center gap-2 text-xs font-bold text-ops-ink-muted">
          {t("b2b.dispatch.filter.skill", "Skill")}
          <select
            value={filters.skill ?? ""}
            onChange={(e) => onChange({ ...filters, skill: e.target.value || undefined })}
            className="min-h-[44px] rounded border border-ops-border-strong bg-ops-surface px-2 text-sm text-ops-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-ink"
          >
            <option value="">{t("b2b.dispatch.filter.anySkill", "Any skill")}</option>
            {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      ) : null}
      {hasBoardFilters(filters) ? (
        <button type="button" onClick={() => onChange({ priority: [] })} className="min-h-[44px] rounded border border-ops-border-strong px-3 text-sm font-bold text-ops-ink hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-ink">
          {t("b2b.dispatch.filter.clear", "Clear filters")}
        </button>
      ) : null}
    </div>
  );
}
