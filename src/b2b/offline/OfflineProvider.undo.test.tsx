import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { B2bError } from "@/b2b/api/client";
import { qk } from "@/b2b/api/endpoints";
import { OfflineProvider, useOffline } from "./OfflineProvider";
import { listQueue, resetDbHandle } from "./store";

const api = vi.hoisted(() => ({ pauseWork: vi.fn(), resumeWork: vi.fn(), undoJob: vi.fn(), runAction: vi.fn(), toggleChecklist: vi.fn(), uploadPhoto: vi.fn(), uploadAttachment: vi.fn(), addPart: vi.fn(), editPart: vi.fn(), removePart: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, f: string) => f }) }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "org1" }) }));
vi.mock("@/b2b/api/endpoints", async (o) => ({ ...await o<typeof import("@/b2b/api/endpoints")>(), ...api }));

const holder: { current: ReturnType<typeof useOffline> | null } = { current: null };
function Probe() { const c = useOffline(); useEffect(() => { holder.current = c; }); return null; }
const ctxOf = () => holder.current!;
const job = { id: "j1", reference: "JOB-1", version: 5 };
const setOnline = (v: boolean) => Object.defineProperty(window.navigator, "onLine", { value: v, configurable: true });
let qc = new QueryClient();
const mount = () => render(<QueryClientProvider client={qc}><OfflineProvider><Probe /></OfflineProvider></QueryClientProvider>);

