import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_FILTERS, parseJobFilters, PRESETS } from "@/b2b/lib/job-filters";
import { JobFiltersBar } from "./JobFiltersBar";

vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: "en", t: (_k: string, f?: string) => f ?? _k }) }));
afterEach(cleanup);

const show = (query: string, draftCount?: number) => {
  const onChange = vi.fn(); const onPreset = vi.fn();
  render(<JobFiltersBar filters={query ? parseJobFilters(query) : DEFAULT_FILTERS} draftCount={draftCount} onChange={onChange} onPreset={onPreset} onClear={vi.fn()} />);
  return { onChange, onPreset };
};

describe("Drafts tab", () => {
  it("is a view tab with my draft count; choosing it asks for drafts created by me", () => {
    const { onPreset } = show("", 3);
    const tab = screen.getByRole("button", { name: /Drafts/ });
    expect(tab.textContent).toContain("3");
    fireEvent.click(tab);
    expect(onPreset).toHaveBeenCalledWith(PRESETS.find((p) => p.key === "drafts")!.patch);
  });
  it("is pressed in the Drafts view, which swaps the status chips for 'Created by: Me / Anyone'", () => {
    const { onChange } = show("status=DRAFT&mine=true", 3);
    expect(screen.getByRole("button", { name: /Drafts/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText("Unassigned only")).toBeNull();
    expect(screen.queryByRole("group", { name: "Status" })).toBeNull();
    expect((screen.getByRole("radio", { name: "Me" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Anyone" }));
    expect(onChange).toHaveBeenCalledWith({ mine: false });
  });
  it("other views have no Created-by switch, and the status chips never include Draft", () => {
    show("");
    expect(screen.queryByRole("radio", { name: "Anyone" })).toBeNull();
    const chips = screen.getAllByRole("checkbox").map((c) => c.closest("label")?.textContent);
    expect(chips).toContain("New");
    expect(chips).not.toContain("Draft");
  });
});
