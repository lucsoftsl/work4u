/**
 * Sign-in for the B2B product. Same identity provider and accounts as the marketplace, but none of the marketplace profile calls
 * (no profile fetch, login-state sync, analytics event): a company admin or an invited employee must not have to finish marketplace
 * sign-up. The organisation / member rows are created by the B2B API (`POST /api/b2b/signup`, invitation accept).
 * The auth SDK is imported on demand (it is large and only B2B sign-in pages need it at once).
 */
async function sdk() {
  const [fa, fb] = await Promise.all([import("firebase/auth"), import("./firebase")]);
  return { fa, auth: fb.auth };
}

export async function b2bSignInWithEmail(email: string, password: string): Promise<void> {
  const { fa, auth } = await sdk();
  await fa.signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function b2bCreateAccount(email: string, password: string, displayName?: string): Promise<void> {
  const { fa, auth } = await sdk();
  const cred = await fa.createUserWithEmailAndPassword(auth, email.trim(), password);
  const name = displayName?.trim();
  if (name) await fa.updateProfile(cred.user, { displayName: name }).catch(() => undefined);
}

export async function b2bSignInWithGoogle(): Promise<void> {
  const { fa, auth } = await sdk();
  await fa.signInWithPopup(auth, new fa.GoogleAuthProvider());
}

export async function b2bSendPasswordReset(email: string): Promise<void> {
  const { fa, auth } = await sdk();
  await fa.sendPasswordResetEmail(auth, email.trim());
}

export type B2bAuthProblem = "credentials" | "tooMany" | "network" | "disabled" | "emailInUse" | "weakPassword" | "invalidEmail" | "generic" | "none";

/** Maps a sign-in error to one of our messages. A closed Google popup is not an error (`none`). */
export function b2bAuthProblem(error: unknown): B2bAuthProblem {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials": return "credentials";
    case "auth/invalid-email": return "invalidEmail";
    case "auth/too-many-requests": return "tooMany";
    case "auth/network-request-failed": return "network";
    case "auth/user-disabled": return "disabled";
    case "auth/email-already-in-use": return "emailInUse";
    case "auth/weak-password": return "weakPassword";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request": return "none";
    default: return "generic";
  }
}