beforeEach(() => { qc = new QueryClient(); globalThis.indexedDB = new IDBFactory(); resetDbHandle(); setOnline(true); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("undo", () => {
  it("offline: undoing a still-queued pause just removes it; nothing is sent", async () => {
    setOnline(false);
    mount();
    await act(async () => { await ctxOf().submitPause(job, "BREAK"); });
    expect(ctxOf().undoEntry?.text).toBe("Work paused");
    expect(ctxOf().undoEntry?.itemId).toBeTruthy();
    expect(await listQueue("org1")).toHaveLength(1);
    await act(async () => { await ctxOf().undoLast(); });
    expect(await listQueue("org1")).toEqual([]);
    expect(api.undoJob).not.toHaveBeenCalled();
    expect(api.pauseWork).not.toHaveBeenCalled();
    expect(ctxOf().undoEntry).toBeNull();
  });

  it("online: a synced pause is undone with POST /undo carrying the server's undo id", async () => {
    api.pauseWork.mockResolvedValue({ undo: { id: 9, kind: "pause", expiresInSeconds: 30 } });
    api.undoJob.mockResolvedValue({ undone: { kind: "pause" }, job: {}, undo: null });
    mount();
    await act(async () => { await ctxOf().submitPause(job, "PARTS", "van"); });
    expect(ctxOf().undoEntry?.serverUndoId).toBe(9);
    await act(async () => { await ctxOf().undoLast(); });
    await waitFor(() => expect(api.undoJob).toHaveBeenCalledWith("org1", "j1", expect.objectContaining({ undoId: 9 }), expect.any(String)));
    expect(api.undoJob).toHaveBeenCalledTimes(1);
  });

  it("a refused undo tells the technician instead of holding the job", async () => {
    api.pauseWork.mockResolvedValue({ undo: { id: 9, kind: "pause", expiresInSeconds: 30 } });
    api.undoJob.mockRejectedValue(new B2bError(409, "UNDO_NOT_POSSIBLE", "x"));
    mount();
    await act(async () => { await ctxOf().submitPause(job, "BREAK"); });
    await act(async () => { await ctxOf().undoLast(); });
    await waitFor(() => expect(ctxOf().undoMessage).toBe("Can't undo: this job changed."));
    expect(await listQueue("org1")).toEqual([]);
  });

  it("complete is never undoable; a newer action replaces the toast", async () => {
    api.runAction.mockResolvedValue({ undo: null });
    api.pauseWork.mockResolvedValue({ undo: { id: 1, kind: "pause", expiresInSeconds: 30 } });
    api.resumeWork.mockResolvedValue({ undo: { id: 2, kind: "resume", expiresInSeconds: 30 } });
    mount();
    await act(async () => { await ctxOf().submitAction(job, "complete"); });
    expect(ctxOf().undoEntry).toBeNull();
    await act(async () => { await ctxOf().submitPause(job, "BREAK"); });
    const first = ctxOf().undoEntry;
    await act(async () => { await ctxOf().submitResumeWork(job); });
    expect(ctxOf().undoEntry?.text).toBe("Work resumed");
    expect(ctxOf().undoEntry?.token).toBeGreaterThan(first!.token);
  });

  it("parts: an offline add gets a client id, and undoing it removes it from the queue", async () => {
    setOnline(false);
    mount();
    let id = "";
    await act(async () => { id = (await ctxOf().submitPart(job, "add", { values: { name: "Valve", quantity: 1 }, undoText: "Added Valve" })).id; });
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    const q = await listQueue("org1");
    expect(q[0]).toMatchObject({ kind: "part", partOp: "add", partId: id });
    await act(async () => { await ctxOf().undoLast(); });
    expect(await listQueue("org1")).toEqual([]);
  });
});

describe("optimistic checklist tick", () => {
  const seed = () => qc.setQueryData(qk.job("org1", "j1"), { id: "j1", cachedAt: null, checklist: [{ id: "a", text: "Valve", done: false }] });
  const done = () => (qc.getQueryData(qk.job("org1", "j1")) as { checklist: Array<{ done: boolean }> }).checklist[0].done;

  it("online: the box is checked immediately, before the server answers", async () => {
    seed();
    let release: (v: unknown) => void = () => undefined;
    api.toggleChecklist.mockReturnValue(new Promise((r) => { release = r; }));
    mount();
    let p: Promise<unknown> = Promise.resolve();
    act(() => { p = ctxOf().submitChecklist(job, "a", true, "Checklist: Valve"); });
    await waitFor(() => expect(done()).toBe(true));
    expect(api.toggleChecklist).toHaveBeenCalled();
    await act(async () => { release({ version: 5 }); await p; });
    expect(done()).toBe(true);
  });

  it("rolls back and reports the error when the server refuses", async () => {
    seed();
    api.toggleChecklist.mockRejectedValue(new B2bError(409, "INVALID_TRANSITION", "no"));
    mount();
    await act(async () => { await expect(ctxOf().submitChecklist(job, "a", true, "x")).rejects.toBeTruthy(); });
    expect(done()).toBe(false);
  });

  it("a network failure falls back to the queue (no rollback flicker: the queue overlay shows it)", async () => {
    seed();
    api.toggleChecklist.mockRejectedValue(new B2bError(0, "NETWORK", "offline"));
    mount();
    await act(async () => { await ctxOf().submitChecklist(job, "a", true, "x"); });
    expect(done()).toBe(false); // cache restored; applyPending overlays the queued tick
    expect((await listQueue("org1")).map((i) => i.kind)).toEqual(["checklist"]);
  });

  it("offline: queued untouched cache (the overlay renders it), and undo then truly reverts it", async () => {
    setOnline(false);
    seed();
    mount();
    await act(async () => { await ctxOf().submitChecklist(job, "a", true, "x", { undoText: "Marked done" }); });
    expect(done()).toBe(false);
    expect(await listQueue("org1")).toHaveLength(1);
    await act(async () => { await ctxOf().undoLast(); });
    expect(await listQueue("org1")).toEqual([]);
  });
});

describe("list freshness after a clock change", () => {
  it("pausing online also refreshes Today's list so the row shows Paused", async () => {
    api.pauseWork.mockResolvedValue({ undo: null });
    const spy = vi.spyOn(qc, "invalidateQueries");
    mount();
    await act(async () => { await ctxOf().submitPause(job, "BREAK"); });
    const keys = spy.mock.calls.map((c) => JSON.stringify((c[0] as { queryKey?: unknown })?.queryKey));
    expect(keys).toContain(JSON.stringify(qk.myJobs("org1")));
  });
});
