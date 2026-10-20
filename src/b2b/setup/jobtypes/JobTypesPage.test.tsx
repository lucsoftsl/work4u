import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { B2bError } from "@/b2b/api/client";
import type { JobType } from "@/b2b/api/jobTypes";

const m = vi.hoisted(() => ({
  perms: new Set<string>(),
  list: vi.fn(), create: vi.fn(), update: vi.fn(), archive: vi.fn(), unarchive: vi.fn(), reorder: vi.fn(), toast: vi.fn(),
}));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: "en", t: (_k: string, f?: string) => f ?? _k }) }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "o1", can: (p: string) => m.perms.has(p) }) }));
const cur = vi.hoisted(() => ({ company: "RON" as string | null, effective: "RON", remember: vi.fn(), refresh: vi.fn() }));
vi.mock("@/b2b/currency/useEffectiveCurrency", () => ({ useEffectiveCurrency: () => ({ currency: cur.effective, companyCurrency: cur.company, isSet: cur.company !== null, preferred: null, loading: false, remember: cur.remember, refreshCompany: cur.refresh }) }));
vi.mock("@/b2b/currency/useCurrencies", async () => (await import("@/b2b/currency/testkit")).currenciesMock());
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ push: m.toast }) }));
vi.mock("@/b2b/api/jobTypes", async (o) => ({
  ...(await o<typeof import("@/b2b/api/jobTypes")>()),
  listJobTypes: m.list, createJobType: m.create, updateJobType: m.update, archiveJobType: m.archive, unarchiveJobType: m.unarchive, reorderJobTypes: m.reorder,
}));
import { JobTypesPage } from "./JobTypesPage";

HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };

const jt = (id: string, name: string, o: Partial<JobType> = {}): JobType => ({ id, name, position: 0, defaultDurationMin: null, archived: false, jobCount: 0, ...o });
const TYPES = [
  jt("a", "Installation", { defaultDurationMin: 240, defaultPrice: 150000, jobCount: 12 }),
  jt("b", "Repair", { defaultDurationMin: 90, defaultPrice: 45000, jobCount: 1 }),
  jt("c", "Maintenance", { defaultDurationMin: 90, defaultPrice: null }),
  jt("d", "Quote visit", { defaultDurationMin: 45, archived: true, jobCount: 9, archivedAt: "2026-10-01T00:00:00Z" }),
];
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const show = () => render(<QueryClientProvider client={client()}><JobTypesPage /></QueryClientProvider>);
const ADMIN = ["jobType.manage", "finance.view", "job.view"];

beforeEach(() => {
  m.perms = new Set(ADMIN);
  m.list.mockImplementation(async () => TYPES.map((x) => ({ ...x })));
});
afterEach(() => { cur.company = "RON"; cur.effective = "RON"; cleanup(); vi.clearAllMocks(); });

