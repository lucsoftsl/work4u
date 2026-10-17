"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/Toast";
import { archiveClient, unarchiveClient } from "@/b2b/setup/api";
import { setupErrorMessage } from "@/b2b/setup/errors";
import { useTr } from "@/b2b/setup/i18n";

/** Archive or restore a client, refresh the caches and report the outcome in a toast. */
export function useArchiveToggle(orgId: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const { tr } = useTr();
  return useMutation({
    mutationFn: ({ id, archive }: { id: string; name: string; archive: boolean }) => (archive ? archiveClient(orgId, id) : unarchiveClient(orgId, id)),
    onSuccess: async (_r, v) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["org", orgId, "customers"] }),
        qc.invalidateQueries({ queryKey: ["org", orgId, "customer"] }),
      ]);
      toast.push({ tone: "success", message: v.archive ? tr("b2b.clients.archived.toast", "{name} archived.", { name: v.name }) : tr("b2b.clients.restored.toast", "{name} restored.", { name: v.name }) });
    },
    onError: (e) => toast.push({ tone: "error", message: setupErrorMessage(e, tr) }),
  });
}
