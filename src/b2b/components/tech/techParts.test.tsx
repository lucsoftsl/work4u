import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ActionDock } from "./ActionDock";
import { SignatureFallbackNotice } from "./SignatureFallbackNotice";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import es from "@/locales/es.json";
import hu from "@/locales/hu.json";
import ro from "@/locales/ro.json";
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, f: string) => f }) }));
afterEach(cleanup);

describe("ActionDock", () => {
  it("is sticky above the 56px tab bar with safe-area padding, keeping its button", () => {
    render(<ActionDock><button type="button">Complete job</button></ActionDock>);
    const dock = screen.getByTestId("action-dock");
    expect(dock.className).toContain("sticky");
    expect(dock.className).toContain("env(safe-area-inset-bottom)");
    expect(dock.querySelector("button")?.textContent).toBe("Complete job");
  });
});
describe("SignatureFallbackNotice", () => {
  it("states that only the name is recorded, not a drawn signature, in every locale", () => {
    render(<SignatureFallbackNotice />);
    expect(screen.getByRole("status").textContent).toMatch(/Only the customer's name will be recorded, not a drawn signature/);
    const key = "b2b.tech.job.padFallback";
    for (const d of [en, fr, es, hu, ro] as Record<string, string>[]) expect(d[key]).toBeTruthy();
    expect((fr as Record<string, string>)[key]).not.toBe((en as Record<string, string>)[key]);
  });
});
