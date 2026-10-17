"use client";

import { useQuery } from "@tanstack/react-query";
import { getSettings, sk } from "./api";

const REFRESH_MS = 4 * 60_000; // the logo link is signed for 5 minutes

/** Company settings (shared by the profile page and the shell logo). Re-read before the signed logo link expires. */
export function useOrgSettings(orgId: string, enabled = true) {
  return useQuery({ queryKey: sk.settings(orgId), queryFn: () => getSettings(orgId), enabled, staleTime: REFRESH_MS, refetchInterval: enabled ? REFRESH_MS : false, retry: 1 });
}
