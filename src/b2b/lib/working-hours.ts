import { fallback, type Translate } from "./plural";
import type { WeekdayKey, WorkingHours } from "@/b2b/api/types";

// Team working hours (PATCH /teams/:id {workingHours}). `null` = default hours.

export const WEEKDAYS: readonly WeekdayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const WEEKDAY_LABEL: Record<WeekdayKey, string> = { mon: fallback("Mon"), tue: fallback("Tue"), wed: fallback("Wed"), thu: fallback("Thu"), fri: fallback("Fri"), sat: fallback("Sat"), sun: fallback("Sun") };
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface DayDraft { on: boolean; start: string; end: string }
export type HoursDraft = Record<WeekdayKey, DayDraft>;

const DEFAULT_DAY: Omit<DayDraft, "on"> = { start: "09:00", end: "17:00" };

/** Form state from the API value: missing / null day = not working. null hours = Mon-Fri 09-17 as a starting point. */
export function toDraft(hours: WorkingHours | null | undefined): HoursDraft {
  const out = {} as HoursDraft;
  for (const d of WEEKDAYS) {
    const v = hours?.[d];
    const weekday = d !== "sat" && d !== "sun";
    out[d] = v ? { on: true, start: v.start, end: v.end } : { on: !hours && weekday, ...DEFAULT_DAY };
  }
  return out;
}

/** API body from form state: days that are off are sent as null. */
export function fromDraft(draft: HoursDraft): WorkingHours {
  const out: WorkingHours = {};
  for (const d of WEEKDAYS) out[d] = draft[d].on ? { start: draft[d].start, end: draft[d].end } : null;
  return out;
}

/** Per-day error (only for days that are on): valid 24 h times and end after start. */
export function validateDraft(draft: HoursDraft, t: Translate = (_k, f) => f): Partial<Record<WeekdayKey, string>> {
  const errors: Partial<Record<WeekdayKey, string>> = {};
  for (const d of WEEKDAYS) {
    const { on, start, end } = draft[d];
    if (!on) continue;
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) errors[d] = t("b2b.teams.hoursNeedBoth", "Enter a start and end time.");
    else if (end <= start) errors[d] = t("b2b.job.win.endAfter", "The end must be after the start.");
  }
  return errors;
}

export const draftChanged = (a: HoursDraft, b: HoursDraft): boolean => JSON.stringify(fromDraft(a)) !== JSON.stringify(fromDraft(b));

/** "Mon–Fri 08:00–16:00, Sat 09:00–12:00"; null/empty -> null (the caller shows "Default"). */
export function summarizeHours(hours: WorkingHours | null | undefined, t: Translate = (_k, f) => f): string | null {
  const day = (d: WeekdayKey) => t(`b2b.teams.day.${d}`, WEEKDAY_LABEL[d]);
  if (!hours) return null;
  const groups: Array<{ days: WeekdayKey[]; range: string }> = [];
  for (const d of WEEKDAYS) {
    const v = hours[d];
    if (!v) continue;
    const range = `${v.start}–${v.end}`;
    const last = groups[groups.length - 1];
    const prev = last ? WEEKDAYS.indexOf(last.days[last.days.length - 1]) : -2;
    if (last && last.range === range && prev === WEEKDAYS.indexOf(d) - 1) last.days.push(d);
    else groups.push({ days: [d], range });
  }
  if (groups.length === 0) return "";
  return groups
    .map((g) => `${g.days.length > 1 ? `${day(g.days[0])}–${day(g.days[g.days.length - 1])}` : day(g.days[0])} ${g.range}`)
    .join(", ");
}
