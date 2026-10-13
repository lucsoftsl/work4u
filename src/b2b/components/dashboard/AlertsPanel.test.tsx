import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AlertsPanel } from "./AlertsPanel";
import type { DashboardAlert } from "@/b2b/lib/dashboard";
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, f: string) => f }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
afterEach(cleanup);
const alert = (id: string, severity: DashboardAlert["severity"]): DashboardAlert => ({ id, severity, kind: "blocked", at: 0, job: { id, reference: `JOB-${id}`, title: "T", status: "BLOCKED", statusReason: "x" } } as unknown as DashboardAlert);

describe("AlertsPanel severity treatment", () => {
  it("renders Critical solid (white on vermilion) with icon + text, and Warning as a tint", () => {
    render(<AlertsPanel orgId="o" tz="UTC" canDispatch alerts={[alert("1", "critical"), alert("2", "warning")]} />);
    const critical = screen.getByText("Critical").closest("span")!;
    const warning = screen.getByText("Warning").closest("span")!;
    expect(critical.className).toContain("bg-sig-vermilion-ink");
    expect(critical.className).toContain("text-white");
    expect(critical.querySelector("svg")).toBeTruthy();
    expect(warning.className).toContain("bg-sig-orange-tint");
  });
});
