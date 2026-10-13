import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getJob, listAttachments, listParts } from "@/b2b/api/endpoints";
import { B2bError } from "@/b2b/api/client";
import type { JobWorkspace } from "@/b2b/api/types";
import { ApproveDialog } from "./ApproveDialog";
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }) }));
vi.mock("@/b2b/api/endpoints", async (original) => ({ ...await original<typeof import("@/b2b/api/endpoints")>(), getJob: vi.fn(), listAttachments: vi.fn(), listParts: vi.fn() }));
const job = (over: Partial<JobWorkspace> = {}) => ({ id: "j", version: 8, status: "REVIEW", requirements: {}, checklist: [], completionNotes: "Done", signature: null, photoKeys: [], missingCompletion: [], ...over }) as unknown as JobWorkspace;
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  vi.mocked(listParts).mockResolvedValue({ items: [], count: 0 });
  vi.mocked(getJob).mockResolvedValue(job());
  vi.mocked(listAttachments).mockResolvedValue({ items: [], urlTtlSeconds: 300 });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function mount(props: { allow?: boolean; errorCode?: string; errorMissing?: string[]; error?: string } = {}) {
  const confirm = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ApproveDialog open orgId="org" jobId="j" reference="JOB-1" allowWithoutEvidence={props.allow} errorCode={props.errorCode} errorMissing={props.errorMissing} error={props.error} onConfirm={confirm} onCancel={vi.fn()} />
  </QueryClientProvider>);
  return confirm;
}
const approve = () => screen.getByRole("button", { name: "Approve" }) as HTMLButtonElement;
const reviewed = () => fireEvent.click(screen.getByRole("checkbox", { name: "I have reviewed the available completion evidence" }));

describe("approval-evidence policy: strict (default)", () => {
  it("blocks approval with an explanation when attachments are MIGRATION_PENDING", async () => {
    vi.mocked(listAttachments).mockRejectedValue(new B2bError(503, "MIGRATION_PENDING", "x"));
    const confirm = mount();
    await screen.findByText(/Approval is blocked: completion evidence can't be checked right now/);
    expect(approve().disabled).toBe(true);
    fireEvent.submit(approve().closest("form")!);
    expect(confirm).not.toHaveBeenCalled();
  });
  it("blocks approval when attachments fail to load", async () => {
    vi.mocked(listAttachments).mockRejectedValue(new B2bError(500, "UNKNOWN", "x"));
    mount();
    await screen.findByText(/Approval is blocked: completion evidence can't be checked right now/);
    expect(approve().disabled).toBe(true);
  });
  it("blocks approval and names the missing evidence", async () => {
    vi.mocked(getJob).mockResolvedValue(job({ missingCompletion: ["photo", "signature"] }));
    mount();
    await screen.findByText(/Approval is blocked: required evidence is missing: an After photo, the customer signature/);
    expect(approve().disabled).toBe(true);
  });
  it("allows approval when evidence is available and complete", async () => {
    const confirm = mount();
    await screen.findByText("Done");
    reviewed();
    fireEvent.click(approve());
    expect(confirm).toHaveBeenCalledWith(undefined, 8);
  });
  it("shows the server's EVIDENCE_UNAVAILABLE and EVIDENCE_REQUIRED honestly", async () => {
    mount({ errorCode: "EVIDENCE_UNAVAILABLE" });
    expect(await screen.findByText(/Evidence can't be checked right now; try again later or ask an administrator/)).toBeTruthy();
    cleanup();
    mount({ errorCode: "EVIDENCE_REQUIRED", errorMissing: ["photo"] });
    expect(await screen.findByText(/The server refused approval: required evidence is missing: an After photo\. Send the job back/)).toBeTruthy();
  });
});

describe("approval-evidence policy: allowed by admin", () => {
  it("requires an explicit acknowledgment of 'approving without evidence' when evidence is unavailable", async () => {
    vi.mocked(listAttachments).mockRejectedValue(new B2bError(503, "MIGRATION_PENDING", "x"));
    const confirm = mount({ allow: true });
    await screen.findByText(/You are approving without completion evidence/);
    reviewed();
    expect(approve().disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "I understand this job is being approved without complete completion evidence" }));
    expect(approve().disabled).toBe(false);
    fireEvent.click(approve());
    expect(confirm).toHaveBeenCalledWith(undefined, 8);
  });
  it("also warns when required evidence is missing", async () => {
    vi.mocked(getJob).mockResolvedValue(job({ missingCompletion: ["notes"] }));
    mount({ allow: true });
    await screen.findByText(/You are approving without completion evidence/);
    reviewed();
    expect(approve().disabled).toBe(true);
  });
  it("shows no extra warning when evidence is complete", async () => {
    mount({ allow: true });
    await screen.findByText("Done");
    expect(screen.queryByText(/approving without completion evidence/)).toBeNull();
  });
});

describe("policy wording", () => {
  it("calls it a site-wide setting, not the organisation's policy", async () => {
    vi.mocked(listAttachments).mockRejectedValue(new B2bError(503, "MIGRATION_PENDING", "x"));
    mount({ allow: true });
    const text = (await screen.findByText(/You are approving without completion evidence/)).textContent ?? "";
    expect(text).toMatch(/site-wide setting/);
    expect(text).not.toMatch(/organisation/i);
  });
});
