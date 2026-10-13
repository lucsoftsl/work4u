import { getJob, getMyJobs } from "@/b2b/api/endpoints";
import { B2bError, isB2bError } from "@/b2b/api/client";
import type { JobWorkspace, MyJobs } from "@/b2b/api/types";
import { cacheJob, cacheMyJobs, readJob, readMyJobs } from "./store";

const NETWORK_TIMEOUT_MS = 8_000;
const offlineNow = () => typeof navigator !== "undefined" && !navigator.onLine;

/** An unreachable network can hang a request (token refresh, stalled socket). Treat that as "offline" so saved data shows. */
export function withNetworkTimeout<T>(promise: Promise<T>, ms: number = NETWORK_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new B2bError(0, "NETWORK", "The server did not answer in time.")), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

const isNetwork = (e: unknown) => isB2bError(e) && (e.code === "NETWORK" || e.status === 0);

export type WithCache<T> = T & { /** ISO time of the cached copy being shown, or null when the data is fresh from the server. */ cachedAt: string | null };

/** Today's list: fresh from the API (and saved on the phone), or the last saved copy when there's no connection. */
export async function loadMyJobs(orgId: string): Promise<WithCache<MyJobs>> {
  try {
    if (offlineNow()) throw new B2bError(0, "NETWORK", "Offline");
    const data = await withNetworkTimeout(getMyJobs(orgId));
    void cacheMyJobs(orgId, data).catch(() => undefined);
    return { ...data, cachedAt: null };
  } catch (err) {
    if (!isNetwork(err)) throw err;
    const saved = await readMyJobs(orgId);
    if (saved) return { ...saved.data, cachedAt: saved.savedAt };
    throw err;
  }
}

export async function loadJob(orgId: string, jobId: string): Promise<WithCache<JobWorkspace>> {
  try {
    if (offlineNow()) throw new B2bError(0, "NETWORK", "Offline");
    const data = await withNetworkTimeout(getJob(orgId, jobId));
    void cacheJob(orgId, data).catch(() => undefined);
    return { ...data, cachedAt: null };
  } catch (err) {
    if (!isNetwork(err)) throw err;
    const saved = await readJob<JobWorkspace>(orgId, jobId);
    if (saved) return { ...saved.data, cachedAt: saved.savedAt };
    throw err;
  }
}

/** Reads must run offline too (TanStack pauses queries while offline by default). */
export const OFFLINE_READ = { networkMode: "always", retry: false } as const;
