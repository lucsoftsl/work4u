"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CircleX } from "lucide-react";
import type { Conflict, DispatchBoard, Job, ConflictCheck } from "@/b2b/api/types";
import { isValidOverrideReason, laneBadge } from "@/b2b/lib/dispatch";
import { useTranslation } from "@/lib/i18n";
import { LaneBadgeView } from "./BoardView";
import type { AssignDialogState } from "./useAssignFlow";

const BTN = "inline-flex min-h-[44px] items-center justify-center rounded px-4 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent disabled:opacity-50";
const BTN_PRIMARY = `${BTN} bg-ops-ink text-white hover:bg-ops-ink/90`;
const BTN_SECONDARY = `${BTN} border border-ops-border-strong bg-ops-surface text-ops-ink hover:bg-ops-canvas`;

/** Native <dialog>: focus trap, Esc and inert background come from the browser. */
function Modal({ open, titleId, onClose, children }: { open: boolean; titleId: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      className="m-auto w-[calc(100%-2rem)] max-w-[480px] rounded-lg border border-ops-border-strong bg-ops-surface p-0 text-ops-ink shadow-xl backdrop:bg-ops-ink/40"
    >
      {open ? <div className="p-5">{children}</div> : null}
    </dialog>
  );
}

function ConflictList({ conflicts }: { conflicts: Conflict[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {conflicts.map((c, i) => (
        <li key={`${c.type}-${i}`} className="flex items-start gap-2 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sig-orange-ink" aria-hidden="true" />
          <span>{c.message}</span>
        </li>
      ))}
    </ul>
  );
}

function OverrideForm({ state, onCancel, onSubmit, titleId }: {
  state: Extract<AssignDialogState, { mode: "override" }>; onCancel: () => void; onSubmit: (reason: string) => void; titleId: string;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const hintId = useId();
  const valid = isValidOverrideReason(reason);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid && !state.busy) onSubmit(reason); }}>
      <h2 id={titleId} className="flex items-center gap-2 text-base font-bold text-sig-orange-ink">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        {t("b2b.dispatch.overrideTitle", "Schedule conflict override")}
      </h2>
      <p className="mt-2 text-sm text-ops-ink-muted">{state.job.reference} → {state.teamName}</p>
      {state.error ? <p role="alert" className="mt-2 text-sm font-bold text-sig-vermilion-ink">{state.error}</p> : null}
      <ConflictList conflicts={state.conflicts} />
      <label className="mt-4 block text-sm font-bold" htmlFor={`${hintId}-reason`}>
        {t("b2b.dispatch.overrideReason", "Reason for override")}{" "}
        <span className="text-sig-orange-ink">({t("b2b.dispatch.overrideRequired", "required, saved in audit log")})</span>
      </label>
      <textarea
        id={`${hintId}-reason`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        required
        minLength={3}
        aria-describedby={hintId}
        placeholder={t("b2b.dispatch.overridePlaceholder", "Enter justification for the overlap…")}
        className="mt-1 w-full rounded border border-ops-border-strong bg-ops-surface p-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-accent"
      />
      <p id={hintId} className="mt-1 text-xs text-ops-ink-muted">{t("b2b.dispatch.overrideMin", "At least 3 characters.")}</p>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className={BTN_SECONDARY}>{t("b2b.dispatch.pickAnother", "Pick another slot")}</button>
        <button type="submit" disabled={!valid || state.busy} className={BTN_PRIMARY}>
          {state.busy ? t("b2b.dispatch.assigning", "Assigning…") : t("b2b.dispatch.assignAnyway", "Assign anyway")}
        </button>
      </div>
    </form>
  );
}

interface DialogsProps {
  orgId: string;
  dialog: AssignDialogState | null;
  onClose: () => void;
  onSubmitOverride: (reason: string) => void;
  onRetry: () => void;
}

