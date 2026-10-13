"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isB2bError } from "@/b2b/api/client";

/** Don't retry what retrying can't fix (4xx incl. 404 non-member, 409, 503 MIGRATION_PENDING). */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isB2bError(error) && error.isRateLimited) return failureCount < 3; // wait out Retry-After, then try again on our own
  if (isB2bError(error) && error.status >= 400 && error.status < 500) return false;
  if (isB2bError(error) && error.isMigrationPending) return false;
  return failureCount < 2;
}

/** A 429 waits as long as the server asked (Retry-After), otherwise a gentle backoff. */
export function queryRetryDelay(failureCount: number, error: unknown): number {
  if (isB2bError(error) && error.isRateLimited) return error.retryAfterMs ?? Math.min(2_000 * 2 ** failureCount, 30_000);
  return Math.min(1_000 * 2 ** failureCount, 30_000);
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 15_000, refetchOnWindowFocus: true, retry: shouldRetry, retryDelay: queryRetryDelay },
      mutations: { retry: false },
    },
  });
}

/** One QueryClient for the /ops and /tech trees (created once per mount; keys are org-prefixed). */
export function B2bQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
