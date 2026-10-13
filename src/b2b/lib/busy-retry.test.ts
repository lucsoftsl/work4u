import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { B2bError } from "@/b2b/api/client";
import { busyRetryDelayMs, useBusyAutoRetry } from "./busy-retry";

const busy = (retryAfterMs?: number) => new B2bError(503, "SERVICE_BUSY", "busy", {}, retryAfterMs);
afterEach(() => vi.useRealTimers());

describe("busyRetryDelayMs", () => {
  it("backs off exponentially from 2 s up to 30 s, never below Retry-After", () => {
    expect([0, 1, 2, 3, 9].map((n) => busyRetryDelayMs(busy(), n))).toEqual([2000, 4000, 8000, 16000, 30000]);
    expect(busyRetryDelayMs(busy(20_000), 0)).toBe(20_000);
    expect(busyRetryDelayMs(busy(1_000), 2)).toBe(8000);
  });
});

describe("useBusyAutoRetry", () => {
  it("refetches after the delay while the error is a busy error, with growing backoff, and stops when it clears", () => {
    vi.useFakeTimers();
    const refetch = vi.fn();
    const { rerender } = renderHook(({ error }) => useBusyAutoRetry(error, refetch), { initialProps: { error: busy() as unknown } });
    vi.advanceTimersByTime(1999);
    expect(refetch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refetch).toHaveBeenCalledTimes(1);
    rerender({ error: busy() }); // still failing: next attempt waits 4 s
    vi.advanceTimersByTime(3999);
    expect(refetch).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(refetch).toHaveBeenCalledTimes(2);
    rerender({ error: null }); // recovered
    vi.advanceTimersByTime(60_000);
    expect(refetch).toHaveBeenCalledTimes(2);
  });
  it("does nothing for non-busy errors", () => {
    vi.useFakeTimers();
    const refetch = vi.fn();
    renderHook(() => useBusyAutoRetry(new B2bError(500, "UNKNOWN", "x"), refetch));
    vi.advanceTimersByTime(60_000);
    expect(refetch).not.toHaveBeenCalled();
  });
});
