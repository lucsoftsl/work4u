import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

const m = vi.hoisted(() => {
  const fbUser = { uid: "u1", email: "n@b.co", displayName: "Ana", getIdToken: vi.fn(async () => "tok") };
  const auth = { currentUser: fbUser as typeof fbUser | null, authStateReady: vi.fn(async () => undefined) };
  const sdk = {
    auth,
    onIdTokenChanged: vi.fn((_a: unknown, cb: (u: unknown) => void) => { queueMicrotask(() => cb(auth.currentUser)); return () => undefined; }),
    getAuthUserFromFirebaseUser: vi.fn(async () => null), // a marketplace profile is required here: absent → "signed out"
    getB2bAuthUser: vi.fn(async () => ({ id: "u1", email: "n@b.co", displayName: "Ana" })),
    signOut: vi.fn(async () => undefined),
  };
  return { sdk, auth };
});
vi.mock("../lib/auth-sdk", () => ({ loadAuthSdk: () => Promise.resolve(m.sdk), hasSessionHint: () => true, whenIdle: (fn: () => void) => { fn(); return () => undefined; } }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

function Probe() {
  const { loading, user } = useAuth();
  return <p data-testid="s">{loading ? "loading" : user ? `in:${user.email}` : "out"}</p>;
}
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("AuthProvider kind='b2b'", () => {
  it("an account without a marketplace profile is signed IN (the B2B API creates what it needs)", async () => {
    render(<AuthProvider kind="b2b"><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("s").textContent).toBe("in:n@b.co"));
    expect(m.sdk.getB2bAuthUser).toHaveBeenCalled();
    expect(m.sdk.getAuthUserFromFirebaseUser).not.toHaveBeenCalled();
  });
  it("the marketplace provider still uses the marketplace profile loader", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("s").textContent).toBe("out"));
    expect(m.sdk.getAuthUserFromFirebaseUser).toHaveBeenCalled();
    expect(m.sdk.getB2bAuthUser).not.toHaveBeenCalled();
  });
});
