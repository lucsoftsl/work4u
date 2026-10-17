import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TechTodayPage from "./page";

const m = vi.hoisted(() => ({ wide: true, replace: vi.fn(), items: [] as unknown[] }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, f: string) => f }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: m.replace }) }));
vi.mock("@/b2b/lib/useMediaQuery", () => ({ useMediaQuery: () => m.wide }));
vi.mock("@/b2b/components/shell/RequirePermission", () => ({ RequirePermission: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "o", me: { org: { timezone: "UTC" } } }) }));
vi.mock("@/b2b/offline/OfflineProvider", () => ({ useOffline: () => ({ items: [], online: true, submitAction: vi.fn() }) }));
vi.mock("@/b2b/offline/read", () => ({ loadMyJobs: async () => ({ serverTime: "2026-10-13T08:00:00Z", items: m.items, cachedAt: null }), OFFLINE_READ: {} }));
afterEach(() => { cleanup(); vi.clearAllMocks(); m.wide = true; });
const job = (id: string, status: string, start: string) => ({ id, reference: `JOB-${id}`, title: `Job ${id}`, status, scheduledStart: `2026-10-13T${start}:00Z`, scheduledEnd: `2026-10-13T${start}:00Z`, checklist: [], version: 1, requirements: {} });
const mount = () => render(<QueryClientProvider client={new QueryClient()}><TechTodayPage /></QueryClientProvider>);

describe("/today on tablet", () => {
  it("replaces the URL with the Next-up job (so Back does not bounce to /today)", async () => {
    m.items = [job("late", "SCHEDULED", "15:00"), job("first", "SCHEDULED", "09:00")];
    mount();
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/tech/o/jobs/first"));
    expect(m.replace).toHaveBeenCalledTimes(1);
  });
  it("shows the empty detail state when there are no jobs, and does not navigate", async () => {
    m.items = [];
    mount();
    expect(await screen.findByText("Nothing to open. New jobs will appear here.")).toBeTruthy();
    expect(m.replace).not.toHaveBeenCalled();
  });
  it("on a phone it stays the list and never redirects", async () => {
    m.wide = false;
    m.items = [job("a", "SCHEDULED", "09:00")];
    mount();
    expect(await screen.findByRole("heading", { level: 1 })).toBeTruthy();
    expect(m.replace).not.toHaveBeenCalled();
  });
  it("always has exactly one h1: tablet placeholder, tablet empty, and the phone loading state", async () => {
    m.items = [];
    const { unmount } = mount();
    expect((await screen.findAllByRole("heading", { level: 1 })).length).toBe(1);
    unmount();
    m.wide = false;
    mount();
    expect(screen.getAllByRole("heading", { level: 1 }).length).toBe(1); // while loading
    await screen.findByText(/No jobs assigned/);
    expect(screen.getAllByRole("heading", { level: 1 }).length).toBe(1);
  });
});
