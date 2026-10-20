"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/LocaleLink";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Clock, MapPin, Navigation } from "lucide-react";
import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { StatusPill, JobRef } from "@/b2b/components/StatusPill";
import { useOrg } from "@/b2b/context/OrgContext";
import { isB2bError } from "@/b2b/api/client";
import { qk } from "@/b2b/api/endpoints";
import type { Job } from "@/b2b/api/types";
import { applyPending } from "@/b2b/offline/apply";
import { useOffline } from "@/b2b/offline/OfflineProvider";
import { loadMyJobs, OFFLINE_READ } from "@/b2b/offline/read";
import { splitToday, techErrorMessage, techPlan } from "@/b2b/lib/tech-actions";
import { formatClock, formatDayLong, formatWindow } from "@/b2b/lib/tz-format";
import { useTranslation } from "@/lib/i18n";
import { SPLIT_QUERY } from "@/b2b/lib/split";
import { useMediaQuery } from "@/b2b/lib/useMediaQuery";
import { CalendarCheck } from "lucide-react";
import { plural } from "@/b2b/lib/plural";


function JobBlock({ job, tz, emphasised, orgId }: { job: Job; tz: string; emphasised?: boolean; orgId: string }) {
  const { t, locale } = useTranslation();
  const { submitAction } = useOffline();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plan = techPlan(job.status, t);
  const href = `/tech/${orgId}/jobs/${job.id}`;
  const quick = plan.primary && plan.primary.action !== "complete" ? plan.primary : null;

  const run = async () => {
    if (!quick) return;
    setBusy(true);
    setError(null);
    try {
      await submitAction(job, quick.action, undefined, quick.label);
    } catch (e) {
      setError(techErrorMessage(e, t).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={emphasised ? "rounded border-2 border-ops-border-strong bg-ops-surface p-4" : "rounded border border-ops-border bg-ops-surface p-4"}>
      <div className="flex items-start justify-between gap-3">
        <JobRef reference={job.reference} />
        <span className="inline-flex items-center gap-1 font-mono text-sm font-bold text-ops-accent">
          <Clock className="h-4 w-4" aria-hidden="true" /> {formatWindow(job.scheduledStart, job.scheduledEnd, tz, { t, locale })}
        </span>
      </div>
      <h2 className={emphasised ? "mt-2 text-2xl font-bold" : "mt-2 text-lg font-bold"}>
        <Link href={href} className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-ink">{job.title}</Link>
      </h2>
      {job.customerName ? <p className="text-ops-ink-muted">{job.customerName}</p> : null}
      {job.locationLabel ? <p className="mt-1 flex items-center gap-1.5 text-ops-ink"><MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />{job.locationLabel}</p> : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusPill status={job.status} />
        {job.status === "BLOCKED" && job.statusReason ? <span className="text-sm text-sig-vermilion-ink">{job.statusReason}</span> : null}
      </div>

      {emphasised ? (
        <div className="mt-4 space-y-2">
          {quick ? (
            <button type="button" disabled={busy} onClick={() => void run()} className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded bg-ops-ink px-4 text-lg font-bold text-white disabled:opacity-45">
              <Navigation className="h-5 w-5" aria-hidden="true" /> {busy ? t("b2b.tech.saving", "Saving…") : quick.label}
            </button>
          ) : null}
          <Link href={href} className="flex min-h-[48px] w-full items-center justify-center rounded border border-ops-border-strong bg-ops-surface px-4 font-bold">
            {plan.primary?.action === "complete" ? t("b2b.tech.today.openToComplete", "Open job to complete") : t("b2b.tech.today.openJob", "Open job")}
          </Link>
          {plan.idleMessage && !plan.primary ? <p className="text-sm text-ops-ink-muted">{plan.idleMessage}</p> : null}
          {error ? <p role="alert" className="rounded border border-sig-vermilion-ink/40 bg-sig-vermilion-tint p-2 text-sm text-sig-vermilion-ink">{error}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

function TodayContent() {
  const { t, locale } = useTranslation();
  const { orgId, me } = useOrg();
  const { items, online } = useOffline();
  const tz = me?.org.timezone ?? "UTC";
  const [showDone, setShowDone] = useState(false);
  const jobs = useQuery({ queryKey: qk.myJobs(orgId), queryFn: () => loadMyJobs(orgId), placeholderData: (prev) => prev, ...OFFLINE_READ });

  // The list as the technician left it: server copy + what is still waiting on the phone.
  const list = useMemo(() => (jobs.data?.items ?? []).map((j) => applyPending(j, items).job), [jobs.data, items]);
  const split = splitToday(list);
  const total = list.length;
  const staleSince = jobs.data?.cachedAt ?? null;
  const wide = useMediaQuery(SPLIT_QUERY);
  const router = useRouter();
  const nextId = jobs.isSuccess ? split.next?.id ?? null : null;

  // Tablet: /today opens the Next-up job. replace(), so Back leaves instead of bouncing to /today.
  useEffect(() => { if (wide && nextId) router.replace(`/tech/${orgId}/jobs/${nextId}`); }, [wide, nextId, orgId, router]);

  if (wide) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center text-ops-ink-muted">
        <h1 className="text-xl font-bold text-ops-ink">{t("b2b.tech.tab.today", "Today")}</h1>
        <CalendarCheck className="h-8 w-8" aria-hidden="true" />
        <p role="status">{jobs.isSuccess && total === 0 ? t("b2b.tech.split.emptyDetail", "Nothing to open. New jobs will appear here.") : t("b2b.tech.split.selectJob", "Select a job to see details.")}</p>
      </div>
    );
  }

  if (jobs.isPending) {
    return (
      <div role="status" aria-busy="true" className="space-y-3">
        <h1 className="text-xl font-bold">{t("b2b.tech.tab.today", "Today")}</h1>
        <span className="sr-only">{t("b2b.tech.today.loading", "Loading your jobs")}</span>
        <div className="h-8 w-2/3 animate-pulse rounded bg-ops-border motion-reduce:animate-none" />
        <div className="h-56 animate-pulse rounded bg-ops-border motion-reduce:animate-none" />
        <div className="h-24 animate-pulse rounded bg-ops-border motion-reduce:animate-none" />
      </div>
    );
  }
  if (jobs.isError) {
    const neverSynced = isB2bError(jobs.error) && jobs.error.code === "NETWORK";
    return (
      <div role="alert" className="rounded border border-sig-vermilion-ink/40 bg-sig-vermilion-tint p-4 text-sig-vermilion-ink">
        <h1 className="mb-1 text-xl font-bold">{t("b2b.tech.tab.today", "Today")}</h1>
        <p className="font-bold">
          {neverSynced ? t("b2b.tech.today.neverSynced", "Connect to the internet once to download your jobs.") : isB2bError(jobs.error) && jobs.error.isNotFound ? t("b2b.tech.today.noAccess", "You don't have access to this workspace.") : t("b2b.tech.today.loadError", "Couldn't load your jobs.")}
        </p>
        <button type="button" onClick={() => void jobs.refetch()} className="mt-3 min-h-[44px] rounded border border-sig-vermilion-ink bg-white px-4 font-bold">{t("b2b.tech.tryAgain", "Try again")}</button>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold">{formatDayLong(jobs.data.serverTime, tz, { t, locale })} · {plural(t, locale, "b2b.tech.today.jobCount", { one: "{n} job", other: "{n} jobs" }, total)}</h1>
      {staleSince ? (
        <p role="status" className="mt-2 rounded border border-sig-orange-ink/40 bg-sig-orange-tint p-2 text-sm font-bold text-sig-orange-ink">
          {(online ? t("b2b.tech.today.staleList", "Job list last updated {time}. Something may have changed.") : t("b2b.tech.today.offlineSaved", "Offline: showing saved data from {time}. Something may have changed.")).replace("{time}", formatClock(staleSince, tz, locale))}
          {online ? <button type="button" onClick={() => void jobs.refetch()} className="ml-2 min-h-[44px] rounded border border-sig-orange-ink px-3">{t("b2b.tech.today.refresh", "Refresh")}</button> : null}
        </p>
      ) : null}
      {total === 0 ? (
        <p className="mt-6 rounded border border-dashed border-ops-border-strong bg-ops-surface p-6 text-center text-ops-ink-muted">{t("b2b.tech.today.empty", "No jobs assigned to you today. List updated {time}.").replace("{time}", formatClock(staleSince ?? new Date(jobs.dataUpdatedAt).toISOString(), tz, locale))}</p>
      ) : null}

      {split.next ? <div className="mt-4"><JobBlock job={split.next} tz={tz} orgId={orgId} emphasised /></div> : null}

      {split.later.length > 0 ? (
        <section aria-labelledby="later" className="mt-6">
          <h2 id="later" className="text-xs font-bold uppercase tracking-wider text-ops-ink-subtle">{t("b2b.tech.today.later", "Later today")}</h2>
          <div className="mt-2 space-y-3">{split.later.map((job) => <JobBlock key={job.id} job={job} tz={tz} orgId={orgId} />)}</div>
        </section>
      ) : null}

      {split.done.length > 0 ? (
        <section className="mt-6">
          <button type="button" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)} className="flex min-h-[56px] w-full items-center justify-between rounded border border-ops-border bg-ops-surface px-4 font-bold">
            {t("b2b.tech.today.done", "Done today ({n})").replace("{n}", String(split.done.length))} {showDone ? <ChevronUp className="h-5 w-5" aria-hidden="true" /> : <ChevronDown className="h-5 w-5" aria-hidden="true" />}
          </button>
          {showDone ? <div className="mt-3 space-y-3">{split.done.map((job) => <JobBlock key={job.id} job={job} tz={tz} orgId={orgId} />)}</div> : null}
        </section>
      ) : null}
      {!staleSince ? <p className="mt-6 text-center text-xs text-ops-ink-subtle">{t("b2b.tech.today.lastUpdated", "Last updated {time}").replace("{time}", formatClock(new Date(jobs.dataUpdatedAt).toISOString(), tz, locale))}</p> : null}
    </>
  );
}

export default function TechTodayPage() {
  return (
    <RequirePermission permission="job.view">
      <TodayContent />
    </RequirePermission>
  );
}
