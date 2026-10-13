"use client";

import { useEffect, useRef } from "react";
import { isB2bError } from "@/b2b/api/client";

const BASE_MS = 2_000;
const MAX_MS = 30_000;

/** Wait before the next automatic retry of a busy (429 / 503 SERVICE_BUSY) response: backoff, never sooner than Retry-After. */
export function busyRetryDelayMs(error: unknown, attempt: number): number {
  const backoff = Math.min(BASE_MS * 2 ** attempt, MAX_MS);
  return Math.max(isB2bError(error) ? error.retryAfterMs ?? 0 : 0, backoff);
}

/** While `error` is a busy response, call `refetch` again after the backoff; stops by itself when the error clears. */
export function useBusyAutoRetry(error: unknown, refetch: () => void): void {
  const attempt = useRef(0);
  const latest = useRef(refetch);
  // callers pass an unstable callback; keep it in a ref so the timer doesn't restart on every render
  useEffect(() => { latest.current = refetch; });
  const busy = isB2bError(error) && error.isRateLimited;
  useEffect(() => {
    if (!busy) { attempt.current = 0; return; }
    const timer = setTimeout(() => { attempt.current += 1; latest.current(); }, busyRetryDelayMs(error, attempt.current));
    return () => clearTimeout(timer);
  }, [busy, error]);
}
