import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { Job } from "@/b2b/api/types";
import { JobCard } from "./JobCard";
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, f: string) => f }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
afterEach(cleanup);
const T0 = "2026-10-13T08:00:00Z";
const time = (state: string) => ({ state, workedSeconds: 60, pausedSeconds: 0, correctionSeconds: 0, runningSince: null, pausedSince: T0, pauseReason: "CUSTOMER_AWAY", pauseNote: null, workStartedAt: T0, workEndedAt: null, serverTime: T0 });
const job = (extra: Record<string, unknown>) => ({ id: "j", reference: "JOB-1", title: "AC", status: "IN_PROGRESS", ...extra }) as unknown as Job;
const props = { orgId: "o", timezone: "UTC", draggable: false };

describe("dispatch board card: paused chip (board items carry the same `time` summary as me/jobs)", () => {
  it("shows the reason when the card's job is paused", () => {
    render(<JobCard job={job({ time: time("PAUSED") })} {...props} />);
    expect(screen.getByText(/Paused · Customer away/)).toBeTruthy();
  });
  it("shows nothing for running jobs, jobs without a clock, or an older API without `time`", () => {
    const { rerender } = render(<JobCard job={job({ time: time("RUNNING") })} {...props} />);
    expect(screen.queryByText(/Paused ·/)).toBeNull();
    rerender(<JobCard job={job({ time: null })} {...props} />);
    expect(screen.queryByText(/Paused ·/)).toBeNull();
    rerender(<JobCard job={job({})} {...props} />);
    expect(screen.queryByText(/Paused ·/)).toBeNull();
  });
});
