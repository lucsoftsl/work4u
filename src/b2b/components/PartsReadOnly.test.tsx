import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { B2bError } from "@/b2b/api/client";
import { listParts } from "@/b2b/api/endpoints";
import { PartsReadOnly } from "./PartsReadOnly";
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, f: string) => f }) }));
vi.mock("@/b2b/api/endpoints", async (o) => ({ ...await o<typeof import("@/b2b/api/endpoints")>(), listParts: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const mount = () => render(<QueryClientProvider client={new QueryClient()}><PartsReadOnly orgId="o" jobId="j" /></QueryClientProvider>);
const p = (id: string, name: string, quantity: number, unit: string | null = "pcs") => ({ id, jobId: "j", name, sku: null, quantity, unit, note: null, createdAt: "", updatedAt: "" });

describe("PartsReadOnly", () => {
  it("lists parts with quantity and sums repeated names", async () => {
    vi.mocked(listParts).mockResolvedValue({ items: [p("1", "Valve", 1), p("2", "Valve", 2)], count: 2 });
    mount();
    expect(await screen.findByText("Parts used (2)")).toBeTruthy();
    expect(screen.getByText("Totals: Valve ×3 pcs")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull(); // read-only
    expect(document.querySelector("section[aria-label], [role=region][aria-label]")).toBeNull(); // would duplicate a parent Card's region name (axe landmark-unique)
  });
  it("says so when nothing was recorded, when parts are unavailable, and on error", async () => {
    vi.mocked(listParts).mockResolvedValue({ items: [], count: 0 });
    mount();
    expect(await screen.findByText("No parts recorded.")).toBeTruthy();
    cleanup();
    vi.mocked(listParts).mockRejectedValue(new B2bError(503, "MIGRATION_PENDING", "x"));
    mount();
    expect(await screen.findByText("Parts are not available yet for this workspace.")).toBeTruthy();
    cleanup();
    vi.mocked(listParts).mockRejectedValue(new B2bError(500, "UNKNOWN", "x"));
    mount();
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't load parts.");
  });
});
