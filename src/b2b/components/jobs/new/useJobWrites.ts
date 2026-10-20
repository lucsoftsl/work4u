"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { createJob, patchJob, promoteJob, qk, transitionJob } from "@/b2b/api/endpoints";
import type { JobWorkspace } from "@/b2b/api/types";
import { useJobCache } from "@/b2b/components/workspace/useJobCache";
import { buildCreateJobInput, buildDraftBody, buildDraftPatch, type FormOpts, type JobDraft } from "@/b2b/lib/job-form";
import { clearSessionDrafts } from "@/b2b/lib/useSessionState";
import { useTr } from "@/b2b/setup/i18n";

interface Params {
  orgId: string;
  /** The draft being edited; absent on a brand-new job. */
  draftJob?: JobWorkspace;
  draftKey: string;
  draft: JobDraft;
  opts: FormOpts;
  onError: (e: unknown) => void;
  onDraftSaved: (reference: string) => void;
}

const jobUrl = (orgId: string, id: string) => `/ops/${encodeURIComponent(orgId)}/jobs/${encodeURIComponent(id)}`;

/**
 * The four writes of the job form:
 *  - create: POST /jobs (a real job);
 *  - saveDraft: POST /jobs {draft:true} on a new form (then the page becomes the draft editor), or PATCH on an existing draft;
 *  - promote: save the form into the draft, then POST /promote (422 DRAFT_INCOMPLETE is surfaced through onError);
 *  - discard: DRAFT -> CANCELLED with the reason.
 */
export function useJobWrites({ orgId, draftJob, draftKey, draft, opts, onError, onDraftSaved }: Params) {
  const { tr } = useTr();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { merge } = useJobCache(orgId, draftJob?.id ?? "");
  const finish = async () => {
    clearSessionDrafts(draftKey);
    await qc.invalidateQueries({ queryKey: qk.jobsAll(orgId) });
    // The first amount may have just chosen the company currency: re-read the company so every screen shows it as chosen.
    if (opts.chooseCurrency) await qc.invalidateQueries({ queryKey: qk.me(orgId) });
  };

  const create = useMutation({
    mutationFn: () => createJob(orgId, buildCreateJobInput(draft, opts)),
    onSuccess: async (job) => { await finish(); router.push(jobUrl(orgId, job.id)); },
    onError,
  });

  const saveDraft = useMutation({
    mutationFn: () => (draftJob ? patchJob(orgId, draftJob.id, draftJob.version, buildDraftPatch(draft, opts)) : createJob(orgId, buildDraftBody(draft, opts))),
    onSuccess: async (job) => {
      if (draftJob) { merge(job); onDraftSaved(job.reference); return; }
      await finish();
      router.replace(`${jobUrl(orgId, job.id)}?saved=1`); // the same form, now editing the saved draft
    },
    onError,
  });

  const promote = useMutation({
    mutationFn: async () => {
      if (!draftJob) throw new Error("promote needs a draft");
      const saved = await patchJob(orgId, draftJob.id, draftJob.version, buildDraftPatch(draft, opts));
      return promoteJob(orgId, draftJob.id, saved.version);
    },
    onSuccess: async (job) => {
      await finish();
      merge(job); // the page now renders the real job
      toast.push({ message: tr("b2b.jobs.draft.promoted", "Job created. It's now on the dispatch board as unassigned."), tone: "success" });
    },
    onError,
  });

  const discard = useMutation({
    mutationFn: (reason: string) => {
      if (!draftJob) throw new Error("discard needs a draft");
      return transitionJob(orgId, draftJob.id, draftJob.version, "CANCELLED", reason);
    },
    onSuccess: async () => {
      await finish();
      toast.push({ message: tr("b2b.jobs.draft.discarded", "Draft discarded."), tone: "success" });
      router.push(`/ops/${encodeURIComponent(orgId)}/jobs?status=DRAFT&mine=true`);
    },
  });

  return { create, saveDraft, promote, discard, busy: create.isPending || saveDraft.isPending || promote.isPending || discard.isPending };
}
