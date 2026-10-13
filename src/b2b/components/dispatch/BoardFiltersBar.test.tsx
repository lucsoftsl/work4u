import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BoardFiltersBar } from "./BoardFiltersBar";
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }) }));
afterEach(cleanup);
describe("dispatch filters", () => {
  it("keeps the skill while toggling priority and clears both", () => {
    const onChange = vi.fn();
    render(<BoardFiltersBar filters={{ priority: ["HIGH"], skill: "s1" }} skills={[{ id: "s1", name: "Plumbing" }]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Urgent" }));
    expect(onChange).toHaveBeenLastCalledWith({ priority: ["HIGH", "URGENT"], skill: "s1" });
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onChange).toHaveBeenLastCalledWith({ priority: [] });
  });
});
