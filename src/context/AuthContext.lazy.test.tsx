import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { getFreshToken } from "@/lib/http";

const m = vi.hoisted(() => {
  const currentUser = { uid: "u1", getIdToken: vi.fn(async () => "tok-123") };
  const auth = { currentUser: null as null | typeof currentUser, authStateReady: vi.fn(async () => undefined) };
  const sdk = {
    auth,
    onIdTokenChanged: vi.fn((_auth: unknown, cb: (u: unknown) => void) => { queueMicrotask(() => cb(auth.currentUser)); return () => undefined; }),
    getAuthUserFromFirebaseUser: vi.fn(async () => ({ id: "u1", email: "a@b.co" })),
    signOut: vi.fn(async () => undefined),
  };
  return { sdk, auth, currentUser, load: vi.fn(), idle: [] as Array<() => void>, hint: false };
});
vi.mock("@/lib/auth-sdk", () => ({
  loadAuthSdk: () => { m.load(); return Promise.resolve(m.sdk); },
  hasSessionHint: () => m.hint,
  whenIdle: (fn: () => void) => { m.idle.push(fn); return () => undefined; },
}));
vi.mock("../lib/auth-sdk", () => ({
  loadAuthSdk: () => { m.load(); return Promise.resolve(m.sdk); },
  hasSessionHint: () => m.hint,
  whenIdle: (fn: () => void) => { m.idle.push(fn); return () => undefined; },
}));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

function Probe() {
  const { loading, isAuthenticated, firebaseToken } = useAuth();
  return <p data-testid="s">{`${loading ? "loading" : "ready"}|${isAuthenticated ? "in" : "out"}|${firebaseToken ?? "-"}`}</p>;
}
const mount = () => render(<AuthProvider><Probe /></AuthProvider>);

beforeEach(() => { m.hint = false; m.idle.length = 0; m.auth.currentUser = null; });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("sign-in SDK is off the critical path (mobile LCP)", () => {
  it("anonymous visitor / crawler: the SDK is NOT loaded while the page paints; it loads when the browser goes idle", async () => {
    mount();
    expect(m.load).not.toHaveBeenCalled();
    expect(screen.getByTestId("s").textContent).toBe("loading|out|-");
    expect(m.idle).toHaveLength(1);
    await act(async () => { m.idle[0](); });
    await waitFor(() => expect(m.load).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId("s").textContent).toBe("ready|out|-")); // resolved as signed out
  });

  it("a person with a session cookie gets it immediately (no idle wait) and ends up signed in", async () => {
    m.hint = true;
    m.auth.currentUser = m.currentUser;
    mount();
    await waitFor(() => expect(m.load).toHaveBeenCalled());
    expect(m.idle).toHaveLength(0);
    await waitFor(() => expect(screen.getByTestId("s").textContent).toBe("ready|in|tok-123"));
  });

  it("an authenticated API call made before the SDK was loaded waits for it and still gets the token", async () => {
    m.auth.currentUser = m.currentUser;
    mount();
    expect(m.load).not.toHaveBeenCalled();
    await expect(getFreshToken()).resolves.toBe("tok-123");
    expect(m.load).toHaveBeenCalled();
    expect(m.auth.authStateReady).toHaveBeenCalled();
  });

  it("an authenticated call while signed out resolves to no token (never hangs)", async () => {
    mount();
    await expect(getFreshToken()).resolves.toBeNull();
  });
});
