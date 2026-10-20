"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, ChevronUp, CloudOff } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Job } from "@/b2b/api/types";
import { JobRef, StatusPill } from "@/b2b/components/StatusPill";
import { useOrg } from "@/b2b/context/OrgContext";
import { qk } from "@/b2b/api/endpoints";
import { applyPending } from "@/b2b/offline/apply";
import { useOffline } from "@/b2b/offline/OfflineProvider";
import { loadMyJobs, OFFLINE_READ } from "@/b2b/offline/read";
import { splitToday } from "@/b2b/lib/tech-actions";
import { splitRoute } from "@/b2b/lib/split";
import { formatClock, formatDayLong, formatWindow } from "@/b2b/lib/tz-format";
import { formatHms, shownSeconds } from "@/b2b/lib/work-time";
import { PausedChip } from "./PausedChip";
import { useNowTick } from "./useNowTick";
import { plural } from "@/b2b/lib/plural";

export const JOB_HEADING_ID = "tech-job-heading";

function RowTimer({ job }: { job: Job }) {
  const { t } = useTranslation();
  const running = job.time?.state === "RUNNING";
  const now = useNowTick(running);
  if (!job.time || job.time.state === "NOT_STARTED") return null;
  if (job.time.state === "PAUSED") return <PausedChip time={job.time} />;
  return <span className="font-mono text-xs font-bold text-sig-blue-ink"><span className="sr-only">{job.time.state === "RUNNING" ? t("b2b.tech.timer.running", "Running") : t("b2b.tech.timer.workedSr", "Worked")} </span>⏱ {formatHms(shownSeconds(job.time, now) ?? 0)}</span>;
}

function Row({ job, tz, selected, waiting, attention, orgId }: { job: Job; tz: string; selected: boolean; waiting: number; attention: boolean; orgId: string }) {
  const { t, locale } = useTranslation();
  return (
    <li>
      <Link
        href={`/tech/${orgId}/jobs/${job.id}`}
        aria-current={selected ? "page" : undefined}
        onClick={(e) => { if (e.detail === 0) setTimeout(() => document.getElementById(JOB_HEADING_ID)?.focus(), 200); }} // keyboard selection moves focus to the job; touch does not
        className={cn("block min-h-[72px] border-l-4 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ops-ink", selected ? "border-ops-accent bg-sig-blue-tint" : "border-transparent hover:bg-ops-canvas")}
      >
        <span className="flex items-center justify-between gap-2"><span className="font-mono text-sm font-bold text-ops-accent">{formatWindow(job.scheduledStart, job.scheduledEnd, tz, { t, locale })}</span><JobRef reference={job.reference} /></span>
        <span className="mt-0.5 block truncate text-[17px] font-bold">{job.title}</span>
        <span className="block truncate text-sm text-ops-ink-muted">{[job.customerName, job.locationLabel].filter(Boolean).join(" · ")}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusPill status={job.status} compact />
          <RowTimer job={job} />
          {attention ? <span className="inline-flex items-center gap-1 text-xs font-bold text-sig-vermilion-ink"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />{t("b2b.tech.split.attentionBadge", "Needs attention")}</span>
            : waiting > 0 ? <span className="inline-flex items-center gap-1 text-xs font-bold text-sig-orange-ink"><CloudOff className="h-3.5 w-3.5" aria-hidden="true" />{t("b2b.tech.split.waitingBadge", "{n} waiting").replace("{n}", String(waiting))}</span> : null}
        </span>
      </Link>
    </li>
  );
}

