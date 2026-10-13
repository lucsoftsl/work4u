import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NewJobForm } from "./NewJobForm";
import { createJob } from "@/b2b/api/endpoints";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }) }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "org", can: () => true }) }));
vi.mock("@/b2b/api/endpoints", async (original) => ({ ...await original<typeof import("@/b2b/api/endpoints")>(), createJob: vi.fn().mockResolvedValue({ id: "created" }) }));
vi.mock("@/b2b/api/catalog", async (original) => ({
  ...await original<typeof import("@/b2b/api/catalog")>(),
  listCustomers: vi.fn().mockResolvedValue([{ id: "customer", name: "ABC Hotels" }]),
  getCustomer: vi.fn().mockResolvedValue({ locations: [{ id: "location", label: "Malaga", addressLine: "Main street" }] }),
  listSkills: vi.fn().mockResolvedValue([{ id: "skill", name: "Plumbing" }]),
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><NewJobForm /></QueryClientProvider>);

describe("new job form", () => {
  it("focuses the first invalid field without posting", () => {
    mount();
    fireEvent.submit(screen.getByRole("button", { name: "Create job" }).closest("form")!);
    expect(document.activeElement).toBe(screen.getByLabelText(/Title/));
    expect(createJob).not.toHaveBeenCalled();
  });
  it("submits customer, its location, skills, priority, date and duration", async () => {
    mount();
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "Repair boiler" } });
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: "Repair" } });
    fireEvent.click(await screen.findByRole("radio", { name: "ABC Hotels" }));
    await waitFor(() => expect((screen.getByRole("radio", { name: /Malaga/ }) as HTMLInputElement).checked).toBe(true));
    fireEvent.click(screen.getByRole("checkbox", { name: "Plumbing" }));
    fireEvent.click(screen.getByRole("radio", { name: "Urgent" }));
    fireEvent.change(screen.getByLabelText("Requested date"), { target: { value: "2026-10-20" } });
    fireEvent.change(screen.getByLabelText("Estimated duration (minutes)"), { target: { value: "90" } });
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await waitFor(() => expect(createJob).toHaveBeenCalledWith("org", expect.objectContaining({ customerId: "customer", locationId: "location", requiredSkillIds: ["skill"], priority: "URGENT", requestedDate: "2026-10-20", estimatedDurationMin: 90 })));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/ops/org/jobs/created"));
  });
});
