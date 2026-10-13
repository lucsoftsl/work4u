"use client";

import { Pause } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { PauseReason, WorkTime } from "@/b2b/api/types";
import { formatHms, pausedSecondsNow } from "@/b2b/lib/work-time";
import { useNowTick } from "./useNowTick";

const REASON: Record<PauseReason, [string, string]> = {
  BREAK: ["b2b.tech.pause.reason.break", "Break"],
  PARTS: ["b2b.tech.pause.reason.parts", "Waiting for parts"],
  CUSTOMER_AWAY: ["b2b.tech.pause.reason.customerAway", "Customer away"],
  OTHER: ["b2b.tech.pause.reason.other", "Other"],
};

export const pauseReasonLabel = (reason: PauseReason | null | undefined, t: (k: string, f: string) => string): string => (reason ? t(...REASON[reason]) : "");

/** "Paused · Customer away · 18:04": for dispatcher views and job rows. Icon + text, never colour alone. Renders nothing unless paused. */
export function PausedChip({ time, className }: { time: WorkTime | null | undefined; className?: string }) {
  const { t } = useTranslation();
  const paused = time?.state === "PAUSED";
  const now = useNowTick(paused);
  if (!time || !paused) return null;
  const reason = pauseReasonLabel(time.pauseReason, t);
  const text = t("b2b.tech.pause.chip", "Paused · {reason} · {duration}").replace("{reason}", reason || t("b2b.tech.timer.paused", "Paused")).replace("{duration}", formatHms(pausedSecondsNow(time, now)));
  return (
    <span title={time.pauseNote ?? undefined} className={`inline-flex min-h-7 items-center gap-1 rounded bg-sig-orange-tint px-2 py-1 text-xs font-bold text-sig-orange-ink ${className ?? ""}`}>
      <Pause className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}
