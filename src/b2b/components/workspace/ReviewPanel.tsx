"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { approveReview, sendBackReview } from "@/b2b/api/endpoints";
import type { JobWorkspace } from "@/b2b/api/types";
import { useOrg } from "@/b2b/context/OrgContext";
import { describeB2bError, type DescribedError } from "@/b2b/lib/workspace";
import { TransitionError } from "./TransitionControl";
import { btnClass, Card, ReasonDialog } from "./ui";
import { ApproveDialog } from "@/b2b/components/review/ApproveDialog";
import { useJobCache } from "./useJobCache";

/** Approve and close / send back (job.close, jobs that require review, COMPLETED or REVIEW). */
export function ReviewPanel({ job }: { job: JobWorkspace }) {
  const { orgId, can, me } = useOrg();
  const toast = useToast();
  const { merge, refresh } = useJobCache(orgId, job.id);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const approvalTrigger = useRef<HTMLButtonElement>(null);
  const [sendBack, setSendBack] = useState(false);
  const [error, setError] = useState<DescribedError | null>(null);

  const done = (msg: string) => (j: Parameters<typeof merge>[0]) => { merge(j); setError(null); setSendBack(false); setApprovalOpen(false); approvalTrigger.current?.focus(); toast.push({ message: msg, tone: "success" }); };
  const approve = useMutation({ mutationFn: ({ note, version }: { note?: string; version: number }) => approveReview(orgId, job.id, version, note), onSuccess: done(`${job.reference} approved and closed`), onError: (e) => setError(describeB2bError(e)) });
  const back = useMutation({ mutationFn: (reason: string) => sendBackReview(orgId, job.id, job.version, reason), onSuccess: done(`${job.reference} sent back to the team`), onError: (e) => setError(describeB2bError(e)) });

  if (!can("job.close") || !job.requirements?.review || (job.status !== "REVIEW" && job.status !== "COMPLETED")) return null;
  const busy = approve.isPending || back.isPending;
  return (
    <Card title="Review" icon={<ClipboardCheck className="h-4 w-4" aria-hidden="true" />}>
      <p className="mb-3 text-sm text-ops-ink-muted">This job requires sign-off. Approve to close it, or send it back with what needs fixing.</p>
      <div className="flex flex-wrap gap-2">
        <button ref={approvalTrigger} type="button" disabled={busy} aria-busy={approve.isPending || undefined} onClick={() => { setError(null); setApprovalOpen(true); }} className={btnClass("primary")}>Approve and close</button>
        <button type="button" disabled={busy} onClick={() => { setError(null); setSendBack(true); }} className={btnClass("secondary")}>Send back</button>
      </div>
      {error && !sendBack && !approvalOpen ? <TransitionError error={error} onReload={() => { setError(null); void refresh(); }} /> : null}
      <ApproveDialog open={approvalOpen} orgId={orgId} jobId={job.id} reference={job.reference} loading={approve.isPending} error={error?.message} errorCode={error?.code} errorMissing={error?.missing} allowWithoutEvidence={me?.policies?.allowApprovalWithoutEvidence === true}
        onConfirm={(note, version) => approve.mutate({ note, version })}
        onCancel={() => { if (error?.kind === "stale") void refresh(); setApprovalOpen(false); setError(null); approvalTrigger.current?.focus(); }} />
      <ReasonDialog open={sendBack} title="Send back to the team" description="The job returns to In progress and the team is notified." reasonLabel="What needs to be fixed?"
        confirmLabel="Send back" loading={back.isPending} error={error && sendBack ? error.message : null}
        onConfirm={(r) => back.mutate(r)} onCancel={() => { if (error?.kind === "stale") void refresh(); setSendBack(false); setError(null); }} />
    </Card>
  );
}
