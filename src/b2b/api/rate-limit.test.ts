import { describe, expect, it } from "vitest";
import { toB2bError } from "./client";
import { queryRetryDelay, shouldRetry } from "@/b2b/query/QueryProvider";
import { unreadRefetchInterval } from "@/b2b/lib/notifications";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import es from "@/locales/es.json";
import hu from "@/locales/hu.json";
import ro from "@/locales/ro.json";

describe("429 handling", () => {
  it("B2bError keeps Retry-After as milliseconds", async () => {
    const err = await toB2bError(new Response("{}", { status: 429, headers: { "Retry-After": "6" } }));
    expect(err).toMatchObject({ status: 429, code: "RATE_LIMITED", retryAfterMs: 6000 });
    expect(err.isRateLimited).toBe(true);
  });
  it("queries retry 429 automatically (bounded) after the server's delay, other 4xx never", async () => {
    const limited = await toB2bError(new Response("{}", { status: 429, headers: { "Retry-After": "4" } }));
    expect(shouldRetry(0, limited)).toBe(true);
    expect(shouldRetry(3, limited)).toBe(false);
    expect(queryRetryDelay(0, limited)).toBe(4000);
    expect(shouldRetry(0, await toB2bError(new Response("{}", { status: 403 })))).toBe(false);
  });
  it("has a distinct rate-limited message in every locale", () => {
    for (const d of [en, fr, es, hu, ro] as Record<string, string>[]) {
      expect(d["auth.connection.rateLimited"]).toBeTruthy();
      expect(d["auth.connection.rateLimited"]).not.toBe(d["auth.connection.retrying"]);
    }
    for (const d of [fr, es, hu, ro] as Record<string, string>[]) expect(d["auth.connection.rateLimited"]).not.toBe((en as Record<string, string>)["auth.connection.rateLimited"]);
  });
});

describe("unread-count polling", () => {
  it("stops while hidden or offline, relaxes when the realtime stream is live", () => {
    expect(unreadRefetchInterval({ live: "polling", hidden: true, online: true })).toBe(false);
    expect(unreadRefetchInterval({ live: "polling", hidden: false, online: false })).toBe(false);
    expect(unreadRefetchInterval({ live: "live", hidden: false, online: true })).toBeGreaterThanOrEqual(300_000);
    expect(unreadRefetchInterval({ live: "polling", hidden: false, online: true })).toBeGreaterThanOrEqual(120_000);
  });
});

describe("503 SERVICE_BUSY is handled like 429", () => {
  const busy = () => toB2bError(new Response(JSON.stringify({ code: "SERVICE_BUSY", error: "The service is busy, please retry shortly", retryAfterSeconds: 2 }), { status: 503, headers: { "Retry-After": "2" } }));
  it("keeps the stable code and Retry-After, and counts as busy", async () => {
    const err = await busy();
    expect(err).toMatchObject({ status: 503, code: "SERVICE_BUSY", retryAfterMs: 2000 });
    expect(err.isRateLimited).toBe(true);
  });
  it("falls back to the body's retryAfterSeconds when the header is missing", async () => {
    const err = await toB2bError(new Response(JSON.stringify({ code: "SERVICE_BUSY", retryAfterSeconds: 3 }), { status: 503 }));
    expect(err.retryAfterMs).toBe(3000);
  });
  it("a plain 503 (no code) is still not 'busy'", async () => {
    expect((await toB2bError(new Response("{}", { status: 503 }))).isRateLimited).toBe(false);
  });
  it("queries retry busy responses after Retry-After", async () => {
    const err = await busy();
    expect(shouldRetry(2, err)).toBe(true);
    expect(queryRetryDelay(0, err)).toBe(2000);
  });
});
