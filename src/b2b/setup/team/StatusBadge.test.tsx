import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, f: string) => f, locale: "en" }) }));
afterEach(cleanup);

describe("StatusBadge", () => {
  it("always shows the planning-only note as visible text", () => {
    render(<StatusBadge badge="planning" />);
    expect(screen.getByText("Planning only")).toBeTruthy();
    expect(screen.getByText("No app login. Scheduled by the office.")).toBeTruthy();
  });
  it("shows how long ago an invitation was sent", () => {
    const sent = new Date(Date.now() - 3 * 86_400_000).toISOString();
    render(<StatusBadge badge="invited" invitedAt={sent} />);
    expect(screen.getByText("Invitation sent 3 days ago")).toBeTruthy();
  });
});
