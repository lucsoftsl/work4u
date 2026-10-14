import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SignInComponent from "./SignIn";

const m = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), signIn: vi.fn(), google: vi.fn(), auth: { isAuthenticated: false, user: null as null | { onboardingCompleted?: boolean } } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push, replace: m.replace }) }));
vi.mock("next/link", () => ({ default: ({ href, children, onClick, ...r }: { href: string; children: React.ReactNode; onClick?: (e: React.MouseEvent) => void }) => <a href={href} onClick={onClick} {...r}>{children}</a> }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => m.auth }));
// The auth SDK modules are mocked: this test never talks to a real identity service.
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({ sendPasswordResetEmail: vi.fn() }));
vi.mock("firebase/app", () => ({ FirebaseError: class extends Error {} }));
vi.mock("@/lib/auth-service", () => ({ signIn: m.signIn, signInWithGoogle: m.google }));
vi.mock("@/lib/useStripCredentialParams", () => ({ useStripCredentialParams: () => undefined }));

const INVITE = "/b2b/invite/abcDEF123_-abcDEF123_-abcDEF123_-abcDEF12345";
const open = (target?: string) => window.history.replaceState({}, "", target ? `/signin?redirect=${encodeURIComponent(target)}` : "/signin");
async function submit() {
  fireEvent.change(document.getElementById("email")!, { target: { value: "a@b.co", name: "email" } });
  fireEvent.change(document.getElementById("password")!, { target: { value: "secret123", name: "password" } });
  fireEvent.submit(document.getElementById("email")!.closest("form")!);
}
beforeEach(() => { sessionStorage.clear(); m.auth = { isAuthenticated: false, user: null }; m.signIn.mockResolvedValue({ onboardingCompleted: true }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("sign-in keeps ?redirect= (regression: ended on /dashboard)", () => {
  it("submits to the redirect target, not /dashboard", async () => {
    open(INVITE);
    render(<SignInComponent />);
    await submit();
    await waitFor(() => expect(m.push).toHaveBeenCalledWith(INVITE));
  });
  it("the 'already authenticated' effect uses the target read when the page opened, even after the URL lost the parameter", async () => {
    open("/profile");
    const { rerender } = render(<SignInComponent />);
    window.history.replaceState({}, "", "/profile"); // navigation already changed the URL: the old code then fell back to /dashboard
    m.auth = { isAuthenticated: true, user: { onboardingCompleted: true } };
    rerender(<SignInComponent />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/profile"));
    expect(m.replace).not.toHaveBeenCalledWith("/dashboard");
  });
  it("no redirect parameter → /dashboard", async () => {
    open();
    render(<SignInComponent />);
    await submit();
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/dashboard"));
  });
  it("unfinished onboarding goes to /signup and still carries the target", async () => {
    open(INVITE);
    m.signIn.mockResolvedValue({ onboardingCompleted: false });
    render(<SignInComponent />);
    await submit();
    await waitFor(() => expect(m.push).toHaveBeenCalledWith(`/signup?redirect=${encodeURIComponent(INVITE)}`));
  });
  it("Google sign-in follows the same target", async () => {
    open("/profile");
    m.google.mockResolvedValue({ onboardingCompleted: true });
    render(<SignInComponent />);
    fireEvent.click(screen.getByRole("button", { name: /continueWithGoogle/ }));
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/profile"));
  });
  it("an unsafe redirect is ignored", async () => {
    open("//evil.com");
    render(<SignInComponent />);
    await submit();
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/dashboard"));
  });
  it("the 'new here' link keeps the target for sign-up", () => {
    open(INVITE);
    render(<SignInComponent />);
    fireEvent.click(screen.getByRole("link", { name: /joinLink/ }));
    expect(m.push).toHaveBeenCalledWith(`/signup?redirect=${encodeURIComponent(INVITE)}`);
  });
});
