import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Part } from "@/b2b/api/types";
import { PartsSection } from "./PartsSection";

const offline = vi.hoisted(() => ({ submitPart: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, f: string) => f }) }));
vi.mock("@/b2b/offline/OfflineProvider", () => ({ useOffline: () => offline }));
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  offline.submitPart.mockResolvedValue({ queued: false, id: "x" });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const part = (over: Partial<Part> = {}): Part => ({ id: "p1", jobId: "j", name: "Capacitor", sku: "CAP-1", quantity: 1, unit: "pcs", note: null, createdAt: "", updatedAt: "", ...over });
const job = { id: "j", reference: "JOB-1" };

describe("PartsSection", () => {
  it("shows the empty state and an Add button (≥48px)", () => {
    render(<PartsSection job={job} parts={[]} editable />);
    expect(screen.getByText("Nothing used yet.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add part" }).className).toContain("min-h-[48px]");
  });
  it("adds with only name + quantity, passing an undo sentence", async () => {
    render(<PartsSection job={job} parts={[]} editable />);
    fireEvent.click(screen.getByRole("button", { name: "Add part" }));
    fireEvent.change(screen.getByLabelText("Part name"), { target: { value: "Valve" } });
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save part" }));
    await waitFor(() => expect(offline.submitPart).toHaveBeenCalledWith(job, "add", { values: { name: "Valve", quantity: 2, sku: null, unit: "pcs", note: null }, undoText: "Added Valve" }));
  });
  it("rejects an empty name and a zero quantity inline, without sending", () => {
    render(<PartsSection job={job} parts={[]} editable />);
    fireEvent.click(screen.getByRole("button", { name: "Add part" }));
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Save part" }));
    expect(screen.getByText("Enter the part name.")).toBeTruthy();
    expect(screen.getByText("Enter a quantity greater than 0.")).toBeTruthy();
    expect(screen.getByLabelText("Part name").getAttribute("aria-invalid")).toBe("true");
    expect(offline.submitPart).not.toHaveBeenCalled();
  });
  it("edits an existing part and removes one with an undo sentence and no confirm dialog", async () => {
    render(<PartsSection job={job} parts={[part()]} editable />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Capacitor" }));
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Save part" }));
    await waitFor(() => expect(offline.submitPart).toHaveBeenCalledWith(job, "edit", expect.objectContaining({ id: "p1", values: expect.objectContaining({ quantity: 3 }) })));
    fireEvent.click(screen.getByRole("button", { name: "Remove Capacitor" }));
    await waitFor(() => expect(offline.submitPart).toHaveBeenCalledWith(job, "delete", { id: "p1", undoText: "Removed Capacitor" }));
  });
  it("keeps the sheet open with an error and the typed values when saving fails", async () => {
    offline.submitPart.mockRejectedValue(new Error("boom"));
    render(<PartsSection job={job} parts={[]} editable />);
    fireEvent.click(screen.getByRole("button", { name: "Add part" }));
    fireEvent.change(screen.getByLabelText("Part name"), { target: { value: "Valve" } });
    fireEvent.click(screen.getByRole("button", { name: "Save part" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't save this part. Try again.");
    expect((screen.getByLabelText("Part name") as HTMLInputElement).value).toBe("Valve");
  });
  it("is read-only (no buttons) when not editable, with a reason", () => {
    render(<PartsSection job={job} parts={[part()]} editable={false} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Parts can be changed until the job is approved.")).toBeTruthy();
  });
  it("marks a part that is still only on the device", () => {
    render(<PartsSection job={job} parts={[part()]} editable pendingIds={new Set(["p1"])} />);
    expect(screen.getByText("Saved on device")).toBeTruthy();
  });
});
