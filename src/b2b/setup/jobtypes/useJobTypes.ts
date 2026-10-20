"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { archiveJobType, jtk, listJobTypes, reorderJobTypes, unarchiveJobType, type JobType } from "@/b2b/api/jobTypes";
import { applyOrder } from "./jobTypeLogic";

/** Every job type of the company, archived ones included (the admin filters them locally, so Active / Archived / All are instant). */
export function useAllJobTypes(orgId: string) {
  return useQuery({ queryKey: jtk.list(orgId, true), queryFn: ({ signal }) => listJobTypes(orgId, true, signal), staleTime: 30_000 });
}

/** The types a job can be given today: active ones, in the admin's order. Shared by Create Job and the editors. */
export function useActiveJobTypes(orgId: string, enabled = true) {
  return useQuery({ queryKey: jtk.list(orgId, false), queryFn: ({ signal }) => listJobTypes(orgId, false, signal), enabled, staleTime: 60_000, retry: 1 });
}

/** Optimistic reorder: the list moves at once; a failed save puts it back (the caller shows the error). */
export function useReorderJobTypes(orgId: string, onFail: () => void) {
  const qc = useQueryClient();
  const key = jtk.list(orgId, true);
  return useMutation({
    mutationFn: (ids: string[]) => reorderJobTypes(orgId, ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: jtk.all(orgId) });
      const before = qc.getQueryData<JobType[]>(key);
      if (before) qc.setQueryData<JobType[]>(key, applyOrder(before, ids).map((x, i) => ({ ...x, position: i })));
      return { before };
    },
    onError: (_e, _ids, ctx) => { if (ctx?.before) qc.setQueryData(key, ctx.before); onFail(); },
    onSettled: () => void qc.invalidateQueries({ queryKey: jtk.all(orgId) }),
  });
}

export function useArchiveJobType(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) => (archive ? archiveJobType(orgId, id) : unarchiveJobType(orgId, id)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: jtk.all(orgId) }),
  });
}
