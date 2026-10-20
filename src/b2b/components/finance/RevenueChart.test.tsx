import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RevenueChart } from "./RevenueChart";
import { summaryFixture } from "./finance.testkit";

vi.mock("@/lib/i18n", async () => (await import("./finance.testkit")).i18nMock);
afterEach(cleanup);

describe("RevenueChart", () => {
  it("is an image with a title and a description that point to the table", () => {
    render(<RevenueChart summary={summaryFixture()} today="2026-10-19" />);
    const img = screen.getByRole("img", { name: "Revenue and cost by day" });
    expect(img.querySelector("title")?.textContent).toBe("Revenue and cost by day");
    expect(img.querySelector("desc")?.textContent).toBe("Earned revenue bars for 1 Oct to 31 Oct, expected pipeline bars after today, and a cost line. A table with the same numbers follows.");
    expect(screen.getByText(/Solid bars are work already done/)).toBeTruthy();
  });
  it("uses a hatched pattern for expected work and a legend above the chart with the same marks", () => {
    const { container } = render(<RevenueChart summary={summaryFixture()} today="2026-10-19" />);
    expect(container.querySelector("pattern")).not.toBeNull();
    const rect = container.querySelector("rect[data-kind='expected']");
    expect(rect?.getAttribute("stroke-dasharray")).toBeTruthy();
    expect(rect?.getAttribute("fill")).toMatch(/^url\(#/);
    const legend = screen.getByRole("list", { name: "Legend" });
    expect(legend.textContent).toContain("Earned revenue");
    expect(legend.textContent).toContain("Expected (pipeline)");
    expect(legend.textContent).toContain("Cost");
    expect(legend.compareDocumentPosition(container.querySelector("svg")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("draws solid earned bars, square cost markers and per-bar tooltips; nothing is focusable", () => {
    const { container } = render(<RevenueChart summary={summaryFixture()} today="2026-10-19" />);
    const earned = container.querySelector("rect[data-kind='earned']");
    expect(earned?.getAttribute("fill")).toBe("#005A8C");
    expect(earned?.querySelector("title")?.textContent).toContain("1,000.00");
    expect(container.querySelector("rect[data-kind='cost-marker']")?.getAttribute("stroke")).toBe("#A33F00");
    expect(container.querySelectorAll("[tabindex]").length).toBe(0);
  });
  it("leaves empty buckets as gaps", () => {
    const { container } = render(<RevenueChart summary={summaryFixture()} today="2026-10-19" />);
    expect(container.querySelectorAll("rect[data-kind='earned']").length).toBe(1);
    expect(container.querySelectorAll("rect[data-kind='cost-marker']").length).toBe(1);
  });
  it("marks today only when it falls inside the range", () => {
    const inside = render(<RevenueChart summary={summaryFixture()} today="2026-10-19" />);
    expect(inside.container.querySelector("[data-today]")).not.toBeNull();
    expect(screen.getByText("Today")).toBeTruthy();
    cleanup();
    const outside = render(<RevenueChart summary={summaryFixture()} today="2026-12-01" />);
    expect(outside.container.querySelector("[data-today]")).toBeNull();
    expect(screen.queryByText("Today")).toBeNull();
  });
  it("is responsive: no fixed pixel width", () => {
    const { container } = render(<RevenueChart summary={summaryFixture()} today="2026-10-19" />);
    const svg = container.querySelector("svg[role='img']")!;
    expect(svg.getAttribute("width")).toBe("100%");
    expect(svg.getAttribute("viewBox")).toMatch(/^0 0 \d+ \d+$/);
  });
});
