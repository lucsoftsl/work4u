"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/b2b/api/endpoints";
import type { Job, JobWorkspace } from "@/b2b/api/types";

/** Merge a returned Job into the cached workspace (keeps assignments, customer…) and refetch the rest. */
export function useJobCache(orgId: string, jobId: string) {
  const qc = useQueryClient();
  const merge = useCallback(
    (job: Job) => {
      qc.setQueryData<JobWorkspace>(qk.job(orgId, jobId), (old) => (old ? { ...old, ...job, internalNotes: job.internalNotes ?? old.internalNotes } : old));
      void qc.invalidateQueries({ queryKey: qk.job(orgId, jobId) });
    },
    [qc, orgId, jobId]
  );
  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: qk.job(orgId, jobId) }), [qc, orgId, jobId]);
  return { merge, refresh };
}
