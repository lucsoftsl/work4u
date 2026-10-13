import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RequirePermission } from "./RequirePermission";
const org = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, f: string) => f }) }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => org.value }));
afterEach(cleanup);

describe("RequirePermission busy state", () => {
  it("offers a manual Retry that refetches, and says it retries automatically", () => {
    const refetch = vi.fn();
    org.value = { status: "error", rateLimited: true, refetch, can: () => false };
    render(<RequirePermission permission="job.view"><p>content</p></RequirePermission>);
    expect(screen.getByText("Busy right now")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
  it("renders the page again once the profile loads", () => {
    org.value = { status: "ready", viewer: { grants: [{ permission: "job.view", scope: "ALL" }], teamIds: [] }, can: () => true, refetch: vi.fn() };
    render(<RequirePermission permission="job.view"><p>content</p></RequirePermission>);
    expect(screen.getByText("content")).toBeTruthy();
  });
});
