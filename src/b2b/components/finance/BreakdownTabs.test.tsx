import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { BreakdownTabs } from "./BreakdownTabs";
import { breakdownItem } from "./finance.testkit";
import type { BreakdownSort, SortDir } from "@/b2b/lib/finance";
import type { FinanceBy } from "@/b2b/api/finance";
import type { BreakdownItem, Figures } from "@/b2b/api/finance";

vi.mock("@/lib/i18n", async () => (await import("./finance.testkit")).i18nMock);
afterEach(cleanup);

interface Over { totals?: Figures; total?: number; hasMore?: boolean; onLoadMore?: () => void; by?: FinanceBy; items?: BreakdownItem[]; sort?: BreakdownSort; dir?: SortDir; status?: "pending" | "error" | "success" }
function mount(o: Over = {}) {
  const onBy = vi.fn();
  const onSort = vi.fn();
  const onRetry = vi.fn();
  const by = o.by ?? "client";
  const sort = o.sort ?? (by === "technician" ? "name" : "revenue");
  const dir = o.dir ?? (by === "technician" ? "asc" : "desc");
  const items = o.items ?? [breakdownItem("a", "Alpha", 100), breakdownItem("b", "Beta", 300), breakdownItem("c", "Gamma", 200)];
  render(<BreakdownTabs by={by} items={items} status={o.status ?? "success"} totals={o.totals} total={o.total} hasMore={o.hasMore} onLoadMore={o.onLoadMore} sort={sort} dir={dir} onBy={onBy} onSort={onSort} onRetry={onRetry} />);
  return { onBy, onSort, onRetry };
}
const names = () => within(screen.getByRole("table")).getAllByRole("rowheader").map((r) => r.textContent);

describe("BreakdownTabs", () => {
  it("is a tablist with roving tabindex, aria-controls and a labelled panel", () => {
    mount();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["By client", "By team", "By job type", "By technician"]);
    expect(tabs.map((t) => t.getAttribute("tabindex"))).toEqual(["0", "-1", "-1", "-1"]);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    const panel = screen.getByRole("tabpanel");
    expect(tabs[0].getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(tabs[0].id);
  });
  it("moves with arrow keys, Home and End", () => {
    const { onBy } = mount();
    const [client, , , technician] = screen.getAllByRole("tab");
    fireEvent.keyDown(client, { key: "ArrowRight" });
    expect(onBy).toHaveBeenLastCalledWith("team");
    fireEvent.keyDown(client, { key: "ArrowLeft" });
    expect(onBy).toHaveBeenLastCalledWith("technician");
    fireEvent.keyDown(client, { key: "End" });
    expect(onBy).toHaveBeenLastCalledWith("technician");
    fireEvent.keyDown(technician, { key: "Home" });
    expect(onBy).toHaveBeenLastCalledWith("client");
    expect(document.activeElement).toBe(client);
  });
  it("sorts with the given order and marks the sorted column", () => {
    mount();
    expect(names()).toEqual(["Beta", "Gamma", "Alpha"]);
    expect(screen.getByRole("columnheader", { name: /Revenue/ }).getAttribute("aria-sort")).toBe("descending");
    expect(screen.getByRole("columnheader", { name: /^Name/ }).getAttribute("aria-sort")).toBeNull();
  });
  it("reports header clicks", () => {
    const { onSort } = mount();
    fireEvent.click(screen.getByRole("button", { name: /Cost/ }));
    expect(onSort).toHaveBeenCalledWith("cost");
  });
  it("labels empty keys per tab", () => {
    mount({ items: [breakdownItem(null, null, 1)] });
    expect(screen.getByText("No client")).toBeTruthy();
    cleanup();
    mount({ by: "jobType", items: [breakdownItem(null, null, 1)] });
    expect(screen.getByText("No job type")).toBeTruthy();
    cleanup();
    mount({ by: "team", items: [breakdownItem(null, null, 1)] });
    expect(screen.getByText("No team")).toBeTruthy();
  });
  it("technician tab: Unassigned for a null key, Team member for a null name, no bars, no ranking, split note", () => {
    mount({ by: "technician", items: [breakdownItem("m2", null, 500), breakdownItem(null, null, 900), breakdownItem("m1", "Ana", 100)] });
    expect(names()).toEqual(["Ana", "Team member", "Unassigned"]);
    expect(document.querySelectorAll("[data-bar]").length).toBe(0);
    expect(screen.getByRole("columnheader", { name: /^Name/ }).getAttribute("aria-sort")).toBe("ascending");
    expect(screen.getByText("Team and technician figures split a job's amounts equally between the people assigned.")).toBeTruthy();
    expect(screen.queryByText(/top/i)).toBeNull();
  });
  it("client tab has decorative bars and no split note", () => {
    mount();
    const bars = document.querySelectorAll("[data-bar]");
    expect(bars.length).toBe(3);
    expect(bars[0].getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByText(/split a job's amounts/)).toBeNull();
  });
  it("team tab shows the split note", () => {
    mount({ by: "team" });
    expect(screen.getByText(/split a job's amounts equally/)).toBeTruthy();
  });
  it("shows the real totals row from the API, not a sum of the rows on screen", () => {
    mount({ totals: { jobs: 99, revenue: 123456, cost: 60000, margin: 63456, marginPct: 51.4 } });
    const foot = screen.getByRole("table").querySelector("tfoot")!;
    expect(foot.textContent).toContain("Total");
    expect(foot.textContent).toContain("99");
    expect(foot.textContent).toContain("1,234.56");
    expect(foot.textContent).toContain("51.4%");
  });
  it("shows no footer and no Load more when everything is on screen", () => {
    mount({ total: 3 });
    expect(screen.queryByText(/Showing/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });
  it("when the API cut the list: 'Showing n of total' + Load more (technicians too), and says sorting covers the rows shown", () => {
    for (const by of ["client", "technician"] as const) {
      const onLoadMore = vi.fn();
      mount({ by, total: 730, hasMore: true, onLoadMore });
      expect(screen.getByText("Showing 3 of 730")).toBeTruthy();
      expect(screen.getByText(/Sorting applies to the rows shown/)).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Load more" }));
      expect(onLoadMore).toHaveBeenCalledTimes(1);
      cleanup();
    }
  });
  it("truncated but nothing more to load (last page): footer without Load more", () => {
    mount({ total: 730, hasMore: false });
    expect(screen.getByText("Showing 3 of 730")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });
  it("puts the table in a labelled focusable region and shows a dash for a blank margin", () => {
    mount({ items: [breakdownItem("a", "Alpha", 100, { margin: null, marginPct: null })] });
    const region = screen.getByRole("region", { name: "Table: Breakdown by client" });
    expect(region.getAttribute("tabindex")).toBe("0");
    expect(within(region).getByRole("table")).toBeTruthy();
    expect(region.textContent).toContain("not available");
  });
  it("offers a retry on error", () => {
    const { onRetry } = mount({ status: "error", items: [] });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });
  it("scrolls sideways inside itself with a visible hint on phones, and the tab row wraps instead of hiding tabs", () => {
    mount();
    expect(screen.getByText("Scroll sideways to see all columns →")).toBeTruthy();
    const region = screen.getByRole("region", { name: "Table: Breakdown by client" });
    expect(region.className).toContain("overflow-x-auto");
    expect(region.className).toContain("background-attachment"); // scroll shadows
    expect(screen.getByRole("tablist").className).toContain("flex-wrap");
    expect(screen.getByRole("tablist").className).not.toContain("overflow-x-auto");
  });
});
