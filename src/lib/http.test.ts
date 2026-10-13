import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  RATE_LIMIT_MESSAGE,
  apiFetch,
  apiJson,
  buildWsUrl,
  normalizeBaseUrl,
  setTokenProvider,
} from "./http";

const okJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function authHeaderOf(call: unknown[]): string | null {
  const init = call[1] as RequestInit;
  return new Headers(init.headers).get("Authorization");
}

afterEach(() => {
  setTokenProvider(null);
  vi.unstubAllGlobals();
});

describe("normalizeBaseUrl", () => {
  it("defaults to the local API and strips trailing slashes and a trailing /api", () => {
    expect(normalizeBaseUrl(undefined)).toBe("http://localhost:3001");
    expect(normalizeBaseUrl("https://api.work4u.app/")).toBe("https://api.work4u.app");
    expect(normalizeBaseUrl("https://api.work4u.app/api")).toBe("https://api.work4u.app");
  });
});

describe("buildWsUrl", () => {
  it("uses ws:// for http and wss:// for https bases", () => {
    expect(buildWsUrl("http://localhost:3001", "/api/messages/ws", { token: "abc" })).toBe(
      "ws://localhost:3001/api/messages/ws?token=abc"
    );
    expect(buildWsUrl("https://api.work4u.app/", "/api/messages/ws", { token: "a b" })).toBe(
      "wss://api.work4u.app/api/messages/ws?token=a+b"
    );
  });

  it("does not duplicate /api when the base already ends with it", () => {
    expect(buildWsUrl("https://x.dev/api", "/api/messages/ws")).toBe("wss://x.dev/api/messages/ws");
  });
});

describe("apiFetch", () => {
  it("replaces a stale Authorization header with a fresh token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({}));
    vi.stubGlobal("fetch", fetchMock);
    setTokenProvider(async () => "fresh-token");

    await apiFetch("/api/jobs", { headers: { Authorization: "Bearer stale" } });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:3001/api/jobs");
    expect(authHeaderOf(fetchMock.mock.calls[0])).toBe("Bearer fresh-token");
  });

  it("retries once with a force-refreshed token on 401", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("", { status: 401 })).mockResolvedValueOnce(okJson({ ok: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = vi.fn(async (force: boolean) => (force ? "refreshed" : "cached"));
    setTokenProvider(provider);

    const res = await apiFetch("/api/me", { auth: true });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(authHeaderOf(fetchMock.mock.calls[0])).toBe("Bearer cached");
    expect(authHeaderOf(fetchMock.mock.calls[1])).toBe("Bearer refreshed");
    expect(provider).toHaveBeenLastCalledWith(true);
  });

  it("does not retry more than once", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    setTokenProvider(async () => "t");

    const res = await apiFetch("/api/me", { auth: true });
    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("leaves unauthenticated requests alone", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    setTokenProvider(async () => "t");

    await apiFetch("/api/jobs");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(authHeaderOf(fetchMock.mock.calls[0])).toBeNull();
  });

  it("keeps the caller's header when no session is available", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({}));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/x", { headers: { Authorization: "Bearer legacy" } });
    expect(authHeaderOf(fetchMock.mock.calls[0])).toBe("Bearer legacy");
  });
});

describe("apiJson errors", () => {
  it("maps 429 to a friendly rate-limit ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okJson({ error: "Too Many Requests" }, 429)));
    await expect(apiJson("/api/messages", { method: "POST", json: {} })).rejects.toMatchObject({
      status: 429,
      message: RATE_LIMIT_MESSAGE,
    });
  });

  it("keeps the server message for 409 conflicts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okJson({ error: "Job already filled" }, 409)));
    const err = (await apiJson("/api/applications/1", { method: "PATCH", json: {} }).catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.message).toBe("Job already filled");
  });
});
