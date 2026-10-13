"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { isB2bError, newIdempotencyKey } from "@/b2b/api/client";
import { addPart, editPart, pauseWork, removePart, resumeWork, runAction, toggleChecklist, undoJob, uploadAttachment, uploadPhoto, type ActionBody, type PartInput } from "@/b2b/api/endpoints";
import type { Job, PauseReason, TechAction } from "@/b2b/api/types";
import { useOrg } from "@/b2b/context/OrgContext";
import { enqueue, flushQueue, pendingForJob, removeWaiting, type Runners } from "./queue";
import { qk } from "@/b2b/api/endpoints";
import { statusAfter } from "./apply";
import { useTranslation } from "@/lib/i18n";
import { JOB_STATUS_META } from "@/b2b/lib/status";
import { newPartId } from "@/b2b/lib/parts";
import { serverNowIso } from "@/b2b/lib/server-clock";
import { clearAllOfflineData, getMeta, listQueue, setMeta, subscribeQueue } from "./store";
import type { FlushResult, QueueItem } from "./types";
import { useOnline } from "./useOnline";
import { LAST_TECH_ORG_KEY } from "./last-org";

const RUNNERS: Runners = {
  runAction,
  toggleChecklist,
  uploadPhoto,
  uploadSignature: (orgId, jobId, file) => uploadAttachment(orgId, jobId, "CUSTOMER_PROVIDED", file),
  pauseWork,
  resumeWork,
  undoJob,
  savePart: (orgId, jobId, op, partId, input, key, at) =>
    op === "add" ? addPart(orgId, jobId, partId, input as PartInput, key, at) : op === "edit" ? editPart(orgId, jobId, partId, input ?? {}, key, at) : removePart(orgId, jobId, partId, key, at),
};
const AUTO_FLUSH_MS = 30_000;
/** Status steps that can be taken back; complete, block and resume-from-blocked are final. */
const UNDOABLE_STEPS: readonly TechAction[] = ["start-journey", "arrived", "start"];

/** The one action the technician can still take back (8 s toast). A newer action replaces it. */
export interface UndoEntry {
  token: number;
  jobId: string;
  /** Translated sentence for the toast, e.g. "Work paused". */
  text: string;
  /** Still waiting in the offline queue: undo = remove it. */
  itemId?: string;
  /** Already accepted by the server: undo = POST /undo with this id. */
  serverUndoId?: number;
}
export type UndoOpts = { undoText?: string };

export type SyncState = "synced" | "syncing" | "queued" | "attention";

interface OfflineContextValue {
  items: QueueItem[];
  /** Items the technician still has to act on (failed or conflict). */
  attention: QueueItem[];
  waitingCount: number;
  syncState: SyncState;
  lastSync: string | null;
  lastResult: FlushResult | null;
  online: boolean;
  flush: () => Promise<void>;
  /** Send now when possible, otherwise (or when the network drops mid-request) queue it. Resolves `queued` for the UI. */
  submitAction: (job: Pick<Job, "id" | "version" | "reference">, action: TechAction, body?: ActionBody, label?: string) => Promise<{ queued: boolean }>;
  submitChecklist: (job: Pick<Job, "id" | "reference">, itemId: string, done: boolean, label: string, opts?: UndoOpts) => Promise<{ queued: boolean }>;
  submitPause: (job: Pick<Job, "id" | "reference">, reason: PauseReason, note?: string) => Promise<{ queued: boolean }>;
  submitResumeWork: (job: Pick<Job, "id" | "reference">) => Promise<{ queued: boolean }>;
  /** Parts add/edit/remove. `add` returns the new client-generated id. */
  submitPart: (job: Pick<Job, "id" | "reference">, op: "add" | "edit" | "delete", input: { id?: string; values?: Partial<PartInput>; undoText?: string }) => Promise<{ queued: boolean; id: string }>;
  undoEntry: UndoEntry | null;
  undoMessage: string | null;
  dismissUndo: () => void;
  clearUndoMessage: () => void;
  undoLast: () => Promise<void>;
  submitPhoto: (job: Pick<Job, "id" | "reference">, file: File) => Promise<{ queued: boolean }>;
  queueSignature: (job: Pick<Job, "id" | "reference">, png: Blob) => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function useOffline(): OfflineContextValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be used inside <OfflineProvider>");
  return ctx;
}

