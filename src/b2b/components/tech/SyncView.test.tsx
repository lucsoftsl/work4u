import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { enqueue } from "@/b2b/offline/queue";
import { listQueue, putItem, resetDbHandle } from "@/b2b/offline/store";
import type { QueueItem } from "@/b2b/offline/types";
import { SyncView } from "./SyncView";

const state = vi.hoisted(() => ({ items: [] as QueueItem[], lastSync: null as string | null }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, fallback: string) => fallback }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "org1", me: { org: { timezone: "UTC" } } }) }));
vi.mock("@/b2b/offline/useStorage", () => ({ useStorage: () => null }));
vi.mock("@/b2b/offline/OfflineProvider", () => ({ useOffline: () => ({ items: state.items, online: true, waitingCount: 0, syncState: "attention", lastSync: state.lastSync, flush: vi.fn() }) }));

beforeEach(() => { globalThis.indexedDB = new IDBFactory(); resetDbHandle(); state.items = []; state.lastSync = null; });
afterEach(cleanup);

async function conflictDraft() {
  const a = await enqueue({ orgId: "org1", jobId: "j1", jobRef: "JOB-1", kind: "action", action: "complete", label: "Complete", expectedVersion: 3 });
  const p = await enqueue({ orgId: "org1", jobId: "j1", jobRef: "JOB-1", kind: "photo", label: "Photo", file: new Blob(["x"]) });
  for (const i of [a, p]) await putItem({ ...i, status: "conflict", error: "This job changed while you were offline." });
  state.items = await listQueue("org1");
}

describe("SyncView conflict card", () => {
  it("offers Discard draft from the conflict state and removes every held item of that job", async () => {
    await conflictDraft();
    render(<SyncView />);
    expect(screen.getByRole("button", { name: "Retry with latest" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Discard draft" }));
    await waitFor(async () => expect(await listQueue("org1")).toEqual([]));
  });
  it("does not touch another job's held items", async () => {
    await conflictDraft();
    const other = await enqueue({ orgId: "org1", jobId: "j2", jobRef: "JOB-2", kind: "action", action: "start", label: "Start", expectedVersion: 1 });
    await putItem({ ...other, status: "conflict", error: "x" });
    state.items = await listQueue("org1");
    render(<SyncView />);
    fireEvent.click(screen.getAllByRole("button", { name: "Discard draft" })[0]);
    await waitFor(async () => expect((await listQueue("org1")).map((i) => i.jobId)).toEqual(["j2"]));
  });
});

describe("SyncView empty queue wording", () => {
  it("does not claim everything was sent before any successful sync", () => {
    render(<SyncView />);
    expect(screen.getByText("No queued changes. Nothing has been synced from this phone yet.")).toBeTruthy();
    expect(screen.queryByText(/Everything you did has been sent/)).toBeNull();
  });
  it("after a verified sync with an empty queue, only claims there are no queued changes", () => {
    state.lastSync = "2026-10-13T10:00:00Z";
    render(<SyncView />);
    expect(screen.getByText("No queued changes.")).toBeTruthy();
    expect(screen.queryByText(/Everything you did has been sent/)).toBeNull();
  });
  it("after discarding a draft, says it was discarded instead of claiming it was sent", async () => {
    state.lastSync = "2026-10-13T10:00:00Z";
    await conflictDraft();
    const { rerender } = render(<SyncView />);
    fireEvent.click(screen.getByRole("button", { name: "Discard draft" }));
    await waitFor(async () => expect(await listQueue("org1")).toEqual([]));
    state.items = [];
    rerender(<SyncView />);
    expect(await screen.findByText("Draft discarded. No queued changes.")).toBeTruthy();
    expect(screen.queryByText(/has been sent/)).toBeNull();
  });
});
