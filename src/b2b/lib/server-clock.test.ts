import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getServerOffsetMs, observeServerTime, resetServerClock, serverNow, serverNowIso } from "./server-clock";

const REAL = Date.parse("2026-10-13T10:00:00Z");
beforeEach(() => { resetServerClock(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); resetServerClock(); });

describe("server clock", () => {
  it("uses the device clock until the server has been heard from", () => {
    vi.setSystemTime(REAL);
    expect(serverNow()).toBe(REAL);
    expect(getServerOffsetMs()).toBe(0);
  });
  it("corrects a device clock that is 2 h ahead", () => {
    vi.setSystemTime(REAL + 2 * 3600_000);
    const now = Date.now();
    observeServerTime(new Date(REAL).toISOString(), now, now); // zero latency
    expect(serverNow()).toBe(REAL);
    vi.advanceTimersByTime(60_000);
    expect(serverNow()).toBe(REAL + 60_000);
    expect(serverNowIso()).toBe(new Date(REAL + 60_000).toISOString());
  });
  it("assumes the server stamped the response mid-flight (latency adjusted)", () => {
    vi.setSystemTime(REAL);
    observeServerTime(new Date(REAL + 500).toISOString(), REAL, REAL + 1000);
    expect(getServerOffsetMs()).toBe(0); // server at +500 ms is exactly the midpoint of a 1 s round trip
  });
  it("ignores garbage and absurdly slow responses, and survives a reload via storage", () => {
    vi.setSystemTime(REAL + 3600_000);
    observeServerTime("nope", Date.now());
    observeServerTime(new Date(REAL).toISOString(), Date.now() - 120_000, Date.now());
    expect(getServerOffsetMs()).toBe(0);
    observeServerTime(new Date(REAL).toISOString(), Date.now(), Date.now());
    expect(localStorage.getItem("work4u.b2b.serverOffsetMs")).toBe(String(-3600_000));
  });
});
