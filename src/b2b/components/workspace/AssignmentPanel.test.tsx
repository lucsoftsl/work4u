import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { JobWorkspace } from "@/b2b/api/types";

const m = vi.hoisted(() => ({ assignable: vi.fn(), teams: vi.fn() }));
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ push: vi.fn() }) }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "o1", can: () => true }) }));
vi.mock("./useJobCache", () => ({ useJobCache: () => ({ refresh: vi.fn() }) }));
vi.mock("@/b2b/api/endpoints", async (o) => ({ ...(await o<typeof import("@/b2b/api/endpoints")>()), listTeams: m.teams, checkAssignment: vi.fn(async () => ({ conflicts: [], canOverride: false })), assignJob: vi.fn() }));
vi.mock("@/b2b/setup/api", async (o) => ({ ...(await o<typeof import("@/b2b/setup/api")>()), listAssignableMembers: m.assignable }));
import { AssignmentPanel } from "./AssignmentPanel";

const job = { id: "j1", version: 1, scheduledStart: "2026-10-16T08:00:00Z", assignments: [] } as unknown as JobWorkspace;
const show = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AssignmentPanel job={job} /></QueryClientProvider>);
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("job assignee picker (regression: employees without a team could not be assigned)", () => {
  it("lists every active member, planning-only people and people in no team included, grouped by team", async () => {
    m.teams.mockResolvedValue([{ id: "t1", name: "Alpha", active: true, status: "AVAILABLE", members: [{ id: "a", displayName: "Ana" }] }]);
    m.assignable.mockResolvedValue([{ id: "a", displayName: "Ana", loginStatus: "ACTIVE" }, { id: "p", displayName: "Pia Planner", loginStatus: "NONE" }, { id: "c", displayName: "Carlos", loginStatus: "INVITED" }]);
    show();
    const select = await screen.findByLabelText("Team or technician");
    await waitFor(() => expect(within(select).getByRole("option", { name: /Pia Planner \(planning only\)/ })).toBeTruthy());
    expect(within(select).getByRole("option", { name: "Carlos" })).toBeTruthy();
    expect(select.querySelector('optgroup[label="Technicians · Alpha"]')).toBeTruthy();
    expect(select.querySelector('optgroup[label="Technicians · No team"]')).toBeTruthy();
    expect((within(select).getByRole("option", { name: /Pia Planner/ }) as HTMLOptionElement).value).toBe("member:p");
  });
  it("still offers the team members if the assignable list cannot be loaded", async () => {
    m.teams.mockResolvedValue([{ id: "t1", name: "Alpha", active: true, status: "AVAILABLE", members: [{ id: "a", displayName: "Ana" }] }]);
    m.assignable.mockRejectedValue(new Error("x"));
    show();
    const select = await screen.findByLabelText("Team or technician");
    await waitFor(() => expect(within(select).getByRole("option", { name: "Ana" })).toBeTruthy());
  });
});
