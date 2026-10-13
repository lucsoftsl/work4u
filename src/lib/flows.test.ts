import { describe, expect, it } from "vitest";
import { postSignInPath, resumeSignup } from "./signup-resume";
import { safeRedirectPath, signInPath } from "./auth-redirect";
import { describeAuthError, isUserFacingMessage } from "./auth-errors";
import { chatHref } from "./chat-links";
import { chatSocketProtocols, chatSocketUrl, compareMessages, isRetryableSendError, reconnectDelay } from "@/lib/chat-socket";
import { ApiError } from "./http";

describe("resumeSignup", () => {
  it("starts at step 1 without a backend user", () => {
    expect(resumeSignup(null)).toEqual({ kind: "step", step: 1 });
  });

  it("resumes at step 2 after only the account step (QA S1.4)", () => {
    expect(resumeSignup({ onboardingCompleted: false, onboardingStep: 1, accountMode: null })).toEqual({ kind: "step", step: 2 });
    expect(resumeSignup({ onboardingCompleted: false })).toEqual({ kind: "step", step: 2 });
  });

  it("resumes at step 3 once a mode was saved", () => {
    expect(resumeSignup({ onboardingCompleted: false, onboardingStep: 2, accountMode: "WORKER" })).toEqual({ kind: "step", step: 3 });
  });

  it("is done for completed users", () => {
    expect(resumeSignup({ onboardingCompleted: true, accountMode: "BOTH" })).toEqual({ kind: "done" });
  });

  it("sends incomplete users back to onboarding after sign-in", () => {
    expect(postSignInPath({ onboardingCompleted: false }, "/my-jobs")).toBe("/signup");
    expect(postSignInPath({ onboardingCompleted: true }, "/my-jobs")).toBe("/my-jobs");
  });
});

describe("safeRedirectPath", () => {
  it("accepts local paths with query strings", () => {
    expect(safeRedirectPath("/my-jobs")).toBe("/my-jobs");
    expect(safeRedirectPath(encodeURIComponent("/chat?userId=1"))).toBe("/chat?userId=1");
  });

  it("rejects open redirects and auth pages", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "/signin", "/signup?x=1", "javascript:alert(1)", null]) {
      expect(safeRedirectPath(bad)).toBe("/dashboard");
    }
  });

  it("builds sign-in links with an encoded return path", () => {
    expect(signInPath("/my-jobs/1/applicants")).toBe("/signin?redirect=%2Fmy-jobs%2F1%2Fapplicants");
    expect(signInPath("//evil.com")).toBe("/signin");
  });
});

describe("describeAuthError", () => {
  it("maps modern Firebase credential errors to one friendly key (QA N26)", () => {
    expect(describeAuthError({ code: "auth/invalid-credential" }).key).toBe("auth.error.invalidCredentials");
    expect(describeAuthError(new Error("Firebase: Error (auth/wrong-password).")).key).toBe("auth.error.invalidCredentials");
    expect(describeAuthError({ code: "auth/too-many-requests" }).key).toBe("auth.error.tooManyRequests");
    expect(describeAuthError({ code: "auth/email-already-in-use" })).toEqual({ key: "auth.error.emailInUse", field: "email" });
  });

  it("falls back to a generic key and never exposes raw Firebase text", () => {
    expect(describeAuthError(new Error("boom")).key).toBe("auth.signIn.error.generic");
    expect(isUserFacingMessage("Firebase: Error (auth/invalid-credential).")).toBe(false);
    expect(isUserFacingMessage("Please choose a location")).toBe(true);
  });
});