const isNetwork = (e: unknown) => isB2bError(e) && (e.code === "NETWORK" || e.status === 0);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { orgId } = useOrg();
  const { user } = useAuth();
  const qc = useQueryClient();
  const online = useOnline();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [flushing, setFlushing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<FlushResult | null>(null);
  const { t } = useTranslation();
  const [undoEntry, setUndoEntry] = useState<UndoEntry | null>(null);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);
  const undoToken = useRef(0);
  const orgRef = useRef(orgId);
  orgRef.current = orgId;

  const reload = useCallback(async () => {
    setItems(await listQueue(orgRef.current));
    setLastSync((await getMeta<string>("lastSync")) ?? null);
  }, []);

  // Another person's data must never survive on this phone.
  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      const owner = await getMeta<string>("owner");
      if (owner && owner !== user.id) await clearAllOfflineData();
      await setMeta("owner", user.id);
      await reload();
    })();
  }, [user?.id, reload]);

  useEffect(() => { try { window.localStorage.setItem(LAST_TECH_ORG_KEY, orgId); } catch { /* private mode */ } }, [orgId]);
  useEffect(() => { void reload(); return subscribeQueue(() => void reload()); }, [orgId, reload]);

  const flush = useCallback(async () => {
    if (!navigator.onLine) return;
    setFlushing(true);
    try {
      const res = await flushQueue(orgRef.current, RUNNERS);
      setLastResult(res);
      if (res.undoRejected > 0) setUndoMessage(t("b2b.tech.undo.failed", "Can't undo: this job changed."));
      if (res.sent > 0 || res.undoRejected > 0) void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "org" && q.queryKey[1] === orgRef.current && q.queryKey[2] !== "me" });
    } finally {
      setFlushing(false);
      await reload();
    }
  }, [qc, reload, t]);

  // Flush on connect, on return to the app, and every 30 s while something waits.
  const waitingCount = items.filter((i) => i.status === "waiting" || i.status === "sending").length;
  useEffect(() => { if (online && waitingCount > 0) void flush(); }, [online, waitingCount, flush]);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") void flush(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [flush]);
  useEffect(() => {
    if (!online || waitingCount === 0) return;
    const t = setInterval(() => void flush(), AUTO_FLUSH_MS);
    return () => clearInterval(t);
  }, [online, waitingCount, flush]);

  const offerUndo = useCallback((entry: Omit<UndoEntry, "token">) => setUndoEntry({ ...entry, token: ++undoToken.current }), []);
  const stillQueued = useCallback(async (jobId: string, itemId: string) => (await pendingForJob(orgRef.current, jobId)).some((i) => i.id === itemId), []);
  const refreshJob = useCallback((jobId: string) => {
    void qc.invalidateQueries({ queryKey: ["org", orgRef.current, "job", jobId] });
    void qc.invalidateQueries({ queryKey: qk.myJobs(orgRef.current) }); // Today's rows show the clock/pause state too
  }, [qc]);

  const queueThenFlush = useCallback(async (input: Parameters<typeof enqueue>[0], undoText?: string) => {
    const item = await enqueue(input);
    await reload();
    // A still-queued action is undone by simply removing it, so offer that right away.
    if (undoText && (await stillQueued(input.jobId, item.id))) offerUndo({ jobId: input.jobId, text: undoText, itemId: item.id });
    if (navigator.onLine) void flush();
    return { queued: true };
  }, [flush, reload, offerUndo, stillQueued]);

  const stepText = useCallback((action: TechAction) => t("b2b.tech.undo.action.step", "Moved to {status}").replace("{status}", JOB_STATUS_META[statusAfter(action)].label), [t]);

  const submitAction = useCallback<OfflineContextValue["submitAction"]>(async (job, action, body, label) => {
    const key = newIdempotencyKey();
    const base = { orgId, jobId: job.id, jobRef: job.reference, kind: "action" as const, action, body, expectedVersion: job.version, label: label ?? action, idempotencyKey: key };
    const undoText = UNDOABLE_STEPS.includes(action) ? stepText(action) : undefined; // complete / block / resume-from-blocked are final
    if (!navigator.onLine || (await pendingForJob(orgId, job.id)).length > 0) return queueThenFlush(base, undoText);
    try {
      const res = await runAction(orgId, job.id, action, { ...body, expectedVersion: job.version, clientOccurredAt: serverNowIso() }, key);
      if (undoText && res.undo) offerUndo({ jobId: job.id, text: undoText, serverUndoId: res.undo.id });
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "org" && q.queryKey[1] === orgId && q.queryKey[2] !== "me" });
      return { queued: false };
    } catch (e) {
      if (isNetwork(e)) return queueThenFlush(base, undoText); // the request may have arrived: replay with the SAME key
      throw e;
    }
  }, [orgId, qc, queueThenFlush, offerUndo, stepText]);

  const submitChecklist = useCallback<OfflineContextValue["submitChecklist"]>(async (job, itemId, done, label, opts) => {
    const base = { orgId, jobId: job.id, jobRef: job.reference, kind: "checklist" as const, itemId, done, label };
    if (!navigator.onLine || (await pendingForJob(orgId, job.id)).length > 0) return queueThenFlush(base, opts?.undoText);
    // Optimistic: the box flips now; the server answer only confirms. Rolled back if the server refuses.
    const cacheKey = qk.job(orgId, job.id);
    const snapshot = qc.getQueryData(cacheKey);
    qc.setQueryData(cacheKey, (old: { checklist?: Array<{ id: string; done: boolean }> } | undefined) => (old?.checklist ? { ...old, checklist: old.checklist.map((c) => (c.id === itemId ? { ...c, done } : c)) } : old));
    try {
      const res = await toggleChecklist(orgId, job.id, itemId, done);
      if (opts?.undoText && res?.undo) offerUndo({ jobId: job.id, text: opts.undoText, serverUndoId: res.undo.id });
      void qc.invalidateQueries({ queryKey: cacheKey });
      return { queued: false };
    } catch (e) {
      qc.setQueryData(cacheKey, snapshot); // roll back (a network failure is re-shown by the queue overlay)
      if (isNetwork(e)) return queueThenFlush(base, opts?.undoText);
      throw e;
    }
  }, [orgId, qc, queueThenFlush, offerUndo]);

  const submitPause = useCallback<OfflineContextValue["submitPause"]>(async (job, reason, note) => {
    const key = newIdempotencyKey();
    const base = { orgId, jobId: job.id, jobRef: job.reference, kind: "pause" as const, pauseReason: reason, pauseNote: note, label: t("b2b.tech.pause.btn", "Pause"), idempotencyKey: key };
    const undoText = t("b2b.tech.undo.action.pause", "Work paused");
    if (!navigator.onLine || (await pendingForJob(orgId, job.id)).length > 0) return queueThenFlush(base, undoText);
    try {
      const res = await pauseWork(orgId, job.id, { reason, note, clientOccurredAt: serverNowIso() }, key);
      if (res.undo) offerUndo({ jobId: job.id, text: undoText, serverUndoId: res.undo.id });
      refreshJob(job.id);
      return { queued: false };
    } catch (e) {
      if (isNetwork(e)) return queueThenFlush(base, undoText);
      throw e;
    }
  }, [orgId, t, queueThenFlush, offerUndo, refreshJob]);

  const submitResumeWork = useCallback<OfflineContextValue["submitResumeWork"]>(async (job) => {
    const key = newIdempotencyKey();
    const base = { orgId, jobId: job.id, jobRef: job.reference, kind: "resume-work" as const, label: t("b2b.tech.pause.resume", "Resume work"), idempotencyKey: key };
    const undoText = t("b2b.tech.undo.action.resumed", "Work resumed");
    if (!navigator.onLine || (await pendingForJob(orgId, job.id)).length > 0) return queueThenFlush(base, undoText);
    try {
      const res = await resumeWork(orgId, job.id, { clientOccurredAt: serverNowIso() }, key);
      if (res.undo) offerUndo({ jobId: job.id, text: undoText, serverUndoId: res.undo.id });
      refreshJob(job.id);
      return { queued: false };
    } catch (e) {
      if (isNetwork(e)) return queueThenFlush(base, undoText);
      throw e;
    }
  }, [orgId, t, queueThenFlush, offerUndo, refreshJob]);

  const submitPart = useCallback<OfflineContextValue["submitPart"]>(async (job, op, input) => {
    const id = input.id ?? newPartId();
    const key = newIdempotencyKey();
    const base = { orgId, jobId: job.id, jobRef: job.reference, kind: "part" as const, partOp: op, partId: id, part: input.values, label: t("b2b.tech.parts.title", "Parts used ({n})").replace(" ({n})", ""), idempotencyKey: key };
    if (!navigator.onLine || (await pendingForJob(orgId, job.id)).length > 0) return { ...(await queueThenFlush(base, input.undoText)), id };
    try {
      const res = await RUNNERS.savePart(orgId, job.id, op, id, input.values, key, serverNowIso());
      if (input.undoText && res.undo) offerUndo({ jobId: job.id, text: input.undoText, serverUndoId: res.undo.id });
      refreshJob(job.id);
      void qc.invalidateQueries({ queryKey: qk.parts(orgId, job.id) });
      return { queued: false, id };
    } catch (e) {
      if (isNetwork(e)) return { ...(await queueThenFlush(base, input.undoText)), id };
      throw e;
    }
  }, [orgId, t, qc, queueThenFlush, offerUndo, refreshJob]);

  const dismissUndo = useCallback(() => setUndoEntry(null), []);
  const clearUndoMessage = useCallback(() => setUndoMessage(null), []);
  const undoLast = useCallback(async () => {
    const entry = undoEntry;
    if (!entry) return;
    setUndoEntry(null);
    if (entry.itemId && (await removeWaiting(entry.itemId))) { await reload(); refreshJob(entry.jobId); return; } // never sent: nothing to take back on the server
    await enqueue({ orgId: orgRef.current, jobId: entry.jobId, kind: "undo", undoId: entry.serverUndoId, label: t("b2b.tech.undo.btn", "Undo") });
    await reload();
    if (navigator.onLine) await flush();
  }, [undoEntry, reload, refreshJob, flush, t]);

  const submitPhoto = useCallback<OfflineContextValue["submitPhoto"]>(async (job, file) => {
    const base = { orgId, jobId: job.id, jobRef: job.reference, kind: "photo" as const, file, fileName: file.name, label: "Photo" };
    if (!navigator.onLine || (await pendingForJob(orgId, job.id)).length > 0) return queueThenFlush(base);
    try {
      await uploadPhoto(orgId, job.id, file);
      void qc.invalidateQueries({ queryKey: ["org", orgId, "job", job.id] });
      return { queued: false };
    } catch (e) {
      if (isNetwork(e)) return queueThenFlush(base);
      throw e;
    }
  }, [orgId, qc, queueThenFlush]);

  const queueSignature = useCallback<OfflineContextValue["queueSignature"]>(async (job, png) => {
    await enqueue({ orgId, jobId: job.id, jobRef: job.reference, kind: "signature", file: png, fileName: "signature.png", label: "Customer signature" });
    await reload();
  }, [orgId, reload]);

  const attention = useMemo(() => items.filter((i) => i.status === "failed" || i.status === "conflict"), [items]);
  const syncState: SyncState = attention.length > 0 ? "attention" : flushing ? "syncing" : waitingCount > 0 ? "queued" : "synced";

  const value = useMemo<OfflineContextValue>(
    () => ({ items, attention, waitingCount, syncState, lastSync, lastResult, online, flush, submitAction, submitChecklist, submitPause, submitResumeWork, submitPart, undoEntry, undoMessage, dismissUndo, clearUndoMessage, undoLast, submitPhoto, queueSignature }),
    [items, attention, waitingCount, syncState, lastSync, lastResult, online, flush, submitAction, submitChecklist, submitPause, submitResumeWork, submitPart, undoEntry, undoMessage, dismissUndo, clearUndoMessage, undoLast, submitPhoto, queueSignature],
  );
  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}
