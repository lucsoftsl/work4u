import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { B2bError } from "@/b2b/api/client";

const m = vi.hoisted(() => ({ create: vi.fn(), tags: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: "en", t: (_k: string, f?: string) => f ?? _k }) }));
vi.mock("@/b2b/setup/api", async (o) => ({ ...(await o<typeof import("@/b2b/setup/api")>()), createClient: m.create, setClientTags: m.tags }));
const cat = vi.hoisted(() => ({ location: vi.fn(), list: vi.fn() }));
vi.mock("@/b2b/api/catalog", async (o) => ({ ...(await o<typeof import("@/b2b/api/catalog")>()), createLocation: cat.location, listCustomers: cat.list }));
import { ClientDialog } from "./ClientDialog";

HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
const show = () => render(<QueryClientProvider client={new QueryClient()}><ClientDialog orgId="o1" onClose={vi.fn()} /></QueryClientProvider>);
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Add client dialog: focus on the first error", () => {
  it("submitting with the button and no name moves focus to the name field", async () => {
    show();
    const save = screen.getByRole("button", { name: "Save" });
    save.focus();
    fireEvent.click(save);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Name")));
    expect(screen.getByLabelText("Name").getAttribute("aria-invalid")).toBe("true");
    expect(m.create).not.toHaveBeenCalled();
  });
  it("a duplicate Client ID from the API moves focus to the Client ID field", async () => {
    m.create.mockRejectedValueOnce(new B2bError(409, "DUPLICATE_EXTERNAL_ID", "x", { field: "externalId" }));
    show();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Hotel Marina" } });
    fireEvent.change(screen.getByLabelText("Client ID"), { target: { value: "C-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Client ID")));
    expect(screen.getByLabelText("Client ID").getAttribute("aria-invalid")).toBe("true");
  });
});

describe("Add client with a first location (Create Job)", () => {
  it("a failed location never creates the client twice; retry saves only the location", async () => {
    m.create.mockResolvedValue({ id: "c1", name: "Bar Luna", tags: [] });
    cat.location.mockRejectedValueOnce(new B2bError(400, "VALIDATION_ERROR", "Invalid request", { fields: { addressLine: "Required" } })).mockResolvedValueOnce({ id: "l1", label: "Main address" });
    const onSaved = vi.fn();
    render(<QueryClientProvider client={new QueryClient()}><ClientDialog orgId="o1" initialName="Bar Luna" withLocation onSaved={onSaved} onClose={vi.fn()} /></QueryClientProvider>);
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "Calle 1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Address")));
    expect(screen.getByText("The client Bar Luna was saved. Only the location failed: fix it and save again, or skip it.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: "c1" }), expect.objectContaining({ id: "l1" })));
    expect(m.create).toHaveBeenCalledTimes(1);
    expect(cat.location).toHaveBeenCalledTimes(2);
  });
  it("tags the API refuses are named in the banner; retrying never creates a second client", async () => {
    m.create.mockResolvedValue({ id: "c1", name: "Bar Luna", tags: [] });
    m.tags.mockRejectedValueOnce(new B2bError(400, "VALIDATION_ERROR", "Invalid request", { fields: { "tags.0": "Too long" } })).mockResolvedValueOnce({ tags: ["vip"] });
    const onSaved = vi.fn();
    render(<QueryClientProvider client={new QueryClient()}><ClientDialog orgId="o1" onSaved={onSaved} onClose={vi.fn()} /></QueryClientProvider>);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Bar Luna" } });
    fireEvent.change(screen.getByLabelText("Tags"), { target: { value: "vip" } });
    fireEvent.keyDown(screen.getByLabelText("Tags"), { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Tags: Too long")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(m.create).toHaveBeenCalledTimes(1);
    expect(m.tags).toHaveBeenCalledTimes(2);
  });
});

describe("Add client: a client that looks the same (DUPLICATE_CUSTOMER)", () => {
  const dup = () => new B2bError(409, "DUPLICATE_CUSTOMER", "x", { matches: [{ id: "c9", name: "Hotel Marina", email: "o•••@marina.es", phone: null, reasons: ["EMAIL"] }] });
  it("outside Create Job the match opens its client page, and Create anyway re-sends with allowDuplicate", async () => {
    m.create.mockRejectedValueOnce(dup()).mockResolvedValueOnce({ id: "c10", name: "Hotel Marina", tags: [] });
    const onSaved = vi.fn();
    render(<QueryClientProvider client={new QueryClient()}><ClientDialog orgId="o1" onSaved={onSaved} onClose={vi.fn()} /></QueryClientProvider>);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Hotel Marina" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Same email address")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open this client" }).getAttribute("href")).toBe("/ops/o1/customers/c9");
    fireEvent.click(screen.getByRole("button", { name: "Create anyway" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(m.create).toHaveBeenLastCalledWith("o1", expect.objectContaining({ allowDuplicate: true }));
  });
  it("a normal save never sends allowDuplicate", async () => {
    m.create.mockResolvedValue({ id: "c10", name: "Hotel Marina", tags: [] });
    show();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Hotel Marina" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(m.create).toHaveBeenCalled());
    expect(m.create.mock.calls[0][1]).not.toHaveProperty("allowDuplicate");
  });
});
