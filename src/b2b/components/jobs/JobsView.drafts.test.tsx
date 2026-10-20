import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Job } from "@/b2b/api/types";

const m = vi.hoisted(() => ({ search: "", replace: vi.fn(), list: vi.fn(), perms: new Set<string>() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: m.replace, push: vi.fn() }),
  usePathname: () => "/ops/o1/jobs",
  useSearchParams: () => new URLSearchParams(m.search),
}));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: "en", t: (_k: string, f?: string) => f ?? _k }) }));
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ push: vi.fn() }) }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "o1", me: { org: { timezone: "UTC" } }, can: (p: string) => m.perms.has(p) }) }));
vi.mock("@/b2b/api/endpoints", async (o) => ({ ...(await o<typeof import("@/b2b/api/endpoints")>()), listJobs: m.list, listTeams: vi.fn().mockResolvedValue([]) }));
import { JobsView } from "./JobsView";

HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };

const draft = (o: Partial<Job> = {}): Job => ({
  id: "d1", number: 1074, reference: "JOB-1074", title: "Leaky tap", status: "DRAFT", customerId: "c1", locationId: null, jobTypeId: null, category: "Repair",
  version: 2, updatedAt: "2026-10-19T08:00:00Z", createdAt: "2026-10-19T07:00:00Z", requirements: { checklist: false, notes: false, photo: false, signature: false, review: false },
  checklist: [], timestamps: {}, reopenedCount: 0, ...o,
}) as Job;
const page = (items: Job[], total = items.length) => ({ items, total, limit: 25, offset: 0, hasMore: false, nextOffset: null, nextCursor: null, sort: "updatedAt", dir: "desc" });
const show = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><JobsView /></QueryClientProvider>);

beforeEach(() => { m.search = ""; m.perms = new Set(["job.view", "job.create", "job.cancel"]); m.list.mockResolvedValue(page([])); });
afterEach(() => { cleanup(); vi.clearAllMocks(); window.history.replaceState({}, "", "/"); });

describe("Jobs list: Drafts view (4718e5f9)", () => {
  it("the Drafts tab shows how many of my drafts there are, asking the API for drafts created by me", async () => {
    m.list.mockImplementation(async (_o: string, f: { status?: string[]; limit?: number }) => (f.status?.[0] === "DRAFT" ? page([draft()], 3) : page([])));
    show();
    const tab = await screen.findByRole("button", { name: /Drafts/ });
    await waitFor(() => expect(tab.textContent).toContain("3"));
    expect(m.list).toHaveBeenCalledWith("o1", { status: ["DRAFT"], mine: true, limit: 1 }, expect.anything());
  });
  it("the default list never asks for drafts", async () => {
    show();
    await screen.findByRole("button", { name: /Drafts/ });
    const listCalls = m.list.mock.calls.filter(([, f]) => f.limit === 25);
    expect(listCalls.length).toBeGreaterThan(0);
    for (const [, f] of listCalls) expect(f.status ?? []).not.toContain("DRAFT");
  });
  it("opening the tab filters the URL to my drafts", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: /Drafts/ }));
    expect(m.replace).toHaveBeenCalledWith("/ops/o1/jobs?status=DRAFT&mine=true", { scroll: false });
  });
  it("shows the drafts table with the explanation, 'Missing' hints, and the Created-by switch", async () => {
    m.search = "status=DRAFT&mine=true";
    m.list.mockImplementation(async () => page([draft(), draft({ id: "d2", reference: "JOB-1075", title: "", customerId: null, category: "" })]));
    show();
    const table = await screen.findByRole("table", { name: "Drafts" });
    expect(within(table).getByText("JOB-1074")).toBeTruthy();
    expect(within(table).getByText("Missing: location")).toBeTruthy();
    expect(within(table).getByText("(no title yet)")).toBeTruthy();
    expect(screen.getByText("Drafts aren't scheduled and aren't on the dispatch board. Technicians can't see them.")).toBeTruthy();
    expect((screen.getByRole("radio", { name: "Me" }) as HTMLInputElement).checked).toBe(true);
    const call = m.list.mock.calls.find(([, f]) => f.limit === 25)!;
    expect(call[1]).toMatchObject({ status: ["DRAFT"], mine: true });
  });
  it("an empty Drafts view explains what a draft is and offers drafts from anyone", async () => {
    m.search = "status=DRAFT&mine=true";
    window.history.replaceState({}, "", "/ops/o1/jobs?status=DRAFT&mine=true"); // the view reads the live URL when a filter changes
    show();
    expect(await screen.findByText("No drafts. Use Save as draft in Create job to keep work in progress.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show drafts from anyone" }));
    expect(m.replace).toHaveBeenCalledWith("/ops/o1/jobs?status=DRAFT", { scroll: false });
  });
  it("a viewer who cannot create or cancel jobs gets the list without Create job or Discard", async () => {
    m.perms = new Set(["job.view"]);
    m.search = "status=DRAFT";
    m.list.mockImplementation(async () => page([draft()]));
    show();
    await screen.findByRole("table", { name: "Drafts" });
    expect(screen.queryByRole("button", { name: /Create job from/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Discard/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Continue editing JOB-1074" })).toBeTruthy();
  });
});
