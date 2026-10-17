import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);
import { ClientTabs } from "./ClientTabs";

vi.mock("@/b2b/setup/i18n", () => ({ useTr: () => ({ tr: (_k: string, f: string) => f }) }));

describe("ClientTabs", () => {
  const enabled = ["overview", "addresses", "jobs", "notes"] as const;
  it("is a tablist with counts, a disabled Files tab, and arrow-key navigation", () => {
    const onChange = vi.fn();
    render(<ClientTabs active="overview" onChange={onChange} counts={{ addresses: 2, jobs: 14 }} enabled={enabled} />);
    expect(screen.getByRole("tablist")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Addresses (2)" })).toBeTruthy();
    expect((screen.getByRole("tab", { name: /Files/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("addresses");
  });
});
