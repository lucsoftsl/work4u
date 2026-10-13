// Maps Firebase Auth / backend auth failures to translation keys so users never see raw
// "Firebase: Error (auth/...)" strings.

export type AuthErrorField = "email" | "password" | undefined;

export interface AuthErrorInfo {
  key: string;
  field?: AuthErrorField;
}

const BY_CODE: Record<string, AuthErrorInfo> = {
  "auth/invalid-credential": { key: "auth.error.invalidCredentials" },
  "auth/invalid-login-credentials": { key: "auth.error.invalidCredentials" },
  "auth/wrong-password": { key: "auth.error.invalidCredentials" },
  "auth/user-not-found": { key: "auth.error.invalidCredentials" },
  "auth/invalid-email": { key: "auth.signIn.error.invalidEmail", field: "email" },
  "auth/missing-email": { key: "auth.signIn.error.emailRequired", field: "email" },
  "auth/missing-password": { key: "auth.signIn.error.passwordRequired", field: "password" },
  "auth/user-disabled": { key: "auth.signIn.error.userDisabled" },
  "auth/too-many-requests": { key: "auth.error.tooManyRequests" },
  "auth/network-request-failed": { key: "auth.error.network" },
  "auth/email-already-in-use": { key: "auth.error.emailInUse", field: "email" },
  "auth/weak-password": { key: "auth.error.weakPassword", field: "password" },
  "auth/popup-blocked": { key: "auth.error.popupBlocked" },
  "auth/operation-not-allowed": { key: "auth.signIn.error.generic" },
};

const GENERIC: AuthErrorInfo = { key: "auth.signIn.error.generic" };

/** Extracts "auth/xyz" from a FirebaseError-like object or from its message text. */
export function authErrorCode(error: unknown): string | null {
  if (error && typeof error === "object" && "code" in error && typeof (error as { code: unknown }).code === "string") {
    const code = (error as { code: string }).code;
    if (code.startsWith("auth/")) return code;
  }
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const match = message.match(/auth\/[a-z0-9-]+/i);
  return match ? match[0].toLowerCase() : null;
}

export function describeAuthError(error: unknown): AuthErrorInfo {
  const code = authErrorCode(error);
  if (code) return BY_CODE[code] ?? GENERIC;
  const status = error && typeof error === "object" && "status" in error ? (error as { status: unknown }).status : undefined;
  if (status === 429) return { key: "auth.error.tooManyRequests" };
  if (status === 403) return { key: "auth.signIn.error.userDisabled" };
  return GENERIC;
}

/** True when the error text is safe to show as-is (not an internal/Firebase message). */
export function isUserFacingMessage(message: string | undefined | null): message is string {
  return !!message && !/firebase|auth\/|\bat\s+\w+\s*\(|stack|internal server/i.test(message);
}
