"use client";

import { useState } from "react";
import { CloudOff, Pause, Timer } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { WorkTime } from "@/b2b/api/types";
import { formatHms, pausedSecondsNow, shownSeconds, timerSpeech } from "@/b2b/lib/work-time";
import { useNowTick } from "./useNowTick";

/**
 * Worked time for a job. The digits are derived from the API's timestamps on every tick (never counted), so a reload,
 * a sleeping tablet or airplane mode all show the same value. Screen readers hear state changes only, never seconds.
 */
export function TimerChip({ time, offline, estimateMin, className }: { time: WorkTime | null | undefined; offline?: boolean; estimateMin?: number | null; className?: string }) {
  const { t } = useTranslation();
  const ticking = time?.state === "RUNNING" || time?.state === "PAUSED";
  const now = useNowTick(ticking);
  const state = time?.state ?? null;
  const worked = shownSeconds(time, now);

  // Polite announcement on state CHANGES only (not on first render, not every second). Derived during render.
  const [announce, setAnnounce] = useState("");
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state === "PAUSED") setAnnounce(t("b2b.tech.timer.srPaused", "Timer paused at {time}").replace("{time}", timerSpeech(worked ?? 0)));
    else if (state === "RUNNING" && seen === "PAUSED") setAnnounce(t("b2b.tech.timer.srResumed", "Timer resumed"));
  }

  if (!time || time.state === "NOT_STARTED") return null;
  const paused = time.state === "PAUSED";
  const stopped = time.state === "STOPPED";
  const overMin = estimateMin && worked !== null && worked > estimateMin * 60 ? Math.ceil((worked - estimateMin * 60) / 60) : 0;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-1", className)} data-timer-state={time.state}>
      <span aria-hidden="true" className={cn("inline-flex items-center gap-1.5 font-mono text-xl font-bold tabular-nums", paused ? "text-sig-orange-ink" : "text-sig-blue-ink")}>
        {paused ? <Pause className="h-5 w-5" /> : <Timer className="h-5 w-5" />}
        {formatHms(worked ?? 0)}
      </span>
      <span className="text-sm font-bold text-ops-ink-muted">
        {paused ? t("b2b.tech.timer.paused", "Paused") : stopped ? t("b2b.tech.timer.worked", "Worked {time}").replace("{time}", formatHms(worked ?? 0)) : t("b2b.tech.timer.running", "Running")}
        {paused && time.pausedSeconds > 0 ? ` · ${t("b2b.tech.timer.pausedTotal", "Paused {time}").replace("{time}", formatHms(pausedSecondsNow(time, now)))}` : ""}
      </span>
      {overMin > 0 ? <span className="text-sm font-bold text-sig-vermilion-ink">{t("b2b.tech.timer.over", "+{n} min over estimate").replace("{n}", String(overMin))}</span> : null}
      {offline ? <span className="inline-flex items-center gap-1 text-sm font-bold text-sig-orange-ink"><CloudOff className="h-4 w-4" aria-hidden="true" />{t("b2b.tech.timer.savedOnDevice", "Saved on device")}</span> : null}
      <span role="timer" aria-live="off" className="sr-only">{timerSpeech(worked ?? 0)}</span>
      <span role="status" aria-live="polite" className="sr-only">{announce}</span>
    </span>
  );
}
