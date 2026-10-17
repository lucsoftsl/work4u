import { describe, expect, it } from "vitest";
import { b2bAuthProblem } from "./b2b-auth";

describe("b2bAuthProblem", () => {
  it("maps auth errors to our messages, a closed popup is silent, anything else is generic", () => {
    const e = (code: string) => Object.assign(new Error("x"), { code });
    expect(b2bAuthProblem(e("auth/invalid-credential"))).toBe("credentials");
    expect(b2bAuthProblem(e("auth/wrong-password"))).toBe("credentials");
    expect(b2bAuthProblem(e("auth/user-not-found"))).toBe("credentials"); // never reveals whether the email exists
    expect(b2bAuthProblem(e("auth/too-many-requests"))).toBe("tooMany");
    expect(b2bAuthProblem(e("auth/network-request-failed"))).toBe("network");
    expect(b2bAuthProblem(e("auth/user-disabled"))).toBe("disabled");
    expect(b2bAuthProblem(e("auth/email-already-in-use"))).toBe("emailInUse");
    expect(b2bAuthProblem(e("auth/weak-password"))).toBe("weakPassword");
    expect(b2bAuthProblem(e("auth/popup-closed-by-user"))).toBe("none");
    expect(b2bAuthProblem(e("auth/internal-error"))).toBe("generic");
    expect(b2bAuthProblem(new Error("boom"))).toBe("generic");
    expect(b2bAuthProblem(null)).toBe("generic");
  });
});
