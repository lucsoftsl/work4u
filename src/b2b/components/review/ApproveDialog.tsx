"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getJob, listAttachments, qk } from "@/b2b/api/endpoints";
import { isB2bError } from "@/b2b/api/client";
import { CompletionEvidence, type EvidenceAvailability } from "./CompletionEvidence";
import { useTranslation } from "@/lib/i18n";
import { Banner, btnClass, fieldClass } from "@/b2b/components/workspace/ui";
import { listMissing } from "@/b2b/lib/workspace";

interface Props { open: boolean; showNote?: boolean; orgId: string; jobId: string; reference: string; loading?: boolean; error?: string | null; /** B2bError code / missing items of the failed approval, to explain evidence refusals in the user's language. */ errorCode?: string; errorMissing?: string[]; /** `policies.allowApprovalWithoutEvidence` from the org profile; absent = strict. */ allowWithoutEvidence?: boolean; onConfirm: (note: string | undefined, version: number) => void; onCancel: () => void }

/** Native <dialog> (focus trap, Esc, inert background) with an optional note. */
export function ApproveDialog({ open, ...rest }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); d.querySelector<HTMLElement>("h2")?.focus(); }
    else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); if (!rest.loading) rest.onCancel(); }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-[640px] overflow-y-auto rounded border border-ops-border bg-ops-surface p-0 text-ops-ink shadow-xl backdrop:bg-ops-chrome/60 max-md:mb-0 max-md:mt-auto max-md:w-full max-md:max-w-none max-md:rounded-b-none"
    >
      {open ? <Form key={rest.jobId} {...rest} titleId={titleId} /> : null}
    </dialog>
  );
}

