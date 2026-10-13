"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/http";
import { B2bError, isB2bError } from "@/b2b/api/client";
import { getMe, pollEvents, qk, streamToken } from "@/b2b/api/endpoints";
import { cacheMe, readMe } from "@/b2b/offline/store";
import { withNetworkTimeout } from "@/b2b/offline/read";
import { useBusyAutoRetry } from "@/b2b/lib/busy-retry";
import type { OrgMe } from "@/b2b/api/types";
import { can as canFn, type PermissionKey, type Relation, type Viewer } from "@/b2b/lib/permissions";

export type OrgStatus = "loading" | "ready" | "not-member" | "error";
export type LiveState = "connecting" | "live" | "polling" | "offline";

export interface OrgState {
  orgId: string;
  status: OrgStatus;
  me?: OrgMe;
  viewer?: Viewer;
  /** UI hint only; the API enforces. List-level check unless a relation is given. */
  can: (permission: PermissionKey, relation?: Relation) => boolean;
  /** Realtime: SSE when the host supports it, polling otherwise. */
  live: LiveState;
  refetch: () => void;
  /** The last profile load failed with HTTP 429 (shown as "busy", retried automatically). */
  rateLimited?: boolean;
}

const OrgContext = createContext<OrgState | null>(null);

const SSE_EVENTS = [
  "job.created", "job.updated", "job.status_changed", "job.assigned", "job.unassigned", "job.rescheduled",
  "job.photo_added", "job.attachment_added", "job.attachment_removed", "team.status_changed",
];
const POLL_MS = 15_000;
const INVALIDATE_THROTTLE_MS = 600;

/** Realtime for one org. Invalidates cached org data (not /me) on any event; throttled so bursts coalesce. */
function useOrgRealtime(orgId: string, enabled: boolean): LiveState {
  const qc = useQueryClient();
  const [live, setLive] = useState<LiveState>("connecting");
  const timers = useRef<{ throttle?: ReturnType<typeof setTimeout>; poll?: ReturnType<typeof setTimeout> }>({});

  useEffect(() => {
    if (!enabled) return;
    let closed = false;
    let es: EventSource | null = null;
    let cursor: string | number | undefined;
    let pending = false;

    const invalidate = () => {
      if (pending) return;
      pending = true;
      timers.current.throttle = setTimeout(() => {
        pending = false;
        // /me and the unread badge have their own cadence (staleTime + focus refetch); a job event must not re-fetch them.
        void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "org" && q.queryKey[1] === orgId && q.queryKey[2] !== "me" && q.queryKey[2] !== "notifications" });
      }, INVALIDATE_THROTTLE_MS);
    };

    const tick = async () => {
      if (closed) return;
      if ((typeof document !== "undefined" && document.visibilityState === "hidden") || (typeof navigator !== "undefined" && !navigator.onLine)) {
        timers.current.poll = setTimeout(tick, POLL_MS);
        return;
      }
      try {
        const res = await pollEvents(orgId, cursor); // first call (no cursor) only returns the head
        if (cursor !== undefined && res.events.length > 0) invalidate();
        cursor = res.cursor;
        setLive("polling");
      } catch {
        setLive("offline");
      }
      if (!closed) timers.current.poll = setTimeout(tick, POLL_MS);
    };

    const startPolling = () => {
      if (closed || timers.current.poll) return;
      void tick();
    };

    const startSse = async () => {
      try {
        const { token } = await streamToken(orgId);
        if (closed) return;
        es = new EventSource(`${API_BASE_URL}/api/b2b/orgs/${encodeURIComponent(orgId)}/stream?token=${encodeURIComponent(token)}`);
        es.onopen = () => setLive("live");
        for (const type of SSE_EVENTS) es.addEventListener(type, invalidate);
        es.onerror = () => {
          es?.close();
          es = null;
          startPolling(); // host without long-lived connections (e.g. serverless): fall back to polling
        };
      } catch {
        startPolling();
      }
    };

    void startSse();
    const t = timers.current;
    return () => {
      closed = true;
      es?.close();
      if (t.throttle) clearTimeout(t.throttle);
      if (t.poll) clearTimeout(t.poll);
      t.poll = undefined;
    };
  }, [orgId, enabled, qc]);

  return live;
}

/** `offlineCapable`: keep the profile/permissions on the phone so the field app opens without a connection. */
export function OrgProvider({ orgId, children, offlineCapable = false }: { orgId: string; children: ReactNode; offlineCapable?: boolean }) {
  const query = useQuery({
    queryKey: qk.me(orgId),
    queryFn: async () => {
      if (!offlineCapable) return getMe(orgId);
      // Field app: the shell must open without a connection, so the last good profile/permissions are kept on the phone.
      try {
        if (typeof navigator !== "undefined" && !navigator.onLine) throw new B2bError(0, "NETWORK", "Offline");
        const me = await withNetworkTimeout(getMe(orgId));
        void cacheMe(orgId, me).catch(() => undefined);
        return me;
      } catch (err) {
        if (isB2bError(err) && (err.code === "NETWORK" || err.status === 0)) {
          const saved = await readMe<Awaited<ReturnType<typeof getMe>>>(orgId);
          if (saved) return saved;
        }
        throw err;
      }
    },
    staleTime: 5 * 60_000, // permissions/profile rarely change; realtime never refetches it
    refetchOnWindowFocus: false,
    ...(offlineCapable ? { networkMode: "always" as const, retry: false } : {}),
  });

  const status: OrgStatus = query.isPending
    ? "loading"
    : query.isError
      ? isB2bError(query.error) && query.error.isNotFound ? "not-member" : "error"
      : "ready";

  const viewer = useMemo<Viewer | undefined>(
    () => (query.data ? { grants: query.data.permissions, teamIds: query.data.member.teamIds } : undefined),
    [query.data]
  );
  const can = useCallback((permission: PermissionKey, relation?: Relation) => (viewer ? canFn(viewer, permission, relation) : false), [viewer]);
  const live = useOrgRealtime(orgId, status === "ready");
  const refetch = useCallback(() => void query.refetch(), [query]);
  useBusyAutoRetry(query.error, refetch); // "Busy right now" clears itself once the API answers

  const value = useMemo<OrgState>(() => ({ orgId, status, me: query.data, viewer, can, live, refetch, rateLimited: isB2bError(query.error) && query.error.isRateLimited }), [orgId, status, query.data, viewer, can, live, refetch, query.error]);
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgState {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used inside <OrgProvider>");
  return ctx;
}
