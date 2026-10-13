"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRightLeft, GripVertical, Lock, Wrench } from "lucide-react";
import { JobRef, StatusPill } from "@/b2b/components/StatusPill";
import { PausedChip } from "@/b2b/components/tech/PausedChip";
import { formatTime, canDragJob } from "@/b2b/lib/dispatch";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Job } from "@/b2b/api/types";
import type { JobCardProps } from "./types";

export function requiredSkillNames(job: Job): string[] {
  const raw = (job as unknown as { requiredSkills?: unknown }).requiredSkills;
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => (typeof s === "string" ? s : (s as { name?: string })?.name ?? "")).filter(Boolean);
}

export function timeWindow(job: Job, timezone: string): string {
  if (!job.scheduledStart) return "";
  const start = formatTime(job.scheduledStart, timezone);
  const end = formatTime(job.scheduledEnd, timezone);
  return end ? `${start}–${end}` : start;
}

/** The drag handle button. dnd-aware boards pass listeners/attributes; the static fallback reserves the same space. */
export function HandlePlaceholder() {
  return <span aria-hidden="true" className="w-11 shrink-0" />;
}

export function DragHandleButton({ reference, ...rest }: { reference: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      {...rest}
      aria-label={`${t("b2b.dispatch.move", "Move")} ${reference}`}
      className="flex min-h-[44px] w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-l text-ops-ink-muted hover:bg-ops-canvas hover:text-ops-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-accent active:cursor-grabbing"
    >
      <GripVertical className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

export function JobCard({ job, orgId, timezone, draggable, onAssignTo, handle, rootRef, rootStyle, isDragging, overlay }: JobCardProps) {
  const { t } = useTranslation();
  const skills = requiredSkillNames(job);
  const timeLabel = timeWindow(job, timezone);
  const place = job.locationLabel ?? job.customerName ?? "";
  const hot = job.priority === "URGENT" || job.priority === "HIGH";
  const locked = !canDragJob(job, true);

  const body = (
    <>
      <span className="flex flex-wrap items-center gap-1.5">
        <JobRef reference={job.reference} />
        <StatusPill status={job.status} compact />
        <PausedChip time={job.time} />
        {hot ? (
          <span className="inline-flex items-center gap-1 rounded bg-sig-orange-tint px-1.5 py-0.5 text-xs font-bold text-sig-orange-ink">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            {job.priority === "URGENT" ? t("b2b.dispatch.urgent", "Urgent") : t("b2b.dispatch.high", "High")}
          </span>
        ) : null}
        {locked ? <Lock className="h-3.5 w-3.5 text-ops-ink-subtle" aria-label={t("b2b.dispatch.locked", "Team locked")} /> : null}
      </span>
      <span className="mt-1 block truncate text-sm font-bold text-ops-ink">{job.title}</span>
      {place ? <span className="block truncate text-xs text-ops-ink-muted">{place}</span> : null}
      <span className="mt-0.5 block font-mono text-xs text-ops-ink-muted">
        {timeLabel || t("b2b.dispatch.noWindow", "No time window")}
      </span>
      {skills.length > 0 ? (
        <span className="mt-0.5 flex items-center gap-1 text-xs text-ops-ink-muted">
          <Wrench className="h-3 w-3" aria-hidden="true" />
          {t("b2b.dispatch.needs", "Needs")} {skills.join(", ")}
        </span>
      ) : null}
    </>
  );

  return (
    <li
      ref={rootRef}
      style={rootStyle}
      className={cn(
        "rounded border border-ops-border bg-ops-surface",
        isDragging && "opacity-40",
        overlay && "border-ops-border-strong shadow-lg"
      )}
    >
      <div className="flex items-stretch">
        {draggable ? handle : null}
        {overlay ? (
          <div className="min-w-0 flex-1 p-2">{body}</div>
        ) : (
          <Link
            href={`/ops/${orgId}/jobs/${job.id}`}
            className={cn("min-h-[44px] min-w-0 flex-1 p-2 hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-accent", !draggable && "rounded-l")}
          >
            {body}
          </Link>
        )}
      </div>
      {onAssignTo && draggable && !overlay ? (
        <div className="border-t border-ops-border px-2 py-1">
          <button
            type="button"
            onClick={() => onAssignTo(job)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded px-2 text-xs font-bold text-ops-ink hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-accent"
          >
            <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
            {t("b2b.dispatch.assignTo", "Assign to…")}
            <span className="sr-only"> {job.reference}</span>
          </button>
        </div>
      ) : null}
    </li>
  );
}
