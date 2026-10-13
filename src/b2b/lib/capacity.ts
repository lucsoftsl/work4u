import type { CapacitySource, LaneCapacity } from "@/b2b/api/types";

// Lane capacity from GET /dispatch/board (`capacity` per team lane). Pure formatting, no React.

/** 480 -> "8", 150 -> "2.5", 0 -> "0" (hours, one decimal at most). */
export function formatHours(minutes: number): string {
  const h = Math.round((Math.max(0, minutes) / 60) * 10) / 10;
  return String(h);
}

export type CapacityState = "not-working" | "ok" | "full" | "over";

export interface CapacityView {
  state: CapacityState;
  /** Rounded percentage, can exceed 100 (overlapping jobs add up). null when not working. */
  percent: number | null;
  /** Bar fill 0..100. */
  fill: number;
  bookedHours: string;
  workingHours: string;
  source: CapacitySource;
  /** The hours were not configured: show the "Default hours" note. */
  isDefault: boolean;
}

export const FULL_THRESHOLD = 0.9;

export function capacityView(c: LaneCapacity): CapacityView {
  const util = c.utilization;
  const base = { bookedHours: formatHours(c.bookedMinutes), workingHours: formatHours(c.workingMinutes), source: c.source, isDefault: c.source === "default" };
  if (util === null || util === undefined || c.workingMinutes <= 0) return { ...base, state: "not-working", percent: null, fill: 0 };
  const percent = Math.round(util * 100);
  return { ...base, state: util > 1 ? "over" : util >= FULL_THRESHOLD ? "full" : "ok", percent, fill: Math.min(100, Math.max(0, percent)) };
}

export const DEFAULT_HOURS_NOTE = "Default hours (Mon–Fri 09–17); set team hours to change";
