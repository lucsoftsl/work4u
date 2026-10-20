"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { JobWorkspace } from "@/b2b/api/types";
import { useOrg } from "@/b2b/context/OrgContext";
import { JobRef, StatusPill } from "@/b2b/components/StatusPill";
import { Banner } from "@/b2b/components/workspace/ui";
import { useTr } from "@/b2b/setup/i18n";
import { NewJobForm } from "./NewJobForm";

/**
 * The page of a draft (/jobs/:id while its status is DRAFT): the Create Job form on the saved draft, with Create job (promote),
 * Save draft and Discard. A draft has no schedule or team yet, so none of those controls exist here.
 */
export function DraftEditor({ job, justSaved }: { job: JobWorkspace; justSaved: boolean }) {
  const { tr } = useTr();
  const { orgId, can } = useOrg();
  return (
    <div className="space-y-4">
      <Link href={`/ops/${encodeURIComponent(orgId)}/jobs?status=DRAFT&mine=true`} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-ops-ink-muted hover:text-ops-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />{tr("b2b.jobs.draft.backLink", "Drafts")}
      </Link>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2"><JobRef reference={job.reference} /><StatusPill status="DRAFT" /></div>
        <h1 className="break-words text-xl font-bold text-ops-ink md:text-2xl">{job.title?.trim() || tr("b2b.jobs.draft.noTitle", "(no title yet)")}</h1>
      </header>
      <Banner tone="neutral">
        {tr("b2b.jobs.draft.notScheduled", "This draft isn't scheduled and technicians can't see it.")} {tr("b2b.jobs.draft.createFirst", "Create the job first to schedule it.")}
      </Banner>
      {can("job.create") ? (
        <NewJobForm draftJob={job} justSaved={justSaved} />
      ) : (
        <p className="rounded border border-ops-border bg-ops-surface p-4 text-sm text-ops-ink-muted">{tr("b2b.jobs.draft.readOnly", "You can see this draft but not change it. Ask someone who can create jobs.")}</p>
      )}
    </div>
  );
}
