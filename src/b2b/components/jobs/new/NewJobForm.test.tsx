import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NewJobForm } from "./NewJobForm";
import { createJob, patchJob, promoteJob, transitionJob } from "@/b2b/api/endpoints";
import { createLocation, getCustomer, listCustomers } from "@/b2b/api/catalog";
import { listJobTypes, type JobType } from "@/b2b/api/jobTypes";
import { B2bError } from "@/b2b/api/client";
import type { JobWorkspace } from "@/b2b/api/types";

const push = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());
const perms = vi.hoisted(() => ({ set: new Set<string>() }));
const setupApi = vi.hoisted(() => ({ createClient: vi.fn(), setClientTags: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: "en", t: (_key: string, fallback: string) => fallback }) }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "org", can: (p: string) => perms.set.has(p) }) }));
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ push: toast }) }));
const cur = vi.hoisted(() => ({ company: "RON" as string | null, effective: "RON", remember: vi.fn(), refresh: vi.fn() }));
vi.mock("@/b2b/currency/useEffectiveCurrency", () => ({ useEffectiveCurrency: () => ({ currency: cur.effective, companyCurrency: cur.company, isSet: cur.company !== null, preferred: null, loading: false, remember: cur.remember, refreshCompany: cur.refresh }) }));
vi.mock("@/b2b/currency/useCurrencies", async () => (await import("@/b2b/currency/testkit")).currenciesMock());
vi.mock("@/b2b/api/jobTypes", async (original) => ({ ...await original<typeof import("@/b2b/api/jobTypes")>(), listJobTypes: vi.fn() }));
vi.mock("@/b2b/api/endpoints", async (original) => ({
  ...await original<typeof import("@/b2b/api/endpoints")>(),
  createJob: vi.fn().mockResolvedValue({ id: "created" }), patchJob: vi.fn(), promoteJob: vi.fn(), transitionJob: vi.fn(),
}));
vi.mock("@/b2b/setup/api", async (original) => ({ ...await original<typeof import("@/b2b/setup/api")>(), createClient: setupApi.createClient, setClientTags: setupApi.setClientTags }));
vi.mock("@/b2b/api/catalog", async (original) => ({
  ...await original<typeof import("@/b2b/api/catalog")>(),
  listCustomers: vi.fn(),
  getCustomer: vi.fn(),
  createLocation: vi.fn(),
  listSkills: vi.fn().mockResolvedValue([{ id: "skill", name: "Plumbing" }]),
}));

// jsdom has no <dialog>.showModal
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };

const MALAGA = { id: "location", label: "Malaga", addressLine: "Main street" };
const BASE = ["job.create", "customer.manage", "job.cancel"];
const FINANCE = [...BASE, "finance.view"];
const jt = (id: string, name: string, o: Partial<JobType> = {}): JobType => ({ id, name, position: 0, defaultDurationMin: null, archived: false, jobCount: 0, ...o });
const TYPES = [jt("t1", "Repair", { defaultDurationMin: 90, defaultPrice: 45000 }), jt("t2", "Installation", { defaultDurationMin: 240, defaultPrice: 150000 })];
beforeEach(() => {
  perms.set = new Set(BASE);
  vi.mocked(listJobTypes).mockResolvedValue([]);
  vi.mocked(listCustomers).mockResolvedValue([{ id: "customer", name: "ABC Hotels" }]);
  vi.mocked(getCustomer).mockResolvedValue({ id: "customer", name: "ABC Hotels", locations: [MALAGA] } as never);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); sessionStorage.clear(); cur.company = "RON"; cur.effective = "RON"; });
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const mount = (qc = client()) => render(<QueryClientProvider client={qc}><NewJobForm /></QueryClientProvider>);
// The category field exists once the (empty) job type list has loaded.
const fillBasics = async () => {
  fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "Repair boiler" } });
  fireEvent.change(await screen.findByLabelText(/Category/), { target: { value: "Repair" } });
};
const dialog = () => screen.getByRole("dialog");

