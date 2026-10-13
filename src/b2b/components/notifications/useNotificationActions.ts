"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markAllNotificationsRead, markNotificationRead, qk } from "@/b2b/api/endpoints";

/** Mark-one / mark-all; both refresh the list and the bell badge (all keys live under qk.notifications). */
export function useNotificationActions(orgId: string) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: qk.notifications(orgId) });
  const markOne = useMutation({ mutationFn: (id: string | number) => markNotificationRead(orgId, id), onSettled: refresh });
  const markAll = useMutation({ mutationFn: () => markAllNotificationsRead(orgId), onSettled: refresh });
  return { markOne, markAll };
}
