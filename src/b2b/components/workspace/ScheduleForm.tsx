"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/components/ui/Toast";
import { checkSchedule, qk, scheduleJob } from "@/b2b/api/endpoints";
import type { JobWorkspace } from "@/b2b/api/types";
import { useOrg } from "@/b2b/context/OrgContext";
import {
  checkableWindow, describeB2bError, formatInZone, isoToZonedInput, movesBackToScheduled, SCHEDULE_CHECK_DEBOUNCE_MS, scheduleGate, validateWindow,
  type DescribedError,
} from "@/b2b/lib/workspace";
import { ConflictList } from "./ConflictList";
import { TransitionError } from "./TransitionControl";
import { Banner, btnClass, Card, fieldClass, ReasonField } from "./ui";
import { useJobCache } from "./useJobCache";

export function ScheduleForm({ job, timezone }: { job: JobWorkspace; timezone: string }) {
  const { t } = useTranslation();
  const { orgId, can } = useOrg();
  const toast = useToast();
  const { merge, refresh } = useJobCache(orgId, job.id);
  const startId = useId();
  const endId = useId();
  const [start, setStart] = useState(() => isoToZonedInput(job.scheduledStart, timezone));
  const [end, setEnd] = useState(() => isoToZonedInput(job.scheduledEnd, timezone));
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [error, setError] = useState<DescribedError | null>(null);

  // Debounced dry run for the window the user picked (read-only; another dispatcher can still win).
  const picked = useMemo(() => checkableWindow(start, end, timezone), [start, end, timezone]);
  const [debounced, setDebounced] = useState<{ start: string; end: string } | null>(null);
  useEffect(() => {
    if (!picked) return; // `settled` below ignores a stale debounced window
    const id = setTimeout(() => setDebounced(picked), SCHEDULE_CHECK_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [picked]);
  const settled = !!picked && !!debounced && picked.start === debounced.start && picked.end === debounced.end;
  const allowed = can("job.schedule");
  const check = useQuery({
    queryKey: [...qk.job(orgId, job.id), "schedule-check", debounced?.start, debounced?.end],
    queryFn: ({ signal }) => checkSchedule(orgId, job.id, debounced!, signal),
    enabled: allowed && settled,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });

  const mutation = useMutation({
    mutationFn: (v: { start: string; end: string; override?: { reason: string } }) => scheduleJob(orgId, job.id, { ...v, expectedVersion: job.version }),
    onSuccess: (updated) => { merge(updated); setError(null); setReason(""); toast.push({ message: t("b2b.job.scheduleUpdated", "Schedule updated"), tone: "success" }); },
    onError: (e) => setError(describeB2bError(e)),
  });

  if (!allowed) return null;

  // Conflicts: the save's 409 (fresher) wins over the dry run. A failed dry run does not block: the save still enforces.
  const checkData = settled && check.isSuccess ? check.data : undefined;
  const conflicts = error?.conflicts?.length ? error.conflicts : (checkData?.conflicts ?? []);
  const checking = !!picked && (!settled || check.isFetching);
  const gate = scheduleGate({
    conflicts,
    apiCanOverride: error?.conflicts?.length ? !error.overrideForbidden : (checkData?.canOverride ?? false),
    roleCanOverride: can("dispatch.override_conflict"),
    reason,
    checking,
  });
  const movesBack = movesBackToScheduled(checkData);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null); setError(null);
    const w = validateWindow(start, end, timezone);
    if (!w.ok) { setLocalError(w.message); return; }
    if (!gate.canSave) return;
    mutation.mutate({ start: w.start, end: w.end, override: gate.showOverride ? { reason: reason.trim() } : undefined });
  };

  const explain =
    gate.block === "cannot-override" ? t("b2b.job.cannotOverride", "Your role can't override conflicts. Pick another time.")
    : gate.block === "reason-required" ? t("b2b.job.reasonToSchedule", "Enter a reason (at least 3 characters) to schedule anyway.")
    : null;

  return (
    <Card title={t("b2b.job.schedule", "Schedule")} icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-ops-ink-muted">
          {job.scheduledStart ? <>{t("b2b.job.currently", "Currently")} <strong className="text-ops-ink">{formatInZone(job.scheduledStart, timezone)}</strong> {t("b2b.job.to", "to")} {formatInZone(job.scheduledEnd, timezone, { timeStyle: "short" })}. </> : `${t("b2b.job.notScheduled", "Not scheduled yet.")} `}
          {t("b2b.job.timesIn", "Times are in")} {timezone}.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={startId} className="mb-1 block text-sm font-bold text-ops-ink">{t("b2b.job.start", "Start")}</label>
            <input id={startId} type="datetime-local" value={start} onChange={(e) => { setStart(e.target.value); setError(null); }} className={`${fieldClass} min-h-[44px]`} required />
          </div>
          <div>
            <label htmlFor={endId} className="mb-1 block text-sm font-bold text-ops-ink">{t("b2b.job.end", "End")}</label>
            <input id={endId} type="datetime-local" value={end} onChange={(e) => { setEnd(e.target.value); setError(null); }} className={`${fieldClass} min-h-[44px]`} required />
          </div>
        </div>
        <p role="status" className="min-h-[1.25rem] text-xs text-ops-ink-muted">
          {checking ? t("b2b.job.checking", "Checking for conflicts…")
            : checkData && checkData.conflicts.length === 0 ? t("b2b.job.noConflicts", "No conflicts for this time.")
            : check.isError && settled ? t("b2b.job.checkFailed", "Couldn't check for conflicts. Saving will check again.") : ""}
        </p>
        {localError ? <Banner tone="danger" role="alert">{localError}</Banner> : null}
        <ConflictList conflicts={conflicts} />
        {movesBack ? (
          <Banner tone="info" role="status">{t("b2b.job.movesBack", "Saving moves this job back to Scheduled, and the team will need to be dispatched again.")}</Banner>
        ) : null}
        {gate.showOverride ? <ReasonField label={t("b2b.job.overrideReason", "Override reason")} value={reason} onChange={setReason} disabled={mutation.isPending} hint={t("b2b.job.overrideHint", "Required to schedule anyway. Admins are notified and the reason is logged.")} /> : null}
        {explain ? <p className="text-sm text-ops-ink-muted" id={`${startId}-why`}>{explain}</p> : null}
        {error && error.kind === "stale" ? <TransitionError error={error} onReload={() => { setError(null); void refresh(); }} /> : null}
        {error && error.kind !== "stale" && conflicts.length === 0 ? <Banner tone="danger" role="alert">{error.message}</Banner> : null}
        <button type="submit" disabled={mutation.isPending || !gate.canSave} aria-describedby={explain ? `${startId}-why` : undefined} aria-busy={mutation.isPending || undefined} className={btnClass(gate.showOverride ? "danger" : "primary")}>
          {gate.showOverride ? t("b2b.job.scheduleAnyway", "Schedule anyway") : t("b2b.job.saveSchedule", "Save schedule")}
        </button>
      </form>
    </Card>
  );
}