function Form({ orgId, jobId, reference, loading, error, errorCode, errorMissing, allowWithoutEvidence = false, showNote = true, onConfirm, onCancel, titleId }: Omit<Props, "open"> & { titleId: string }) {
  const { t } = useTranslation();
  const [note, setNote] = useState("");
  const noteId = useId();
  const [reviewed, setReviewed] = useState<string | null>(null);
  const job = useQuery({ queryKey: [...qk.job(orgId, jobId), "approval-evidence"], queryFn: () => getJob(orgId, jobId), staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: false });
  const attachments = useQuery({ queryKey: [...qk.attachments(orgId, jobId), "approval-evidence"], queryFn: () => listAttachments(orgId, jobId), staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: false });
  const availability: EvidenceAvailability = attachments.isPending ? "loading" : attachments.isError ? (isB2bError(attachments.error) && attachments.error.isMigrationPending ? "migration" : "error") : "ready";
  const stamp = `${job.dataUpdatedAt}:${attachments.dataUpdatedAt}:${attachments.errorUpdatedAt}`;
  const missing = job.data?.missingCompletion;
  const awaitingReview = job.data?.status === "REVIEW" || job.data?.status === "COMPLETED";
  const missingList = Array.isArray(missing) ? missing : [];
  const unavailable = availability === "migration" || availability === "error";
  const settled = job.isSuccess && !job.isFetching && !attachments.isFetching && Array.isArray(missing) && awaitingReview;
  const evidenceGap = unavailable || missingList.length > 0;
  const blockedByPolicy = settled && !allowWithoutEvidence && evidenceGap;
  const needsGapAck = settled && allowWithoutEvidence && evidenceGap;
  const ready = settled && !blockedByPolicy;
  const [gapAck, setGapAck] = useState<string | null>(null);
  const canConfirm = ready && reviewed === stamp && (!needsGapAck || gapAck === stamp) && !loading;
  const reload = () => { setReviewed(null); setGapAck(null); void job.refetch(); void attachments.refetch(); };
  return (
    <form className="space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); if (canConfirm && job.data) onConfirm(note.trim() || undefined, job.data.version); }}>
      <h2 tabIndex={-1} id={titleId} className="text-lg font-bold">{t("b2b.review.approveTitle", "Approve and close")} {reference}</h2>
      <p className="text-sm text-ops-ink-muted">{t("b2b.review.approveBody", "The job is closed and the customer record is final.")}</p>
      {job.isPending || job.isFetching ? <p role="status">{t("b2b.review.evidence.loadingReport", "Loading completion report…")}</p> : job.isError ? (
        <Banner tone="warning" role="alert" action={<button type="button" onClick={reload} className={btnClass("secondary")}>{t("b2b.common.retry", "Retry")}</button>}>{t("b2b.review.evidence.reportError", "Completion report could not be loaded. Retry before approving.")}</Banner>
      ) : job.data ? <CompletionEvidence orgId={orgId} jobId={jobId} job={job.data} files={attachments.data?.items ?? []} availability={availability} onReload={reload} /> : null}
      {blockedByPolicy ? (
        <Banner tone="warning" role="alert">
          {unavailable
            ? t("b2b.review.evidence.blockedUnavailable", "Approval is blocked: completion evidence can't be checked right now (photos and documents are unavailable). Try again later, or ask an administrator.")
            : t("b2b.review.evidence.blockedMissing", "Approval is blocked: required evidence is missing: {items}. Send the job back so the team can add it.").replace("{items}", listMissing(missingList))}
        </Banner>
      ) : null}
      {needsGapAck ? (
        <Banner tone="warning" role="alert">
          {t("b2b.review.evidence.warnWithout", "You are approving without completion evidence. A site-wide setting allows it, and it will be recorded in the audit log.")}{" "}
          {unavailable ? t("b2b.review.evidence.warnUnavailable", "Evidence can't be checked right now.") : t("b2b.review.evidence.warnMissing", "Missing: {items}.").replace("{items}", listMissing(missingList))}
        </Banner>
      ) : null}
      {job.isSuccess && (!Array.isArray(missing) || !awaitingReview) ? <Banner tone="warning" role="alert">{t("b2b.review.evidence.notReady", "This job is not ready for approval. Open the completion report to check its status and missing requirements.")}</Banner> : null}
      <label className="flex min-h-[44px] items-center gap-3 text-sm font-bold">
        <input type="checkbox" className="h-5 w-5 shrink-0" checked={reviewed === stamp} disabled={!ready || loading} onChange={(e) => setReviewed(e.target.checked ? stamp : null)} />
        {t("b2b.review.evidence.reviewed", "I have reviewed the available completion evidence")}
      </label>
      {needsGapAck ? (
        <label className="flex min-h-[44px] items-center gap-3 text-sm font-bold">
          <input type="checkbox" className="h-5 w-5 shrink-0" checked={gapAck === stamp} disabled={loading} onChange={(e) => setGapAck(e.target.checked ? stamp : null)} />
          {t("b2b.review.evidence.ackWithout", "I understand this job is being approved without complete completion evidence")}
        </label>
      ) : null}
      {showNote ? <div>
        <label htmlFor={noteId} className="mb-1 block text-sm font-bold">{t("b2b.review.noteLabel", "Note (optional)")}</label>
        <textarea id={noteId} rows={3} value={note} onChange={(e) => setNote(e.target.value)} disabled={loading} className={fieldClass} />
      </div> : null}
      {errorCode === "EVIDENCE_UNAVAILABLE" ? (
        <Banner tone="danger" role="alert">{t("b2b.review.evidence.serverUnavailable", "Evidence can't be checked right now; try again later or ask an administrator.")}</Banner>
      ) : errorCode === "EVIDENCE_REQUIRED" ? (
        <Banner tone="danger" role="alert">{t("b2b.review.evidence.serverRequired", "The server refused approval: required evidence is missing{items}. Send the job back so the team can add it.").replace("{items}", errorMissing?.length ? `: ${listMissing(errorMissing)}` : "")}</Banner>
      ) : error ? <Banner tone="danger" role="alert">{error}</Banner> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={loading} className={btnClass("secondary")}>{t("b2b.common.cancel", "Cancel")}</button>
        <button type="submit" disabled={!canConfirm} aria-busy={loading || undefined} className={btnClass("primary")}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          {t("b2b.review.approve", "Approve")}
        </button>
      </div>
    </form>
  );
}
