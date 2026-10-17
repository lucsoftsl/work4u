import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CompanySettings } from "../api";

const m = vi.hoisted(() => ({ can: true, get: vi.fn(), upload: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: "en", t: (_k: string, f?: string) => f ?? _k }) }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "o1", can: () => m.can }) }));
vi.mock("../api", async (o) => ({ ...(await o<typeof import("../api")>()), getSettings: m.get, uploadLogo: m.upload }));
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
});
