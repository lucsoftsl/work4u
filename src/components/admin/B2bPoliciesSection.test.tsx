import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { B2bPoliciesSection } from "./B2bPoliciesSection";
import { PolicyApiError } from "@/lib/b2b-policies-api";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import es from "@/locales/es.json";
import hu from "@/locales/hu.json";
import ro from "@/locales/ro.json";
const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("@/lib/b2b-policies-api", async (original) => ({ ...await original<typeof import("@/lib/b2b-policies-api")>(), getB2bPolicies: api.get, putB2bPolicies: api.put }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (key: string, fallback?: string) => (en as Record<string, string>)[key] ?? fallback ?? key }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const policy = (over = {}) => ({ allowApprovalWithoutEvidence: false, updatedAt: null, updatedByUserId: null, ...over });
const toggle = () => screen.findByRole("switch", { name: "Allow approval without completion evidence" });
const save = () => screen.getByRole("button", { name: "Save changes" });

describe("B2bPoliciesSection", () => {
  it("shows loading, then the toggle off by default with the risk help text", async () => {
    api.get.mockResolvedValue(policy());
    render(<B2bPoliciesSection token="t" />);
    expect(screen.getByRole("status").textContent).toMatch(/Loading/);
    expect((await toggle()).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(/can be closed even when photos, signatures or notes/i)).toBeTruthy();
  });
  it("saves, shows success, and shows who/when of the last change", async () => {
    api.get.mockResolvedValue(policy());
    api.put.mockResolvedValue(policy({ allowApprovalWithoutEvidence: true, updatedAt: "2026-10-13T10:00:00Z", updatedByUserId: "user-7" }));
    render(<B2bPoliciesSection token="t" />);
    fireEvent.click(await toggle());
    fireEvent.click(save());
    await screen.findByText("Saved");
    expect(api.put).toHaveBeenCalledWith("t", true);
    expect(screen.getByText(/user-7/)).toBeTruthy();
    expect((await toggle()).getAttribute("aria-checked")).toBe("true");
  });
  it("shows a clear error and keeps the unsaved choice when saving fails", async () => {
    api.get.mockResolvedValue(policy());
    api.put.mockRejectedValue(new PolicyApiError(500, "boom", false));
    render(<B2bPoliciesSection token="t" />);
    fireEvent.click(await toggle());
    fireEvent.click(save());
    await screen.findByRole("alert");
    expect((await toggle()).getAttribute("aria-checked")).toBe("true");
  });
  it("handles 503 MIGRATION_PENDING on save as 'not available yet'", async () => {
    api.get.mockResolvedValue(policy());
    api.put.mockRejectedValue(new PolicyApiError(503, "x", true));
    render(<B2bPoliciesSection token="t" />);
    fireEvent.click(await toggle());
    fireEvent.click(save());
    await screen.findByText(/isn't available yet/);
    await waitFor(() => expect(save()).toBeTruthy());
  });
  it("shows a load error with retry", async () => {
    api.get.mockRejectedValueOnce(new PolicyApiError(500, "x", false)).mockResolvedValue(policy());
    render(<B2bPoliciesSection token="t" />);
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await toggle();
  });
  it("is translated in every locale", () => {
    const keys = Object.keys(en).filter((k) => k.startsWith("adminSettings."));
    expect(keys.length).toBeGreaterThan(8);
    for (const d of [fr, es, hu, ro] as Record<string, string>[]) for (const k of keys) expect(d[k], k).toBeTruthy();
  });
});
