import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AuthGate } from "./AuthGate";

const m = vi.hoisted(() => ({ replace: vi.fn(), auth: { user: null as unknown, loading: false, connectionIssue: false } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: m.replace }) }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => m.auth }));
afterEach(() => { cleanup(); vi.clearAllMocks(); m.auth = { user: null, loading: false, connectionIssue: false }; });

describe("AuthGate (B2B)", () => {
  it("sends signed-out visitors to the B2B sign-in with the page to come back to, never to the marketplace sign-in", () => {
    window.history.replaceState({}, "", "/ops/o1/jobs?q=a");
    render(<AuthGate><p>secret</p></AuthGate>);
    expect(m.replace).toHaveBeenCalledWith("/ops/signin?redirect=%2Fops%2Fo1%2Fjobs%3Fq%3Da");
    expect(screen.queryByText("secret")).toBeNull();
  });
  it("a path outside the B2B app is not carried as a return target", () => {
    window.history.replaceState({}, "", "/dashboard");
    render(<AuthGate><p>x</p></AuthGate>);
    expect(m.replace).toHaveBeenCalledWith("/ops/signin");
  });
  it("renders for signed-in users and while offline with a saved session; waits while loading", () => {
    m.auth = { user: { id: "u" }, loading: false, connectionIssue: false };
    const { rerender } = render(<AuthGate><p>app</p></AuthGate>);
    expect(screen.getByText("app")).toBeTruthy();
    m.auth = { user: null, loading: true, connectionIssue: true }; // the provider keeps loading=true while it retries the profile
    rerender(<AuthGate><p>app</p></AuthGate>);
    expect(screen.getByText("app")).toBeTruthy();
    expect(m.replace).not.toHaveBeenCalled();
    m.auth = { user: null, loading: true, connectionIssue: false };
    rerender(<AuthGate><p>app</p></AuthGate>);
    expect(screen.queryByText("app")).toBeNull();
    expect(m.replace).not.toHaveBeenCalled();
  });
});
