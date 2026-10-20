import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { B2bError } from "@/b2b/api/client";
import type { CompanySettings } from "../api";

const m = vi.hoisted(() => ({ can: true, get: vi.fn(), upload: vi.fn(), patch: vi.fn(), effective: "USD" }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: "en", t: (_k: string, f?: string) => f ?? _k }) }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "o1", can: () => m.can }) }));
vi.mock("../api", async (o) => ({ ...(await o<typeof import("../api")>()), getSettings: m.get, uploadLogo: m.upload, patchSettings: m.patch }));
vi.mock("@/b2b/currency/useEffectiveCurrency", () => ({ useEffectiveCurrency: () => ({ currency: m.effective, companyCurrency: null, isSet: false, preferred: null, loading: false, remember: vi.fn(), refreshCompany: vi.fn() }) }));
vi.mock("@/b2b/currency/useCurrencies", () => ({
  useCurrencies: () => ({ status: "ready", refetch: vi.fn(), items: [
    { code: "EUR", name: "Euro", symbol: "€", minorUnits: 2, popular: true }, { code: "USD", name: "US Dollar", symbol: "$", minorUnits: 2, popular: true },
    { code: "RON", name: "Romanian Leu", symbol: "RON", minorUnits: 2, popular: true }, { code: "JPY", name: "Japanese Yen", symbol: "¥", minorUnits: 0, popular: false },
  ] }),
}));
import { CompanyProfile } from "./CompanyProfile";

const base: CompanySettings = { id: "o1", name: "Costa Clima", legalName: null, taxId: null, phone: null, addressLine: null, city: null, postalCode: null, country: "ES", timezone: "Europe/Madrid", locale: "es", logoUrl: null, createdAt: "x", canEdit: true };
const show = () => render(<QueryClientProvider client={new QueryClient()}><CompanyProfile /></QueryClientProvider>);
afterEach(() => { cleanup(); vi.clearAllMocks(); m.can = true; });