/** Tablet list pane: selectable rows of today's jobs. Same query as the phone list, so nothing is fetched twice. */
export function JobListPane() {
  const { t, locale } = useTranslation();
  const { orgId, me } = useOrg();
  const { items, online } = useOffline();
  const pathname = usePathname();
  const tz = me?.org.timezone ?? "UTC";
  const selectedId = splitRoute(pathname, orgId).selectedJobId;
  const [showDone, setShowDone] = useState(false);
  const jobs = useQuery({ queryKey: qk.myJobs(orgId), queryFn: () => loadMyJobs(orgId), placeholderData: (prev) => prev, ...OFFLINE_READ });
  const list = useMemo(() => (jobs.data?.items ?? []).map((j) => applyPending(j, items).job), [jobs.data, items]);
  const split = splitToday(list);
  const byJob = (id: string) => {
    const mine = items.filter((i) => i.jobId === id);
    return { waiting: mine.filter((i) => i.status === "waiting" || i.status === "sending").length, attention: mine.some((i) => i.status === "conflict" || i.status === "failed") };
  };
  const row = (job: Job) => <Row key={job.id} job={job} tz={tz} orgId={orgId} selected={job.id === selectedId} {...byJob(job.id)} />;

  if (jobs.isPending) {
    return <div role="status" aria-busy="true" className="space-y-2 p-3"><span className="sr-only">{t("b2b.tech.today.loading", "Loading your jobs")}</span>{[0, 1, 2].map((i) => <div key={i} className="h-[72px] animate-pulse rounded bg-ops-border motion-reduce:animate-none" />)}</div>;
  }
  if (jobs.isError) {
    return (
      <div role="alert" className="m-3 rounded border border-sig-vermilion-ink/40 bg-sig-vermilion-tint p-3 text-sig-vermilion-ink">
        <p className="font-bold">{t("b2b.tech.today.loadError", "Couldn't load your jobs.")}</p>
        <button type="button" onClick={() => void jobs.refetch()} className="mt-2 min-h-[44px] rounded border border-sig-vermilion-ink bg-white px-4 font-bold">{t("b2b.tech.tryAgain", "Try again")}</button>
      </div>
    );
  }
  const stale = jobs.data.cachedAt;
  return (
    <div>
      <div className="border-b border-ops-border px-3 py-2">
        <h2 className="text-base font-bold">{formatDayLong(jobs.data.serverTime, tz, { t, locale })}</h2>
        <p className="text-sm text-ops-ink-muted">{plural(t, locale, "b2b.tech.today.jobCount", { one: "{n} job", other: "{n} jobs" }, list.length)}</p>
      </div>
      {stale ? (
        <p role="status" className="m-2 rounded border border-sig-orange-ink/40 bg-sig-orange-tint p-2 text-sm font-bold text-sig-orange-ink">
          {(online ? t("b2b.tech.today.staleList", "Job list last updated {time}. Something may have changed.") : t("b2b.tech.today.offlineSaved", "Offline: showing saved data from {time}. Something may have changed.")).replace("{time}", formatClock(stale, tz, locale))}
        </p>
      ) : null}
      {list.length === 0 ? <p className="m-3 rounded border border-dashed border-ops-border-strong p-4 text-center text-ops-ink-muted">{t("b2b.tech.today.empty", "No jobs assigned to you today. List updated {time}.").replace("{time}", formatClock(stale ?? new Date(jobs.dataUpdatedAt).toISOString(), tz, locale))}</p> : null}
      {split.next ? <section aria-label={t("b2b.tech.split.nextUp", "Next up")}><h3 className="px-3 pt-3 text-xs font-bold uppercase tracking-wider text-ops-ink-subtle">{t("b2b.tech.split.nextUp", "Next up")}</h3><ul className="mt-1">{row(split.next)}</ul></section> : null}
      {split.later.length > 0 ? <section aria-label={t("b2b.tech.today.later", "Later today")}><h3 className="px-3 pt-3 text-xs font-bold uppercase tracking-wider text-ops-ink-subtle">{t("b2b.tech.today.later", "Later today")}</h3><ul className="mt-1 divide-y divide-ops-border">{split.later.map(row)}</ul></section> : null}
      {split.done.length > 0 ? (
        <section className="mt-3">
          <button type="button" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)} className="flex min-h-[48px] w-full items-center justify-between border-y border-ops-border px-3 font-bold">
            {t("b2b.tech.today.done", "Done today ({n})").replace("{n}", String(split.done.length))} {showDone ? <ChevronUp className="h-5 w-5" aria-hidden="true" /> : <ChevronDown className="h-5 w-5" aria-hidden="true" />}
          </button>
          {showDone ? <ul className="divide-y divide-ops-border">{split.done.map(row)}</ul> : null}
        </section>
      ) : null}
    </div>
  );
}
