import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DashboardView } from "./DashboardView";
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, f: string) => f }) }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "o", live: "live", me: { org: { timezone: "UTC" } }, can: () => true }) }));
vi.mock("./useNow", () => ({ useNow: () => 0 }));
vi.mock("./useDashboardData", () => ({
  MAX_PAGES: 1, PAGE_LIMIT: 1,
  useDashboardData: () => ({ all: { data: { jobs: [{ id: "1" }], capped: false }, isError: false, isFetching: false, dataUpdatedAt: 0, refetch: vi.fn() }, unassigned: { data: { jobs: [] }, isFetching: false, dataUpdatedAt: 0, refetch: vi.fn() }, teams: { data: [{}], isPending: false, isError: false, refetch: vi.fn() }, totals: {} }),
}));
vi.mock("./BucketCards", () => ({ BucketCards: () => <section aria-label="buckets" /> }));
vi.mock("./AlertsPanel", () => ({ AlertsPanel: () => <section aria-label="alerts" /> }));
vi.mock("./TeamStrip", () => ({ TeamStrip: () => <section aria-label="teams" /> }));
vi.mock("./LiveIndicator", () => ({ LiveIndicator: () => null }));
vi.mock("@/b2b/setup/SetupChecklist", () => ({ SetupChecklist: () => null })); // own tests in b2b/setup
afterEach(cleanup);

describe("DashboardView hierarchy", () => {
  it("puts alerts (attention) before the bucket cards", () => {
    render(<DashboardView />);
    const alerts = screen.getByLabelText("alerts");
    const buckets = screen.getByLabelText("buckets");
    expect(alerts.compareDocumentPosition(buckets) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
