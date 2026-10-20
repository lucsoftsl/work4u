"use client";

import { useState } from "react";
import Link from "next/link";
import { getJob } from "@/b2b/api/endpoints";
import { AlertTriangle, Camera, CheckCircle2, Clock, FileText, PauseCircle, PenLine, Puzzle, RefreshCw, RotateCcw, RotateCw, X, Zap } from "lucide-react";
import { useOrg } from "@/b2b/context/OrgContext";
import { discardItem, discardJob, resolveWithFreshData, retryItem } from "@/b2b/offline/queue";
import { useOffline } from "@/b2b/offline/OfflineProvider";
import { useStorage } from "@/b2b/offline/useStorage";
import type { QueueItem } from "@/b2b/offline/types";
import { formatClock } from "@/b2b/lib/tz-format";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { plural } from "@/b2b/lib/plural";

const KIND_ICON = { action: Zap, checklist: CheckCircle2, photo: Camera, signature: PenLine, pause: PauseCircle, "resume-work": Zap, undo: RotateCcw, part: Puzzle } as const;
const STATUS: Record<QueueItem["status"], { label: string; key: string; cls: string; Icon: typeof Clock }> = {
  waiting: { label: "Waiting", key: "waiting", cls: "bg-sig-orange-tint text-sig-orange-ink", Icon: Clock },
  sending: { label: "In progress", key: "sending", cls: "bg-sig-blue-tint text-sig-blue-ink", Icon: RefreshCw },
  failed: { label: "Failed", key: "failed", cls: "bg-sig-vermilion-tint text-sig-vermilion-ink", Icon: AlertTriangle },
  conflict: { label: "Draft", key: "conflict", cls: "bg-sig-orange-tint text-sig-orange-ink", Icon: FileText },
};

/** Queue item statuses with their English fallback, for the locale guard. */
export const SYNC_STATUS_LABELS: ReadonlyArray<readonly [key: string, label: string]> = Object.values(STATUS).map((s) => [s.key, s.label] as const);

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(bytes > 1024 ** 3 ? 0 : 1);

