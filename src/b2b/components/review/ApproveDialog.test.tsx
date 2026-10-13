import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getJob, listAttachments, listParts } from "@/b2b/api/endpoints";
import { B2bError } from "@/b2b/api/client";
import type { Attachment, JobWorkspace } from "@/b2b/api/types";
import { ApproveDialog } from "./ApproveDialog";
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }) }));
vi.mock("@/b2b/api/endpoints", async (original) => ({ ...await original<typeof import("@/b2b/api/endpoints")>(), getJob: vi.fn(), listAttachments: vi.fn(), listParts: vi.fn() }));
const job = { id: "j", version: 8, status: "REVIEW", requirements: { checklist: true, notes: true, photo: true, signature: true }, checklist: [{ id: "c", text: "Test valve", done: true }], completionNotes: "Pressure restored", signature: { name: "Bea", signedAt: "2026-10-12T10:00:00Z" }, photoKeys: [], missingCompletion: [] } as unknown as JobWorkspace;
const photo = { id: "p", name: "After repair", mime: "image/jpeg", category: "AFTER", url: "/api/b2b/files/download?token=mock", urlExpiresAt: "2099-01-01T00:00:00Z" } as Attachment;
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  vi.mocked(listParts).mockResolvedValue({ items: [], count: 0 });
  vi.mocked(getJob).mockResolvedValue(job);
  vi.mocked(listAttachments).mockResolvedValue({ items: [photo], urlTtlSeconds: 300 });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function mount() {
  const confirm = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ApproveDialog open orgId="org" jobId="j" reference="JOB-1" onConfirm={confirm} onCancel={vi.fn()} /></QueryClientProvider>);
  return confirm;
}
describe("evidence-aware approval", () => {
  it("shows current evidence before confirmation and submits its version", async () => {
    const confirm = mount();
    expect((screen.getByRole("button", { name: "Approve" }) as HTMLButtonElement).disabled).toBe(true);
    await screen.findByText("Pressure restored");
    expect(screen.getByText("Test valve")).toBeTruthy();
    expect(screen.getByText("Bea")).toBeTruthy();
    expect(screen.getByRole("img", { name: "After repair" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "View completion report" }).getAttribute("href")).toBe("/ops/org/jobs/j");
    fireEvent.click(screen.getByRole("checkbox", { name: "I have reviewed the available completion evidence" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(confirm).toHaveBeenCalledWith(undefined, 8);
  });
  it("reports migration-pending photos honestly without inventing an image", async () => {
    vi.mocked(listAttachments).mockRejectedValue(new B2bError(503, "MIGRATION_PENDING", "not ready"));
    mount();
    await screen.findByText("Photo and document evidence is not available yet for this workspace.");
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Drawn signature image is not identified by the API; the recorded name is shown above.")).toBeTruthy();
  });
  it("shows absent evidence and blocks when a required item is missing", async () => {
    vi.mocked(getJob).mockResolvedValue({ ...job, completionNotes: null, signature: null, checklist: [], missingCompletion: ["notes", "signature"] });
    vi.mocked(listAttachments).mockResolvedValue({ items: [], urlTtlSeconds: 300 });
    mount();
    await screen.findByText("No completion notes recorded.");
    expect(screen.getByText("No signature recorded.")).toBeTruthy();
    expect(screen.getByText("No photo evidence recorded.")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "I have reviewed the available completion evidence" }));
    expect((screen.getByRole("button", { name: "Approve" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("blocks approval and offers retry if the report cannot load", async () => {
    vi.mocked(getJob).mockRejectedValue(new B2bError(0, "NETWORK", "offline"));
    mount();
    await waitFor(() => expect(screen.getByText("Completion report could not be loaded. Retry before approving.")).toBeTruthy());
    expect((screen.getByRole("button", { name: "Approve" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("never presents legacy photo references as downloadable images or as absent", async () => {
    vi.mocked(getJob).mockResolvedValue({ ...job, photoKeys: ["legacy-photo-key"] });
    vi.mocked(listAttachments).mockResolvedValue({ items: [], urlTtlSeconds: 300 });
    mount();
    await screen.findByText(/legacy photo references recorded/);
    expect(screen.queryByText("No photo evidence recorded.")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });
  it("does not load an expired signed image", async () => {
    vi.mocked(listAttachments).mockResolvedValue({ items: [{ ...photo, urlExpiresAt: "2000-01-01T00:00:00Z" }], urlTtlSeconds: 300 });
    mount();
    await screen.findByText(/Preview unavailable/);
    expect(screen.queryByRole("img")).toBeNull();
  });
  it("labels omitted report fields unavailable rather than claiming evidence exists", async () => {
    vi.mocked(getJob).mockResolvedValue({ ...job, checklist: undefined, completionNotes: undefined, signature: undefined, missingCompletion: undefined } as unknown as JobWorkspace);
    mount();
    await screen.findByText("Checklist evidence is unavailable.");
    expect(screen.getByText("Completion notes are unavailable.")).toBeTruthy();
    expect(screen.getByText("Signature evidence is unavailable.")).toBeTruthy();
    expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Approve" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("distinguishes a failed attachment request from no photo evidence", async () => {
    vi.mocked(listAttachments).mockRejectedValue(new B2bError(0, "NETWORK", "offline"));
    const confirm = mount();
    await screen.findByText("Photo and document evidence could not be loaded.");
    expect(screen.queryByText("No photo evidence recorded.")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(confirm).not.toHaveBeenCalled();
  });
  it("requires a fresh acknowledgment after evidence is reloaded", async () => {
    const confirm = mount();
    await screen.findByText("Pressure restored");
    await waitFor(() => expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("checkbox"));
    expect((screen.getByRole("button", { name: "Approve" }) as HTMLButtonElement).disabled).toBe(false);
    vi.mocked(getJob).mockResolvedValue({ ...job, version: 9, completionNotes: "Updated report" });
    fireEvent.click(screen.getByRole("button", { name: "Reload evidence" }));
    await screen.findByText("Updated report");
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("button", { name: "Approve" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(confirm).toHaveBeenCalledWith(undefined, 9);
  });

  it("does not claim absent photos when legacy metadata is omitted", async () => {
    vi.mocked(getJob).mockResolvedValue({ ...job, photoKeys: undefined });
    vi.mocked(listAttachments).mockResolvedValue({ items: [], urlTtlSeconds: 300 });
    mount();
    await screen.findByText("No photo attachments returned; legacy photo evidence is unavailable.");
    expect(screen.queryByText("No photo evidence recorded.")).toBeNull();
  });

});
