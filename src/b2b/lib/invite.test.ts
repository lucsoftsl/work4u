import { describe, expect, it } from "vitest";
import { B2bError } from "@/b2b/api/client";
import { afterJoinPath, invitePath, inviteProblem } from "./invite";

describe("inviteProblem", () => {
  it("maps each contract error to its own situation", () => {
    expect(inviteProblem(new B2bError(404, "INVITE_INVALID", "x"))).toBe("invalid");
    expect(inviteProblem(new B2bError(410, "INVITE_EXPIRED", "x"))).toBe("expired");
    expect(inviteProblem(new B2bError(410, "INVITE_USED", "x"))).toBe("used");
    expect(inviteProblem(new B2bError(410, "INVITE_REVOKED", "x"))).toBe("revoked");
    expect(inviteProblem(new B2bError(403, "INVITE_EMAIL_MISMATCH", "x"))).toBe("mismatch");
    expect(inviteProblem(new B2bError(409, "ALREADY_MEMBER", "x"))).toBe("already");
    expect(inviteProblem(new B2bError(401, "UNKNOWN", "x"))).toBe("signin");
  });
  it("treats rate limits, offline and anything else without leaking details", () => {
    expect(inviteProblem(new B2bError(429, "RATE_LIMITED", "x"))).toBe("busy");
    expect(inviteProblem(new B2bError(503, "SERVICE_BUSY", "x"))).toBe("busy");
    expect(inviteProblem(new B2bError(0, "NETWORK", "x"))).toBe("network");
    expect(inviteProblem(new B2bError(500, "UNKNOWN", "x"))).toBe("generic");
    expect(inviteProblem(new Error("boom"))).toBe("generic");
  });
});

describe("destinations", () => {
  it("sends technicians to the field app and everyone else to the ops console", () => {
    expect(afterJoinPath("o1", "TECHNICIAN")).toBe("/tech/o1/today");
    expect(afterJoinPath("o1", "ADMIN")).toBe("/ops/o1/dashboard");
    expect(afterJoinPath("o 1", null)).toBe("/ops/o%201/dashboard");
  });
  it("keeps the token URL-safe", () => {
    expect(invitePath("abc_DEF-123")).toBe("/b2b/invite/abc_DEF-123");
  });
});
