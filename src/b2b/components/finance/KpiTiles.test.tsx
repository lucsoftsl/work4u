import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { KpiTiles } from "./KpiTiles";
import { summaryFixture } from "./finance.testkit";

vi.mock("@/lib/i18n", async () => (await import("./finance.testkit")).i18nMock);
afterEach(cleanup);

describe("KpiTiles", () => {
  it("is a list of six tiles in reading order with label, value and note", () => {
    render(<KpiTiles summary={summaryFixture()} />);
    const items = within(screen.getByRole("list", { name: "Key figures" })).getAllByRole("listitem");
    expect(items.map((li) => li.querySelector("p")?.textContent)).toEqual(["Earned revenue", "Cost", "Margin", "Margin %", "Jobs completed", "Pipeline (expected)"]);
    expect(items[0].textContent).toContain("41 jobs completed");
    expect(items[5].textContent).toContain("23 jobs scheduled or in progress");
  });
  it("uses the singular for one job and flags missing costs in the cost note", () => {
    const base = summaryFixture();
    render(<KpiTiles summary={{ ...base, earned: { ...base.earned, jobs: 1, jobsWithoutCost: 1 } }} />);
    expect(screen.getByText("1 job completed")).toBeTruthy();
    expect(screen.getByText("Without a cost: 1")).toBeTruthy();
  });
  it("gives the pipeline tile a dashed outline", () => {
    render(<KpiTiles summary={summaryFixture()} />);
    expect(screen.getByText("Pipeline (expected)").closest("li")?.className).toContain("border-dashed");
  });
  it("shows a dash, not a zero, when no completed job has a price or a cost", () => {
    const base = summaryFixture();
    render(<KpiTiles summary={{ ...base, earned: { ...base.earned, jobs: 4, revenue: 0, cost: 0, margin: null, marginPct: null, jobsWithoutPrice: 4, jobsWithoutCost: 4 } }} />);
    const items = within(screen.getByRole("list", { name: "Key figures" })).getAllByRole("listitem");
    for (const i of [0, 1, 2, 3]) {
      expect(items[i].textContent).not.toMatch(/0[.,]00/);
      expect(items[i].textContent).toContain("not available");
    }
  });
  it("still shows a real zero when jobs have prices and the cost is genuinely zero", () => {
    const base = summaryFixture();
    render(<KpiTiles summary={{ ...base, earned: { ...base.earned, jobs: 2, revenue: 50000, cost: 0, margin: 50000, marginPct: 100, jobsWithoutPrice: 0, jobsWithoutCost: 0 } }} />);
    const items = within(screen.getByRole("list", { name: "Key figures" })).getAllByRole("listitem");
    expect(items[1].textContent).toMatch(/0[.,]00/);
  });
});
