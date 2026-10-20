"use client";

import { useTranslation } from "@/lib/i18n";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { approveReview, sendBackReview } from "@/b2b/api/endpoints";
import type { JobWorkspace } from "@/b2b/api/types";
import { useOrg } from "@/b2b/context/OrgContext";
import { fmt } from "@/b2b/lib/plural";
import { jobStatusLabel } from "@/b2b/lib/status-label";
import { describeB2bError, type DescribedError } from "@/b2b/lib/workspace";
import { TransitionError } from "./TransitionControl";
import { btnClass, Card, ReasonDialog } from "./ui";
import { ApproveDialog } from "@/b2b/components/review/ApproveDialog";
import { useJobCache } from "./useJobCache";

/** Approve and close / send back (job.close, jobs that require review, COMPLETED or REVIEW). */
export function ReviewPanel({ job }: { job: JobWorkspace }) {
  const { t: tx, locale } = useTranslation();
  const i18n = { t: tx, locale };
  const { orgId, can, me } = useOrg();
  const toast = useToast();
  const { merge, refresh } = useJobCache(orgId, job.id);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const approvalTrigger = useRef<HTMLButtonElement>(null);
  const [sendBack, setSendBack] = useState(false);
  const [error, setError] = useState<DescribedError | null>(null);

  const done = (msg: string) => (j: Parameters<typeof merge>[0]) => { merge(j); setError(null); setSendBack(false); setApprovalOpen(false); approvalTrigger.current?.focus(); toast.push({ message: msg, tone: "success" }); };
  const approve = useMutation({ mutationFn: ({ note, version }: { note?: string; version: number }) => approveReview(orgId, job.id, version, note), onSuccess: done(fmt(tx("b2b.job.review.approved", "{ref} approved and closed"), { ref: job.reference })), onError: (e) => setError(describeB2bError(e, i18n)) });
  const back = useMutation({ mutationFn: (reason: string) => sendBackReview(orgId, job.id, job.version, reason), onSuccess: done(fmt(tx("b2b.job.review.sentBack", "{ref} sent back to the team"), { ref: job.reference })), onError: (e) => setError(describeB2bError(e, i18n)) });

  if (!can("job.close") || !job.requirements?.review || (job.status !== "REVIEW" && job.status !== "COMPLETED")) return null;
  const busy = approve.isPending || back.isPending;
  return (
    <Card title={tx("b2b.job.review.title", "Review")} icon={<ClipboardCheck className="h-4 w-4" aria-hidden="true" />}>
      <p className="mb-3 text-sm text-ops-ink-muted">{tx("b2b.job.review.intro", "This job requires sign-off. Approve to close it, or send it back with what needs fixing.")}</p>
      <div className="flex flex-wrap gap-2">
        <button ref={approvalTrigger} type="button" disabled={busy} aria-busy={approve.isPending || undefined} onClick={() => { setError(null); setApprovalOpen(true); }} className={btnClass("primary")}>{tx("b2b.job.review.approve", "Approve and close")}</button>
        <button type="button" disabled={busy} onClick={() => { setError(null); setSendBack(true); }} className={btnClass("secondary")}>{tx("b2b.job.review.sendBack", "Send back")}</button>
      </div>
      {error && !sendBack && !approvalOpen ? <TransitionError error={error} onReload={() => { setError(null); void refresh(); }} /> : null}
      <ApproveDialog open={approvalOpen} orgId={orgId} jobId={job.id} reference={job.reference} loading={approve.isPending} error={error?.message} errorCode={error?.code} errorMissing={error?.missing} allowWithoutEvidence={me?.policies?.allowApprovalWithoutEvidence === true}
        onConfirm={(note, version) => approve.mutate({ note, version })}
        onCancel={() => { if (error?.kind === "stale") void refresh(); setApprovalOpen(false); setError(null); approvalTrigger.current?.focus(); }} />
      <ReasonDialog open={sendBack} title={tx("b2b.job.review.sendBackTitle", "Send back to the team")} description={fmt(tx("b2b.job.review.sendBackBody", "The job returns to {status} and the team is notified."), { status: jobStatusLabel(tx, "IN_PROGRESS") })} reasonLabel={tx("b2b.job.review.fix", "What needs to be fixed?")}
        confirmLabel={tx("b2b.job.review.sendBack", "Send back")} loading={back.isPending} error={error && sendBack ? error.message : null}
        onConfirm={(r) => back.mutate(r)} onCancel={() => { if (error?.kind === "stale") void refresh(); setSendBack(false); setError(null); }} />
    </Card>
  );
}
