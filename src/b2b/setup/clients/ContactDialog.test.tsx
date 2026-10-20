import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { B2bError } from "@/b2b/api/client";

const m = vi.hoisted(() => ({ add: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: "en", t: (_k: string, f?: string) => f ?? _k }) }));
vi.mock("@/b2b/setup/api", async (o) => ({ ...(await o<typeof import("@/b2b/setup/api")>()), addContact: m.add }));
import { ContactDialog } from "./ContactDialog";

HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
const show = () => render(<QueryClientProvider client={new QueryClient()}><ContactDialog orgId="o1" clientId="c1" onClose={vi.fn()} /></QueryClientProvider>);
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Contact dialog: API field errors on their fields (c769b0c5)", () => {
  it("an email the API would refuse is refused before any request, with focus on it", async () => {
    show();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ana Pop" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@firma" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Email")));
    expect(m.add).not.toHaveBeenCalled();
  });
  it("the API's fields.phone marks and focuses the phone field", async () => {
    m.add.mockRejectedValueOnce(new B2bError(400, "VALIDATION_ERROR", "Invalid request", { fields: { phone: "Invalid phone" } }));
    show();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ana Pop" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Phone")));
    expect(screen.getByLabelText("Phone").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Enter a valid phone number, e.g. +34 600 555 021.")).toBeTruthy();
  });
});
