"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { listMyOrgs } from "@/b2b/api/endpoints";
import { afterSignInTarget, safeB2bRedirect } from "@/lib/b2b-paths";

/** The `?redirect=` of the current URL if it is inside the B2B app (see safeB2bRedirect), else null. */
export function currentB2bRedirect(): string | null {
  if (typeof window === "undefined") return null;
  return safeB2bRedirect(new URLSearchParams(window.location.search).get("redirect"));
}

const noop = () => () => undefined;
/** The safe `?redirect=` as render-safe state (null on the server and during hydration, the real value after). */
export function useB2bRedirect(): string | null {
  const search = useSyncExternalStore(noop, () => window.location.search, () => "");
  return safeB2bRedirect(new URLSearchParams(search).get("redirect"));
}

/**
 * After a B2B session exists: ask the API for the person's workspaces and go to the right place (a safe ?redirect=, their only
 * workspace's `landing`, the chooser, or the company wizard). Never the marketplace dashboard.
 */
export function useContinueToWorkspace() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "working" | "error">("idle");
  const go = useCallback(async () => {
    setState("working");
    try {
      const orgs = await listMyOrgs();
      router.replace(afterSignInTarget(orgs, currentB2bRedirect()));
    } catch {
      setState("error");
    }
  }, [router]);
  return { state, go };
}
