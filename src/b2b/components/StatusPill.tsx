"use client";

import { cn } from "@/lib/utils";
import { FAMILY_CLASSES, JOB_STATUS_META } from "@/b2b/lib/status";
import type { JobStatus } from "@/b2b/api/types";
import { jobStatusLabel } from "@/b2b/lib/status-label";
import { useTranslation } from "@/lib/i18n";

/** Job status chip: family colour + treatment + icon + text (never colour alone). */
export function StatusPill({ status, className, compact }: { status: JobStatus; className?: string; compact?: boolean }) {
  const { t } = useTranslation();
  const meta = JOB_STATUS_META[status];
  const label = jobStatusLabel(t, status);
  const Icon = meta.icon;
  return (
    <span
      title={label}
      className={cn("inline-flex min-h-7 max-w-full items-center gap-1.5 rounded px-2 py-1 text-xs font-bold", compact && "gap-1 px-1.5", FAMILY_CLASSES[meta.family][meta.treatment], status === "DRAFT" && "border-dashed", className)}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="whitespace-normal break-words text-left">{label}</span>
    </span>
  );
}

/** "JOB-1045" reference in monospace. */
export function JobRef({ reference, className }: { reference: string; className?: string }) {
  return <span className={cn("rounded bg-ops-canvas px-1.5 py-0.5 font-mono text-xs text-ops-ink", className)}>{reference}</span>;
}
