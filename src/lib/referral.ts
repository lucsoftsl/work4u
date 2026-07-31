const STORAGE_KEY = "work4u_referral_code";

export function captureReferralCodeFromUrl(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const code = params.get("ref");
  if (code && code.trim()) {
    window.localStorage.setItem(STORAGE_KEY, code.trim().toUpperCase());
  }
}

export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function clearStoredReferralCode(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function buildReferralLink(referralCode: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://work4u.vercel.app";
  return `${origin}/signup?ref=${referralCode}`;
}
