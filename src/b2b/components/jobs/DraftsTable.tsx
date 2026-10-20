"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/Toast";
import { promoteJob, qk, transitionJob } from "@/b2b/api/endpoints";
import { isB2bError } from "@/b2b/api/client";
import type { Job } from "@/b2b/api/types";
import { JobRef, StatusPill } from "@/b2b/components/StatusPill";
import { btnClass, ReasonDialog } from "@/b2b/components/workspace/ui";
import { draftMissing, type MissingKey } from "@/b2b/lib/job-form";
import { useTr } from "@/b2b/setup/i18n";
import { ago } from "./format";

type DraftRow = Job;

const MISSING_LABEL: Record<MissingKey, [string, string]> = {
  title: ["b2b.jobs.draft.m.title", "title"],
  customer: ["b2b.jobs.draft.m.customer", "client"],
  location: ["b2b.jobs.draft.m.location", "location"],
  type: ["b2b.jobs.draft.m.type", "job type"],
};
/** DRAFT_INCOMPLETE `missing[]` uses API field names. */
const API_MISSING: Record<string, MissingKey> = { title: "title", customerId: "customer", locationId: "location", category: "type" };

const GRID = "lg:grid-cols-[96px_minmax(0,1fr)_96px_auto]";

interface Props { orgId: string; items: Job[]; nowMs: number; canPromote: boolean; canDiscard: boolean }

/** The Drafts view: a draft is never mixed with real jobs, so it has its own columns and its own actions. */
export function DraftsTable({ orgId, items, nowMs, canPromote, canDiscard }: Props) {
  const { tr } = useTr();
  const qc = useQueryClient();
  const toast = useToast();
  const [discard, setDiscard] = useState<Job | null>(null);
  const [announce, setAnnounce] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: qk.jobsAll(orgId) });
  const discardMut = useMutation({
    mutationFn: ({ job, reason }: { job: Job; reason: string }) => transitionJob(orgId, job.id, job.version, "CANCELLED", reason),
    onSuccess: async (_r, { job }) => {
      setDiscard(null);
      await refresh();
      const msg = tr("b2b.jobs.draft.discardedRef", "{ref} discarded.", { ref: job.reference });
      setAnnounce(msg);
      toast.push({ message: msg, tone: "success" });
    },
  });

  return (
    <>
    <div role="table" aria-label={tr("b2b.jobs.preset.drafts", "Drafts")} className="overflow-hidden rounded-lg border border-ops-border bg-ops-surface">
      <div role="row" className={`hidden items-center gap-3 border-b border-ops-border bg-ops-canvas px-4 py-2 text-xs font-bold text-ops-ink-muted lg:grid ${GRID}`}>
        <span role="columnheader">{tr("b2b.jobs.col.ref", "Reference")}</span>
        <span role="columnheader">{tr("b2b.jobs.draft.col", "Draft")}</span>
        <span role="columnheader">{tr("b2b.jobs.col.updated", "Updated")}</span>
        <span role="columnheader" className="sr-only">{tr("b2b.jobs.draft.actions", "Actions")}</span>
      </div>
      <div role="rowgroup" className="divide-y divide-ops-border">
        {items.map((j) => (
          <DraftRowView key={j.id} orgId={orgId} job={j as DraftRow} nowMs={nowMs} canPromote={canPromote} canDiscard={canDiscard} onDiscard={() => { discardMut.reset(); setDiscard(j); }} onDone={refresh} />
        ))}
      </div>
    </div>
    {/* Outside the table: a role=table may only contain rows (axe aria-required-children). */}
    <p aria-live="polite" className="sr-only">{announce}</p>
    <ReasonDialog
        open={!!discard}
        title={tr("b2b.jobs.draft.discardTitle", "Discard this draft?")}
        description={tr("b2b.jobs.draft.discardBody", "{ref} will be cancelled. It was never scheduled, so nobody is notified.", { ref: discard?.reference ?? "" })}
        reasonLabel={tr("b2b.jobs.draft.discardReason", "Reason")}
        reasonHint={tr("b2b.jobs.draft.discardReasonHint", "Required, at least 3 characters.")}
        reasonShort={tr("b2b.jobs.draft.discardReasonShort", "Enter at least 3 characters.")}
        cancelLabel={tr("b2b.common.cancel", "Cancel")}
        confirmLabel={tr("b2b.jobs.draft.discard", "Discard draft")}
        tone="danger"
        loading={discardMut.isPending}
        error={discardMut.isError ? tr("b2b.jobs.draft.discardError", "Couldn't discard the draft. Reload the page and try again.") : null}
        onConfirm={(reason) => discard && discardMut.mutate({ job: discard, reason })}
        onCancel={() => setDiscard(null)}
      />
    </>
  );
}

