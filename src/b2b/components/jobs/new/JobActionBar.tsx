"use client";

import Link from "next/link";
import { btnClass } from "@/b2b/components/workspace/ui";
import { useTr } from "@/b2b/setup/i18n";

interface Props {
  /** A request is running: every button waits. */
  busy: boolean;
  creating: boolean;
  savingDraft: boolean;
  /** "Add a title or choose a client to save a draft." is showing. */
  draftNeed: boolean;
  /** Editing an existing draft: Cancel becomes a link back to the drafts, and Discard exists. */
  editingDraft: boolean;
  draftsHref: string;
  canDiscard: boolean;
  onCancel: () => void;
  onSaveDraft: () => void;
  onDiscard: () => void;
}

/**
 * Cancel on the left; Save as draft (secondary) beside Create job (primary) on the right. Sticks to the bottom of the viewport above the
 * iOS safe area; on phones the two main buttons stack full width (Romanian / Spanish labels do not fit next to Cancel).
 */
export function JobActionBar({ busy, creating, savingDraft, draftNeed, editingDraft, draftsHref, canDiscard, onCancel, onSaveDraft, onDiscard }: Props) {
  const { tr } = useTr();
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-ops-border bg-ops-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
      {draftNeed ? <p role="alert" className="mb-2 text-sm font-bold text-sig-vermilion-ink">{tr("b2b.newJob.draft.needTitleOrClient", "Add a title or choose a client to save a draft.")}</p> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          {editingDraft ? (
            <Link href={draftsHref} className={btnClass("secondary", "w-full sm:w-auto")}>{tr("b2b.jobs.draft.back", "Back to drafts")}</Link>
          ) : (
            <button type="button" onClick={onCancel} disabled={busy} className={btnClass("secondary", "w-full sm:w-auto")}>{tr("b2b.common.cancel", "Cancel")}</button>
          )}
          {editingDraft && canDiscard ? (
            <button type="button" onClick={onDiscard} disabled={busy} className={btnClass("secondary", "w-full border-sig-vermilion-ink text-sig-vermilion-ink sm:w-auto")}>{tr("b2b.jobs.draft.discard", "Discard draft")}</button>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onSaveDraft} disabled={busy} aria-busy={savingDraft || undefined} className={btnClass("secondary", "min-h-[52px] w-full sm:min-h-[44px] sm:w-auto")}>
            {savingDraft ? tr("b2b.common.saving", "Saving…") : editingDraft ? tr("b2b.jobs.draft.save", "Save draft") : tr("b2b.newJob.saveDraft", "Save as draft")}
          </button>
          <button type="submit" disabled={busy} aria-busy={creating || undefined} className={btnClass("primary", "min-h-[52px] w-full sm:min-h-[44px] sm:w-auto")}>
            {creating ? tr("b2b.newJob.creating", "Creating…") : tr("b2b.newJob.create", "Create job")}
          </button>
        </div>
      </div>
    </div>
  );
}
