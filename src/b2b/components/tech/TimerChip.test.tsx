import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { WorkTime } from "@/b2b/api/types";
import { observeServerTime, resetServerClock } from "@/b2b/lib/server-clock";
import { PausedChip } from "./PausedChip";
import { TimerChip } from "./TimerChip";
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, f: string) => f }) }));
afterEach(() => { cleanup(); vi.useRealTimers(); resetServerClock(); });

const T0 = Date.parse("2026-10-13T10:00:00Z");
const time = (over: Partial<WorkTime> = {}): WorkTime => ({ state: "RUNNING", workedSeconds: 4325, pausedSeconds: 0, correctionSeconds: 0, runningSince: new Date(T0).toISOString(), pausedSince: null, pauseReason: null, pauseNote: null, workStartedAt: null, workEndedAt: null, serverTime: new Date(T0).toISOString(), ...over });

describe("TimerChip", () => {
  it("renders nothing before the job is started", () => {
    const { container } = render(<TimerChip time={time({ state: "NOT_STARTED" })} />);
    expect(container.firstChild).toBeNull();
  });
  it("derives the time from timestamps and ticks without announcing seconds", () => {
    vi.useFakeTimers({ now: T0 });
    render(<TimerChip time={time()} />);
    expect(screen.getByText("1:12:05")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText("1:12:08")).toBeTruthy();
    expect(screen.getByRole("timer").getAttribute("aria-live")).toBe("off");
    expect(screen.getByRole("status").textContent).toBe(""); // no announcement without a state change
  });
  it("announces a pause once, politely, in words", () => {
    vi.useFakeTimers({ now: T0 });
    const { rerender } = render(<TimerChip time={time()} />);
    rerender(<TimerChip time={time({ state: "PAUSED", pauseReason: "BREAK" })} />);
    expect(screen.getByRole("status").textContent).toBe("Timer paused at 1 hour 12 minutes");
    expect(screen.getByText("Paused")).toBeTruthy();
  });
  it("freezes while paused and shows the offline marker", () => {
    vi.useFakeTimers({ now: T0 });
    render(<TimerChip time={time({ state: "PAUSED" })} offline />);
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByText("1:12:05")).toBeTruthy();
    expect(screen.getByText("Saved on device")).toBeTruthy();
  });
  it("flags time over the estimate with text", () => {
    vi.useFakeTimers({ now: T0 });
    render(<TimerChip time={time()} estimateMin={60} />);
    expect(screen.getByText("+13 min over estimate")).toBeTruthy();
  });
});

describe("PausedChip", () => {
  it("shows reason and paused duration only while paused", () => {
    vi.useFakeTimers({ now: T0 + 60_000 });
    const { rerender, container } = render(<PausedChip time={time({ state: "PAUSED", pauseReason: "CUSTOMER_AWAY", pausedSeconds: 120 })} />);
    expect(screen.getByText("Paused · Customer away · 0:03:00")).toBeTruthy();
    rerender(<PausedChip time={time()} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("TimerChip with a wrong device clock", () => {
  it("does not jump when the device clock is 2 h ahead (uses the learned server offset)", () => {
    const skew = 2 * 3600_000;
    vi.useFakeTimers({ now: T0 + 184_000 + skew }); // device says T0+184s+2h
    observeServerTime(new Date(T0 + 184_000).toISOString(), Date.now(), Date.now()); // an API response told us the real time
    render(<TimerChip time={time({ workedSeconds: 0 })} />);
    expect(screen.getByText("0:03:04")).toBeTruthy(); // 184 s, not 7384 s
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText("0:03:09")).toBeTruthy();
  });
  it("does not go negative or stall when the device clock is behind", () => {
    vi.useFakeTimers({ now: T0 - 3600_000 });
    observeServerTime(new Date(T0).toISOString(), Date.now(), Date.now());
    render(<TimerChip time={time({ workedSeconds: 10 })} />);
    expect(screen.getByText("0:00:10")).toBeTruthy();
  });
});
