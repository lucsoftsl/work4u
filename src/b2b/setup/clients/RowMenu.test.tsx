import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RowMenu } from "./RowMenu";

vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: "en", t: (_k: string, f?: string) => f ?? _k }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
afterEach(cleanup);

describe("clients RowMenu", () => {
  it("focuses the Actions trigger before Edit runs, so the edit dialog returns focus to it", () => {
    let focusedAtAction: Element | null = null;
    render(<RowMenu name="Hotel Marina" archived={false} canManage canCreateJob jobHref="/ops/o1/jobs/new" offline={false} onEdit={() => { focusedAtAction = document.activeElement; }} onToggleArchive={vi.fn()} />);
    const trigger = screen.getAllByRole("button")[0];
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(focusedAtAction).toBe(trigger);
    expect(document.activeElement).toBe(trigger);
  });
});
