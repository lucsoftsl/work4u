import type { WorkTime } from "@/b2b/api/types";
import type { QueueItem } from "@/b2b/offline/types";

const MS = 1000;

/**
 * Worked seconds right now. Derived from the API's `serverTime` anchor, never counted: a reload, a sleeping device
 * or an offline hour all give the exact value. Paused/stopped clocks are frozen. A device clock behind the
 * server never makes the value drop below the anchor.
 */
export function shownSeconds(time: WorkTime | null | undefined, nowMs: number): number | null {
  if (!time) return null;
  if (time.state !== "RUNNING") return Math.max(0, Math.floor(time.workedSeconds));
  const since = Math.max(0, (nowMs - Date.parse(time.serverTime)) / MS);
  return Math.max(0, Math.floor(time.workedSeconds + (Number.isFinite(since) ? since : 0)));
}

/** Total paused seconds, including a pause that is still going on. */
export function pausedSecondsNow(time: WorkTime | null | undefined, nowMs: number): number {
  if (!time) return 0;
  if (time.state !== "PAUSED") return time.pausedSeconds;
  const since = Math.max(0, (nowMs - Date.parse(time.serverTime)) / MS);
  return Math.floor(time.pausedSeconds + (Number.isFinite(since) ? since : 0));
}

export function formatHms(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Plain-words duration for screen readers ("1 hour 12 minutes"); seconds are never read out. */
export function timerSpeech(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = [h ? `${h} hour${h === 1 ? "" : "s"}` : "", m ? `${m} minute${m === 1 ? "" : "s"}` : ""].filter(Boolean);
  return parts.length ? parts.join(" ") : "less than a minute";
}

const baseTime = (at: string): WorkTime => ({ state: "NOT_STARTED", workedSeconds: 0, pausedSeconds: 0, correctionSeconds: 0, runningSince: null, pausedSince: null, pauseReason: null, pauseNote: null, workStartedAt: null, workEndedAt: null, serverTime: at });

/** Move the anchor to `at` so later arithmetic starts from that instant (pure). */
function anchored(t: WorkTime, at: string): WorkTime {
  const dt = Math.max(0, (Date.parse(at) - Date.parse(t.serverTime)) / MS);
  if (t.state === "RUNNING") return { ...t, workedSeconds: t.workedSeconds + dt, serverTime: at };
  if (t.state === "PAUSED") return { ...t, pausedSeconds: t.pausedSeconds + dt, serverTime: at };
  return { ...t, serverTime: at };
}

/**
 * The work clock as the technician left it: the last server clock plus every queued action, each applied at its OWN
 * device timestamp. Offline taps therefore show the same time as after they sync.
 */
export function applyQueuedClock(time: WorkTime | null | undefined, items: readonly QueueItem[], jobId?: string): WorkTime | null {
  const mine = items.filter((i) => i.status !== "conflict" && (jobId === undefined || i.jobId === jobId));
  let t: WorkTime | null = time ?? null;
  for (const item of mine) {
    const at = item.createdAt;
    if (item.kind === "pause") {
      if (t?.state !== "RUNNING") continue;
      t = { ...anchored(t, at), state: "PAUSED", pausedSince: at, runningSince: null, pauseReason: item.pauseReason ?? "OTHER", pauseNote: item.pauseNote ?? null };
    } else if (item.kind === "resume-work") {
      if (t?.state !== "PAUSED") continue;
      t = { ...anchored(t, at), state: "RUNNING", runningSince: at, pausedSince: null, pauseReason: null, pauseNote: null };
    } else if (item.kind === "action") {
      if (item.action === "start" && (!t || t.state === "NOT_STARTED")) {
        t = { ...(t ?? baseTime(at)), state: "RUNNING", workedSeconds: 0, runningSince: at, workStartedAt: at, serverTime: at };
      } else if (t && item.action === "block" && (t.state === "RUNNING" || t.state === "PAUSED")) {
        t = { ...anchored(t, at), state: "STOPPED", runningSince: null, pausedSince: null };
      } else if (t && item.action === "resume" && t.state === "STOPPED") {
        t = { ...anchored(t, at), state: "RUNNING", runningSince: at };
      } else if (t && item.action === "complete" && t.state !== "STOPPED") {
        t = { ...anchored(t, at), state: "STOPPED", runningSince: null, pausedSince: null, workEndedAt: at };
      }
    }
  }
  return t;
}
