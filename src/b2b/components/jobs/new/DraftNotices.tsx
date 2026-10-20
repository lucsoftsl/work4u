"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Banner, btnClass } from "@/b2b/components/workspace/ui";
import type { FieldKey } from "@/b2b/lib/job-form";
import { useTr } from "@/b2b/setup/i18n";

/** "Draft saved as JOB-1075": polite confirmation with the two next steps. It takes focus once, so the keyboard user lands on it. */
export function DraftSavedBar({ reference, draftsHref, autoFocus, onKeepEditing }: { reference: string; draftsHref: string; autoFocus: boolean; onKeepEditing: () => void }) {
  const { tr } = useTr();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  return (
    <div ref={ref} tabIndex={-1} className="focus:outline-none">
      <Banner tone="info" role="status" action={
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onKeepEditing} className={btnClass("secondary")}>{tr("b2b.newJob.draft.keep", "Keep editing")}</button>
          <Link href={draftsHref} className={btnClass("secondary")}>{tr("b2b.newJob.draft.goTo", "Go to drafts")}</Link>
        </div>
      }>
        {tr("b2b.newJob.draft.saved", "Draft saved as {ref}. You can finish it later from Jobs → Drafts.", { ref: reference })}
      </Banner>
    </div>
  );
}

const MISSING_LABEL: Record<string, [string, string]> = {
  title: ["b2b.newJob.title", "Title"],
  jobTypeId: ["b2b.newJob.type", "Job type"],
  category: ["b2b.newJob.category", "Category"],
  customerId: ["b2b.newJob.customer", "Customer"],
  locationId: ["b2b.newJob.location", "Location"],
};

/** 422 DRAFT_INCOMPLETE: what is missing, as links that jump to the field. */
export function IncompleteAlert({ missing, onJump }: { missing: readonly FieldKey[]; onJump: (k: FieldKey) => void }) {
  const { tr } = useTr();
  return (
    <Banner tone="warning" role="alert" title={tr("b2b.jobs.draft.incomplete", "This draft isn't ready to become a job.")}>
      <p>{tr("b2b.jobs.draft.incompleteBody", "Fill in what's missing, then choose Create job.")}</p>
      <ul className="mt-1 flex flex-wrap gap-x-4">
        {missing.map((k) => (
          <li key={k}>
            <button type="button" onClick={() => onJump(k)} className="min-h-[44px] font-bold underline">{tr(MISSING_LABEL[k]?.[0] ?? "b2b.newJob.title", MISSING_LABEL[k]?.[1] ?? k)}</button>
          </li>
        ))}
      </ul>
    </Banner>
  );
}
