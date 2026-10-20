"use client";

import { useState } from "react";
import { Clock, Flag, OctagonAlert, CalendarClock, CircleCheck, CircleAlert } from "lucide-react";
import type { JobWorkspace } from "@/b2b/api/types";
import { JobRef, StatusPill } from "@/b2b/components/StatusPill";
import { formatInZone, listMissing } from "@/b2b/lib/workspace";
import { TransitionControl } from "./TransitionControl";
import { PausedChip } from "@/b2b/components/tech/PausedChip";
import { TimerChip } from "@/b2b/components/tech/TimerChip";
import { useTranslation } from "@/lib/i18n";

const PRIORITY: Record<string, string> = { LOW: "Low", NORMAL: "Normal", HIGH: "High", URGENT: "Urgent" };
const EXECUTION = new Set(["ON_SITE", "IN_PROGRESS", "COMPLETED", "REVIEW"]);

export function JobHeader({ job, timezone }: { job: JobWorkspace; timezone: string }) {
  const { t, locale } = useTranslation();
  const i18n = { t, locale };
  const [now] = useState(() => Date.now());
  const missing = job.missingCompletion ?? [];
  const hasReqs = job.requirements && (job.requirements.checklist || job.requirements.notes || job.requirements.photo || job.requirements.signature);
  const slaOverdue = !!job.slaDueAt && Date.parse(job.slaDueAt) < now && !["COMPLETED", "REVIEW", "CLOSED", "CANCELLED"].includes(job.status);
  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-72">
          <div className="flex flex-wrap items-center gap-2">
            <JobRef reference={job.reference} />
            <StatusPill status={job.status} />
            <PausedChip time={job.time} />
          </div>
          {job.time && job.time.state !== "NOT_STARTED" ? <div className="mt-1"><TimerChip time={job.time} estimateMin={job.estimatedDurationMin} /></div> : null}
          <h1 className="mt-2 break-words text-xl font-bold text-ops-ink md:text-2xl">{job.title}</h1>
        </div>
        <TransitionControl job={job} />
      </div>
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ops-ink-muted">
        {job.priority ? <div className="flex items-center gap-1.5"><dt className="sr-only">{t("b2b.job.hdr.priority", "Priority")}</dt><dd className="inline-flex items-center gap-1.5 font-bold text-ops-ink"><Flag className="h-4 w-4" aria-hidden="true" />{t("b2b.job.hdr.priorityLine", "{priority} priority").replace("{priority}", PRIORITY[job.priority] ? t(`b2b.jobs.priority.${job.priority}`, PRIORITY[job.priority]) : job.priority)}</dd></div> : null}
        {job.slaDueAt ? <div className="flex items-center gap-1.5"><dt className="sr-only">{t("b2b.job.hdr.sla", "SLA")}</dt><dd className={`inline-flex items-center gap-1.5 ${slaOverdue ? "font-bold text-sig-vermilion-ink" : ""}`}><Clock className="h-4 w-4" aria-hidden="true" />{t("b2b.job.hdr.sla", "SLA")} <span className="font-mono">{formatInZone(job.slaDueAt, timezone, undefined, locale)}</span>{slaOverdue ? ` ${t("b2b.job.hdr.overdue", "(overdue)")}` : ""}</dd></div> : null}
        <div className="flex items-center gap-1.5"><dt className="sr-only">{t("b2b.job.hdr.schedule", "Schedule")}</dt><dd className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4" aria-hidden="true" />
          {job.scheduledStart ? <span className="font-mono">{formatInZone(job.scheduledStart, timezone, undefined, locale)} – {formatInZone(job.scheduledEnd, timezone, { timeStyle: "short" }, locale)}</span> : t("b2b.job.hdr.notScheduled", "Not scheduled")}
        </dd></div>
      </dl>
      {job.status === "BLOCKED" ? (
        <p role="note" className="flex items-start gap-2 rounded border-l-4 border-sig-vermilion-ink bg-sig-vermilion-tint p-3 text-sm text-sig-vermilion-ink">
          <OctagonAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span><strong>{t("b2b.job.hdr.blocked", "Blocked:")}</strong> {job.statusReason || t("b2b.job.hdr.noReason", "No reason given.")}</span>
        </p>
      ) : null}
      {hasReqs && EXECUTION.has(job.status) ? (
        <p className={`inline-flex items-center gap-1.5 text-sm font-bold ${missing.length ? "text-sig-orange-ink" : "text-sig-green-ink"}`}>
          {missing.length ? <CircleAlert className="h-4 w-4" aria-hidden="true" /> : <CircleCheck className="h-4 w-4" aria-hidden="true" />}
          {missing.length ? t("b2b.job.hdr.notReady", "Not ready to complete. Missing: {items}").replace("{items}", listMissing(missing, i18n)) : t("b2b.job.hdr.ready", "Ready to complete")}
        </p>
      ) : null}
    </header>
  );
}
