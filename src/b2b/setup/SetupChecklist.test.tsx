import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { SetupProgress } from "./api";

const m = vi.hoisted(() => ({ can: true, setup: vi.fn() }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: "en", t: (_k: string, f?: string) => f ?? _k }) }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "o1", can: () => m.can }) }));
vi.mock("./api", async (o) => ({ ...(await o<typeof import("./api")>()), getSetup: m.setup }));
import { SetupChecklist } from "./SetupChecklist";

const p = (done: string[], completed = false): SetupProgress => ({
  steps: [["profile", true], ["team", true], ["employees", true], ["invites", false], ["clients", true], ["first_job", false]].map(([key, required]) => ({ key: key as never, required: required as boolean, done: done.includes(key as string) })),
  completed, percent: Math.round((done.length / 6) * 100),
});
const show = () => render(<QueryClientProvider client={new QueryClient()}><SetupChecklist /></QueryClientProvider>);
afterEach(() => { cleanup(); vi.clearAllMocks(); m.can = true; localStorage.clear(); });

describe("SetupChecklist", () => {
  it("shows the six steps, required progress, optional badges, 'After step 4' and one button per open step", async () => {
    m.setup.mockResolvedValue(p(["profile"]));
    show();
    expect((await screen.findByRole("heading", { name: /1 of 4 required steps done/ })).tagName).toBe("H2");
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getAllByText("Optional")).toHaveLength(2);
    expect(screen.getByText("After step 4")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("17");
    expect(screen.getByRole("link", { name: "Add clients" }).getAttribute("href")).toBe("/ops/o1/customers");
    expect(screen.getByRole("link", { name: "Continue setup" }).getAttribute("href")).toBe("/ops/o1/setup");
    expect(screen.queryByRole("link", { name: "Complete profile" })).toBeNull(); // done steps have no button
  });
  it("can be hidden for now and stays hidden", async () => {
    m.setup.mockResolvedValue(p([]));
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Hide for now" }));
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    cleanup();
    show();
    await vi.waitFor(() => expect(m.setup).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
  });
  it("collapses to 'Setup complete', is hidden for people without org.manage and when the request fails", async () => {
    m.setup.mockResolvedValue(p(["profile", "team", "employees", "clients"], true));
    show();
    expect(await screen.findByText("Setup complete")).toBeTruthy();
    cleanup();
    m.can = false;
    const { container } = show();
    expect(container.textContent).toBe("");
    cleanup();
    m.can = true;
    m.setup.mockRejectedValue(new Error("x"));
    const failed = show();
    await vi.waitFor(() => expect(m.setup).toHaveBeenCalled());
    expect(failed.container.querySelector("section")).toBeNull();
  });
});
