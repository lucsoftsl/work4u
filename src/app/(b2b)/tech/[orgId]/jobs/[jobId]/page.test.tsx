import { Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TechJobPage from "./page";

const m = vi.hoisted(() => ({ job: {} as Record<string, unknown>, offline: {} as Record<string, unknown> }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, f: string) => f }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/b2b/components/shell/RequirePermission", () => ({ RequirePermission: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/b2b/components/tech/PadBoundary", () => ({ PadBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>, preloadSignaturePad: () => undefined }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "o", me: { org: { timezone: "UTC" } } }) }));
vi.mock("@/b2b/offline/OfflineProvider", () => ({ useOffline: () => m.offline }));
vi.mock("@/b2b/offline/read", () => ({ loadJob: async () => m.job, OFFLINE_READ: {} }));
vi.mock("@/b2b/offline/store", () => ({ readDraft: async () => undefined, saveDraft: async () => undefined, deleteDraft: async () => undefined }));
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const VALUE = { orgId: "o", jobId: "j" };
const PARAMS = Object.assign(Promise.resolve(VALUE), { status: "fulfilled", value: VALUE }); // React.use() reads a settled thenable synchronously
const T0 = "2026-10-13T10:00:00Z";
const time = (state: string) => ({ state, workedSeconds: 600, pausedSeconds: 0, correctionSeconds: 0, runningSince: T0, pausedSince: state === "PAUSED" ? T0 : null, pauseReason: state === "PAUSED" ? "BREAK" : null, pauseNote: null, workStartedAt: T0, workEndedAt: null, serverTime: T0 });
function setup(state: "RUNNING" | "PAUSED", status = "IN_PROGRESS", extra: Record<string, unknown> = {}, offlineExtra: Record<string, unknown> = {}) {
  m.job = { id: "j", reference: "JOB-1", title: "AC", status, version: 3, customer: { name: "ACME" }, location: { addressLine: "x" }, requirements: {}, checklist: [], photoKeys: [], timestamps: {}, time: time(state), parts: [], cachedAt: null, ...extra };
  m.offline = {
    items: [], online: true, submitAction: vi.fn(async () => ({ queued: false })), submitChecklist: vi.fn(), submitPause: vi.fn(async () => ({ queued: false })), submitResumeWork: vi.fn(async () => ({ queued: false })),
    submitPhoto: vi.fn(), submitPart: vi.fn(), queueSignature: vi.fn(), undoEntry: null, undoMessage: null, undoLast: vi.fn(), dismissUndo: vi.fn(), clearUndoMessage: vi.fn(), ...offlineExtra,
  };
  render(<QueryClientProvider client={new QueryClient()}><Suspense fallback="suspended"><TechJobPage params={PARAMS} /></Suspense></QueryClientProvider>);
}

describe("technician job screen: pause / resume", () => {
  it("running: Pause (≥48px) and Blocked… sit above Complete (≥56px); Resume is not offered", async () => {
    setup("RUNNING");
    const pause = await screen.findByRole("button", { name: "Pause" });
    expect(pause.className).toContain("min-h-[48px]");
    expect(screen.getByRole("button", { name: "Blocked…" }).className).toContain("min-h-[48px]");
    expect(screen.getByRole("button", { name: "Complete job" }).className).toContain("min-h-[56px]");
    expect(screen.queryByRole("button", { name: "Resume work" })).toBeNull();
  });
  it("Pause opens the reason picker; confirming sends reason + note", async () => {
    setup("RUNNING");
    fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
    fireEvent.click(screen.getByRole("radio", { name: "Customer away" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Pause" }).at(-1)!);
    await waitFor(() => expect((m.offline.submitPause as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(expect.objectContaining({ id: "j" }), "CUSTOMER_AWAY", undefined));
  });
  it("paused: the primary is Resume work, Complete is not available, and the chip shows the reason", async () => {
    setup("PAUSED");
    const resume = await screen.findByRole("button", { name: "Resume work" });
    expect(screen.queryByRole("button", { name: "Complete job" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    expect(screen.getByText(/Paused · Break/)).toBeTruthy();
    fireEvent.click(resume);
    await waitFor(() => expect(m.offline.submitResumeWork).toHaveBeenCalled());
  });
  it("shows the running timer derived from the clock", async () => {
    setup("RUNNING");
    await screen.findByRole("button", { name: "Pause" });
    expect(document.querySelector('[data-timer-state="RUNNING"]')).toBeTruthy();
  });
  it("offers no Pause before the work has started", async () => {
    setup("RUNNING", "ON_SITE");
    await screen.findByRole("button", { name: "Start job" });
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
  });
});

describe("technician job screen: toast placement and parts", () => {
  it("the undo toast sits inside the dock ABOVE the Pause/Blocked buttons, so it never covers them", async () => {
    setup("RUNNING", "IN_PROGRESS", {}, { undoEntry: { token: 1, jobId: "j", text: "Work paused" } });
    const dock = await screen.findByTestId("action-dock");
    const toast = screen.getByText("Work paused").closest("div")!;
    const blocked = screen.getByRole("button", { name: "Blocked…" });
    expect(dock.contains(toast)).toBe(true);
    expect(toast.compareDocumentPosition(blocked) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(toast.className).not.toMatch(/fixed|absolute/);
  });
  it("parts stay editable until approval: IN_PROGRESS, COMPLETED and REVIEW; read-only once CLOSED", async () => {
    setup("RUNNING", "COMPLETED");
    expect(await screen.findByRole("button", { name: "Add part" })).toBeTruthy();
    cleanup();
    setup("RUNNING", "REVIEW");
    expect(await screen.findByRole("button", { name: "Add part" })).toBeTruthy();
    cleanup();
    setup("RUNNING", "CLOSED");
    await screen.findByText("Parts can be changed until the job is approved.");
    expect(screen.queryByRole("button", { name: "Add part" })).toBeNull();
  });
  it("still shows the undo toast after a part change on a finished job (no dock)", async () => {
    setup("RUNNING", "COMPLETED", {}, { undoEntry: { token: 2, jobId: "j", text: "Added Valve" } });
    expect(await screen.findByText("Added Valve")).toBeTruthy();
  });
});