describe("Job types admin (ce3173a7)", () => {
  it("lists the active types in order with time, price and job count; archived ones are hidden by default", async () => {
    show();
    const list = await screen.findByRole("list", { name: "Job types" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain("Installation");
    expect(rows[0].textContent).toContain("4 h");
    expect(rows[0].textContent).toMatch(/1,500\.00/);
    expect(rows[0].textContent).toContain("12 jobs");
    expect(rows[1].textContent).toContain("1 job");
    expect(within(list).queryByText("Quote visit")).toBeNull();
  });
  it("without finance.view the default price does not exist: not in the rows, not in the dialog", async () => {
    m.perms = new Set(["jobType.manage", "job.view"]);
    show();
    await screen.findByText("Installation");
    expect(screen.queryByText(/1,500\.00/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add job type" }));
    expect(within(screen.getByRole("dialog")).queryByLabelText("Default price")).toBeNull();
  });
  it("a viewer who cannot manage sees the list, a note, and no controls", async () => {
    m.perms = new Set(["job.view"]);
    show();
    await screen.findByText("Installation");
    expect(screen.getByText(/You can view job types but not change them/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add job type" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Move Installation/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Archive Installation/ })).toBeNull();
  });
  it("filters Archived and All; an archived type offers Restore", async () => {
    show();
    await screen.findByText("Installation");
    fireEvent.click(screen.getByRole("radio", { name: "Archived" }));
    const row = screen.getByText("Quote visit").closest("li")!;
    expect(row.textContent).toContain("Archived");
    expect(within(row).queryByRole("button", { name: /Move/ })).toBeNull();
    m.unarchive.mockResolvedValue({ ...TYPES[3], archived: false });
    fireEvent.click(within(row).getByRole("button", { name: "Restore Quote visit" }));
    await waitFor(() => expect(m.unarchive).toHaveBeenCalledWith("o1", "d"));
    fireEvent.click(screen.getByRole("radio", { name: "All" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });
  it("shows the empty state with an Add button", async () => {
    m.list.mockResolvedValue([]);
    show();
    expect(await screen.findByText("No job types yet")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Add job type" }).length).toBeGreaterThan(0);
  });
  it("shows an error with retry", async () => {
    m.list.mockRejectedValueOnce(new B2bError(500, "UNKNOWN", "boom"));
    show();
    expect(await screen.findByText("Job types could not be loaded.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Installation")).toBeTruthy();
  });

  describe("reorder", () => {
    it("the arrow buttons save the new order, announce it and keep keyboard focus on the moved row", async () => {
      // the server remembers the order: the refetch after the save returns it
      let server = TYPES.map((x) => ({ ...x }));
      m.list.mockImplementation(async () => server.map((x) => ({ ...x })));
      m.reorder.mockImplementation(async (_o: string, ids: string[]) => {
        server = [...ids.map((id) => server.find((x) => x.id === id)!), ...server.filter((x) => !ids.includes(x.id))];
        return server;
      });
      show();
      await screen.findByText("Installation");
      const down = screen.getByRole("button", { name: "Move Installation down" });
      down.focus();
      fireEvent.click(down);
      await waitFor(() => expect(m.reorder).toHaveBeenCalledWith("o1", ["b", "a", "c"]));
      expect(screen.getByText("Installation moved to position 2 of 3.")).toBeTruthy();
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Move Installation down" })));
      const names = within(screen.getByRole("list", { name: "Job types" })).getAllByRole("listitem").map((r) => r.textContent ?? "");
      expect(names[0]).toContain("Repair");
    });
    it("the first row cannot go up and the last cannot go down", async () => {
      show();
      await screen.findByText("Installation");
      expect((screen.getByRole("button", { name: "Move Installation up" }) as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByRole("button", { name: "Move Maintenance down" }) as HTMLButtonElement).disabled).toBe(true);
    });
    it("a failed save puts the old order back and says so", async () => {
      m.reorder.mockRejectedValue(new B2bError(500, "UNKNOWN", "boom"));
      show();
      await screen.findByText("Installation");
      fireEvent.click(screen.getByRole("button", { name: "Move Installation down" }));
      await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Couldn't save the new order"));
      const first = within(screen.getByRole("list", { name: "Job types" })).getAllByRole("listitem")[0];
      expect(first.textContent).toContain("Installation");
      expect(m.toast).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
    });
    it("a drop on another row moves the dragged type to that slot", async () => {
      m.reorder.mockImplementation(async (_o: string, ids: string[]) => ids.map((id) => TYPES.find((x) => x.id === id)));
      show();
      await screen.findByText("Installation");
      const rows = within(screen.getByRole("list", { name: "Job types" })).getAllByRole("listitem");
      const data = new Map<string, string>();
      const dataTransfer = { setData: (k: string, v: string) => data.set(k, v), getData: (k: string) => data.get(k) ?? "", effectAllowed: "" };
      fireEvent.dragStart(rows[2], { dataTransfer });
      fireEvent.dragOver(rows[0], { dataTransfer });
      fireEvent.drop(rows[0], { dataTransfer });
      await waitFor(() => expect(m.reorder).toHaveBeenCalledWith("o1", ["c", "a", "b"]));
    });
  });

  describe("add and rename", () => {
    it("adds a type with its default time and price in minor units", async () => {
      m.create.mockResolvedValue(jt("e", "Emergency call-out"));
      show();
      await screen.findByText("Installation");
      fireEvent.click(screen.getByRole("button", { name: "Add job type" }));
      const dialog = screen.getByRole("dialog");
      fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "  Emergency   call-out " } });
      fireEvent.change(within(dialog).getByLabelText(/Default time/), { target: { value: "60" } });
      fireEvent.change(within(dialog).getByLabelText("Default price"), { target: { value: "300.50" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
      await waitFor(() => expect(m.create).toHaveBeenCalledWith("o1", { name: "Emergency call-out", defaultDurationMin: 60, defaultPrice: 30050 }));
    });
    it("the first price chooses the company currency: pre-selected selector, the pick goes with the price", async () => {
      cur.company = null; cur.effective = "USD";
      m.create.mockResolvedValue(jt("e", "Emergency"));
      show();
      await screen.findByText("Installation");
      fireEvent.click(screen.getByRole("button", { name: "Add job type" }));
      const dialog = screen.getByRole("dialog");
      expect((within(dialog).getByRole("combobox", { name: "Company currency" }) as HTMLInputElement).value).toBe("USD · US Dollar ($)");
      fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Emergency" } });
      fireEvent.change(within(dialog).getByLabelText("Default price"), { target: { value: "300" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
      await waitFor(() => expect(m.create).toHaveBeenCalledWith("o1", { name: "Emergency", defaultPrice: 30000, currency: "USD" }));
    });
    it("with a company currency there is no selector and no currency is sent", async () => {
      m.create.mockResolvedValue(jt("e", "Emergency"));
      show();
      await screen.findByText("Installation");
      fireEvent.click(screen.getByRole("button", { name: "Add job type" }));
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).queryByRole("combobox")).toBeNull();
      fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Emergency" } });
      fireEvent.change(within(dialog).getByLabelText("Default price"), { target: { value: "300" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
      await waitFor(() => expect(m.create).toHaveBeenCalledWith("o1", { name: "Emergency", defaultPrice: 30000 }));
    });
    it("a name you already have (any case) is refused on the field, with focus there, before any request", async () => {
      show();
      await screen.findByText("Installation");
      fireEvent.click(screen.getByRole("button", { name: "Add job type" }));
      const dialog = screen.getByRole("dialog");
      const name = within(dialog).getByLabelText("Name");
      fireEvent.change(name, { target: { value: "repair" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
      expect(await within(dialog).findByText("You already have a job type called repair.")).toBeTruthy();
      expect(name.getAttribute("aria-invalid")).toBe("true");
      await waitFor(() => expect(document.activeElement).toBe(name));
      expect(m.create).not.toHaveBeenCalled();
    });
    it("the API's DUPLICATE_JOB_TYPE lands on the name field too", async () => {
      m.create.mockRejectedValueOnce(new B2bError(409, "DUPLICATE_JOB_TYPE", "x", { field: "name" }));
      m.list.mockResolvedValue(TYPES.slice(0, 1));
      show();
      await screen.findByText("Installation");
      fireEvent.click(screen.getByRole("button", { name: "Add job type" }));
      const dialog = screen.getByRole("dialog");
      fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Quotes" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
      expect(await within(dialog).findByText("You already have a job type called Quotes.")).toBeTruthy();
    });
    it("renames, sending only the changed name", async () => {
      m.update.mockResolvedValue(jt("b", "Repairs"));
      show();
      await screen.findByText("Installation");
      fireEvent.click(screen.getByRole("button", { name: "Rename Repair" }));
      const dialog = screen.getByRole("dialog");
      expect((within(dialog).getByLabelText("Name") as HTMLInputElement).value).toBe("Repair");
      fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Repairs" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
      await waitFor(() => expect(m.update).toHaveBeenCalledWith("o1", "b", { name: "Repairs" }));
    });
    it("a blank name and a bad time are refused", async () => {
      show();
      await screen.findByText("Installation");
      fireEvent.click(screen.getByRole("button", { name: "Add job type" }));
      const dialog = screen.getByRole("dialog");
      fireEvent.change(within(dialog).getByLabelText(/Default time/), { target: { value: "1.5" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
      expect(await within(dialog).findByText("Enter a name.")).toBeTruthy();
      expect(within(dialog).getByText("Enter a whole number of minutes, from 1 to 20160.")).toBeTruthy();
      expect(m.create).not.toHaveBeenCalled();
    });
  });

  describe("archive", () => {
    it("confirms with the number of jobs that keep the type, then archives", async () => {
      m.archive.mockResolvedValue({ ...TYPES[1], archived: true });
      show();
      await screen.findByText("Installation");
      fireEvent.click(screen.getByRole("button", { name: "Archive Installation" }));
      expect(await screen.findByText("12 jobs use Installation. Existing jobs keep this type, but it can't be used on new jobs.")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Archive", hidden: true }));
      await waitFor(() => expect(m.archive).toHaveBeenCalledWith("o1", "a"));
    });
  });

  it("the Add button is disabled at the 200-type limit, with the reason", async () => {
    m.list.mockResolvedValue(Array.from({ length: 200 }, (_, i) => jt(`t${i}`, `Type ${i}`)));
    show();
    await screen.findByText("Type 0");
    expect((screen.getByRole("button", { name: "Add job type" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/limit of 200 job types/)).toBeTruthy();
  });
});
