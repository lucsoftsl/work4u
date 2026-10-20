import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { B2bError } from "@/b2b/api/client";
import type { Member } from "../api";

const m = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: "en", t: (_k: string, f?: string) => f ?? _k }) }));
vi.mock("../api", async (o) => ({ ...(await o<typeof import("../api")>()), createMember: m.create, updateMember: m.update }));
import { MemberDrawer } from "./MemberDrawer";

// jsdom has no <dialog>.showModal
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };

const member: Member = { id: "m1", displayName: null, workEmail: "ana@costa.es", phone: null, externalId: null, memberType: "EMPLOYEE", status: "ACTIVE", loginStatus: "NONE", role: { id: "r", name: "Tech", template: "TECHNICIAN" } };
const show = (target: { mode: "add" } | { mode: "edit"; member: Member }) => render(
  <QueryClientProvider client={new QueryClient()}>
    <MemberDrawer orgId="o1" target={target} roles={[]} viewerTemplate="ADMIN" online canManage onClose={vi.fn()} onInvite={vi.fn()} onStatus={vi.fn()} />
  </QueryClientProvider>,
);
const nameInput = () => screen.getByLabelText("Full name") as HTMLInputElement;
const save = () => fireEvent.click(screen.getByRole("button", { name: /^(Save changes|Add employee)$/ }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Add / Edit employee drawer: the name can't be an email (d886968d)", () => {
  it("add: an email typed as the full name is refused before any request, with a linked error", async () => {
    show({ mode: "add" });
    fireEvent.change(nameInput(), { target: { value: "ana@costa.es" } });
    save();
    const msg = await screen.findByText("Enter the person's name, not an email address.");
    expect(nameInput().getAttribute("aria-invalid")).toBe("true");
    expect(nameInput().getAttribute("aria-describedby")).toBe(msg.id);
    expect(m.create).not.toHaveBeenCalled();
  });
  it("add: a blank name is refused", async () => {
    show({ mode: "add" });
    save();
    expect(await screen.findByText("Enter a name.")).toBeTruthy();
    expect(m.create).not.toHaveBeenCalled();
  });
  it("edit: a nameless member must get a real name; the API's 400 fields.displayName shows under the field", async () => {
    m.update.mockRejectedValueOnce(new B2bError(400, "VALIDATION_ERROR", "x", { fields: { displayName: "Enter a name, not an email address" } }));
    show({ mode: "edit", member });
    expect(nameInput().value).toBe(""); // never prefilled with the email
    fireEvent.change(nameInput(), { target: { value: "ana@costa.es" } });
    save();
    expect(await screen.findByText("Enter the person's name, not an email address.")).toBeTruthy();
    expect(m.update).not.toHaveBeenCalled();
    fireEvent.change(nameInput(), { target: { value: "Ana Pop" } });
    save();
    await waitFor(() => expect(m.update).toHaveBeenCalled());
    expect(await screen.findByText("Enter the person's name, not an email address.")).toBeTruthy(); // mapped from the 400
    expect(nameInput().getAttribute("aria-invalid")).toBe("true");
  });
  it("add: a real name is saved", async () => {
    m.create.mockResolvedValue({ ...member, id: "m2", displayName: "Ana Pop" });
    show({ mode: "add" });
    fireEvent.change(nameInput(), { target: { value: "Ana Pop" } });
    save();
    await waitFor(() => expect(m.create).toHaveBeenCalledWith("o1", expect.objectContaining({ displayName: "Ana Pop" })));
  });
  it("a failed submit with the button moves focus to the invalid name field (client check and the API's 400)", async () => {
    m.update.mockRejectedValueOnce(new B2bError(400, "VALIDATION_ERROR", "x", { fields: { displayName: "Enter your name" } }));
    show({ mode: "edit", member });
    const button = screen.getByRole("button", { name: "Save changes" });
    button.focus();
    fireEvent.click(button); // blank name: client check
    await waitFor(() => expect(document.activeElement).toBe(nameInput()));
    fireEvent.change(nameInput(), { target: { value: "Ana Pop" } });
    button.focus();
    fireEvent.click(button); // passes the client check, the API answers 400 fields.displayName
    await waitFor(() => expect(m.update).toHaveBeenCalled());
    await waitFor(() => expect(document.activeElement).toBe(nameInput()));
    expect(nameInput().getAttribute("aria-invalid")).toBe("true");
  });
  it("a duplicate phone from the API moves focus to the phone field", async () => {
    m.create.mockRejectedValueOnce(new B2bError(409, "DUPLICATE_MEMBER", "x", { field: "phone" }));
    show({ mode: "add" });
    fireEvent.change(nameInput(), { target: { value: "Ana Pop" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+34600555021" } });
    fireEvent.click(screen.getByRole("button", { name: "Add employee" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Phone")));
  });
});

describe("Add / Edit employee drawer: every API field error lands on its field (c769b0c5)", () => {
  const emailInput = () => screen.getByLabelText("Email (optional)") as HTMLInputElement;
  const fill = (email: string) => { fireEvent.change(nameInput(), { target: { value: "Ana Pop" } }); fireEvent.change(emailInput(), { target: { value: email } }); };

  it("the API's 400 fields.workEmail marks the email field, links the message, focuses it and shows no generic banner", async () => {
    m.create.mockRejectedValueOnce(new B2bError(400, "VALIDATION_ERROR", "Invalid request", { fields: { workEmail: "Invalid email" } }));
    show({ mode: "add" });
    fill("ana@costa.es");
    save();
    await waitFor(() => expect(document.activeElement).toBe(emailInput()));
    const msg = screen.getByText("Enter a valid email address, for example ana@company.com.");
    expect(emailInput().getAttribute("aria-invalid")).toBe("true");
    expect(emailInput().getAttribute("aria-describedby")).toContain(msg.id);
    expect(screen.queryByText("Check the details you entered and try again.")).toBeNull();
  });
  it("an email the API would refuse is refused before any request", async () => {
    show({ mode: "add" });
    fill("ana@firma");
    save();
    await waitFor(() => expect(document.activeElement).toBe(emailInput()));
    expect(screen.getByText("Enter a valid email address, for example ana@company.com.")).toBeTruthy();
    expect(m.create).not.toHaveBeenCalled();
  });
  it("a phone the API would refuse is refused before any request", async () => {
    show({ mode: "add" });
    fill("");
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "600 555 021" } });
    save();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Phone")));
    expect(screen.getByText("Enter the number in international format, e.g. +34 600 555 021.")).toBeTruthy();
    expect(m.create).not.toHaveBeenCalled();
  });
  it("phone, Employee ID and role errors land on their fields; the first one gets focus", async () => {
    m.create.mockRejectedValueOnce(new B2bError(400, "VALIDATION_ERROR", "Invalid request", { fields: { externalId: "Too long", roleId: "Invalid uuid", phone: "Use international format" } }));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemberDrawer orgId="o1" target={{ mode: "add" }} roles={[{ id: "r", name: "Tech", template: "TECHNICIAN" } as never]} viewerTemplate="ADMIN" online canManage onClose={vi.fn()} onInvite={vi.fn()} onStatus={vi.fn()} />
      </QueryClientProvider>,
    );
    fill("");
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+34600555021" } });
    save();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Phone")));
    expect(screen.getByLabelText("Employee ID (optional)").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText("Role").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Pick a role from the list.")).toBeTruthy();
  });
  it("a key the drawer has no field for is named in the banner", async () => {
    m.create.mockRejectedValueOnce(new B2bError(400, "VALIDATION_ERROR", "Invalid request", { fields: { "teamIds.0": "Invalid uuid" } }));
    show({ mode: "add" });
    fill("");
    save();
    expect(await screen.findByText("Teams: Invalid uuid")).toBeTruthy();
  });
});