describe("chat helpers", () => {
  it("builds the socket URL from the API base without the token in the URL", () => {
    expect(chatSocketUrl("https://api.example.com")).toBe("wss://api.example.com/api/messages/ws");
    expect(chatSocketUrl("http://localhost:3001")).toBe("ws://localhost:3001/api/messages/ws");
  });

  it("passes the ID token in the work4u.auth subprotocol (new API handshake)", () => {
    expect(chatSocketProtocols("eyJ.a.b")).toEqual(["work4u.auth", "eyJ.a.b"]);
  });

  it("orders messages by time, then id, so the newest is last and ties are stable", () => {
    const msgs = [
      { id: "b", dateTimeCreated: "2026-10-12T10:29:00.000Z" },
      { id: "a", dateTimeCreated: "2026-10-12T10:29:00.000Z" },
      { id: "z", dateTimeCreated: "2026-10-12T10:21:00.000Z" },
    ];
    expect([...msgs].sort(compareMessages).map((m) => m.id)).toEqual(["z", "a", "b"]);
  });

  it("retries network, 401/408/429 and 5xx sends but not validation errors", () => {
    expect(isRetryableSendError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isRetryableSendError(new ApiError(429, "slow down"))).toBe(true);
    expect(isRetryableSendError(new ApiError(503, "down"))).toBe(true);
    expect(isRetryableSendError(new ApiError(400, "bad"))).toBe(false);
    expect(isRetryableSendError(new ApiError(404, "no recipient"))).toBe(false);
  });

  it("backs off exponentially and caps at 30s", () => {
    expect([0, 1, 2, 3].map(reconnectDelay)).toEqual([1000, 2000, 4000, 8000]);
    expect(reconnectDelay(10)).toBe(30000);
  });

  it("builds conversation deep links", () => {
    expect(chatHref({ userId: "u1", userName: "Ana B", jobId: "j1", jobTitle: "Fix sink" })).toBe(
      "/chat?userId=u1&userName=Ana+B&jobId=j1&jobTitle=Fix+sink"
    );
  });
});

describe("displayLocation", () => {
  it("handles structured fields, JSON strings, parsed objects and junk", async () => {
    const { displayLocation } = await import("./user-location");
    expect(displayLocation({ city: "Budapest", country: "HU" })).toBe("Budapest, HU");
    expect(displayLocation({ address: '{"location":"Budapest"}' })).toBe("Budapest");
    expect(displayLocation({ address: { location: "Malaga" } })).toBe("Malaga");
    expect(displayLocation({ address: "Plain street 1" })).toBe("Plain street 1");
    expect(displayLocation({ address: 42 })).toBeNull();
    expect(displayLocation(null)).toBeNull();
  });
});

describe("shell helpers", () => {
  it("sums unread counts from the conversations payload and ignores junk", async () => {
    const { sumUnread } = await import("@/lib/unread");
    expect(sumUnread([{ unreadCount: 2 }, { unreadCount: 0 }, { unreadCount: "3" }, {}, { unreadCount: -1 }])).toBe(5);
    expect(sumUnread(null)).toBe(0);
  });

  it("hides the app chrome only on auth screens and the full-bleed map", async () => {
    const { isChromeless, isActivePath } = await import("@/components/shell/nav-config");
    expect(isChromeless("/signin")).toBe(true);
    expect(isChromeless("/signup")).toBe(true);
    expect(isChromeless("/jobs/1/nearby-pros")).toBe(true);
    expect(isChromeless("/")).toBe(false);
    expect(isActivePath("/my-jobs/1/applicants", "/my-jobs")).toBe(true);
    expect(isActivePath("/my-jobsx", "/my-jobs")).toBe(false);
  });

  it("formats money with the active locale and survives bad currency codes", async () => {
    const { formatMoney } = await import("@/components/ui/MoneyPlate");
    expect(formatMoney(180, "EUR", "en")).toBe("€180");
    expect(formatMoney(12.5, "USD", "en")).toBe("$12.50");
    expect(formatMoney(50, "🍕", "en")).toBe("50 🍕");
  });
});

describe("cn (tailwind-merge with the design type scale)", () => {
  it("keeps a text colour next to a custom font size", async () => {
    const { cn } = await import("./utils");
    expect(cn("bg-primary text-on-fill", "text-label")).toContain("text-on-fill");
    expect(cn("text-body", "text-label")).toBe("text-label");
    expect(cn("text-ink", "text-primary")).toBe("text-primary");
  });
});
