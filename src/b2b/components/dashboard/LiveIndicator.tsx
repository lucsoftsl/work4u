"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveState } from "@/b2b/context/OrgContext";
import { ago } from "@/b2b/components/jobs/format";

const LABEL: Record<LiveState, string> = { live: "Live", polling: "Live (polling)", connecting: "Connecting", offline: "Offline" };

export function LiveIndicator({ live, updatedAt, nowMs, fetching }: { live: LiveState; updatedAt: number; nowMs: number; fetching: boolean }) {
  const ok = live === "live" || live === "polling";
  return (
    <p className="flex items-center gap-2 text-xs text-ops-ink-muted">
      <span className={cn("inline-flex h-6 items-center gap-1.5 rounded px-2 font-bold", ok ? "bg-sig-green-tint text-sig-green-ink" : "bg-sig-slate-tint text-sig-slate-ink")}>
        <span className={cn("h-2 w-2 rounded-full", ok ? "bg-sig-green-ink" : "bg-sig-slate-ink")} aria-hidden="true" />
        {LABEL[live]}
      </span>
      <span aria-live="off">{updatedAt ? `Updated ${ago(updatedAt, nowMs)}` : "Not updated yet"}</span>
      {fetching && <RefreshCw className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-label="Refreshing" />}
    </p>
  );
}
