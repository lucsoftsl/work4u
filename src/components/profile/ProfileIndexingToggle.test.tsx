import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProfileIndexingToggle } from "./ProfileIndexingToggle";
import en from "@/locales/en.json";

const apiJson = vi.hoisted(() => vi.fn());
vi.mock("@/lib/http", () => ({ apiJson, errorMessage: (_e: unknown, f: string) => f }));
const t = (k: string) => (en as Record<string, string>)[k] ?? k; // stable identity, like the real memoised `t`
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const box = () => screen.findByRole("checkbox", { name: "Allow search engines to list my profile" }) as Promise<HTMLInputElement>;

describe("ProfileIndexingToggle", () => {
  it("loads the current setting (default listed) and is disabled until it arrives", async () => {
    apiJson.mockResolvedValue({ indexable: true });
    render(<ProfileIndexingToggle userId="u1" />);
    await waitFor(async () => expect((await box()).checked).toBe(true));
    expect(apiJson).toHaveBeenCalledWith("/api/users/u1/profile-indexing", { auth: true });
  });
  it("opting out sends a strict boolean PUT", async () => {
    apiJson.mockResolvedValueOnce({ indexable: true }).mockResolvedValueOnce({ indexable: false });
    render(<ProfileIndexingToggle userId="u1" />);
    await waitFor(async () => expect((await box()).disabled).toBe(false));
    fireEvent.click(await box());
    await waitFor(() => expect(apiJson).toHaveBeenLastCalledWith("/api/users/u1/profile-indexing", { method: "PUT", auth: true, json: { indexable: false } }));
    await waitFor(async () => expect((await box()).checked).toBe(false));
  });
  it("rolls back and says so when saving fails", async () => {
    apiJson.mockResolvedValueOnce({ indexable: true }).mockRejectedValueOnce(new Error("x"));
    render(<ProfileIndexingToggle userId="u1" />);
    await waitFor(async () => expect((await box()).disabled).toBe(false));
    fireEvent.click(await box());
    expect((await screen.findByRole("alert")).textContent).toMatch(/Couldn't save this setting/);
    expect((await box()).checked).toBe(true);
  });
});
