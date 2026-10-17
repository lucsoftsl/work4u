import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { B2bError } from "@/b2b/api/client";
import InviteClient from "./invite-client";

const m = vi.hoisted(() => ({ user: null as null | { email: string }, replace: vi.fn(), signOut: vi.fn(async () => undefined), preview: vi.fn(), accept: vi.fn(), me: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, f: string) => f }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: m.replace }) }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: m.user, loading: false, signOut: m.signOut }) }));
vi.mock("@/b2b/api/endpoints", () => ({ previewInvitation: m.preview, acceptInvitation: m.accept, getMe: m.me }));

const TOKEN = "tok_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abc";
const invite = { orgName: "Acme HVAC", roleName: "Technician", memberType: "EMPLOYEE", emailHint: "a***@acme.test", expiresAt: "2026-12-01T00:00:00Z" };
beforeEach(() => { m.user = null; m.preview.mockResolvedValue(invite); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("B2B invite page", () => {
  it("signed out: shows the org + role + masked email and round-trips the token through sign-in and sign-up", async () => {
    render(<InviteClient token={TOKEN} />);
    expect(await screen.findByRole("heading", { level: 1, name: "Join Acme HVAC" })).toBeTruthy();
    expect(screen.getByText("This invitation was sent to a***@acme.test.")).toBeTruthy();
    const back = encodeURIComponent(`/b2b/invite/${TOKEN}`);
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe(`/ops/signin?redirect=${back}`);
    expect(screen.getByRole("link", { name: "Create an account" }).getAttribute("href")).toBe(`/ops/start?redirect=${back}`);
    expect(m.accept).not.toHaveBeenCalled(); // never accepts on its own
  });
  it("signed in: accepts on click, then opens the technician app for a technician role", async () => {
    m.user = { email: "ana@acme.test" };
    m.accept.mockResolvedValue({ orgId: "org1", memberId: "m1" });
    m.me.mockResolvedValue({ role: { template: "TECHNICIAN" } });
    render(<InviteClient token={TOKEN} />);
    fireEvent.click(await screen.findByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/tech/org1/today"));
    expect(m.accept).toHaveBeenCalledWith(TOKEN);
  });
  it("other roles go to the ops console, and a failed profile read still gets them in", async () => {
    m.user = { email: "ana@acme.test" };
    m.accept.mockResolvedValue({ orgId: "org1", memberId: "m1" });
    m.me.mockRejectedValue(new Error("x"));
    render(<InviteClient token={TOKEN} />);
    fireEvent.click(await screen.findByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/ops/org1/dashboard"));
  });
  for (const [status, code, title] of [[404, "INVITE_INVALID", "This invitation link isn't valid"], [410, "INVITE_EXPIRED", "This invitation has expired"], [410, "INVITE_USED", "This invitation was already used"], [410, "INVITE_REVOKED", "This invitation was cancelled"]] as const) {
    it(`friendly state for ${code} (no code or token shown)`, async () => {
      m.preview.mockRejectedValue(new B2bError(status, code, "raw server text"));
      const { container } = render(<InviteClient token={TOKEN} />);
      expect(await screen.findByRole("heading", { level: 1, name: title })).toBeTruthy();
      expect(container.textContent).not.toContain(code);
      expect(container.textContent).not.toContain(TOKEN);
      expect(container.textContent).not.toContain("raw server text");
    });
  }
  it("email mismatch offers sign-out-and-switch that returns to this invitation", async () => {
    m.user = { email: "other@x.test" };
    m.accept.mockRejectedValue(new B2bError(403, "INVITE_EMAIL_MISMATCH", "x"));
    render(<InviteClient token={TOKEN} />);
    fireEvent.click(await screen.findByRole("button", { name: "Accept invitation" }));
    expect(await screen.findByText("You're signed in with a different email")).toBeTruthy();
    expect(screen.getByText(/This invitation is for a\*\*\*@acme.test/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sign out and switch account" }));
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith(`/ops/signin?redirect=${encodeURIComponent(`/b2b/invite/${TOKEN}`)}`));
    expect(m.signOut).toHaveBeenCalled();
  });
  it("network errors on preview can be retried", async () => {
    m.preview.mockRejectedValueOnce(new B2bError(0, "NETWORK", "x")).mockResolvedValue(invite);
    render(<InviteClient token={TOKEN} />);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Join Acme HVAC" })).toBeTruthy();
  });
});