/** Override / blocked / error dialogs for the assignment flow. */
export function AssignDialogs({ orgId, dialog, onClose, onSubmitOverride, onRetry }: DialogsProps) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <Modal open={!!dialog} titleId={titleId} onClose={dialog?.mode === "override" && dialog.busy ? () => undefined : onClose}>
      {dialog?.mode === "override" ? (
        <OverrideForm key={`${dialog.job.id}-${dialog.teamId}`} state={dialog} onCancel={onClose} onSubmit={onSubmitOverride} titleId={titleId} />
      ) : null}
      {dialog?.mode === "blocked" ? (
        <>
          <h2 id={titleId} className="flex items-center gap-2 text-base font-bold">
            <CircleX className="h-5 w-5 text-sig-vermilion-ink" aria-hidden="true" />
            {t("b2b.dispatch.blockedTitle", "Can't assign")} {dialog.job.reference} {t("b2b.dispatch.to", "to")} {dialog.teamName}
          </h2>
          <ConflictList conflicts={dialog.conflicts} />
          <div className="mt-4 flex justify-end"><button type="button" onClick={onClose} className={BTN_PRIMARY}>OK</button></div>
        </>
      ) : null}
      {dialog?.mode === "error" ? (
        <>
          <h2 id={titleId} className="flex items-center gap-2 text-base font-bold">
            <CircleX className="h-5 w-5 text-sig-vermilion-ink" aria-hidden="true" />
            {t("b2b.dispatch.errorTitle", "Not assigned")}
          </h2>
          <p role="alert" className="mt-2 text-sm">{dialog.info.message}</p>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {dialog.info.linkToJob ? (
              <Link href={`/ops/${orgId}/jobs/${dialog.job.id}`} className={BTN_SECONDARY}>{t("b2b.dispatch.openJob", "Open job")} {dialog.job.reference}</Link>
            ) : null}
            {dialog.info.retryable ? <button type="button" onClick={onRetry} className={BTN_SECONDARY}>{t("common.retry", "Try again")}</button> : null}
            <button type="button" onClick={onClose} className={BTN_PRIMARY}>OK</button>
          </div>
        </>
      ) : null}
    </Modal>
  );
}

/** Non-drag alternative: list the teams with live fit/conflict hints; choosing one runs the same flow as a drop. */
export function AssignToDialog({ job, board, fetchCheck, onPick, onClose }: {
  job: Job | null; board: DispatchBoard | undefined; fetchCheck: (jobId: string, teamId: string) => Promise<ConflictCheck>;
  onPick: (job: Job, teamId: string) => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const [checks, setChecks] = useState<Record<string, ConflictCheck | "error">>({});
  const jobId = job?.id;
  const teams = board?.teams;

  useEffect(() => {
    if (!jobId || !teams) return;
    let cancelled = false;
    for (const team of teams) {
      fetchCheck(jobId, team.id)
        .then((c) => { if (!cancelled) setChecks((prev) => ({ ...prev, [`${jobId}:${team.id}`]: c })); })
        .catch(() => { if (!cancelled) setChecks((prev) => ({ ...prev, [`${jobId}:${team.id}`]: "error" })); });
    }
    return () => { cancelled = true; };
  }, [jobId, teams, fetchCheck]);

  return (
    <Modal open={!!job} titleId={titleId} onClose={onClose}>
      {job ? (
        <>
          <h2 id={titleId} className="text-base font-bold">{t("b2b.dispatch.assignTo", "Assign to…")} <span className="font-mono">{job.reference}</span></h2>
          {teams && teams.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {teams.map((team) => {
                const check = checks[`${job.id}:${team.id}`];
                return (
                  <li key={team.id}>
                    <button
                      type="button"
                      onClick={() => onPick(job, team.id)}
                      className="w-full rounded border border-ops-border-strong p-2 text-left hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-accent"
                    >
                      <span className="block min-h-[28px] text-sm font-bold">{team.name}</span>
                      {check && check !== "error" ? <LaneBadgeView badge={laneBadge(check)} /> : null}
                      {check === "error" ? <span className="text-xs text-ops-ink-muted">{t("b2b.dispatch.checkFailed", "Couldn't check availability")}</span> : null}
                      {!check ? <LaneBadgeView badge={laneBadge(null)} /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ops-ink-muted">{t("b2b.dispatch.noTeams", "Add a team before dispatching.")}</p>
          )}
          <div className="mt-4 flex justify-end"><button type="button" onClick={onClose} className={BTN_SECONDARY}>{t("common.cancel", "Cancel")}</button></div>
        </>
      ) : null}
    </Modal>
  );
}
