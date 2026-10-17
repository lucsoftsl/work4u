"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTr } from "../i18n";

export const STEPS = ["upload", "map", "preview", "confirm", "result"] as const;
export type StepKey = (typeof STEPS)[number];

/** Ordered list; aria-current on the current step; earlier steps are buttons (reachable backwards). Below 600px only the current label shows. */
export function Stepper({ current, maxReached, onGo }: { current: StepKey; maxReached: StepKey; onGo: (s: StepKey) => void }) {
  const { tr } = useTr();
  const label: Record<StepKey, string> = {
    upload: tr("b2b.import.step.upload", "Upload"), map: tr("b2b.import.step.map", "Map columns"), preview: tr("b2b.import.step.preview", "Preview"),
    confirm: tr("b2b.import.step.confirm", "Confirm"), result: tr("b2b.import.step.result", "Result"),
  };
  const idx = STEPS.indexOf(current);
  const locked = current === "result";
  return (
    <ol className="flex flex-wrap gap-x-2 gap-y-1" aria-label={tr("b2b.import.steps", "Import steps")}>
      {STEPS.map((s, i) => {
        const done = i < idx;
        const isCurrent = s === current;
        const canGo = done && !locked && i < STEPS.indexOf(maxReached) + 1;
        const body = (
          <>
            <span aria-hidden="true" className={cn("inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold", isCurrent ? "border-ops-ink bg-ops-ink text-white" : "border-ops-border-strong")}>
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn(isCurrent ? "font-bold" : "sr-only min-[600px]:not-sr-only")}>{label[s]}</span>
            {done && <span className="sr-only"> ({tr("b2b.import.step.completed", "completed")})</span>}
          </>
        );
        return (
          <li key={s} aria-current={isCurrent ? "step" : undefined} className="text-sm">
            {canGo ? (
              <button type="button" onClick={() => onGo(s)} className="inline-flex min-h-[44px] items-center gap-2 rounded px-1 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2">{body}</button>
            ) : (
              <span className={cn("inline-flex min-h-[44px] items-center gap-2 px-1", !isCurrent && "text-ops-ink-muted")}>{body}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
