"use client";

import { useId } from "react";
import { useTranslation } from "@/lib/i18n";
import { inputCls } from "@/b2b/components/catalog/ui";
import { WEEKDAYS, WEEKDAY_LABEL, validateDraft, type DayDraft, type HoursDraft } from "@/b2b/lib/working-hours";

interface Props {
  useDefault: boolean;
  draft: HoursDraft;
  showErrors: boolean;
  onUseDefault: (v: boolean) => void;
  onChange: (next: HoursDraft) => void;
}

/** Weekly hours: one row per day (works / from / to), or "Use default hours". */
export function WorkingHoursEditor({ useDefault, draft, showErrors, onUseDefault, onChange }: Props) {
  const { t } = useTranslation();
  const baseId = useId();
  const errors = showErrors && !useDefault ? validateDraft(draft) : {};
  const set = (day: (typeof WEEKDAYS)[number], patch: Partial<DayDraft>) => onChange({ ...draft, [day]: { ...draft[day], ...patch } });

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-bold text-ops-ink">{t("b2b.teams.hours", "Working hours")}</legend>
      <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-ops-ink">
        <input type="checkbox" className="h-5 w-5" checked={useDefault} onChange={(e) => onUseDefault(e.target.checked)} />
        {t("b2b.teams.useDefaultHours", "Use default hours (Mon–Fri 09:00–17:00)")}
      </label>
      {!useDefault && (
        <ul className="divide-y divide-ops-border rounded border border-ops-border-strong">
          {WEEKDAYS.map((d) => {
            const row = draft[d];
            const err = errors[d];
            const errId = `${baseId}-${d}-err`;
            return (
              <li key={d} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1">
                <label className="flex min-h-[44px] w-24 cursor-pointer items-center gap-2 text-sm font-bold text-ops-ink">
                  <input type="checkbox" className="h-5 w-5" checked={row.on} onChange={(e) => set(d, { on: e.target.checked })} />
                  {t(`b2b.teams.day.${d}`, WEEKDAY_LABEL[d])}
                </label>
                {row.on ? (
                  <>
                    <label className="flex items-center gap-1 text-xs text-ops-ink-muted">
                      <span>{t("b2b.teams.from", "From")}</span>
                      <input type="time" value={row.start} onChange={(e) => set(d, { start: e.target.value })} aria-invalid={!!err} aria-describedby={err ? errId : undefined} className={`${inputCls} w-32`} />
                    </label>
                    <label className="flex items-center gap-1 text-xs text-ops-ink-muted">
                      <span>{t("b2b.teams.until", "Until")}</span>
                      <input type="time" value={row.end} onChange={(e) => set(d, { end: e.target.value })} aria-invalid={!!err} aria-describedby={err ? errId : undefined} className={`${inputCls} w-32`} />
                    </label>
                    {err ? <p id={errId} className="w-full text-xs font-bold text-sig-vermilion-ink">{err}</p> : null}
                  </>
                ) : (
                  <span className="text-xs text-ops-ink-muted">{t("b2b.teams.notWorking", "Not working")}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}
