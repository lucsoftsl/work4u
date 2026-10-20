"use client";

import { useTranslation } from "@/lib/i18n";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { assignJob, checkAssignment, qk } from "@/b2b/api/endpoints";
import type { Conflict, ConflictCheck, DispatchBoard, Job } from "@/b2b/api/types";
import { applyAssignmentToBoard, decideDrop, laneOfJob, mapAssignError, rollback, type AssignErrorInfo } from "@/b2b/lib/dispatch";
import { useToast } from "@/components/ui/Toast";
import { isB2bError } from "@/b2b/api/client";

export type AssignDialogState =
  | { mode: "override"; job: Job; teamId: string; teamName: string; conflicts: Conflict[]; error?: string; busy: boolean }
  | { mode: "blocked"; job: Job; teamName: string; conflicts: Conflict[] }
  | { mode: "error"; job: Job; teamId: string; teamName: string; info: AssignErrorInfo };

const CHECK_STALE_MS = 15_000;

interface Options { orgId: string; date: string; canOverride: boolean; /** Same filters key as the board query (qk.board). */ filtersKey?: unknown }

/** Drop / "Assign to..." flow: live check -> decide -> optimistic assign with rollback. */
export function useAssignFlow({ orgId, date, canOverride, filtersKey }: Options) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [dialog, setDialog] = useState<AssignDialogState | null>(null);
  const [pending, setPending] = useState(false);
  const boardKey = qk.board(orgId, date, filtersKey);

  /** Cached per (job, team) dry run. */
  const fetchCheck = useCallback(
    (jobId: string, teamId: string): Promise<ConflictCheck> =>
      qc.fetchQuery({
        queryKey: [...qk.org(orgId), "assign-check", jobId, teamId],
        queryFn: () => checkAssignment(orgId, jobId, { teamId }),
        staleTime: CHECK_STALE_MS,
      }),
    [qc, orgId]
  );

  const teamNameOf = useCallback(
    (teamId: string) => qc.getQueryData<DispatchBoard>(boardKey)?.teams.find((t) => t.id === teamId)?.name ?? "this team",
    [qc, boardKey]
  );

  const doAssign = useCallback(
    async (job: Job, teamId: string, override?: { reason: string }): Promise<boolean> => {
      const teamName = teamNameOf(teamId);
      await qc.cancelQueries({ queryKey: boardKey });
      const snapshot = qc.getQueryData<DispatchBoard>(boardKey);
      if (snapshot) qc.setQueryData<DispatchBoard>(boardKey, applyAssignmentToBoard(snapshot, job.id, teamId));
      try {
        await assignJob(orgId, job.id, { teamId }, override);
        toast.push({ message: t("b2b.dispatch.assigned", "{ref} assigned to {team}").replace("{ref}", job.reference).replace("{team}", teamName), tone: "success" });
        setDialog(null);
        void qc.invalidateQueries({ queryKey: qk.boardAll(orgId) });
        void qc.invalidateQueries({ queryKey: [...qk.org(orgId), "assign-check"] });
        return true;
      } catch (err) {
        const current = qc.getQueryData<DispatchBoard>(boardKey);
        if (current) qc.setQueryData<DispatchBoard>(boardKey, rollback(current, snapshot));
        const info = mapAssignError(err, t);
        const fresh = isB2bError(err) ? err.conflicts : info.conflicts ?? [];
        if (err instanceof Error && (err as { code?: string }).code === "ASSIGNMENT_CONFLICT" && fresh.length > 0) {
          setDialog(canOverride ? { mode: "override", job, teamId, teamName, conflicts: fresh, busy: false, error: info.message } : { mode: "blocked", job, teamName, conflicts: fresh });
        } else if (override) {
          setDialog((d) => (d && d.mode === "override" ? { ...d, busy: false, error: info.message } : { mode: "error", job, teamId, teamName, info }));
        } else {
          setDialog({ mode: "error", job, teamId, teamName, info });
        }
        void qc.invalidateQueries({ queryKey: boardKey });
        return false;
      }
    },
    [qc, boardKey, orgId, toast, canOverride, teamNameOf, t]
  );

  /** Entry point for both a drop and the "Assign to..." menu. */
  const requestAssign = useCallback(
    async (job: Job, teamId: string) => {
      const board = qc.getQueryData<DispatchBoard>(boardKey);
      const currentLaneId = board ? laneOfJob(board, job.id) : "unassigned";
      const teamName = teamNameOf(teamId);
      setPending(true);
      try {
        const check = await fetchCheck(job.id, teamId);
        const decision = decideDrop({ job, target: { laneId: teamId, currentLaneId }, check, viewerCanOverride: canOverride });
        if (decision.kind === "assign") await doAssign(job, teamId);
        else if (decision.kind === "confirm-override") setDialog({ mode: "override", job, teamId, teamName, conflicts: decision.conflicts, busy: false });
        else if (decision.kind === "blocked") setDialog({ mode: "blocked", job, teamName, conflicts: decision.conflicts });
      } catch (err) {
        setDialog({ mode: "error", job, teamId, teamName, info: mapAssignError(err, t) });
      } finally {
        setPending(false);
      }
    },
    [qc, boardKey, fetchCheck, doAssign, canOverride, teamNameOf, t]
  );

  const submitOverride = useCallback(
    async (reason: string) => {
      setDialog((d) => (d && d.mode === "override" ? { ...d, busy: true, error: undefined } : d));
      const d = dialog;
      if (d && d.mode === "override") await doAssign(d.job, d.teamId, { reason: reason.trim() });
    },
    [dialog, doAssign]
  );

  const retry = useCallback(() => {
    if (dialog && dialog.mode === "error") {
      const { job, teamId } = dialog;
      setDialog(null);
      void requestAssign(job, teamId);
    }
  }, [dialog, requestAssign]);

  return { dialog, closeDialog: () => setDialog(null), pending, fetchCheck, requestAssign, submitOverride, retry };
}