export function SyncView() {
  const { t, locale } = useTranslation();
  const { orgId, me } = useOrg();
  const tz = me?.org.timezone ?? "UTC";
  const { items, online, waitingCount, syncState, lastSync, flush } = useOffline();
  const storage = useStorage();
  const [freshError, setFreshError] = useState<string | null>(null);
  const [discarded, setDiscarded] = useState(false);
  const retryFresh = async (jobId: string) => {
    setFreshError(null);
    try {
      await resolveWithFreshData(orgId, jobId, () => getJob(orgId, jobId));
      await flush();
    } catch {
      setFreshError(jobId);
    }
  };
  const conflicts = items.filter((i) => i.status === "conflict");
  const conflictJobs = [...new Set(conflicts.map((i) => i.jobId))];
  const pending = items.filter((i) => i.status !== "conflict");
  const clock = (iso: string) => formatClock(iso, tz, locale);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">{t("b2b.sync.title", "Sync")}</h1>

      {!online ? (
        <section role="status" className="rounded border-2 border-sig-orange-ink bg-sig-orange-tint p-4 text-sig-orange-ink">
          <p className="font-bold">{waitingCount > 0 ? t("b2b.sync.offlineWaiting", "Offline · {changes} waiting").replace("{changes}", plural(t, locale, "b2b.sync.changes", { one: "{n} change", other: "{n} changes" }, waitingCount)) : t("b2b.sync.offline", "Offline")}</p>
          <p className="text-sm">{t("b2b.sync.savedOnPhone", "Saved on this phone. We'll send them when you're back online.")}</p>
        </section>
      ) : null}

      {storage?.low ? (
        <section role="status" className="rounded border-2 border-sig-orange-ink bg-sig-orange-tint p-4 text-sig-orange-ink">
          <p className="font-bold">{t("b2b.sync.storageLow", "Phone storage almost full")}</p>
          <p className="text-sm">{t("b2b.sync.storageLowHint", "Photos waiting to send use space. Connect to Wi-Fi so they can go, or discard drafts you don't need.")}</p>
        </section>
      ) : null}

      {conflictJobs.map((jobId) => {
        const group = conflicts.filter((i) => i.jobId === jobId);
        const photos = group.filter((i) => i.kind === "photo").length;
        return (
          <section key={jobId} aria-label={t("b2b.sync.conflictLabel", "Conflict {ref}").replace("{ref}", group[0].jobRef ?? "")} className="rounded border border-ops-border bg-ops-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-sm font-bold">{group[0].jobRef ?? t("b2b.sync.job", "Job")} · {t("b2b.sync.conflict", "Conflict")}</p>
              <span className="inline-flex items-center gap-1 rounded bg-sig-orange-tint px-2 py-1 text-xs font-bold text-sig-orange-ink"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> {t("b2b.sync.needsYou", "Needs you")}</span>
            </div>
            <p className="mt-2">{group[0].error}</p>
            <p className="mt-1 text-sm text-ops-ink-muted">{photos
              ? t("b2b.sync.keptWithPhotos", "{items} kept, including {photos}.").replace("{items}", plural(t, locale, "b2b.sync.items", { one: "{n} item", other: "{n} items" }, group.length)).replace("{photos}", plural(t, locale, "b2b.sync.photos", { one: "{n} photo", other: "{n} photos" }, photos))
              : t("b2b.sync.kept", "{items} kept.").replace("{items}", plural(t, locale, "b2b.sync.items", { one: "{n} item", other: "{n} items" }, group.length))}</p>
            {freshError === jobId ? <p role="alert" className="mt-2 text-sm text-sig-vermilion-ink">{t("b2b.sync.retryFreshFailed", "Couldn't load the latest version of this job. Check your connection and try again.")}</p> : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" disabled={!online} onClick={() => void retryFresh(jobId)} className="col-span-2 min-h-[48px] rounded bg-ops-accent font-bold text-white disabled:opacity-45">{t("b2b.sync.retryFresh", "Retry with latest")}</button>
              <button type="button" onClick={() => void discardJob(orgId, jobId).then(() => setDiscarded(true))} className="min-h-[48px] rounded border-2 border-ops-border-strong font-bold">{t("b2b.sync.discardDraft", "Discard draft")}</button>
              <Link href={`/tech/${orgId}/jobs/${jobId}`} className="flex min-h-[48px] items-center justify-center rounded bg-ops-ink font-bold text-white">{t("b2b.sync.viewJob", "View job")}</Link>
            </div>
          </section>
        );
      })}

      <section aria-labelledby="pending-h">
        <div className="flex items-baseline justify-between">
          <h2 id="pending-h" className="text-lg font-bold">{t("b2b.sync.pendingTitle", "Pending queue items")}</h2>
          <span className="font-mono text-sm text-ops-ink-muted">{plural(t, locale, "b2b.sync.items", { one: "{n} item", other: "{n} items" }, pending.length)}</span>
        </div>
        {pending.length === 0 ? (
          <p className="mt-3 rounded border border-dashed border-ops-border-strong bg-ops-surface p-5 text-center text-ops-ink-muted">{discarded ? t("b2b.sync.draftDiscarded", "Draft discarded. No queued changes.") : lastSync ? t("b2b.sync.empty", "No queued changes.") : t("b2b.sync.emptyNeverSynced", "No queued changes. Nothing has been synced from this phone yet.")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((item) => {
              const Kind = KIND_ICON[item.kind];
              const st = STATUS[item.status];
              return (
                <li key={item.id} className="flex items-center gap-3 rounded border border-ops-border bg-ops-surface p-3">
                  <Kind className="h-6 w-6 shrink-0 text-ops-ink-muted" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{item.label}{item.jobRef ? ` · ${item.jobRef}` : ""}</p>
                    <p className="font-mono text-sm text-ops-ink-muted">{t("b2b.sync.addedAt", "Added at {time}").replace("{time}", clock(item.createdAt))}</p>
                    {item.error && item.status !== "sending" ? <p className="text-sm text-ops-ink-muted">{item.error}</p> : null}
                  </div>
                  <span className={cn("inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-sm font-bold", st.cls)}><st.Icon className="h-4 w-4" aria-hidden="true" /> {t(`b2b.sync.status.${st.key}`, st.label)}</span>
                  {item.status === "failed" ? (
                    <>
                      <button type="button" aria-label={t("b2b.sync.retry", "Retry {label}").replace("{label}", item.label)} onClick={() => void retryItem(item.id, orgId).then(flush)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded border-2 border-ops-border-strong"><RotateCw className="h-5 w-5" aria-hidden="true" /></button>
                      <button type="button" aria-label={t("b2b.sync.discard", "Discard {label}").replace("{label}", item.label)} onClick={() => void discardItem(item.id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded border-2 border-sig-vermilion-ink text-sig-vermilion-ink"><X className="h-5 w-5" aria-hidden="true" /></button>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <dl className="rounded border border-ops-border bg-ops-surface p-4">
        <div className="flex justify-between gap-2"><dt className="text-ops-ink-muted">{t("b2b.sync.lastSync", "Last successful sync")}</dt><dd className="font-mono font-bold">{lastSync ? clock(lastSync) : t("b2b.sync.notYet", "Not yet")}</dd></div>
        {storage ? (
          <div className="mt-3 flex justify-between gap-2"><dt className="text-ops-ink-muted">{t("b2b.sync.localStorage", "Local storage")}</dt><dd className="font-mono font-bold">{mb(storage.usage)} MB / {mb(storage.quota)} MB</dd></div>
        ) : null}
      </dl>
      {storage ? (
        <div className="-mt-3 h-2 rounded bg-ops-border" role="presentation"><div className={cn("h-2 rounded", storage.low ? "bg-sig-orange-ink" : "bg-ops-accent")} style={{ width: `${Math.min(100, Math.round(storage.ratio * 100))}%` }} /></div>
      ) : null}

      <button
        type="button"
        disabled={!online || syncState === "syncing" || waitingCount === 0}
        onClick={() => void flush()}
        className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded bg-ops-ink px-4 text-lg font-bold text-white disabled:opacity-45"
      >
        <RefreshCw className={cn("h-5 w-5", syncState === "syncing" && "motion-safe:animate-spin")} aria-hidden="true" />
        {syncState === "syncing" ? t("b2b.sync.sending", "Sending…") : t("b2b.sync.syncNow", "Sync now ({items})").replace("{items}", plural(t, locale, "b2b.sync.items", { one: "{n} item", other: "{n} items" }, waitingCount))}
      </button>
    </div>
  );
}
