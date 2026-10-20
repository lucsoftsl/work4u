"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "@/components/LocaleLink";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Camera, CloudOff, MapPin, Navigation, Pause, PauseCircle, Phone, Play } from "lucide-react";
import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { StatusPill, JobRef } from "@/b2b/components/StatusPill";
import type { SignaturePadHandle } from "@/b2b/components/tech/SignaturePad";
import { PadBoundary, preloadSignaturePad } from "@/b2b/components/tech/PadBoundary";
import { ActionDock } from "@/b2b/components/tech/ActionDock";
import { PartsSection } from "@/b2b/components/tech/PartsSection";
import { PauseSheet } from "@/b2b/components/tech/PauseSheet";
import { PausedChip } from "@/b2b/components/tech/PausedChip";
import { TimerChip } from "@/b2b/components/tech/TimerChip";
import { UndoToast } from "@/b2b/components/tech/UndoToast";
import { SignatureFallbackNotice } from "@/b2b/components/tech/SignatureFallbackNotice";
import { useOrg } from "@/b2b/context/OrgContext";
import { qk } from "@/b2b/api/endpoints";
import { applyPending } from "@/b2b/offline/apply";
import { useOffline } from "@/b2b/offline/OfflineProvider";
import { loadJob, OFFLINE_READ } from "@/b2b/offline/read";
import { deleteDraft, readDraft, saveDraft } from "@/b2b/offline/store";
import { completionLabel, missingForCompletion, techErrorMessage, techPlan } from "@/b2b/lib/tech-actions";
import { formatClock, formatWindow } from "@/b2b/lib/tz-format";
import { useTranslation } from "@/lib/i18n";
import { setTitleState } from "@/b2b/lib/title-store";
import { plural } from "@/b2b/lib/plural";

// Loaded only on the completion step, so the pad library isn't part of the Today screen.
const SignaturePad = dynamic(() => import("@/b2b/components/tech/SignaturePad"), { ssr: false, loading: () => <div className="h-40 animate-pulse rounded bg-ops-border motion-reduce:animate-none" /> });

const MIN_REASON = 3;
const DRAFT_SAVE_MS = 500;