describe("CompanyProfile", () => {
  it("stays editable after a logo upload even when the response omits canEdit (regression: flipped to 'View only')", async () => {
    m.get.mockResolvedValue(base);
    const { canEdit: _drop, ...noCanEdit } = base;
    void _drop;
    m.upload.mockResolvedValue({ ...noCanEdit, logoUrl: "https://api.test/api/b2b/files/download?token=t" });
    show();
    await screen.findByLabelText("Company name");
    const input = document.getElementById("pf-logo-file") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "logo.png", { type: "image/png" })] } });
    await waitFor(() => expect(m.upload).toHaveBeenCalled());
    await waitFor(() => expect(document.querySelector('img[src^="https://api.test/"]')).toBeTruthy()); // an absolute logoUrl is used as is
    expect(screen.queryByText(/View only/)).toBeNull();
    expect(screen.getByLabelText("Company name")).toBeTruthy();
  });
  it("the logo upload input has an accessible name", async () => {
    m.get.mockResolvedValue(base);
    show();
    await screen.findByLabelText("Company name");
    expect((document.getElementById("pf-logo-file") as HTMLInputElement).getAttribute("aria-label")).toBe("Upload logo");
  });
  it("a viewer without org.manage sees plain text and no controls", async () => {
    m.can = false;
    m.get.mockResolvedValue({ ...base, canEdit: false });
    show();
    expect(await screen.findByText(/View only/)).toBeTruthy();
    expect(screen.queryByLabelText("Company name")).toBeNull();
  });
  it("falls back to the initial letter when the logo cannot be loaded", async () => {
    m.get.mockResolvedValue({ ...base, logoUrl: "https://api.test/logo" });
    show();
    const img = await waitFor(() => { const i = document.querySelector("img"); if (!i) throw new Error("no img"); return i; });
    fireEvent.error(img);
    await waitFor(() => expect(document.querySelector("img")).toBeNull());
  });
  it("an API field error lands on its field and gets focus; a key without a field is named (c769b0c5)", async () => {
    m.get.mockResolvedValue(base);
    m.patch.mockRejectedValueOnce(new B2bError(400, "VALIDATION_ERROR", "Invalid request", { fields: { taxId: "Too long", logoAlt: "Required" } }));
    show();
    const tax = await screen.findByLabelText("Tax ID");
    fireEvent.change(tax, { target: { value: "ES-B12345678" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(document.activeElement).toBe(tax));
    expect(tax.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Too long")).toBeTruthy();
    expect(screen.getByText("logoAlt: Required")).toBeTruthy();
  });
  const pickCurrency = (box: HTMLElement, text: string) => {
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: text } });
    fireEvent.keyDown(box, { key: "Enter" });
  };
  it("the currency is chosen in a searchable dropdown; read-only viewers see it as text; an older API without a currency shows none (aa659608)", async () => {
    m.get.mockResolvedValue({ ...base, currency: "RON", currencyIsSet: true });
    m.patch.mockResolvedValue({ ...base, currency: "EUR", currencyIsSet: true });
    show();
    const box = (await screen.findByRole("combobox", { name: "Company currency" })) as HTMLInputElement;
    expect(box.value).toBe("RON · Romanian Leu");
    pickCurrency(box, "euro");
    expect(box.value).toBe("EUR · Euro (€)");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(m.patch).toHaveBeenCalledWith("o1", { currency: "EUR" }));
    cleanup();
    m.get.mockResolvedValue({ ...base });
    show();
    await screen.findByLabelText("Company name");
    expect(screen.queryByRole("combobox", { name: "Company currency" })).toBeNull();
    cleanup();
    m.can = false;
    m.get.mockResolvedValue({ ...base, canEdit: false, currency: "EUR", currencyIsSet: true });
    show();
    expect(await screen.findByText(/EUR/)).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Company currency" })).toBeNull();
  });
  it("a company with no currency: the effective default is pre-selected but nothing is chosen until the user picks (or saves a pick)", async () => {
    m.get.mockResolvedValue({ ...base, currency: null, currencyIsSet: false, effectiveCurrency: "USD" });
    m.patch.mockResolvedValueOnce({ ...base, taxId: "ES-B1", currency: null, currencyIsSet: false, effectiveCurrency: "USD" });
    m.patch.mockResolvedValue({ ...base, taxId: "ES-B1", currency: "USD", currencyIsSet: true });
    show();
    const box = (await screen.findByRole("combobox", { name: "Company currency" })) as HTMLInputElement;
    expect(box.value).toBe("USD · US Dollar ($)");
    expect(screen.getByText(/Not chosen yet/)).toBeTruthy();
    // an unrelated edit does not choose the currency by accident
    fireEvent.change(screen.getByLabelText("Tax ID"), { target: { value: "ES-B1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(m.patch).toHaveBeenLastCalledWith("o1", { taxId: "ES-B1" }));
    // choosing it, even the pre-selected one, is explicit
    pickCurrency(box, "usd");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(m.patch).toHaveBeenLastCalledWith("o1", { currency: "USD" }));
  });
  it("409 CURRENCY_IN_USE locks the currency with a clear message, restores it, and keeps the other edits", async () => {
    m.get.mockResolvedValue({ ...base, currency: "RON", currencyIsSet: true });
    m.patch.mockRejectedValueOnce(new B2bError(409, "CURRENCY_IN_USE", "x", { field: "currency" }));
    show();
    const box = (await screen.findByRole("combobox", { name: "Company currency" })) as HTMLInputElement;
    fireEvent.change(screen.getByLabelText("Tax ID"), { target: { value: "ES-B1" } });
    pickCurrency(box, "euro");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(box.getAttribute("aria-disabled")).toBe("true"));
    expect(box.value).toBe("RON · Romanian Leu");
    expect(screen.getByRole("alert").textContent).toBe("The currency is locked because jobs or job types already have amounts.");
    expect(document.activeElement).toBe(box); // focus goes to the field, like any other form error
    expect(box.getAttribute("aria-describedby")).toContain("-err");
    pickCurrency(box, "usd");
    expect(box.value).toBe("RON · Romanian Leu"); // a locked field ignores changes
    expect((screen.getByLabelText("Tax ID") as HTMLInputElement).value).toBe("ES-B1");
    m.patch.mockResolvedValue({ ...base, currency: "RON", taxId: "ES-B1" });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(m.patch).toHaveBeenLastCalledWith("o1", { taxId: "ES-B1" }));
  });
  const lockedWith = async (body: Record<string, unknown>) => {
    m.get.mockResolvedValue({ ...base, currency: "RON", currencyIsSet: true });
    m.patch.mockRejectedValueOnce(new B2bError(409, "CURRENCY_IN_USE", "x", { field: "currency", ...body }));
    show();
    const box = (await screen.findByRole("combobox", { name: "Company currency" })) as HTMLInputElement;
    pickCurrency(box, "euro");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(box.getAttribute("aria-disabled")).toBe("true"));
  };
  it("the lock message gives the counts: jobs and job types, singular and plural", async () => {
    await lockedWith({ jobsWithMoney: 3, jobTypesWithPrice: 1 });
    expect(screen.getByText("The currency is locked because 3 jobs have amounts and 1 job type has a default price.")).toBeTruthy();
  });
  it("only jobs, only job types, and counts nested under details", async () => {
    await lockedWith({ jobsWithMoney: 1, jobTypesWithPrice: 0 });
    expect(screen.getByText("The currency is locked because 1 job has an amount.")).toBeTruthy();
    cleanup();
    await lockedWith({ details: { jobsWithMoney: 0, jobTypesWithPrice: 6 } });
    expect(screen.getByText("The currency is locked because 6 job types have default prices.")).toBeTruthy();
  });
});
