import { describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("./http", async (o) => ({ ...(await o<typeof import("./http")>()), apiFetch: m.apiFetch }));
vi.mock("./firebase", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({ signInWithEmailAndPassword: vi.fn(), createUserWithEmailAndPassword: vi.fn(), signInWithPopup: vi.fn(), GoogleAuthProvider: class {}, signOut: vi.fn(), sendPasswordResetEmail: vi.fn(), updateProfile: vi.fn() }));
import { getB2bAuthUser } from "./auth-service";

describe("getB2bAuthUser", () => {
  it("builds the signed-in user from the account alone and never calls GET /api/users/{uid} (404 for B2B-only people)", async () => {
    const user = { uid: "u1", email: "a@b.co", displayName: "Ana", photoURL: null, phoneNumber: null, emailVerified: true, getIdToken: vi.fn(async () => "tok") };
    const u = await getB2bAuthUser(user as never);
    expect(u).toMatchObject({ id: "u1", email: "a@b.co", displayName: "Ana", token: "tok" });
    expect(m.apiFetch).not.toHaveBeenCalled();
  });
});