function DraftRowView({ orgId, job, nowMs, canPromote, canDiscard, onDiscard, onDone }: { orgId: string; job: DraftRow; nowMs: number; canPromote: boolean; canDiscard: boolean; onDiscard: () => void; onDone: () => Promise<unknown> }) {
  const { tr, locale } = useTr();
  const toast = useToast();
  const href = `/ops/${encodeURIComponent(orgId)}/jobs/${encodeURIComponent(job.id)}`;
  const missing = draftMissing(job);
  const [problem, setProblem] = useState<string | null>(null);
  const promote = useMutation({
    mutationFn: () => promoteJob(orgId, job.id, job.version),
    onSuccess: async () => {
      await onDone();
      toast.push({ message: tr("b2b.jobs.draft.promoted", "Job created. It's now on the dispatch board as unassigned."), tone: "success" });
    },
    onError: (e) => {
      if (isB2bError(e) && e.code === "DRAFT_INCOMPLETE") {
        const items = e.missing.map((m) => API_MISSING[m]).filter(Boolean).map((k) => tr(...MISSING_LABEL[k])).join(", ");
        setProblem(tr("b2b.jobs.draft.rowIncomplete", "{ref} isn't ready to become a job. Missing: {items}.", { ref: job.reference, items }));
      } else if (isB2bError(e) && e.code === "NOT_A_DRAFT") {
        setProblem(tr("b2b.jobs.draft.rowAlready", "{ref} was already created as a job.", { ref: job.reference }));
        void onDone();
      } else {
        setProblem(tr("b2b.jobs.draft.rowError", "Couldn't create {ref}. Try again.", { ref: job.reference }));
      }
    },
  });
  const title = job.title?.trim() || tr("b2b.jobs.draft.noTitle", "(no title yet)");
  const items = missing.map((k) => tr(...MISSING_LABEL[k])).join(", ");
  return (
    <div role="row" className={`grid grid-cols-1 gap-x-3 gap-y-2 px-4 py-3 lg:items-center ${GRID}`}>
      <div role="cell" className="contents">
        <JobRef reference={job.reference} className="justify-self-start" />
        <Link href={href} className="min-w-0 rounded hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-ink">
          <span className="flex flex-wrap items-center gap-2"><StatusPill status="DRAFT" compact /><span className={`break-words text-sm font-bold ${job.title?.trim() ? "text-ops-ink" : "text-ops-ink-muted"}`}>{title}</span></span>
          {job.customerName ? <span className="block break-words text-xs text-ops-ink-muted">{job.customerName}{job.locationLabel ? ` · ${job.locationLabel}` : ""}</span> : null}
          {missing.length ? <span className="block text-xs font-bold text-sig-orange-ink">{tr("b2b.jobs.draft.missing", "Missing: {items}", { items })}</span> : null}
        </Link>
        <span className="text-xs text-ops-ink-muted">{ago(Date.parse(job.updatedAt), nowMs, locale)}</span>
      </div>
      <div role="cell" className="flex flex-wrap gap-2">
        <Link href={href} className={btnClass("secondary", "px-3")} aria-label={tr("b2b.jobs.draft.continueNamed", "Continue editing {ref}", { ref: job.reference })}>{tr("b2b.jobs.draft.continue", "Continue editing")}</Link>
        {canPromote ? <button type="button" disabled={promote.isPending} aria-busy={promote.isPending || undefined} onClick={() => { setProblem(null); promote.mutate(); }} className={btnClass("primary", "px-3")} aria-label={tr("b2b.jobs.draft.promoteNamed", "Create job from {ref}", { ref: job.reference })}>{tr("b2b.jobs.draft.promote", "Create job")}</button> : null}
        {canDiscard ? <button type="button" onClick={onDiscard} className={btnClass("secondary", "px-3 text-sig-vermilion-ink")} aria-label={tr("b2b.jobs.draft.discardNamed", "Discard {ref}", { ref: job.reference })}>{tr("b2b.jobs.draft.discard", "Discard draft")}</button> : null}
      </div>
      {problem ? <div role="cell" className="col-span-full"><p role="alert" className="text-sm font-bold text-sig-vermilion-ink">{problem}{" "}<Link href={href} className="underline">{tr("b2b.jobs.draft.continue", "Continue editing")}</Link></p></div> : null}
    </div>
  );
}