describe("new job form", () => {
  it("focuses the first invalid field without posting", async () => {
    mount();
    await screen.findByLabelText(/Category/);
    fireEvent.submit(screen.getByRole("button", { name: "Create job" }).closest("form")!);
    expect(document.activeElement).toBe(screen.getByLabelText(/Title/));
    expect(createJob).not.toHaveBeenCalled();
  });
  it("submits customer, its location, skills, priority, date and duration", async () => {
    mount();
    await fillBasics();
    fireEvent.click(await screen.findByRole("radio", { name: "ABC Hotels" }));
    await waitFor(() => expect((screen.getByRole("radio", { name: /Malaga/ }) as HTMLInputElement).checked).toBe(true));
    fireEvent.click(await screen.findByRole("checkbox", { name: "Plumbing" }));
    fireEvent.click(screen.getByRole("radio", { name: "Urgent" }));
    fireEvent.change(screen.getByLabelText("Requested date"), { target: { value: "2026-10-20" } });
    fireEvent.change(screen.getByLabelText("Estimated duration (minutes)"), { target: { value: "90" } });
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await waitFor(() => expect(createJob).toHaveBeenCalledWith("org", expect.objectContaining({ customerId: "customer", locationId: "location", requiredSkillIds: ["skill"], priority: "URGENT", requestedDate: "2026-10-20", estimatedDurationMin: 90 })));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/ops/org/jobs/created"));
  });
});

