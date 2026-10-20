import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { FinanceView } from "./FinanceView";
import { FinanceGate } from "./FinanceGate";
import { downloadFinanceCsv, getFinanceBreakdown, getFinanceJobs, getFinanceSummary } from "@/b2b/api/finance";
import { B2bError } from "@/b2b/api/client";
import { TODAY_ISO, breakdownFixture, breakdownItem, jobItem, jobsFixture, makeClient, mountWithQuery, navStore, stubMedia, summaryFixture, withQuery } from "./finance.testkit";

const perms = vi.hoisted(() => ({ allow: true, online: true }));
vi.mock("next/navigation", async () => (await import("./finance.testkit")).navigationMock);
vi.mock("@/lib/i18n", async () => (await import("./finance.testkit")).i18nMock);
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "org", status: "ready", viewer: {}, can: () => perms.allow, me: { org: { timezone: "UTC" } } }) }));
vi.mock("@/b2b/components/shell/RequirePermission", () => ({ RequirePermission: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/b2b/setup/useOnlineStatus", () => ({ useOnlineStatus: () => perms.online }));
vi.mock("@/b2b/api/finance", async (original) => ({
  ...await original<typeof import("@/b2b/api/finance")>(),
  getFinanceSummary: vi.fn(), getFinanceBreakdown: vi.fn(), getFinanceJobs: vi.fn(), downloadFinanceCsv: vi.fn(),
}));
vi.mock("@/b2b/api/catalog", async (original) => ({ ...await original<typeof import("@/b2b/api/catalog")>(), listCustomers: vi.fn().mockResolvedValue([{ id: "c1", name: "Hotel Marina" }]) }));
vi.mock("@/b2b/api/endpoints", async (original) => ({ ...await original<typeof import("@/b2b/api/endpoints")>(), listTeams: vi.fn().mockResolvedValue([{ id: "t1", name: "North" }]) }));
vi.mock("@/b2b/api/jobTypes", async (original) => ({ ...await original<typeof import("@/b2b/api/jobTypes")>(), listJobTypes: vi.fn().mockResolvedValue([{ id: "jt1", name: "Repair", archived: false }]) }));
vi.mock("@/b2b/setup/api", async (original) => ({ ...await original<typeof import("@/b2b/setup/api")>(), listAssignableMembers: vi.fn().mockResolvedValue([{ id: "m1", displayName: "Ana Pop" }]) }));

const summaryMock = vi.mocked(getFinanceSummary);
const breakdownMock = vi.mocked(getFinanceBreakdown);
const jobsMock = vi.mocked(getFinanceJobs);
const csvMock = vi.mocked(downloadFinanceCsv);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(TODAY_ISO));
  perms.allow = true;
  perms.online = true;
  stubMedia(true);
  navStore.reset();
  summaryMock.mockResolvedValue(summaryFixture());
  breakdownMock.mockResolvedValue(breakdownFixture("client", [breakdownItem("c1", "Hotel Marina S.A.", 52400), breakdownItem(null, null, 6400, { margin: -500, marginPct: -7.8 })]));
  jobsMock.mockResolvedValue(jobsFixture([jobItem(1), jobItem(2, { kind: "PIPELINE", price: null, cost: null, margin: null, marginPct: null })], { total: 64, hasMore: true, nextOffset: 50 }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

const mount = (qs = "") => { navStore.reset(qs); return mountWithQuery(<FinanceView />); };
const tile = (label: string) => within(screen.getByRole("list", { name: "Key figures" })).getByText(label).closest("li") as HTMLElement;
const loaded = () => screen.findByRole("list", { name: "Key figures" });

describe("permission", () => {
  it("shows the finance denied message and fires no finance request without finance.view", async () => {
    perms.allow = false;
    mountWithQuery(<FinanceGate><FinanceView /></FinanceGate>);
    expect(screen.getByText("Finance is limited to administrators and operations managers.")).toBeTruthy();
    await Promise.resolve();
    for (const fn of [summaryMock, breakdownMock, jobsMock, csvMock]) expect(fn).not.toHaveBeenCalled();
  });
  it("does not query by itself without the permission either", async () => {
    perms.allow = false;
    mount();
    await Promise.resolve();
    expect(summaryMock).not.toHaveBeenCalled();
  });
});

describe("period and URL state", () => {
  it("defaults to this month and sends the month range", async () => {
    mount();
    await loaded();
    expect(summaryMock).toHaveBeenCalledWith("org", expect.objectContaining({ from: "2026-10-01", to: "2026-10-31", basis: "completed" }), expect.anything());
    expect((screen.getByRole("radio", { name: "This month" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText(/1 October 2026 – 31 October 2026 · amounts in RON/)).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
  it("detects the preset from from/to in the URL", async () => {
    mount("from=2026-09-01&to=2026-09-30");
    await loaded();
    expect((screen.getByRole("radio", { name: "Last month" }) as HTMLInputElement).checked).toBe(true);
    expect(summaryMock).toHaveBeenCalledWith("org", expect.objectContaining({ from: "2026-09-01", to: "2026-09-30" }), expect.anything());
  });
  it("picking Quarter writes from/to to the URL", async () => {
    mount();
    await loaded();
    fireEvent.click(screen.getByRole("radio", { name: "Quarter" }));
    expect(navStore.replaced.at(-1)).toContain("from=2026-10-01&to=2026-12-31");
  });
  it("Custom shows two date inputs and applies a valid range", async () => {
    mount();
    await loaded();
    fireEvent.click(screen.getByRole("radio", { name: "Custom" }));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-08-20" } });
    expect(navStore.replaced.at(-1)).toContain("from=2026-08-01&to=2026-08-20");
  });
  it("an invalid range shows a message, keeps the last data and does not call the API", async () => {
    mount();
    await loaded();
    const calls = summaryMock.mock.calls.length;
    fireEvent.click(screen.getByRole("radio", { name: "Custom" }));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2024-01-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-10-31" } });
    expect((await screen.findByRole("alert")).textContent).toBe("That date range is too long. Choose up to 400 days.");
    expect(summaryMock.mock.calls.length).toBe(calls);
    expect(screen.getByRole("list", { name: "Key figures" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-11-01" } });
    expect(screen.getByRole("alert").textContent).toBe("The end date is before the start date.");
    expect(summaryMock.mock.calls.length).toBe(calls);
  });
  it("a range from the URL that is reversed shows the message and queries the last good range", async () => {
    mount("from=2026-10-20&to=2026-10-02");
    expect((await screen.findByRole("alert")).textContent).toBe("The end date is before the start date.");
    for (const [, f] of summaryMock.mock.calls) expect(f).toEqual(expect.objectContaining({ from: "2026-10-01", to: "2026-10-31" }));
  });
  it("basis toggle is in the URL and the API call", async () => {
    mount();
    await loaded();
    fireEvent.click(screen.getByRole("radio", { name: "By scheduled date" }));
    expect(navStore.replaced.at(-1)).toContain("basis=scheduled");
    await waitFor(() => expect(summaryMock).toHaveBeenLastCalledWith("org", expect.objectContaining({ basis: "scheduled" }), expect.anything()));
  });
  it("filters are in the URL and the API call", async () => {
    mount();
    await loaded();
    fireEvent.change(await screen.findByLabelText("Client"), { target: { value: "c1" } });
    expect(navStore.replaced.at(-1)).toContain("customer=c1");
    await waitFor(() => expect(summaryMock).toHaveBeenLastCalledWith("org", expect.objectContaining({ customerId: "c1" }), expect.anything()));
    expect(await screen.findByRole("option", { name: "Ana Pop" })).toBeTruthy();
  });
});

describe("key figures", () => {
  it("shows the summary values and never adds the pipeline into earned", async () => {
    mount();
    await loaded();
    const items = within(screen.getByRole("list", { name: "Key figures" })).getAllByRole("listitem");
    expect(items).toHaveLength(6);
    expect(tile("Earned revenue").textContent).toContain("1,845.00");
    expect(tile("Earned revenue").textContent).not.toContain("2,809");
    expect(tile("Cost").textContent).toContain("1,213.00");
    expect(tile("Margin").textContent).toContain("632.00");
    expect(tile("Margin %").textContent).toContain("34.3%");
    expect(tile("Jobs completed").textContent).toContain("41");
    expect(tile("Pipeline (expected)").textContent).toContain("964.00");
  });
  it("shows a dash with a text alternative when the margin is unknown", async () => {
    summaryMock.mockResolvedValue(summaryFixture({ earned: { ...summaryFixture().earned, margin: null, marginPct: null } }));
    mount();
    await loaded();
    expect(tile("Margin").textContent).toContain("–");
    expect(tile("Margin").textContent).toContain("not available");
    expect(tile("Margin %").textContent).toContain("not available");
  });
  it("marks a negative margin with a minus sign and the word loss", async () => {
    summaryMock.mockResolvedValue(summaryFixture({ earned: { ...summaryFixture().earned, margin: -50000, marginPct: -12.5 } }));
    mount();
    await loaded();
    expect(tile("Margin").textContent).toMatch(/-.*500\.00/);
    expect(tile("Margin").textContent).toContain("loss");
  });
  it("hint uses jobsWithoutPrice and jobsWithoutCost", async () => {
    summaryMock.mockResolvedValue(summaryFixture({
      earned: { ...summaryFixture().earned, jobsWithoutPrice: 2, jobsWithoutCost: 5 },
      pipeline: { ...summaryFixture().pipeline, jobsWithoutPrice: 1, jobsWithoutCost: 1 },
    }));
    mount();
    expect(await screen.findByText("6 jobs have no cost and 3 jobs have no price, so margin may be higher or lower than shown.")).toBeTruthy();
  });
  it("names only what is missing, in the singular for one job", async () => {
    summaryMock.mockResolvedValue(summaryFixture({ earned: { ...summaryFixture().earned, jobsWithoutPrice: 0, jobsWithoutCost: 1 }, pipeline: { ...summaryFixture().pipeline, jobsWithoutCost: 0 } }));
    mount();
    expect(await screen.findByText("1 job has no cost, so margin may be higher or lower than shown.")).toBeTruthy();
  });
  it("no hint when the data is complete", async () => {
    summaryMock.mockResolvedValue(summaryFixture({ earned: { ...summaryFixture().earned, jobsWithoutPrice: 0, jobsWithoutCost: 0 } }));
    mount();
    await loaded();
    expect(screen.queryByRole("button", { name: "Show them" })).toBeNull();
  });
  it("Show them asks the server for the jobs missing a price or cost (list and CSV), keeps it in the URL and focuses the list", async () => {
    mount();
    await screen.findByText("JOB-1");
    fireEvent.click(screen.getByRole("button", { name: "Show them" }));
    await waitFor(() => expect(jobsMock).toHaveBeenLastCalledWith("org", expect.objectContaining({ missing: "any" }), expect.anything()));
    expect(navStore.replaced.at(-1)).toContain("missing=any");
    expect((screen.getByLabelText("Missing") as HTMLSelectElement).value).toBe("any");
    expect(document.activeElement?.textContent).toBe("Jobs in this period");
    fireEvent.click(await screen.findByRole("button", { name: "Export CSV" }));
    await waitFor(() => expect(csvMock).toHaveBeenCalledWith("org", expect.objectContaining({ missing: "any" })));
  });
  it("the Missing select can ask for a price or a cost only, and back to all jobs", async () => {
    mount();
    await screen.findByText("JOB-1");
    fireEvent.change(screen.getByLabelText("Missing"), { target: { value: "cost" } });
    await waitFor(() => expect(jobsMock).toHaveBeenLastCalledWith("org", expect.objectContaining({ missing: "cost" }), expect.anything()));
    fireEvent.change(screen.getByLabelText("Missing"), { target: { value: "" } });
    await waitFor(() => expect(jobsMock.mock.calls.at(-1)![1]).not.toHaveProperty("missing"));
  });
  it("nothing missing: a friendly empty message, not an empty table", async () => {
    jobsMock.mockResolvedValue(jobsFixture([]));
    mount("missing=price");
    expect(await screen.findByText("Every job in this period has a price and a cost.")).toBeTruthy();
  });
});

describe("states", () => {
  it("shows a loading status first", () => {
    summaryMock.mockReturnValue(new Promise(() => {}));
    mount();
    const status = screen.getByRole("status", { name: "" });
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Loading finance figures")).toBeTruthy();
  });
  it("empty: nothing completed offers last month", async () => {
    summaryMock.mockResolvedValue(summaryFixture({ earned: { ...summaryFixture().earned, jobs: 0, revenue: 0, cost: 0 }, pipeline: { ...summaryFixture().pipeline, jobs: 0 } }));
    mount();
    expect(await screen.findByText("No completed jobs in this period")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show last month" }));
    expect(navStore.replaced.at(-1)).toContain("from=2026-09-01&to=2026-09-30");
  });
  it("empty: jobs completed but no prices links to the jobs list", async () => {
    summaryMock.mockResolvedValue(summaryFixture({ earned: { ...summaryFixture().earned, jobs: 4, jobsWithoutPrice: 4 } }));
    mount();
    expect(await screen.findByText("Jobs completed, but no prices yet")).toBeTruthy();
    expect(screen.getByText("4 jobs were completed in this period, and none has a price. Add a price (and cost) to a job to see revenue and margin.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open jobs without a price" }).getAttribute("href")).toBe("/ops/org/jobs");
  });
  it("error: shows the message and retries", async () => {
    summaryMock.mockRejectedValueOnce(new B2bError(400, "VALIDATION_ERROR", "bad"));
    mount();
    expect(await screen.findByText("We couldn't load your finance figures.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await loaded();
    expect(summaryMock).toHaveBeenCalledTimes(2);
  });
  it("offline: banner with the saved time, export disabled, data kept", async () => {
    const qc = makeClient();
    navStore.reset();
    const { rerender } = mountWithQuery(<FinanceView />, qc);
    await screen.findByText("JOB-1");
    perms.online = false;
    rerender(withQuery(<FinanceView />, qc));
    expect(await screen.findByText(/You're offline\. Showing figures saved at/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Export CSV" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Reconnect to export.")).toBeTruthy();
  });
  it("announces the number of jobs politely", async () => {
    mount();
    await loaded();
    await waitFor(() => expect(document.querySelector('[aria-live="polite"]')?.textContent).toContain("Showing 64 jobs"));
  });
});

describe("chart and table", () => {
  it("shows the chart by default and the table with view=table", async () => {
    mount();
    await loaded();
    expect(screen.getByRole("img", { name: /Revenue and cost by day/ })).toBeTruthy();
    expect(screen.queryByRole("table", { name: /Revenue, cost and expected pipeline by day, RON/ })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Table" }));
    expect(navStore.replaced.at(-1)).toContain("view=table");
  });
  it("table totals equal the key figures", async () => {
    mount("view=table");
    await loaded();
    const table = screen.getByRole("table", { name: "Revenue, cost and expected pipeline by day, RON" });
    expect(within(screen.getByRole("region", { name: "Table: Revenue, cost and expected pipeline by day, RON" })).getByRole("table")).toBe(table);
    const foot = within(table).getAllByRole("row").at(-1) as HTMLElement;
    expect(within(foot).getByText("Total")).toBeTruthy();
    const cells = within(foot).getAllByRole("cell").map((c) => c.textContent);
    expect(cells).toEqual(expect.arrayContaining(["1,845.00", "1,213.00", "632.00", "964.00"]));
    expect(within(table).getAllByRole("rowheader")).toHaveLength(4);
  });
});

describe("breakdown paging", () => {
  it("Load more fetches the next page of groups with the API's nextOffset; the totals row stays the API's", async () => {
    breakdownMock.mockReset();
    breakdownMock
      .mockResolvedValueOnce(breakdownFixture("client", [breakdownItem("c1", "Hotel Marina S.A.", 52400)], { total: 2, hasMore: true, nextOffset: 1, truncated: true, totals: { jobs: 9, revenue: 99900, cost: 40000, margin: 59900, marginPct: 60 } }))
      .mockResolvedValueOnce(breakdownFixture("client", [breakdownItem("c2", "Café Sol", 47500)], { total: 2, offset: 1, truncated: false }));
    mount();
    await screen.findByText("Hotel Marina S.A.");
    expect(screen.getByText("Showing 1 of 2")).toBeTruthy();
    const tables = () => screen.getAllByRole("table");
    expect(tables().some((t) => t.querySelector("tfoot")?.textContent?.includes("999.00"))).toBe(true);
    const buttons = screen.getAllByRole("button", { name: "Load more" });
    fireEvent.click(buttons[0]);
    expect(await screen.findByText("Café Sol")).toBeTruthy();
    expect(breakdownMock).toHaveBeenLastCalledWith("org", "client", expect.objectContaining({ offset: 1 }), expect.anything());
    expect(screen.queryByText("Showing 2 of 2")).toBeNull();
  });
});

describe("breakdown", () => {
  it("labels null keys and asks the API for the active tab", async () => {
    mount();
    expect(await screen.findByText("Hotel Marina S.A.")).toBeTruthy();
    expect(screen.getByText("No client")).toBeTruthy();
    expect(breakdownMock).toHaveBeenCalledWith("org", "client", expect.anything(), expect.anything());
    fireEvent.click(screen.getByRole("tab", { name: "By technician" }));
    expect(navStore.replaced.at(-1)).toContain("by=technician");
  });
});

describe("jobs in this period", () => {
  it("lists jobs with links, null labels and the count", async () => {
    jobsMock.mockResolvedValue(jobsFixture([jobItem(1, { customer: null, jobType: null })], { total: 64, hasMore: true, nextOffset: 50 }));
    mount();
    const link = await screen.findByRole("link", { name: "JOB-1" });
    expect(link.getAttribute("href")).toBe("/ops/org/jobs/job-1");
    expect(screen.getByText("No client", { selector: "td *, td" })).toBeTruthy();
    expect(screen.getByText("No job type")).toBeTruthy();
    expect(screen.getByText("Showing 1 of 64")).toBeTruthy();
    expect(screen.getAllByText("Earned").length).toBeGreaterThan(0);
  });
  it("renders cards below 900px", async () => {
    stubMedia(false);
    mount();
    await screen.findByText("JOB-1");
    expect(screen.queryByRole("table", { name: "Jobs in this period" })).toBeNull();
  });
  it("load more asks for the next offset and appends", async () => {
    jobsMock.mockResolvedValueOnce(jobsFixture([jobItem(1)], { total: 2, hasMore: true, nextOffset: 50 }));
    jobsMock.mockResolvedValueOnce(jobsFixture([jobItem(2)], { total: 2, hasMore: false, nextOffset: null, offset: 50 }));
    mount();
    await screen.findByText("JOB-1");
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await screen.findByText("JOB-2");
    expect(jobsMock).toHaveBeenLastCalledWith("org", expect.objectContaining({ offset: 50, limit: 50 }), expect.anything());
    expect(screen.getByText("JOB-1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
    expect(screen.getByText("Showing 2 of 2")).toBeTruthy();
  });
  it("Show filter sets kind in the URL and the request", async () => {
    mount();
    await screen.findByText("JOB-1");
    fireEvent.change(screen.getByLabelText("Show"), { target: { value: "pipeline" } });
    expect(navStore.replaced.at(-1)).toContain("kind=pipeline");
    await waitFor(() => expect(jobsMock).toHaveBeenLastCalledWith("org", expect.objectContaining({ kind: "pipeline", offset: 0 }), expect.anything()));
  });
  it("shows an empty message", async () => {
    jobsMock.mockResolvedValue(jobsFixture([], { total: 0 }));
    mount();
    expect(await screen.findByText("No jobs match these filters in this period.")).toBeTruthy();
  });
});

describe("export CSV", () => {
  it("downloads with the current filters, shows progress and confirms", async () => {
    let done!: () => void;
    csvMock.mockReturnValue(new Promise<void>((r) => { done = r; }));
    mount("customer=c1&kind=earned");
    await screen.findByText("JOB-1");
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    const busy = await screen.findByRole("button", { name: "Preparing CSV…" });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    expect(busy.getAttribute("aria-busy")).toBe("true");
    expect(csvMock).toHaveBeenCalledWith("org", expect.objectContaining({ from: "2026-10-01", to: "2026-10-31", basis: "completed", customerId: "c1", kind: "earned" }));
    done();
    expect(await screen.findByText("CSV downloaded")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeTruthy();
  });
  it("explains a rate limit", async () => {
    csvMock.mockRejectedValue(new B2bError(429, "RATE_LIMITED", "slow down"));
    mount();
    await screen.findByText("JOB-1");
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect((await screen.findByRole("alert")).textContent).toBe("You've exported a lot. Try again shortly.");
  });
  it("shows a retryable message for other failures", async () => {
    csvMock.mockRejectedValue(new Error("boom"));
    mount();
    await screen.findByText("JOB-1");
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect((await screen.findByRole("alert")).textContent).toBe("We couldn't prepare the CSV. Try again.");
    expect((screen.getByRole("button", { name: "Export CSV" }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("accessibility structure", () => {
  it("every landmark and labelled section has its own name (axe landmark-unique)", async () => {
    mount("view=table");
    await screen.findByText("JOB-1");
    await screen.findByText("Hotel Marina S.A.");
    const names: string[] = [];
    for (const el of Array.from(document.querySelectorAll("section[aria-labelledby], [role='region'], nav, aside, main"))) {
      const by = el.getAttribute("aria-labelledby");
      const name = el.getAttribute("aria-label") ?? (by ? document.getElementById(by)?.textContent : null);
      if (name) names.push(name.trim());
    }
    expect(names.length).toBeGreaterThan(2);
    expect(new Set(names).size).toBe(names.length);
  });
  it("KPI amounts never break: the figure is one unbreakable run, the currency sits above it, and the font follows the tile width", async () => {
    mount();
    const li = (await loaded(), tile("Earned revenue"));
    const figure = Array.from(li.querySelectorAll("span")).find((s) => /1,845\.00/.test(s.textContent ?? ""))!;
    expect(figure.className).toContain("whitespace-nowrap");
    expect(figure.textContent).toBe("1,845.00");
    expect(li.textContent).toContain("RON");
    expect(li.className).toContain("container-type:inline-size");
    expect(li.querySelector("p:nth-of-type(2)")?.className).toContain("cqw");
    expect(li.querySelector("p:nth-of-type(2)")?.className).not.toContain("overflow-wrap");
  });
});

describe("offline navigation", () => {
  afterEach(() => { Object.defineProperty(navigator, "onLine", { value: true, configurable: true }); });
  it("changing the period or a filter offline keeps the page: the address bar changes, the router is not used, cached figures stay with the notice", async () => {
    mount();
    await loaded();
    perms.online = false;
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const spy = vi.spyOn(window.history, "replaceState");
    const before = navStore.replaced.length;
    fireEvent.click(screen.getByRole("radio", { name: "Last month" }));
    expect(navStore.replaced.length).toBe(before); // no router.replace: it would fetch a page and end on the browser's error page
    expect(spy).toHaveBeenCalledWith(null, "", expect.stringContaining("from=2026-09-01"));
    expect(screen.getByRole("list", { name: "Key figures" })).toBeTruthy();
    spy.mockRestore();
  });
  it("two successive offline changes add up (the controls and header follow), and after reconnecting the URL and the screen agree", async () => {
    const qc = makeClient();
    const view = mountWithQuery(<FinanceView />, qc);
    await loaded();
    perms.online = false;
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    view.rerender(withQuery(<FinanceView />, qc));
    const spy = vi.spyOn(window.history, "replaceState");
    // The mocked useSearchParams does not follow history.replaceState: exactly the case where reading the URL back lost the change.
    fireEvent.click(screen.getByRole("radio", { name: "Last month" }));
    expect((screen.getByRole("radio", { name: "Last month" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText(/1 September 2026 – 30 September 2026/)).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "By scheduled date" }));
    expect((screen.getByRole("radio", { name: "By scheduled date" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: "Last month" }) as HTMLInputElement).checked).toBe(true); // the first change was not dropped
    const last = spy.mock.calls.at(-1)![2] as string;
    expect(last).toContain("from=2026-09-01");
    expect(last).toContain("basis=scheduled");
    expect(navStore.replaced).toHaveLength(0); // the router stayed out of it while offline
    // reconnect
    perms.online = true;
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    view.rerender(withQuery(<FinanceView />, qc));
    await waitFor(() => expect(navStore.replaced.at(-1)).toMatch(/from=2026-09-01.*basis=scheduled|basis=scheduled.*from=2026-09-01/));
    expect((screen.getByRole("radio", { name: "Last month" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: "By scheduled date" }) as HTMLInputElement).checked).toBe(true);
    await waitFor(() => expect(summaryMock).toHaveBeenLastCalledWith("org", expect.objectContaining({ from: "2026-09-01", basis: "scheduled" }), expect.anything()));
    spy.mockRestore();
  });
});
describe("currency: chosen by the company, never defaulted", () => {
  it("a company with no currency yet says so (no zero charts) and points to the profile", async () => {
    summaryMock.mockResolvedValue(summaryFixture({ currency: "EUR", currencyIsSet: false, earned: { jobs: 0, revenue: 0, cost: 0, margin: null, marginPct: null, jobsWithoutPrice: 0, jobsWithoutCost: 0 }, pipeline: { jobs: 0, revenue: 0, cost: 0, margin: null, marginPct: null, jobsWithoutPrice: 0, jobsWithoutCost: 0 }, series: [] }));
    mount();
    expect(await screen.findByText("Choose a currency to start entering prices")).toBeTruthy();
    expect(screen.queryByText(/· amounts in/)).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("link", { name: "Choose the company currency" }).getAttribute("href")).toBe("/ops/org/settings/profile");
  });
  it("amounts use the digits of the company currency: JPY has none", async () => {
    summaryMock.mockResolvedValue(summaryFixture({ currency: "JPY", currencyIsSet: true }));
    breakdownMock.mockResolvedValue(breakdownFixture("client", [breakdownItem("c1", "Hotel Marina S.A.", 52400)], { currency: "JPY" }));
    jobsMock.mockResolvedValue(jobsFixture([jobItem(1)], { currency: "JPY" }));
    mount();
    await screen.findByText("Hotel Marina S.A.");
    expect(screen.getAllByText("52,400").length).toBeGreaterThan(0);
    expect(screen.queryByText("524.00")).toBeNull();
  });
});
