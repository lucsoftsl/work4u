import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { B2bError } from "@/b2b/api/client";
import type { JobWorkspace } from "@/b2b/api/types";

const m = vi.hoisted(() => ({ perms: new Set<string>(), patch: vi.fn(), toast: vi.fn(), types: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: "en", t: (_k: string, f?: string) => f ?? _k }) }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "o1", can: (p: string) => m.perms.has(p) }) }));
const cur = vi.hoisted(() => ({ company: "RON" as string | null, effective: "RON", remember: vi.fn(), refresh: vi.fn() }));
vi.mock("@/b2b/currency/useEffectiveCurrency", () => ({ useEffectiveCurrency: () => ({ currency: cur.effective, companyCurrency: cur.company, isSet: cur.company !== null, preferred: null, loading: false, remember: cur.remember, refreshCompany: cur.refresh }) }));
vi.mock("@/b2b/currency/useCurrencies", async () => (await import("@/b2b/currency/testkit")).currenciesMock());
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ push: m.toast }) }));
vi.mock("@/b2b/api/endpoints", async (o) => ({ ...(await o<typeof import("@/b2b/api/endpoints")>()), patchJob: m.patch }));
vi.mock("@/b2b/api/jobTypes", async (o) => ({ ...(await o<typeof import("@/b2b/api/jobTypes")>()), listJobTypes: m.types }));
import { JobTypeMoneyCard } from "./JobTypeMoneyCard";

const job = (o: Record<string, unknown> = {}) => ({
  id: "j1", version: 7, status: "SCHEDULED", jobTypeId: "t1", jobTypeName: "Repair", jobType: { id: "t1", name: "Repair", archived: false },
  price: 45000, cost: 29000, margin: 16000, marginPct: 35.6, currency: "RON", ...o,
}) as unknown as JobWorkspace;
const flat = (s: string | null | undefined) => (s ?? "").replace(/\s/g, " ");
const show = (j = job()) => render(<QueryClientProvider client={new QueryClient()}><JobTypeMoneyCard job={j} /></QueryClientProvider>);
const TYPES = [{ id: "t1", name: "Repair" }, { id: "t2", name: "Installation" }];

beforeEach(() => { m.perms = new Set(["job.update", "finance.view"]); m.types.mockResolvedValue(TYPES); });
afterEach(() => { cleanup(); vi.clearAllMocks(); cur.company = "RON"; cur.effective = "RON"; });

