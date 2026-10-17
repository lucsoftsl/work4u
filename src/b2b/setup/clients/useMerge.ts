"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/Toast";
import { isB2bError } from "@/b2b/api/client";
import { mergeClients, revertMerge } from "@/b2b/setup/api";
import { setupErrorMessage } from "@/b2b/setup/errors";
import { useTr } from "@/b2b/setup/i18n";
import { isMergeRefusal, mergeIds, mergeTotals } from "./merge";

const TOAST_MS = 10_000;

/** Merge the others into the kept client; on success a 10 s toast offers "Undo merge" for every merge id returned. */
export function useMerge(orgId: string, onMerged?: (targetId: string) => void) {
  const { tr } = useTr();
  const qc = useQueryClient();
  const toast = useToast();
  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["org", orgId, "customers"] }),
    qc.invalidateQueries({ queryKey: ["org", orgId, "customer"] }),
  ]);

  const undo = async (ids: string[]) => {
    const results = await Promise.allSettled(ids.map((id) => revertMerge(orgId, id)));
    await refresh();
    const failed = results.some((r) => r.status === "rejected");
    toast.push({ tone: failed ? "error" : "success", message: failed ? tr("b2b.clients.merge.undoFailed", "We couldn't undo the merge completely. Check the clients and try again.") : tr("b2b.clients.merge.undone", "Merge undone.") });
  };

  const mutation = useMutation({
    mutationFn: ({ targetId, sourceIds }: { targetId: string; sourceIds: string[]; targetName: string }) => mergeClients(orgId, targetId, sourceIds),
    onSuccess: async (res, v) => {
      await refresh();
      const t = mergeTotals(res);
      toast.push({
        tone: "success", duration: TOAST_MS,
        message: tr("b2b.clients.merge.done", "Merged. {jobs} jobs, {contacts} contacts and {notes} notes moved to {name}.", { jobs: t.jobs, contacts: t.contacts, notes: t.notes, name: v.targetName }),
        action: { label: tr("b2b.clients.merge.undo", "Undo merge"), onClick: () => void undo(mergeIds(res)) },
      });
      onMerged?.(res.targetId);
    },
  });

  const errorMessage = mutation.error
    ? (isB2bError(mutation.error) && isMergeRefusal(mutation.error.code)
      ? tr("b2b.clients.merge.err", "We couldn't merge these clients. Nothing was changed.")
      : setupErrorMessage(mutation.error, tr))
    : null;
  return { mutation, errorMessage };
}
