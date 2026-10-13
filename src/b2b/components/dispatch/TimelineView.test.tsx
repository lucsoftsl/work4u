import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TimelineView } from "./TimelineView";
import type { DispatchBoard, Job } from "@/b2b/api/types";
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, f: string) => f }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
vi.mock("./BoardView", () => ({ LaneHeader: ({ name }: { name: string }) => <span>{name}</span>, UnassignedColumn: () => null }));
vi.mock("./JobCard", () => ({ timeWindow: () => "09:00–11:00" }));
afterEach(cleanup);
const job = (id: string, start: string, end: string, status: Job["status"]) => ({ id, reference: `JOB-${id}`, title: `Job ${id}`, status, scheduledStart: start, scheduledEnd: end }) as Job;
const board = { teams: [{ id: "t", name: "Team A", status: "AVAILABLE", capacity: undefined, jobs: [
  job("1", "2026-10-12T09:00:00Z", "2026-10-12T11:00:00Z", "BLOCKED"),
  job("2", "2026-10-12T10:00:00Z", "2026-10-12T12:00:00Z", "IN_PROGRESS"),
] }], individuals: [], unassigned: [] } as unknown as DispatchBoard;
const props = { board, orgId: "o", timezone: "UTC", canAssign: false };

describe("TimelineView", () => {
  it("shows a visible status label with an icon on each block", () => {
    render(<TimelineView {...props} />);
    expect(screen.getByText("Blocked")).toBeTruthy();
    expect(screen.getByText("In progress")).toBeTruthy();
  });
  it("stacks overlapping jobs on different tracks", () => {
    render(<TimelineView {...props} />);
    const tops = screen.getAllByRole("link").map((a) => (a as HTMLElement).style.top);
    expect(new Set(tops).size).toBe(2);
  });
  it("draws the now line only on today's date and inside the window", () => {
    const now = Date.parse("2026-10-12T13:00:00Z");
    const { rerender } = render(<TimelineView {...props} date="2026-10-12" nowMs={now} />);
    expect(screen.getByTestId("now-line")).toBeTruthy();
    rerender(<TimelineView {...props} date="2026-10-13" nowMs={now} />);
    expect(screen.queryByTestId("now-line")).toBeNull();
  });
});