describe("Job type and money on a job (aa659608)", () => {
  it("a finance viewer sees the type, price, cost and margin in the company currency", () => {
    show();
    expect(screen.getByRole("heading", { name: "Job type and money" })).toBeTruthy();
    expect(screen.getByText("Repair")).toBeTruthy();
    expect(flat(screen.getByText(/450\.00/).textContent)).toBe("RON 450.00");
    expect(flat(screen.getByText(/290\.00/).textContent)).toBe("RON 290.00");
    expect(flat(screen.getByText(/160\.00/).textContent)).toBe("RON 160.00 · 35.6%");
  });
  it("shows a loss in vermilion with a minus sign and the word", () => {
    show(job({ price: 10000, cost: 12000, margin: -2000, marginPct: -20 }));
    const margin = screen.getByText(/loss/);
    expect(margin.textContent).toContain("-");
    expect(margin.className).toContain("vermilion");
  });
  it("never shows a guessed zero: a missing price reads 'Not set' and the margin a dash", () => {
    show(job({ price: undefined, margin: undefined, marginPct: undefined }));
    expect(screen.getAllByText("Not set").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Not set").textContent).toBe("–");
    expect(screen.queryByText(/RON 0/)).toBeNull();
  });
  it("without finance.view only the job type exists: no price, cost, margin or money inputs", () => {
    m.perms = new Set(["job.update"]);
    show(job({ price: undefined, cost: undefined, margin: undefined }));
    expect(screen.getByRole("heading", { name: "Job type" })).toBeTruthy();
    expect(screen.queryByText("Price")).toBeNull();
    expect(screen.queryByText("Cost")).toBeNull();
    expect(screen.queryByText("Margin")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.queryByLabelText(/Price charged/)).toBeNull();
  });
  it("an archived type stays visible on the old job", () => {
    show(job({ jobType: { id: "t1", name: "Quote visit", archived: true }, jobTypeName: "Quote visit" }));
    expect(screen.getByText("Quote visit")).toBeTruthy();
    expect(screen.getByText("Archived")).toBeTruthy();
  });
  it("edit sends only what changed, with the version, money in minor units", async () => {
    m.patch.mockResolvedValue({ id: "j1", version: 8, price: 50025 });
    show();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await screen.findByRole("option", { name: "Installation" });
    fireEvent.change(screen.getByLabelText(/Price charged/), { target: { value: "500.25" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(m.patch).toHaveBeenCalledWith("o1", "j1", 7, { price: 50025 }));
    await waitFor(() => expect(m.toast).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" })));
  });
  it("changes the job type", async () => {
    m.patch.mockResolvedValue({ id: "j1", version: 8 });
    show();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await screen.findByRole("option", { name: "Installation" });
    fireEvent.change(screen.getByLabelText("Job type"), { target: { value: "t2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(m.patch).toHaveBeenCalledWith("o1", "j1", 7, { jobTypeId: "t2" }));
  });
  it("a bad amount is refused on the field, with focus there, before any request", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/Price charged/), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Enter an amount like 450.00.")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Price charged/)));
    expect(m.patch).not.toHaveBeenCalled();
  });
  it("a conflict (someone else changed the job) is explained", async () => {
    m.patch.mockRejectedValue(new B2bError(409, "VERSION_CONFLICT", "x", { currentVersion: 9 }));
    show();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/Cost to you/), { target: { value: "300" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toContain("changed by someone else");
  });
  it("a closed or cancelled job cannot be edited, and a viewer without job.update cannot either", () => {
    show(job({ status: "CLOSED" }));
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    cleanup();
    m.perms = new Set(["finance.view"]);
    show();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  });
  it("if the job was closed in another tab, the 409 becomes a friendly message, editing ends and nothing else breaks", async () => {
    m.patch.mockRejectedValue(new B2bError(409, "INVALID_TRANSITION", "x", { details: { currentStatus: "CLOSED" } }));
    show();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/Cost to you/), { target: { value: "300" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("This job is now Closed, so its type and amounts can no longer be changed. Nothing was saved.");
    expect(screen.queryByLabelText(/Cost to you/)).toBeNull(); // back to the read view
    expect(m.patch).toHaveBeenCalledTimes(1);
  });
  it("the same 409 without a status still explains itself (cancelled works too)", async () => {
    m.patch.mockRejectedValue(new B2bError(409, "INVALID_TRANSITION", "x", { currentStatus: "CANCELLED" }));
    show();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/Cost to you/), { target: { value: "300" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toContain("This job is now Cancelled");
  });
});

describe("currency of the first amount on a job", () => {
  const edit = (j = job({ price: undefined, cost: undefined, margin: undefined, marginPct: undefined })) => {
    show(j);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  };
  const priceInput = () => screen.getByLabelText(/Price charged to the client/) as HTMLInputElement;
  it("with a company currency the card shows it as text and sends no currency", async () => {
    m.patch.mockResolvedValue(job());
    edit();
    expect(screen.queryByRole("combobox", { name: "Company currency" })).toBeNull();
    fireEvent.change(priceInput(), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(m.patch).toHaveBeenCalled());
    expect(m.patch.mock.calls[0][3]).toEqual({ price: 2000 });
  });
  it("without one the selector is pre-selected and the pick goes with the first price", async () => {
    cur.company = null; cur.effective = "USD";
    m.patch.mockResolvedValue(job());
    edit();
    expect((screen.getByRole("combobox", { name: "Company currency" }) as HTMLInputElement).value).toBe("USD · US Dollar ($)");
    fireEvent.change(priceInput(), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(m.patch).toHaveBeenCalled());
    expect(m.patch.mock.calls[0][3]).toEqual({ price: 2000, currency: "USD" });
    await waitFor(() => expect(cur.refresh).toHaveBeenCalled()); // the company now has its currency
  });
  it("409 CURRENCY_REQUIRED asks again with the suggestion; CURRENCY_MISMATCH says which currency the company has", async () => {
    cur.company = null; cur.effective = "EUR";
    m.patch.mockRejectedValueOnce(new B2bError(409, "CURRENCY_REQUIRED", "x", { details: { effectiveCurrency: "GBP" } }));
    edit();
    fireEvent.change(priceInput(), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findAllByRole("alert")).map((a) => a.textContent).join(" ")).toContain("GBP is pre-selected");
    expect(cur.remember).toHaveBeenCalledWith("GBP");
    cleanup();
    m.patch.mockRejectedValueOnce(new B2bError(409, "CURRENCY_MISMATCH", "x", { details: { currency: "RON" } }));
    edit();
    fireEvent.change(priceInput(), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findAllByRole("alert")).map((a) => a.textContent).join(" ")).toContain("The company currency is RON");
    expect(cur.refresh).toHaveBeenCalled();
  });
});
