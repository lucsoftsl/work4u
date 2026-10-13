import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ScheduleForm } from "./ScheduleForm";
import { checkSchedule, scheduleJob } from "@/b2b/api/endpoints";
import { B2bError } from "@/b2b/api/client";
import type { JobWorkspace } from "@/b2b/api/types";

const state = vi.hoisted(() => ({ override: true, schedule: true }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }) }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "org", can: (p: string) => p === "dispatch.override_conflict" ? state.override : state.schedule }) }));
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ push: vi.fn() }) }));
vi.mock("@/b2b/api/endpoints", async (original) => ({ ...await original<typeof import("@/b2b/api/endpoints")>(), checkSchedule: vi.fn(), scheduleJob: vi.fn() }));

const job = { id: "job", status: "DISPATCHED", version: 3, scheduledStart: "2026-10-20T09:00:00Z", scheduledEnd: "2026-10-20T10:00:00Z" } as JobWorkspace;
const conflict = { type: "TEAM_TIME_OVERLAP" as const, message: "Team already booked" };
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><ScheduleForm job={job} timezone="UTC" /></QueryClientProvider>);
beforeEach(() => {
  state.override = true; state.schedule = true;
  vi.mocked(checkSchedule).mockResolvedValue({ conflicts: [conflict], canOverride: true, version: 3, status: "DISPATCHED", resultingStatus: "SCHEDULED" });
  vi.mocked(scheduleJob).mockResolvedValue(job);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("schedule dry run integration", () => {
  it("warns before save, requires an override reason and preserves expectedVersion", async () => {
    mount();
    expect(scheduleJob).not.toHaveBeenCalled();
    await screen.findByText(/Team already booked/);
    expect((screen.getByRole("button", { name: "Schedule anyway" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Override reason"), { target: { value: "Urgent repair" } });
    fireEvent.click(screen.getByRole("button", { name: "Schedule anyway" }));
    await waitFor(() => expect(scheduleJob).toHaveBeenCalledWith("org", "job", expect.objectContaining({ expectedVersion: 3, override: { reason: "Urgent repair" } })));
  });
  it("does not offer override to a role without permission", async () => {
    state.override = false;
    mount();
    await screen.findByText(/Your role can't override/);
    expect(screen.queryByLabelText("Override reason")).toBeNull();
    expect((screen.getByRole("button", { name: "Save schedule" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("respects the API refusal even for a locally permitted role", async () => {
    vi.mocked(checkSchedule).mockResolvedValue({ conflicts: [conflict], canOverride: false, version: 3, status: "DISPATCHED", resultingStatus: "SCHEDULED" });
    mount();
    await screen.findByText(/Your role can't override/);
    expect(screen.queryByLabelText("Override reason")).toBeNull();
  });
  it("handles a version race between the check and save", async () => {
    vi.mocked(checkSchedule).mockResolvedValue({ conflicts: [], canOverride: false, version: 3, status: "DISPATCHED", resultingStatus: "SCHEDULED" });
    vi.mocked(scheduleJob).mockRejectedValue(new B2bError(409, "VERSION_CONFLICT", "Changed", { currentVersion: 4 }));
    mount();
    await screen.findByText("No conflicts for this time.");
    fireEvent.click(screen.getByRole("button", { name: "Save schedule" }));
    await screen.findByRole("button", { name: /Reload|Refresh/ });
  });
  it("hides scheduling and never checks when permission is absent", () => {
    state.schedule = false;
    mount();
    expect(screen.queryByRole("button", { name: "Save schedule" })).toBeNull();
    expect(checkSchedule).not.toHaveBeenCalled();
  });
});