function JobScreen({ jobId }: { jobId: string }) {
  const { t, locale } = useTranslation();
  const { orgId, me } = useOrg();
  const tz = me?.org.timezone ?? "UTC";
  const { items, online, submitAction, submitChecklist, submitPause, submitResumeWork, submitPhoto, queueSignature } = useOffline();
  const fileRef = useRef<HTMLInputElement>(null);
  const padRef = useRef<SignaturePadHandle>(null);

  const [notes, setNotes] = useState("");
  const [signatureName, setSignatureName] = useState("");
  const [signatureDrawn, setSignatureDrawn] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [padFailed, setPadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [pausing, setPausing] = useState(false);
  const pauseTrigger = useRef<HTMLButtonElement>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const query = useQuery({ queryKey: qk.job(orgId, jobId), queryFn: () => loadJob(orgId, jobId), placeholderData: (prev) => prev, ...OFFLINE_READ });

  // Typed notes and the customer's name survive a closed tab, a dead battery or a conflict.
  useEffect(() => {
    void readDraft(orgId, jobId).then((d) => {
      if (d) { setNotes(d.notes); setSignatureName(d.signatureName); }
      setDraftLoaded(true);
    });
  }, [orgId, jobId]);
  useEffect(() => {
    if (!draftLoaded) return;
    const t = setTimeout(() => void (notes || signatureName ? saveDraft(orgId, jobId, notes, signatureName) : deleteDraft(orgId, jobId)), DRAFT_SAVE_MS);
    return () => clearTimeout(t);
  }, [notes, signatureName, draftLoaded, orgId, jobId]);

  useEffect(() => { preloadSignaturePad(); }, []);

  const view = useMemo(() => (query.data ? applyPending(query.data, items) : null), [query.data, items]);
  const onPad = useCallback((drawn: boolean) => setSignatureDrawn(drawn), []);
  const jobRefForTitle = view?.job.reference;
  useEffect(() => setTitleState({ jobRef: jobRefForTitle }), [jobRefForTitle]);

  if (query.isPending) {
    return <div role="status" aria-busy="true" className="space-y-3"><span className="sr-only">{t("b2b.tech.job.loading", "Loading job")}</span><div className="h-10 animate-pulse rounded bg-ops-border motion-reduce:animate-none" /><div className="h-64 animate-pulse rounded bg-ops-border motion-reduce:animate-none" /></div>;
  }
  if (query.isError || !view) {
    return (
      <div role="alert" className="rounded border border-sig-vermilion-ink/40 bg-sig-vermilion-tint p-4 text-sig-vermilion-ink">
        <p className="font-bold">{online ? t("b2b.tech.job.loadError", "Couldn't load this job.") : t("b2b.tech.job.notSaved", "This job isn't saved on your phone yet. Connect once to open it.")}</p>
        <button type="button" onClick={() => void query.refetch()} className="mt-3 min-h-[44px] rounded border border-sig-vermilion-ink bg-white px-4 font-bold">{t("b2b.tech.tryAgain", "Try again")}</button>
      </div>
    );
  }

  const server = query.data;
  const job = view.job;
  const plan = techPlan(job.status, t);
  const isComplete = plan.primary?.action === "complete";
  const editable = job.status === "IN_PROGRESS" || job.status === "ON_SITE";
  const paused = job.time?.state === "PAUSED";
  const canPause = job.status === "IN_PROGRESS" && !paused;
  const pendingPartIds = new Set(items.filter((i) => i.jobId === jobId && i.kind === "part" && i.partId && i.status !== "conflict").map((i) => i.partId!));
  const held = items.filter((i) => i.jobId === jobId && i.status === "conflict");
  const missing = missingForCompletion(job, { notes, signatureName, newPhotoKeys: [], queuedPhotos: view.pendingPhotos, signatureDrawn: job.requirements.signature && !padFailed ? signatureDrawn : undefined });
  const tel = server.customer.phone ? `tel:${server.customer.phone.replace(/[^+\d]/g, "")}` : null;

  const guard = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    setNote(null);
    try { await fn(); } catch (e) { setError(techErrorMessage(e, t).message); } finally { setBusy(false); }
  };

  const perform = (action: Parameters<typeof submitAction>[1], body?: Parameters<typeof submitAction>[2], label?: string) =>
    guard(async () => {
      const res = await submitAction(job, action, body, label);
      if (res.queued) setNote(t("b2b.tech.job.savedQueued", "Saved on your phone. It will be sent when you're back online."));
    });

  const doPause = (reason: Parameters<typeof submitPause>[1], pauseNote?: string) =>
    guard(async () => {
      const res = await submitPause(job, reason, pauseNote);
      setPausing(false);
      pauseTrigger.current?.focus();
      setNote(res.queued ? t("b2b.tech.pause.pausedQueued", "Paused. Saved on this device.") : t("b2b.tech.pause.paused", "Paused."));
    });
  const resumeWorkNow = () =>
    guard(async () => { await submitResumeWork(job); });

  const complete = () => {
    if (paused) {
      setError(t("b2b.tech.err.jobPaused", "Resume work first, then complete the job."));
      return Promise.resolve();
    }
    if (missing.length > 0) {
      setError(t("b2b.tech.err.notCompleteItems", "Not complete yet: {items}.").replace("{items}", missing.map((m) => completionLabel(m, t)).join(", ")));
      return Promise.resolve();
    }
    return guard(async () => {
      const png = job.requirements.signature ? await padRef.current?.toBlob() : null;
      if (png) await queueSignature(job, png);
      const res = await submitAction(job, "complete", { notes: notes.trim() || undefined, signatureName: signatureName.trim() || undefined }, t("b2b.tech.step.completeJob", "Complete job"));
      await deleteDraft(orgId, jobId);
      setNote(res.queued ? t("b2b.tech.job.completedQueued", "Job completed. Will send when online.") : t("b2b.tech.job.completed", "Job completed."));
    });
  };

  const confirmBlock = async () => {
    if (reason.trim().length < MIN_REASON) return;
    await perform("block", { reason: reason.trim() }, t("b2b.tech.job.blockedLabel", "Blocked"));
    setBlocking(false);
    setReason("");
  };

  return (
    <div className="space-y-5">
      <Link href={`/tech/${orgId}/today`} className="inline-flex min-h-[44px] items-center gap-1 font-bold text-ops-accent md:hidden"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("b2b.tech.tab.today", "Today")}</Link>

      {query.data.cachedAt ? (
        <p role="status" className="rounded border border-sig-orange-ink/40 bg-sig-orange-tint p-2 text-sm font-bold text-sig-orange-ink">{t("b2b.tech.job.savedCopy", "Saved copy from {time}. Changes will be sent when you're online.").replace("{time}", formatClock(query.data.cachedAt, tz, locale))}</p>
      ) : null}
      {held.length > 0 ? (
        <section role="alert" className="rounded border-2 border-sig-orange-ink bg-sig-orange-tint p-3 text-sig-orange-ink">
          <p className="font-bold">{t("b2b.tech.job.draftKept", "Draft kept on your phone")}</p>
          <p className="text-sm">{held[0].error}</p>
          <Link href={`/tech/${orgId}/sync`} className="mt-2 inline-flex min-h-[44px] items-center font-bold underline">{t("b2b.tech.job.openSync", "Open Sync")}</Link>
        </section>
      ) : null}

      <header>
        <JobRef reference={job.reference} />
        <h1 id="tech-job-heading" tabIndex={-1} className="mt-1 text-2xl font-bold focus:outline-none">{job.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusPill status={job.status} />
          <PausedChip time={job.time} />
          {view.unconfirmed || view.pendingCount > 0 ? <span className="inline-flex items-center gap-1 text-sm font-bold text-sig-orange-ink"><CloudOff className="h-4 w-4" aria-hidden="true" /> {t("b2b.tech.job.savedOnPhone", "Saved on phone · {n} waiting").replace("{n}", String(view.pendingCount))}</span> : null}
          <span className="font-mono text-sm font-bold text-ops-accent">{formatWindow(job.scheduledStart, job.scheduledEnd, tz, { t, locale })}</span>
        </div>
        {job.time && job.time.state !== "NOT_STARTED" ? <div className="mt-2"><TimerChip time={job.time} offline={view.pendingCount > 0} estimateMin={job.estimatedDurationMin} /></div> : null}
        {job.status === "BLOCKED" && job.statusReason ? <p className="mt-2 text-sig-vermilion-ink">{t("b2b.tech.job.blockedReason", "Blocked: {reason}").replace("{reason}", job.statusReason)}</p> : null}
      </header>

      <section aria-labelledby="where" className="rounded border border-ops-border bg-ops-surface p-4">
        <h2 id="where" className="text-xs font-bold uppercase tracking-wider text-ops-ink-subtle">{t("b2b.tech.job.customerPlace", "Customer & place")}</h2>
        <p className="mt-2 text-lg font-bold">{server.customer.name}</p>
        <p className="mt-1 flex items-start gap-1.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{[server.location.addressLine, server.location.postalCode, server.location.city].filter(Boolean).join(", ")}</p>
        {server.location.accessInstructions ? <p className="mt-2 text-sm text-ops-ink-muted">{t("b2b.tech.job.access", "Access: {text}").replace("{text}", server.location.accessInstructions)}</p> : null}
        {server.location.safetyInstructions ? <p className="mt-2 rounded bg-sig-orange-tint p-2 text-sm font-bold text-sig-orange-ink">{t("b2b.tech.job.safety", "Safety: {text}").replace("{text}", server.location.safetyInstructions)}</p> : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {tel ? <a href={tel} className="flex min-h-[48px] items-center justify-center gap-2 rounded border border-ops-border-strong font-bold"><Phone className="h-4 w-4" aria-hidden="true" /> {t("b2b.tech.job.call", "Call")}</a> : <span />}
          {server.navigationUrl ? <a href={server.navigationUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-[48px] items-center justify-center gap-2 rounded border border-ops-border-strong font-bold"><Navigation className="h-4 w-4" aria-hidden="true" /> {t("b2b.tech.job.navigate", "Navigate")}</a> : null}
        </div>
      </section>

      {job.description ? <p className="whitespace-pre-line text-ops-ink">{job.description}</p> : null}

      {job.checklist.length > 0 ? (
        <section aria-labelledby="checklist" className="rounded border border-ops-border bg-ops-surface p-4">
          <h2 id="checklist" className="text-xs font-bold uppercase tracking-wider text-ops-ink-subtle">{t("b2b.tech.job.checklist", "Checklist ({done}/{total})").replace("{done}", String(job.checklist.filter((c) => c.done).length)).replace("{total}", String(job.checklist.length))}</h2>
          <ul className="mt-2">
            {job.checklist.map((item) => (
              <li key={item.id}>
                <label className="flex min-h-[56px] items-center gap-3 py-1">
                  <input type="checkbox" className="h-7 w-7 accent-[#005A8C]" checked={item.done} disabled={!editable} onChange={(e) => void guard(async () => { await submitChecklist(job, item.id, e.target.checked, t("b2b.tech.job.checklistLabel", "Checklist: {text}").replace("{text}", item.text), { undoText: (e.target.checked ? t("b2b.tech.undo.action.checked", 'Marked "{text}" done') : t("b2b.tech.undo.action.unchecked", 'Marked "{text}" not done')).replace("{text}", item.text) }); })} />
                  <span className={item.done ? "text-ops-ink-muted line-through" : ""}>{item.text}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {["IN_PROGRESS", "COMPLETED", "REVIEW", "CLOSED"].includes(job.status) || (job.parts?.length ?? 0) > 0 ? (
        <PartsSection job={job} parts={job.parts ?? []} editable={["IN_PROGRESS", "COMPLETED", "REVIEW"].includes(job.status)} pendingIds={pendingPartIds} />
      ) : null}

      {editable ? (
        <section aria-labelledby="wrap" className="space-y-4 rounded border border-ops-border bg-ops-surface p-4">
          <h2 id="wrap" className="text-xs font-bold uppercase tracking-wider text-ops-ink-subtle">{t("b2b.tech.job.wrapUp", "Wrap-up")}</h2>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-label={t("b2b.tech.job.photoFile", "Photo file")} onChange={(e) => { const f = e.target.files?.[0]; if (f) void guard(async () => { const r = await submitPhoto(job, f); if (r.queued) setNote(t("b2b.tech.job.photoQueued", "Photo saved on your phone. It will upload when you're online.")); }); e.target.value = ""; }} />
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded border border-ops-border-strong font-bold disabled:opacity-45">
            <Camera className="h-5 w-5" aria-hidden="true" /> {t("b2b.tech.job.addPhoto", "Add photo")}
          </button>
          <p className="text-sm text-ops-ink-muted">{plural(t, locale, "b2b.tech.job.photoCount", { one: "{n} photo on this job", other: "{n} photos on this job" }, (job.photoKeys?.length ?? 0) + view.pendingPhotos)}{view.pendingPhotos > 0 ? t("b2b.tech.job.photosWaiting", " ({n} waiting to upload)").replace("{n}", String(view.pendingPhotos)) : ""}</p>
          <label className="block font-bold">{t("b2b.tech.job.notes", "Notes")}
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded border border-ops-border-strong p-2 font-normal" />
          </label>
          {isComplete ? (
            <>
              <label className="block font-bold">{t("b2b.tech.job.customerName", "Customer name")}
                <input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} autoComplete="off" className="mt-1 min-h-[48px] w-full rounded border border-ops-border-strong px-2 font-normal" />
              </label>
              {job.requirements.signature ? (
                <PadBoundary onFail={() => setPadFailed(true)} fallback={<SignatureFallbackNotice />}>
                  <SignaturePad handleRef={padRef} onChange={onPad} label={t("b2b.tech.job.signature", "Customer signature")} clearLabel={t("b2b.tech.job.clearSignature", "Clear signature")} />
                </PadBoundary>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      {error ? <p role="alert" className="rounded border border-sig-vermilion-ink/40 bg-sig-vermilion-tint p-3 text-sig-vermilion-ink">{error}</p> : null}
      {note ? <p role="status" className="rounded border border-ops-border-strong bg-ops-surface p-3 font-bold">{note}</p> : null}

      {plan.primary ? (
        <>
          <ActionDock>
            <UndoToast />
            {canPause || plan.canBlock ? (
              <div className="mb-2 grid grid-cols-2 gap-2">
                {canPause ? (
                  <button ref={pauseTrigger} type="button" disabled={busy} onClick={() => setPausing(true)} className="flex min-h-[48px] items-center justify-center gap-2 rounded border-2 border-ops-border-strong bg-ops-surface font-bold disabled:opacity-45"><Pause className="h-5 w-5" aria-hidden="true" />{t("b2b.tech.pause.btn", "Pause")}</button>
                ) : <span />}
                {plan.canBlock && !blocking ? (
                  <button type="button" disabled={busy} onClick={() => setBlocking(true)} className="flex min-h-[48px] items-center justify-center gap-2 rounded border-2 border-ops-border-strong bg-ops-surface font-bold disabled:opacity-45"><PauseCircle className="h-5 w-5" aria-hidden="true" />{t("b2b.tech.job.blockedBtn", "Blocked…")}</button>
                ) : null}
              </div>
            ) : null}
            {paused ? (
              <button type="button" disabled={busy} onClick={() => void resumeWorkNow()} className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded bg-sig-sky-ink px-4 text-lg font-bold text-white disabled:opacity-45 md:min-h-[64px]">
                <Play className="h-5 w-5" aria-hidden="true" />{busy ? t("b2b.tech.saving", "Saving…") : t("b2b.tech.pause.resume", "Resume work")}
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => void (isComplete ? complete() : perform(plan.primary!.action, undefined, plan.primary!.label))} className="flex min-h-[56px] w-full items-center justify-center rounded bg-ops-ink px-4 text-lg font-bold text-white disabled:opacity-45 md:min-h-[64px]">
                {busy ? t("b2b.tech.saving", "Saving…") : plan.primary.label}
              </button>
            )}
          </ActionDock>
        </>
      ) : plan.idleMessage ? <p className="rounded border border-dashed border-ops-border-strong p-3 text-ops-ink-muted">{plan.idleMessage}</p> : null}


      <PauseSheet open={pausing} busy={busy} onCancel={() => { setPausing(false); pauseTrigger.current?.focus(); }} onConfirm={(r, n) => void doPause(r, n)} />

      {!plan.primary ? <UndoToast /> : null}

      {blocking ? (
        <section role="group" aria-labelledby="block-h" className="space-y-3 rounded border-2 border-sig-vermilion-ink bg-ops-surface p-4">
          <h2 id="block-h" className="font-bold">{t("b2b.tech.job.blockingTitle", "What's blocking the job?")}</h2>
          <label className="block text-sm font-bold">{t("b2b.tech.job.reason", "Reason")}
            <textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-1 w-full rounded border border-ops-border-strong p-2 font-normal" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setBlocking(false); setReason(""); }} className="min-h-[48px] rounded border border-ops-border-strong font-bold">{t("b2b.tech.job.cancel", "Cancel")}</button>
            <button type="button" disabled={busy || reason.trim().length < MIN_REASON} onClick={() => void confirmBlock()} className="min-h-[48px] rounded bg-sig-vermilion-ink font-bold text-white disabled:opacity-45">{t("b2b.tech.job.markBlocked", "Mark blocked")}</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function TechJobPage({ params }: { params: Promise<{ orgId: string; jobId: string }> }) {
  const { jobId } = use(params);
  return (
    <RequirePermission permission="job.view">
      <JobScreen key={jobId} jobId={jobId} />
    </RequirePermission>
  );
}
