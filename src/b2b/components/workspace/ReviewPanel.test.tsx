import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { approveReview, getJob, listAttachments, listParts, transitionJob } from "@/b2b/api/endpoints";
import { B2bError } from "@/b2b/api/client";
import type { JobWorkspace } from "@/b2b/api/types";
import { ReviewPanel } from "./ReviewPanel";
import { TransitionControl } from "./TransitionControl";
const state = vi.hoisted(() => ({ allowed: true }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }) }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "org", viewer: {}, can: () => state.allowed }) }));
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ push: vi.fn() }) }));
vi.mock("./useJobCache", () => ({ useJobCache: () => ({ merge: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/b2b/lib/transitions", async (original) => ({ ...await original<typeof import("@/b2b/lib/transitions")>(), allowedTransitions: () => state.allowed ? [{ to: "CLOSED", permission: "job.close", needsReason: false, isBackStep: false }] : [] }));
vi.mock("@/b2b/api/endpoints", async (original) => ({ ...await original<typeof import("@/b2b/api/endpoints")>(), approveReview: vi.fn(), transitionJob: vi.fn(), getJob: vi.fn(), listAttachments: vi.fn(), listParts: vi.fn() }));
const job = { id: "j", reference: "JOB-1", version: 2, status: "REVIEW", requirements: { review: true }, checklist: [], completionNotes: "Actual completion notes", signature: null, photoKeys: [], missingCompletion: [] } as unknown as JobWorkspace;
beforeEach(() => {
 state.allowed = true;
 HTMLDialogElement.prototype.showModal = function () { this.open = true; };
 HTMLDialogElement.prototype.close = function () { this.open = false; };
 vi.mocked(getJob).mockResolvedValue({ ...job, version: 9 });
 vi.mocked(listAttachments).mockResolvedValue({ items: [], urlTtlSeconds: 300 });
 vi.mocked(listParts).mockResolvedValue({ items: [], count: 0 }); // never hit the network: a failing parts load added a second role=alert (flaky)
 vi.mocked(approveReview).mockResolvedValue(job);
 vi.mocked(transitionJob).mockResolvedValue(job);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function mount(transition = false) {
 render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{transition ? <TransitionControl job={job} /> : <ReviewPanel job={job} />}</QueryClientProvider>);
}
describe("workspace evidence review", () => {
 for (const transition of [false, true]) {
  it(`requires evidence acknowledgment before ${transition ? "status close" : "panel approval"} and uses fresh version`, async () => {
   mount(transition);
   fireEvent.click(screen.getByRole("button", { name: transition ? "Move to Closed" : "Approve and close" }));
   expect(approveReview).not.toHaveBeenCalled();
   expect(transitionJob).not.toHaveBeenCalled();
   await screen.findByText("Actual completion notes");
   if (transition) expect(screen.queryByLabelText("Note (optional)")).toBeNull();
   expect((screen.getByRole("button", { name: "Approve" }) as HTMLButtonElement).disabled).toBe(true);
   fireEvent.click(screen.getByRole("checkbox"));
   fireEvent.click(screen.getByRole("button", { name: "Approve" }));
   await waitFor(() => transition ? expect(transitionJob).toHaveBeenCalledWith("org", "j", 9, "CLOSED") : expect(approveReview).toHaveBeenCalledWith("org", "j", 9, undefined));
  });
 }
 it("shows migration pending in workspace without claiming photos are absent", async () => {
  vi.mocked(listAttachments).mockRejectedValue(new B2bError(503, "MIGRATION_PENDING", "pending"));
  mount(); fireEvent.click(screen.getByRole("button", { name: "Approve and close" }));
  await screen.findByText("Photo and document evidence is not available yet for this workspace.");
  expect(screen.queryByText("No photo evidence recorded.")).toBeNull();
 });
 it("hides approval when job.close is not granted", () => {
  state.allowed = false; mount();
  expect(screen.queryByRole("button", { name: "Approve and close" })).toBeNull();
  expect(getJob).not.toHaveBeenCalled();
 });
 it("blocks workspace approval when readiness is unknown", async () => {
  vi.mocked(getJob).mockResolvedValue({ ...job, missingCompletion: undefined } as unknown as JobWorkspace);
  mount(); fireEvent.click(screen.getByRole("button", { name: "Approve and close" }));
  await screen.findByText(/This job is not ready for approval/);
  expect((screen.getByRole("button", { name: "Approve" }) as HTMLButtonElement).disabled).toBe(true);
  expect(approveReview).not.toHaveBeenCalled();
 });
 it("blocks a failed report and returns focus to the trigger on cancel", async () => {
  vi.mocked(getJob).mockRejectedValue(new B2bError(0, "NETWORK", "offline"));
  mount(); const trigger = screen.getByRole("button", { name: "Approve and close" });
  fireEvent.click(trigger);
  await screen.findByText("Completion report could not be loaded. Retry before approving.");
  expect((screen.getByRole("button", { name: "Approve" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(document.activeElement).toBe(trigger);
  expect(approveReview).not.toHaveBeenCalled();
 });
 it("keeps the evidence dialog open on a version conflict with reload available", async () => {
  vi.mocked(approveReview).mockRejectedValue(new B2bError(409, "VERSION_CONFLICT", "Changed", { currentVersion: 10 }));
  mount(); fireEvent.click(screen.getByRole("button", { name: "Approve and close" }));
  await screen.findByText("Actual completion notes");
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  const dialog = screen.getByRole("dialog");
  expect((await within(dialog).findByRole("alert")).textContent).toMatch(/changed by someone else/);
  expect(screen.getByRole("button", { name: "Reload evidence" })).toBeTruthy();
  expect(screen.getByRole("dialog")).toBeTruthy();
 });

});
