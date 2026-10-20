"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { replaceQuery } from "@/b2b/lib/client-nav";
import { parseFinanceParams, periodRange, rangeProblem, serializeFinanceParams, todayIn, type FinanceState } from "@/b2b/lib/finance";
import { useOnlineStatus } from "@/b2b/setup/useOnlineStatus";

/**
 * The page state is the URL (shareable, back button works), with one extra rule for being offline: `local` is what the user last chose and is
 * the single source of truth until the URL has caught up with it. Offline, `history.replaceState` may not reach `useSearchParams`, so reading
 * the URL back would drop the control change, lose a second change, and disagree with the address bar after reconnecting. Instead every change
 * is merged into `local` (successive changes add up), written to the URL, and on reconnect the router is told the same state, so URL, controls
 * and data agree again. `queryState` is what the requests use: equal to `state` unless it holds an impossible range (then the last good one).
 */
export function useFinanceState(timeZone: string) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const online = useOnlineStatus();
  const today = todayIn(timeZone);
  const fromUrl = useMemo(() => parseFinanceParams(search, today), [search, today]);
  const [local, setLocal] = useState<FinanceState | null>(null);
  const needsSync = useRef(false);

  // The URL caught up with what the user chose: it is the source of truth again.
  if (local && serializeFinanceParams(local, today) === serializeFinanceParams(fromUrl, today)) setLocal(null);
  const state = local ?? fromUrl;
  const problem = rangeProblem(state.from, state.to);

  const [good, setGood] = useState<FinanceState>(() => (problem ? { ...state, ...periodRange("month", today) } : state));
  if (!problem && good !== state) setGood(state);

  const urlOf = useCallback((s: FinanceState) => {
    const qs = serializeFinanceParams(s, today);
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, today]);

  const change = useCallback((patch: Partial<FinanceState>) => {
    const next = { ...state, ...patch };
    needsSync.current = typeof navigator !== "undefined" && !navigator.onLine;
    setLocal(next);
    replaceQuery(router, urlOf(next));
  }, [state, router, urlOf]);

  // Back online with a change the router never saw: tell it, so the URL and Next's own search params match the screen.
  useEffect(() => {
    if (!online || !needsSync.current || !local) return;
    needsSync.current = false;
    router.replace(urlOf(local), { scroll: false });
  }, [online, local, router, urlOf]);

  return { state, queryState: problem ? good : state, problem, today, change };
}
