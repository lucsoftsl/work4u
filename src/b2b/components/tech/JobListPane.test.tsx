import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Job } from "@/b2b/api/types";
import type { QueueItem } from "@/b2b/offline/types";
import { JobListPane } from "./JobListPane";

const m = vi.hoisted(() => ({ jobs: { items: [] as unknown[], serverTime: "2026-10-13T08:00:00Z" } as Record<string, unknown>, queue: [] as unknown[], path: "/tech/o/jobs/b", online: true }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, f: string) => f }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
vi.mock("next/navigation", () => ({ usePathname: () => m.path }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "o", me: { org: { timezone: "UTC" } } }) }));
vi.mock("@/b2b/offline/OfflineProvider", () => ({ useOffline: () => ({ items: m.queue, online: m.online }) }));
vi.mock("@/b2b/offline/read", () => ({ loadMyJobs: async () => m.jobs, OFFLINE_READ: {} }));
afterEach(() => { cleanup(); m.queue = []; m.online = true; m.path = "/tech/o/jobs/b"; });

const job = (id: string, status: string, start: string): Job => ({ id, reference: `JOB-${id}`, title: `Job ${id}`, status, scheduledStart: `2026-10-13T${start}:00Z`, scheduledEnd: `2026-10-13T${start}:00Z`, customerName: "ACME", checklist: [], version: 1, requirements: {} }) as unknown as Job;
const mount = () => render(<QueryClientProvider client={new QueryClient()}><JobListPane /></QueryClientProvider>);

describe("JobListPane", () => {
  it("renders selectable rows as links; the URL's job is aria-current", async () => {
    m.jobs = { ...m.jobs, items: [job("a", "SCHEDULED", "09:00"), job("b", "DISPATCHED", "11:00"), job("c", "CLOSED", "07:00")] };
    mount();
    const links = await screen.findAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/tech/o/jobs/a", "/tech/o/jobs/b"]); // done jobs stay collapsed
    expect(screen.getByRole("link", { name: /Job b/ }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: /Job a/ }).getAttribute("aria-current")).toBeNull();
    expect(links[0].className).toContain("min-h-[72px]");
  });
  it("collapses done jobs until asked, then lists them", async () => {
    m.jobs = { ...m.jobs, items: [job("a", "SCHEDULED", "09:00"), job("c", "CLOSED", "07:00")] };
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Done today \(1\)/ }));
    expect(screen.getByRole("link", { name: /Job c/ })).toBeTruthy();
  });
  it("shows what is waiting or needs attention on a row, in text", async () => {
    m.jobs = { ...m.jobs, items: [job("a", "SCHEDULED", "09:00"), job("b", "DISPATCHED", "11:00")] };
    m.queue = [
      { id: "1", jobId: "a", status: "waiting", kind: "photo", createdAt: "", attempts: 0, orgId: "o", idempotencyKey: "k", label: "p" },
      { id: "2", jobId: "b", status: "conflict", kind: "photo", createdAt: "", attempts: 0, orgId: "o", idempotencyKey: "k", label: "p" },
    ] as QueueItem[];
    mount();
    expect(await screen.findByText("1 waiting")).toBeTruthy();
    expect(screen.getByText("Needs attention")).toBeTruthy();
  });
  it("uses the offline wording for a cached list", async () => {
    m.online = false;
    m.jobs = { ...m.jobs, items: [job("a", "SCHEDULED", "09:00")], cachedAt: "2026-10-13T07:00:00Z" };
    mount();
    expect(await screen.findByText(/Offline: showing saved data from/)).toBeTruthy();
  });
  it("shows the empty state", async () => {
    m.jobs = { ...m.jobs, items: [] };
    mount();
    expect(await screen.findByText(/No jobs assigned to you today/)).toBeTruthy();
  });
  it("a paused job's row shows the Paused chip and a frozen time, never a running timer", async () => {
    const T0 = "2026-10-13T08:00:00Z";
    const t = (state: string) => ({ state, workedSeconds: 422, pausedSeconds: 0, correctionSeconds: 0, runningSince: null, pausedSince: T0, pauseReason: "BREAK", pauseNote: null, workStartedAt: T0, workEndedAt: null, serverTime: T0 });
    m.jobs = { ...m.jobs, items: [{ ...job("a", "IN_PROGRESS", "09:00"), time: t("PAUSED") }, { ...job("b", "IN_PROGRESS", "11:00"), time: t("RUNNING") }] };
    mount();
    expect(await screen.findByText(/Paused · Break/)).toBeTruthy();
    expect(screen.getAllByText(/^⏱/).length).toBe(1); // only the running row ticks
  });
  it("a pause queued on the device shows on the row at once (overlay)", async () => {
    const T0 = "2026-10-13T08:00:00Z";
    m.jobs = { ...m.jobs, items: [{ ...job("a", "IN_PROGRESS", "09:00"), time: { state: "RUNNING", workedSeconds: 0, pausedSeconds: 0, correctionSeconds: 0, runningSince: T0, pausedSince: null, pauseReason: null, pauseNote: null, workStartedAt: T0, workEndedAt: null, serverTime: T0 } }] };
    m.queue = [{ id: "1", jobId: "a", status: "waiting", kind: "pause", pauseReason: "PARTS", createdAt: "2026-10-13T08:05:00Z", attempts: 0, orgId: "o", idempotencyKey: "k", label: "Pause" }] as QueueItem[];
    mount();
    expect(await screen.findByText(/Paused · Waiting for parts/)).toBeTruthy();
  });
});

