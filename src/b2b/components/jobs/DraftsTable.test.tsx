import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { B2bError } from "@/b2b/api/client";
import type { Job } from "@/b2b/api/types";

const m = vi.hoisted(() => ({ promote: vi.fn(), transition: vi.fn(), toast: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: "en", t: (_k: string, f?: string) => f ?? _k }) }));
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ push: m.toast }) }));
vi.mock("@/b2b/api/endpoints", async (o) => ({ ...(await o<typeof import("@/b2b/api/endpoints")>()), promoteJob: m.promote, transitionJob: m.transition }));
import { DraftsTable } from "./DraftsTable";

HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };

const draft = (o: Partial<Job> = {}): Job => ({
  id: "d1", number: 1074, reference: "JOB-1074", title: "", status: "DRAFT", customerId: null, locationId: null, jobTypeId: null, category: "",
  version: 3, updatedAt: "2026-10-19T08:00:00Z", createdAt: "2026-10-19T07:00:00Z", requirements: { checklist: false, notes: false, photo: false, signature: false, review: false },
  checklist: [], timestamps: {}, reopenedCount: 0, ...o,
}) as Job;
const NOW = Date.parse("2026-10-19T08:30:00Z");
const show = (items: Job[], caps = { canPromote: true, canDiscard: true }) => render(
  <QueryClientProvider client={new QueryClient()}><DraftsTable orgId="o1" items={items} nowMs={NOW} {...caps} /></QueryClientProvider>,
);
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Drafts list (4718e5f9)", () => {
  it("marks a draft with a Draft badge that has text, shows '(no title yet)' and what is missing", () => {
    show([draft()]);
    const row = screen.getByText("JOB-1074").closest("[role='row']") as HTMLElement;
    expect(within(row).getByText("Draft")).toBeTruthy();
    expect(within(row).getByText("(no title yet)")).toBeTruthy();
    expect(within(row).getByText("Missing: title, client, location, job type")).toBeTruthy();
    expect(within(row).getByText("30 min ago")).toBeTruthy();
  });
  it("shows only what is actually missing, and nothing for a complete draft", () => {
    show([
      draft({ id: "a", reference: "JOB-1", title: "Leaky tap", customerId: "c", locationId: null, category: "Repair" }),
      draft({ id: "b", reference: "JOB-2", title: "Boiler", customerId: "c", locationId: "l", jobTypeId: "t" }),
    ]);
    expect(screen.getByText("Missing: location")).toBeTruthy();
    expect(screen.getAllByText(/^Missing:/)).toHaveLength(1);
  });
  it("Continue editing opens the draft; the title link does too", () => {
    show([draft({ title: "Leaky tap" })]);
    expect(screen.getByRole("link", { name: "Continue editing JOB-1074" }).getAttribute("href")).toBe("/ops/o1/jobs/d1");
    expect(screen.getByRole("link", { name: /Leaky tap/ }).getAttribute("href")).toBe("/ops/o1/jobs/d1");
  });
  it("Create job promotes with the draft's version and says so", async () => {
    m.promote.mockResolvedValue({ id: "d1", status: "NEW" });
    show([draft({ title: "Leaky tap" })]);
    fireEvent.click(screen.getByRole("button", { name: "Create job from JOB-1074" }));
    await waitFor(() => expect(m.promote).toHaveBeenCalledWith("o1", "d1", 3));
    await waitFor(() => expect(m.toast).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" })));
  });
  it("a draft that is not ready says what is missing, with a way to continue editing", async () => {
    m.promote.mockRejectedValue(new B2bError(422, "DRAFT_INCOMPLETE", "x", { missing: ["customerId", "locationId"] }));
    show([draft({ title: "Leaky tap" })]);
    fireEvent.click(screen.getByRole("button", { name: "Create job from JOB-1074" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("JOB-1074 isn't ready to become a job. Missing: client, location.");
    expect(within(alert).getByRole("link", { name: "Continue editing" }).getAttribute("href")).toBe("/ops/o1/jobs/d1");
  });
  it("NOT_A_DRAFT (someone already created it) is a friendly message", async () => {
    m.promote.mockRejectedValue(new B2bError(409, "NOT_A_DRAFT", "x"));
    show([draft({ title: "Leaky tap" })]);
    fireEvent.click(screen.getByRole("button", { name: "Create job from JOB-1074" }));
    expect((await screen.findByRole("alert")).textContent).toContain("JOB-1074 was already created as a job.");
  });
  it("Discard asks for a reason and cancels the draft", async () => {
    m.transition.mockResolvedValue({ id: "d1", status: "CANCELLED" });
    show([draft({ title: "Leaky tap" })]);
    fireEvent.click(screen.getByRole("button", { name: "Discard JOB-1074" }));
    const dialog = await screen.findByRole("dialog", { hidden: true });
    const confirm = within(dialog).getByRole("button", { name: "Discard draft", hidden: true }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "Entered twice" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(m.transition).toHaveBeenCalledWith("o1", "d1", 3, "CANCELLED", "Entered twice"));
  });
  it("without the permissions the actions are not there", () => {
    show([draft({ title: "Leaky tap" })], { canPromote: false, canDiscard: false });
    expect(screen.queryByRole("button", { name: /Create job from/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Discard/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Continue editing JOB-1074" })).toBeTruthy();
  });
  it("the table container holds only rows (axe aria-required-children); the live region and dialog sit outside it", () => {
    const { container } = show([draft({ title: "Leaky tap" })]);
    const table = container.querySelector("[role='table']")!;
    for (const child of Array.from(table.children)) expect(["row", "rowgroup"]).toContain(child.getAttribute("role"));
    expect(table.querySelector("[aria-live]")).toBeNull();
    expect(container.querySelector("[aria-live='polite']")).not.toBeNull();
  });
  it("a row's error message is inside a cell, not directly in the row", async () => {
    m.promote.mockRejectedValue(new B2bError(409, "NOT_A_DRAFT", "x"));
    show([draft({ title: "Leaky tap" })]);
    fireEvent.click(screen.getByRole("button", { name: "Create job from JOB-1074" }));
    const alert = await screen.findByRole("alert");
    expect(alert.parentElement?.getAttribute("role")).toBe("cell");
  });
});
