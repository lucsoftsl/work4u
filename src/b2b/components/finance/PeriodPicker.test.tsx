import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PeriodPicker } from "./PeriodPicker";
import { shouldRetry } from "./useFinanceQueries";
import { B2bError } from "@/b2b/api/client";

vi.mock("@/lib/i18n", async () => (await import("./finance.testkit")).i18nMock);
afterEach(cleanup);
const TODAY = "2026-10-19";

describe("PeriodPicker", () => {
  it("is a radiogroup that selects the preset matching the range", () => {
    render(<PeriodPicker from="2026-10-01" to="2026-12-31" today={TODAY} onChange={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: "Period" })).toBeTruthy();
    expect((screen.getByRole("radio", { name: "Quarter" }) as HTMLInputElement).checked).toBe(true);
  });
  it("scrolls inside its own container instead of wrapping", () => {
    render(<PeriodPicker from="2026-10-01" to="2026-10-31" today={TODAY} onChange={() => {}} />);
    expect(screen.getByRole("radiogroup").className).toContain("overflow-x-auto");
    expect(screen.getByText("This month").className).toContain("whitespace-nowrap");
  });
  it("reports a preset with its range", () => {
    const onChange = vi.fn();
    render(<PeriodPicker from="2026-10-01" to="2026-10-31" today={TODAY} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Last month" }));
    expect(onChange).toHaveBeenCalledWith({ from: "2026-09-01", to: "2026-09-30" });
  });
  it("shows a message for an unfinished custom date and sends nothing", () => {
    const onChange = vi.fn();
    render(<PeriodPicker from="2026-09-03" to="2026-09-10" today={TODAY} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "" } });
    expect(screen.getByRole("alert").textContent).toBe("Enter both dates.");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("shouldRetry", () => {
  it("does not retry a 4xx, retries other failures twice", () => {
    expect(shouldRetry(0, new B2bError(403, "FORBIDDEN", "no"))).toBe(false);
    expect(shouldRetry(0, new B2bError(500, "UNKNOWN", "boom"))).toBe(true);
    expect(shouldRetry(2, new Error("network"))).toBe(false);
  });
});
