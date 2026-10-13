import { describe, expect, it } from "vitest";
import { ProfileUnavailableError, backoffDelay, isOutageError, isOutageStatus, stripCredentialParams } from "./auth-outage";

describe("stripCredentialParams", () => {
  it("removes email and password but keeps harmless params and the hash", () => {
    expect(stripCredentialParams("/signin?email=a%40b.c&password=hunter2&next=%2Fjobs#x")).toBe("/signin?next=%2Fjobs#x");
  });

  it("returns a bare path when only credentials were present", () => {
    expect(stripCredentialParams("/signup?email=a@b.c&password=x&confirmPassword=x")).toBe("/signup");
  });

  it("also removes token-style params (OAuth fragments, magic links) but keeps the rest", () => {
    expect(stripCredentialParams("/signin?access_token=abc&id_token=def&token=t&refresh_token=r&oobCode=o&next=%2Fjobs")).toBe("/signin?next=%2Fjobs");
    expect(stripCredentialParams("/signin?accessToken=a&apiKey=k")).toBe("/signin");
  });

  it("removes tokens from the URL fragment and keeps harmless fragments", () => {
    expect(stripCredentialParams("/signin#access_token=abc&state=x")).toBe("/signin#state=x");
    expect(stripCredentialParams("/signin#id_token=abc")).toBe("/signin");
    expect(stripCredentialParams("/signin#section")).toBeNull();
  });

  it("returns null when there is nothing to strip", () => {
    expect(stripCredentialParams("/signin?next=%2Fjobs")).toBeNull();
    expect(stripCredentialParams("/signin")).toBeNull();
  });
});

describe("outage classification", () => {
  it("treats network errors and 5xx as outages, 401/403/404 as a real answer", () => {
    expect(isOutageError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isOutageError(new ProfileUnavailableError())).toBe(true);
    expect(isOutageError(new Error("boom"))).toBe(false);
    expect(isOutageError(Object.assign(new Error("x"), { code: "auth/network-request-failed" }))).toBe(true);
    expect(isOutageError(Object.assign(new Error("x"), { code: "auth/invalid-credential" }))).toBe(false);
    expect([500, 502, 503, 504, 0, 429].every(isOutageStatus)).toBe(true);
    expect([200, 401, 403, 404].some(isOutageStatus)).toBe(false);
  });

  it("backs off 1s, 2s, 4s, 8s and then holds at 15s", () => {
    expect([0, 1, 2, 3, 4, 5, 50].map(backoffDelay)).toEqual([1000, 2000, 4000, 8000, 15000, 15000, 15000]);
  });
});

describe("rate limiting", () => {
  it("parses Retry-After seconds and dates, clamps, and falls back", async () => {
    const { parseRetryAfterMs } = await import("./auth-outage");
    expect(parseRetryAfterMs("7")).toBe(7000);
    expect(parseRetryAfterMs("0")).toBe(1000);
    expect(parseRetryAfterMs("9999")).toBe(120000);
    expect(parseRetryAfterMs(new Date(10_000).toUTCString(), 4_000)).toBe(6000);
    expect(parseRetryAfterMs(null)).toBeUndefined();
    expect(parseRetryAfterMs("soon")).toBeUndefined();
  });
  it("marks a 429 profile failure as rate limited, not unreachable", () => {
    const e = new ProfileUnavailableError(undefined, { rateLimited: true, retryAfterMs: 5000 });
    expect(isOutageError(e)).toBe(true);
    expect(e.rateLimited).toBe(true);
    expect(e.retryAfterMs).toBe(5000);
    expect(new ProfileUnavailableError().rateLimited).toBe(false);
  });
});

describe("busy responses", () => {
  it("treats 429 and 503+Retry-After / SERVICE_BUSY as busy, a bare 503 as unreachable", async () => {
    const { isBusyResponse } = await import("./auth-outage");
    expect(isBusyResponse(429, null, undefined)).toBe(true);
    expect(isBusyResponse(503, "2", undefined)).toBe(true);
    expect(isBusyResponse(503, null, "SERVICE_BUSY")).toBe(true);
    expect(isBusyResponse(503, null, undefined)).toBe(false);
    expect(isBusyResponse(500, "2", undefined)).toBe(false);
  });
});
