// Decides where a returning user should continue onboarding.
// A backend user row only exists after step 1 (account) succeeded, so any loaded user is at least on step 2.

export type SignupStep = 1 | 2 | 3;

export interface OnboardingSnapshot {
  onboardingCompleted?: boolean | null;
  onboardingStep?: number | null;
  accountMode?: "REQUESTOR" | "WORKER" | "BOTH" | null;
}

export type SignupResume = { kind: "done" } | { kind: "step"; step: SignupStep };

export function resumeSignup(user: OnboardingSnapshot | null | undefined): SignupResume {
  if (!user) return { kind: "step", step: 1 };
  if (user.onboardingCompleted) return { kind: "done" };
  const reached = typeof user.onboardingStep === "number" ? user.onboardingStep : 0;
  // Mode chosen (step 2 saved) → profile step; otherwise the mode step.
  if (user.accountMode || reached >= 3) return { kind: "step", step: 3 };
  return { kind: "step", step: 2 };
}

/** Where to send a user right after sign-in. */
export function postSignInPath(user: OnboardingSnapshot | null | undefined, requested: string): string {
  if (user && user.onboardingCompleted === false) return "/signup";
  return requested;
}