describe("a client without a location never dead-ends Create Job (afcfd60a, e6c69ccf)", () => {
  it("adds the location in a dialog, selects it and keeps everything typed", async () => {
    vi.mocked(getCustomer)
      .mockResolvedValueOnce({ id: "customer", name: "ABC Hotels", locations: [] } as never)
      .mockResolvedValue({ id: "customer", name: "ABC Hotels", locations: [{ id: "new-loc", label: "Warehouse", addressLine: "Calle 1" }] } as never);
    vi.mocked(createLocation).mockResolvedValue({ id: "new-loc", label: "Warehouse", addressLine: "Calle 1" } as never);
    mount();
    await fillBasics();
    fireEvent.click(await screen.findByRole("radio", { name: "ABC Hotels" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add a location" }));
    expect(screen.queryByRole("link", { name: /location/i })).toBeNull(); // no redirect to the client page
    fireEvent.change(within(dialog()).getByLabelText("Label (for example Head office)"), { target: { value: "Warehouse" } });
    fireEvent.change(within(dialog()).getByLabelText("Address"), { target: { value: "Calle 1" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(createLocation).toHaveBeenCalledWith("org", "customer", expect.objectContaining({ label: "Warehouse", addressLine: "Calle 1" })));
    await waitFor(() => expect((screen.getByRole("radio", { name: /Warehouse/ }) as HTMLInputElement).checked).toBe(true));
    expect(screen.getByText("Warehouse was added and selected.")).toBeTruthy();
    expect((screen.getByLabelText(/Title/) as HTMLInputElement).value).toBe("Repair boiler");
    expect(createJob).not.toHaveBeenCalled(); // the dialog's Save never submits the job form
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await waitFor(() => expect(createJob).toHaveBeenCalledWith("org", expect.objectContaining({ customerId: "customer", locationId: "new-loc", title: "Repair boiler" })));
  });
  it("an invalid location from the API lands on its field in the dialog", async () => {
    const { B2bError } = await import("@/b2b/api/client");
    vi.mocked(getCustomer).mockResolvedValue({ id: "customer", name: "ABC Hotels", locations: [] } as never);
    vi.mocked(createLocation).mockRejectedValueOnce(new B2bError(400, "VALIDATION_ERROR", "Invalid request", { fields: { country: "String must contain exactly 2 character(s)" } }));
    mount();
    fireEvent.click(await screen.findByRole("radio", { name: "ABC Hotels" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add a location" }));
    fireEvent.change(within(dialog()).getByLabelText("Label (for example Head office)"), { target: { value: "Warehouse" } });
    fireEvent.change(within(dialog()).getByLabelText("Address"), { target: { value: "Calle 1" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save" }));
    const country = within(dialog()).getByLabelText("Country code");
    await waitFor(() => expect(document.activeElement).toBe(country));
    expect(country.getAttribute("aria-invalid")).toBe("true");
  });
  it("without permission to edit clients there is no add button, and the message says who can", async () => {
    perms.set = new Set();
    vi.mocked(getCustomer).mockResolvedValue({ id: "customer", name: "ABC Hotels", locations: [] } as never);
    mount();
    fireEvent.click(await screen.findByRole("radio", { name: "ABC Hotels" }));
    expect(await screen.findByText(/Ask someone who can edit clients/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add a location" })).toBeNull();
  });
});

describe("create the client from Create Job (4e742976)", () => {
  it("offers to create the typed name, creates client + first location, selects both, keeps the job", async () => {
    vi.mocked(listCustomers).mockResolvedValue([]);
    setupApi.createClient.mockResolvedValue({ id: "c-new", name: "Bar Luna", tags: [] });
    vi.mocked(createLocation).mockResolvedValue({ id: "l-new", label: "Main address", addressLine: "Calle 1" } as never);
    vi.mocked(getCustomer).mockResolvedValue({ id: "c-new", name: "Bar Luna", locations: [{ id: "l-new", label: "Main address", addressLine: "Calle 1" }] } as never);
    mount();
    await fillBasics();
    fireEvent.change(screen.getByLabelText("Search customers"), { target: { value: "Bar Luna" } });
    fireEvent.click(screen.getByRole("button", { name: "Create new client “Bar Luna”" }));
    expect((within(dialog()).getByLabelText("Name") as HTMLInputElement).value).toBe("Bar Luna");
    fireEvent.change(within(dialog()).getByLabelText("Address"), { target: { value: "Calle 1" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(setupApi.createClient).toHaveBeenCalledWith("org", expect.objectContaining({ name: "Bar Luna" })));
    expect(createLocation).toHaveBeenCalledWith("org", "c-new", expect.objectContaining({ label: "Main address", addressLine: "Calle 1" }));
    expect(await screen.findByText("Bar Luna", { selector: "p" })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Change" })));
    expect((screen.getByLabelText(/Title/) as HTMLInputElement).value).toBe("Repair boiler");
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await waitFor(() => expect(createJob).toHaveBeenCalledWith("org", expect.objectContaining({ customerId: "c-new", locationId: "l-new" })));
  });
  const DUP = { id: "customer", name: "ABC Hotels", email: "o•••@abc.ro", phone: "••• ••• 111", reasons: ["NAME", "PHONE"] };
  const dupError = () => new B2bError(409, "DUPLICATE_CUSTOMER", "x", { matches: [DUP] });
  const startDuplicate = async () => {
    setupApi.createClient.mockRejectedValueOnce(dupError());
    mount();
    await screen.findByLabelText(/Category/);
    fireEvent.change(screen.getByLabelText("Search customers"), { target: { value: "abc hotels" } });
    fireEvent.click(screen.getByRole("button", { name: "Create new client \u201cabc hotels\u201d" }));
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save" }));
    await within(dialog()).findByText("This client may already exist");
  };
  it("a client the API says may already exist is offered, with masked contact details, instead of a second one", async () => {
    await startDuplicate();
    expect(within(dialog()).getByText("o•••@abc.ro · ••• ••• 111")).toBeTruthy(); // shown exactly as masked by the API
    expect(within(dialog()).getByText("Same name · Same phone number")).toBeTruthy();
    expect(document.activeElement?.textContent).toBe("This client may already exist");
    fireEvent.click(within(dialog()).getByRole("button", { name: "Use this client" }));
    expect(await screen.findByText("ABC Hotels", { selector: "p" })).toBeTruthy();
    expect(setupApi.createClient).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("Back to the form keeps what was typed; Create anyway re-sends the same client with allowDuplicate", async () => {
    await startDuplicate();
    fireEvent.click(within(dialog()).getByRole("button", { name: "Back to the form" }));
    expect(((await within(dialog()).findByLabelText("Name")) as HTMLInputElement).value).toBe("abc hotels"); // react-query resets on the next tick
    setupApi.createClient.mockRejectedValueOnce(dupError());
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save" }));
    await within(dialog()).findByText("This client may already exist");
    setupApi.createClient.mockResolvedValueOnce({ id: "c-new", name: "abc hotels", tags: [] });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Create anyway" }));
    await waitFor(() => expect(setupApi.createClient).toHaveBeenLastCalledWith("org", expect.objectContaining({ name: "abc hotels", allowDuplicate: true })));
    expect(await screen.findByText("abc hotels", { selector: "p" })).toBeTruthy();
  });
  it("is hidden without permission to create clients", async () => {
    perms.set = new Set(["job.create"]);
    mount();
    fireEvent.change(screen.getByLabelText("Search customers"), { target: { value: "Bar Luna" } });
    await screen.findByRole("radio", { name: "ABC Hotels" });
    expect(screen.queryByRole("button", { name: /Create (new|a new) client/ })).toBeNull();
  });
});

describe("typed data survives a reload or an accidental close (4)", () => {
  it("the job draft comes back after a remount and is cleared once the job is created", async () => {
    const first = mount();
    await fillBasics();
    first.unmount();
    mount();
    expect((screen.getByLabelText(/Title/) as HTMLInputElement).value).toBe("Repair boiler");
    fireEvent.click(await screen.findByRole("radio", { name: "ABC Hotels" }));
    await waitFor(() => expect((screen.getByRole("radio", { name: /Malaga/ }) as HTMLInputElement).checked).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(sessionStorage.getItem("b2b.newJob.org")).toBeNull();
  });
  it("closing the inline client dialog by accident keeps what was typed in it", async () => {
    vi.mocked(listCustomers).mockResolvedValue([]);
    mount();
    fireEvent.change(screen.getByLabelText("Search customers"), { target: { value: "Bar Luna" } });
    fireEvent.click(screen.getByRole("button", { name: "Create new client “Bar Luna”" }));
    fireEvent.change(within(dialog()).getByLabelText("Email"), { target: { value: "hola@barluna.es" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Create new client “Bar Luna”" }));
    expect((within(dialog()).getByLabelText("Email") as HTMLInputElement).value).toBe("hola@barluna.es");
  });
});

const typeRadio = (name: string) => screen.findByRole("radio", { name: new RegExp(name) });
const duration = () => screen.getByLabelText("Estimated duration (minutes)") as HTMLInputElement;
const price = () => screen.getByLabelText(/Price charged to the client/) as HTMLInputElement;
const cost = () => screen.getByLabelText(/Cost to you/) as HTMLInputElement;
const pickClientAndLocation = async () => {
  fireEvent.click(await screen.findByRole("radio", { name: "ABC Hotels" }));
  await waitFor(() => expect((screen.getByRole("radio", { name: /Malaga/ }) as HTMLInputElement).checked).toBe(true));
};

describe("job type instead of the free-text category (ce3173a7)", () => {
  it("a company without job types keeps the Category field, and only managers get the link to set them up", async () => {
    perms.set = new Set([...BASE, "jobType.manage"]);
    mount();
    expect(await screen.findByLabelText(/Category/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Set up job types" }).getAttribute("href")).toBe("/ops/org/settings/job-types");
    cleanup();
    perms.set = new Set(BASE);
    mount();
    await screen.findByLabelText(/Category/);
    expect(screen.queryByRole("link", { name: "Set up job types" })).toBeNull();
  });
  it("with job types the picker replaces Category; the type's time prefills and the job is created with jobTypeId and no category", async () => {
    vi.mocked(listJobTypes).mockResolvedValue(TYPES);
    mount();
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "Repair boiler" } });
    expect(screen.queryByLabelText(/Category/)).toBeNull();
    fireEvent.click(await typeRadio("Repair"));
    expect(duration().value).toBe("90");
    expect(screen.getByText("Time and price are filled from the job type. You can change them.")).toBeTruthy();
    await pickClientAndLocation();
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await waitFor(() => expect(createJob).toHaveBeenCalled());
    const body = vi.mocked(createJob).mock.calls[0][1];
    expect(body).toMatchObject({ jobTypeId: "t1", estimatedDurationMin: 90, customerId: "customer", locationId: "location" });
    expect(body).not.toHaveProperty("category");
    expect(body).not.toHaveProperty("price"); // no finance.view: no money, ever
  });
  it("editing the time survives choosing the same type again, and a different type no longer overwrites it", async () => {
    vi.mocked(listJobTypes).mockResolvedValue(TYPES);
    mount();
    fireEvent.click(await typeRadio("Repair"));
    fireEvent.change(duration(), { target: { value: "45" } });
    fireEvent.click(await typeRadio("Repair"));
    expect(duration().value).toBe("45");
    fireEvent.click(await typeRadio("Installation"));
    expect(duration().value).toBe("45");
  });
  it("a job needs a type when the company has them", async () => {
    vi.mocked(listJobTypes).mockResolvedValue(TYPES);
    mount();
    await typeRadio("Repair");
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "Leak" } });
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    expect(await screen.findByText("Choose a job type.")).toBeTruthy();
    expect(createJob).not.toHaveBeenCalled();
  });
});

describe("money on a job (aa659608)", () => {
  it("the Money card does not exist without finance.view: no inputs, no hint, no price in the request", async () => {
    vi.mocked(listJobTypes).mockResolvedValue(TYPES);
    mount();
    fireEvent.click(await typeRadio("Repair"));
    expect(screen.queryByText("Money")).toBeNull();
    expect(screen.queryByLabelText(/Price charged/)).toBeNull();
    expect(screen.queryByLabelText(/Cost to you/)).toBeNull();
  });
  it("with finance.view the type's default price fills in, the margin follows live, and the amounts go out as minor units", async () => {
    perms.set = new Set(FINANCE);
    vi.mocked(listJobTypes).mockResolvedValue(TYPES);
    mount();
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "Repair boiler" } });
    fireEvent.click(await typeRadio("Repair"));
    expect(price().value).toBe("450.00");
    expect(screen.getByText("From the job type. You can change it.")).toBeTruthy();
    expect(screen.getByLabelText(/Price charged to the client \(RON\)/)).toBeTruthy();
    fireEvent.change(cost(), { target: { value: "290" } });
    expect(screen.getByText("Margin RON 160.00 · 35.6%")).toBeTruthy();
    await pickClientAndLocation();
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await waitFor(() => expect(createJob).toHaveBeenCalledWith("org", expect.objectContaining({ jobTypeId: "t1", price: 45000, cost: 29000 })));
  });
  it("a cost above the price shows a loss with a minus sign and the word", async () => {
    perms.set = new Set(FINANCE);
    mount();
    await screen.findByLabelText(/Category/);
    fireEvent.change(price(), { target: { value: "100" } });
    fireEvent.change(cost(), { target: { value: "120" } });
    const line = screen.getByText(/^Margin .*loss/);
    expect(line.textContent).toContain("-");
    expect(line.textContent).toContain("(loss)");
    expect(line.className).toContain("sig-vermilion");
  });
  it("shows no margin (not a zero) while a side is missing", async () => {
    perms.set = new Set(FINANCE);
    mount();
    await screen.findByLabelText(/Category/);
    fireEvent.change(price(), { target: { value: "100" } });
    expect(screen.queryByText(/^Margin RON/)).toBeNull();
    expect(screen.getByText("Margin appears when price and cost are filled in.")).toBeTruthy();
  });
  it("a price that is not an amount is refused on the field before any request", async () => {
    perms.set = new Set(FINANCE);
    mount();
    await fillBasics();
    await pickClientAndLocation();
    fireEvent.change(price(), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    expect(await screen.findByText("Enter an amount like 450.00.")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(price()));
    expect(price().getAttribute("aria-invalid")).toBe("true");
    expect(createJob).not.toHaveBeenCalled();
  });
});

describe("Save as draft (4718e5f9)", () => {
  it("with neither a title nor a client it says so and moves focus to Title", async () => {
    mount();
    await screen.findByLabelText(/Category/);
    fireEvent.click(screen.getByRole("button", { name: "Save as draft" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Add a title or choose a client to save a draft.");
    expect(document.activeElement).toBe(screen.getByLabelText(/Title/));
    expect(createJob).not.toHaveBeenCalled();
  });
  it("a title alone is enough: a draft without client, location or category is created, then the page becomes the draft editor", async () => {
    vi.mocked(createJob).mockResolvedValue({ id: "d9", reference: "JOB-1075" } as never);
    mount();
    await screen.findByLabelText(/Category/);
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "Leaky tap" } });
    expect(sessionStorage.getItem("b2b.newJob.org")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save as draft" }));
    await waitFor(() => expect(createJob).toHaveBeenCalledWith("org", expect.objectContaining({ draft: true, title: "Leaky tap" })));
    const body = vi.mocked(createJob).mock.calls[0][1];
    expect(body).not.toHaveProperty("customerId");
    expect(body).not.toHaveProperty("locationId");
    expect(body).not.toHaveProperty("category");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/ops/org/jobs/d9?saved=1"));
    expect(sessionStorage.getItem("b2b.newJob.org")).toBeNull(); // the draft is on the server now
    expect(push).not.toHaveBeenCalled();
  });
  it("a client alone is enough too, and money is only validated for those who can see it", async () => {
    vi.mocked(createJob).mockResolvedValue({ id: "d9", reference: "JOB-1075" } as never);
    mount();
    await screen.findByLabelText(/Category/);
    fireEvent.click(await screen.findByRole("radio", { name: "ABC Hotels" }));
    fireEvent.click(screen.getByRole("button", { name: "Save as draft" }));
    await waitFor(() => expect(createJob).toHaveBeenCalledWith("org", expect.objectContaining({ draft: true, customerId: "customer" })));
  });
  it("a date that cannot be sent is still refused", async () => {
    mount();
    await screen.findByLabelText(/Category/);
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "Leak" } });
    fireEvent.change(screen.getByLabelText("Requested date"), { target: { value: "2026-02-30" } });
    fireEvent.click(screen.getByRole("button", { name: "Save as draft" }));
    expect(createJob).not.toHaveBeenCalled();
  });
});

const draftJob = (o: Record<string, unknown> = {}): JobWorkspace => ({
  id: "d1", reference: "JOB-1074", number: 1074, version: 3, status: "DRAFT", title: "Leaky tap", category: "", description: null,
  customerId: null, locationId: null, jobTypeId: null, priority: "NORMAL", requestedDate: null, estimatedDurationMin: null,
  requirements: { checklist: false, notes: false, photo: false, signature: false, review: false }, checklist: [], requiredSkills: [],
  customer: null, location: null, assignments: [], ...o,
}) as unknown as JobWorkspace;
const mountDraft = (job = draftJob(), justSaved = false) => render(
  <QueryClientProvider client={client()}><NewJobForm draftJob={job} justSaved={justSaved} /></QueryClientProvider>,
);

describe("the draft editor", () => {
  it("opens on the saved draft and keeps the form off the new-job storage key", async () => {
    mountDraft();
    expect((screen.getByLabelText(/Title/) as HTMLInputElement).value).toBe("Leaky tap");
    await screen.findByLabelText(/Category/);
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "Leaky tap upstairs" } });
    expect(sessionStorage.getItem("b2b.draftJob.org.d1")).toContain("Leaky tap upstairs");
    expect(sessionStorage.getItem("b2b.newJob.org")).toBeNull();
  });
  it("Save draft patches the same draft with its version, then confirms with the next steps", async () => {
    vi.mocked(patchJob).mockResolvedValue({ id: "d1", reference: "JOB-1074", version: 4 } as never);
    mountDraft();
    await screen.findByLabelText(/Category/);
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "Leaky tap upstairs" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(patchJob).toHaveBeenCalledWith("org", "d1", 3, expect.objectContaining({ title: "Leaky tap upstairs", jobTypeId: null, description: null })));
    expect(await screen.findByText("Draft saved as JOB-1074. You can finish it later from Jobs → Drafts.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go to drafts" }).getAttribute("href")).toBe("/ops/org/jobs?status=DRAFT&mine=true");
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.queryByText(/Draft saved as/)).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText(/Title/));
  });
  it("a draft kept only for its client can have its title cleared: the empty title is sent as is", async () => {
    vi.mocked(patchJob).mockResolvedValue({ id: "d1", reference: "JOB-1074", version: 4 } as never);
    mountDraft(draftJob({ customerId: "customer" }));
    await screen.findByLabelText(/Category/);
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(patchJob).toHaveBeenCalledWith("org", "d1", 3, expect.objectContaining({ title: "", customerId: "customer" })));
  });
  it("shows the confirmation (and focuses it) right after the new-job form created the draft", () => {
    mountDraft(draftJob(), true);
    const bar = screen.getByText(/Draft saved as JOB-1074/).closest("[tabindex='-1']");
    expect(document.activeElement).toBe(bar);
  });
  it("Create job saves the form into the draft, then promotes it with the new version", async () => {
    vi.mocked(patchJob).mockResolvedValue({ id: "d1", version: 4 } as never);
    vi.mocked(promoteJob).mockResolvedValue({ id: "d1", status: "NEW", version: 5 } as never);
    mountDraft(draftJob({ customerId: "customer", locationId: "location", jobTypeId: "t1" }));
    vi.mocked(listJobTypes).mockResolvedValue(TYPES);
    await screen.findByLabelText(/Category/).catch(() => undefined);
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await waitFor(() => expect(promoteJob).toHaveBeenCalledWith("org", "d1", 4));
    expect(patchJob).toHaveBeenCalledWith("org", "d1", 3, expect.any(Object));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ message: "Job created. It's now on the dispatch board as unassigned.", tone: "success" })));
    expect(sessionStorage.getItem("b2b.draftJob.org.d1")).toBeNull();
  });
  it("the form's own check runs first: Create job on an incomplete draft sends nothing and focuses the first missing field", async () => {
    vi.mocked(patchJob).mockResolvedValue({ id: "d1", version: 4 } as never);
    vi.mocked(promoteJob).mockRejectedValue(new B2bError(422, "DRAFT_INCOMPLETE", "x", { missing: ["customerId", "locationId", "category"] }));
    mountDraft();
    await screen.findByLabelText(/Category/);
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Category/)));
    expect(patchJob).not.toHaveBeenCalled();
    expect(promoteJob).not.toHaveBeenCalled();
  });
  it("422 DRAFT_INCOMPLETE from the API highlights each missing field and the alert links jump to them", async () => {
    vi.mocked(patchJob).mockResolvedValue({ id: "d1", version: 4 } as never);
    vi.mocked(promoteJob).mockRejectedValue(new B2bError(422, "DRAFT_INCOMPLETE", "x", { missing: ["customerId", "locationId"] }));
    mountDraft(draftJob({ jobTypeId: "t1", category: "Repair" }));
    await screen.findByLabelText(/Category/);
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: "Repair" } });
    // the form passes its own check; the server still says client and location are missing (e.g. they were removed meanwhile)
    await pickClientAndLocation();
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    const alert = await screen.findByText("This draft isn't ready to become a job.");
    const box = alert.closest("[role='alert']") as HTMLElement;
    expect(within(box).getByRole("button", { name: "Customer" })).toBeTruthy();
    expect(within(box).getByRole("button", { name: "Location" })).toBeTruthy();
    expect(screen.getAllByText("Choose a customer.").length + screen.getAllByText("Choose a location.").length).toBeGreaterThan(0);
  });
  it("Discard needs a reason, cancels the draft and returns to the drafts", async () => {
    vi.mocked(transitionJob).mockResolvedValue({ id: "d1", status: "CANCELLED" } as never);
    mountDraft();
    await screen.findByLabelText(/Category/);
    fireEvent.click(screen.getByRole("button", { name: "Discard draft" }));
    const dialog = await screen.findByRole("dialog", { hidden: true });
    expect(within(dialog).getByText("JOB-1074 will be cancelled. It was never scheduled, so nobody is notified.")).toBeTruthy();
    const confirm = within(dialog).getByRole("button", { name: "Discard draft", hidden: true }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "Duplicate of JOB-1070" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(transitionJob).toHaveBeenCalledWith("org", "d1", 3, "CANCELLED", "Duplicate of JOB-1070"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/ops/org/jobs?status=DRAFT&mine=true"));
  });
  it("Discard is absent without job.cancel", async () => {
    perms.set = new Set(["job.create"]);
    mountDraft();
    await screen.findByLabelText(/Category/);
    expect(screen.queryByRole("button", { name: "Discard draft" })).toBeNull();
  });
  it("shows no money for a viewer without finance.view even if the draft has a price", async () => {
    mountDraft(draftJob({ price: 45000 }));
    await screen.findByLabelText(/Category/);
    expect(screen.queryByLabelText(/Price charged/)).toBeNull();
    expect(JSON.stringify(sessionStorage)).not.toContain("450.00");
  });
  it("shows the price of a draft to a finance viewer", async () => {
    perms.set = new Set(FINANCE);
    mountDraft(draftJob({ price: 45000, cost: 29000 }));
    await screen.findByLabelText(/Category/);
    expect(price().value).toBe("450.00");
    // the visible line and the polite live region (initially the same text) both carry it
    expect(screen.getAllByText("Margin RON 160.00 · 35.6%")).toHaveLength(2);
    expect(screen.getByRole("status").textContent?.replace(/\s/g, " ")).toBe("Margin RON 160.00 · 35.6%"); // Intl puts a no-break space after the code
  });
  it("an archived type stays on its old draft, marked as archived", async () => {
    vi.mocked(listJobTypes).mockResolvedValue(TYPES);
    mountDraft(draftJob({ jobTypeId: "old", jobType: { id: "old", name: "Quote visit", archived: true } }));
    const radio = (await screen.findByRole("radio", { name: /Quote visit/ })) as HTMLInputElement;
    expect(radio.checked).toBe(true);
    expect(screen.getByText("Archived. It stays on this job.")).toBeTruthy();
  });
});
describe("the currency of the first amount", () => {
  const fillMoney = async (priceText = "450") => {
    perms.set = new Set(FINANCE);
    mount();
    await fillBasics();
    fireEvent.change(price(), { target: { value: priceText } });
    await pickClientAndLocation();
  };
  it("a company with a currency shows it as text, has no selector, and sends no currency", async () => {
    await fillMoney();
    expect(screen.queryByRole("combobox", { name: "Company currency" })).toBeNull();
    expect(screen.getByText("RON · Romanian Leu")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await waitFor(() => expect(createJob).toHaveBeenCalled());
    expect(vi.mocked(createJob).mock.calls[0][1]).toMatchObject({ price: 45000 });
    expect(vi.mocked(createJob).mock.calls[0][1]).not.toHaveProperty("currency");
  });
  it("a company with none: the selector is next to the amount, pre-selected with the effective currency, and the pick goes with the first amount", async () => {
    cur.company = null; cur.effective = "USD";
    await fillMoney();
    const box = screen.getByRole("combobox", { name: "Company currency" }) as HTMLInputElement;
    expect(box.value).toBe("USD · US Dollar ($)");
    expect(screen.getByText(/Saving the first amount sets this as the company currency/)).toBeTruthy();
    expect(screen.getByLabelText(/Price charged to the client \(USD\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await waitFor(() => expect(createJob).toHaveBeenCalled());
    expect(vi.mocked(createJob).mock.calls[0][1]).toMatchObject({ price: 45000, currency: "USD" });
  });
  it("picking another currency changes the label, the digits, the request, and is remembered", async () => {
    cur.company = null; cur.effective = "EUR";
    await fillMoney("1500");
    const box = screen.getByRole("combobox", { name: "Company currency" });
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: "yen" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(cur.remember).toHaveBeenCalledWith("JPY");
    expect(screen.getByLabelText(/Price charged to the client \(JPY\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await waitFor(() => expect(createJob).toHaveBeenCalled());
    expect(vi.mocked(createJob).mock.calls[0][1]).toMatchObject({ price: 1500, currency: "JPY" }); // yen has no minor unit
  });
  it("no amount: no currency is sent (the company stays without one)", async () => {
    cur.company = null; cur.effective = "EUR";
    perms.set = new Set(FINANCE);
    mount();
    await fillBasics();
    await pickClientAndLocation();
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await waitFor(() => expect(createJob).toHaveBeenCalled());
    expect(vi.mocked(createJob).mock.calls[0][1]).not.toHaveProperty("currency");
  });
  it("409 CURRENCY_REQUIRED: nothing is lost, the selector asks again pre-selected with the suggestion", async () => {
    cur.company = null; cur.effective = "EUR";
    vi.mocked(createJob).mockRejectedValueOnce(new B2bError(409, "CURRENCY_REQUIRED", "x", { details: { effectiveCurrency: "GBP" } }));
    await fillMoney();
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Choose the company currency before saving the first amount. GBP is pre-selected.");
    expect(cur.remember).toHaveBeenCalledWith("GBP");
    expect(cur.refresh).toHaveBeenCalled();
    expect((price()).value).toBe("450");
  });
  it("409 CURRENCY_MISMATCH: says which currency the company has and re-reads the company", async () => {
    vi.mocked(createJob).mockRejectedValueOnce(new B2bError(409, "CURRENCY_MISMATCH", "x", { details: { currency: "EUR" } }));
    await fillMoney();
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    expect((await screen.findByRole("alert")).textContent).toContain("The company currency is EUR");
    expect(cur.refresh).toHaveBeenCalled();
  });
});
