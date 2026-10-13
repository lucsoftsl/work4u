import { Bricolage_Grotesque, Atkinson_Hyperlegible_Next } from "next/font/google";

// Self-hosted at build time by next/font (no render-blocking Google request, no visitor IPs to Google).
// latin-ext is needed for hu/ro diacritics. Weights actually used: display 600–700, body 400/700.
export const display = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-display",
  preload: true,
  fallback: ["system-ui", "Segoe UI", "Arial"],
});

export const body = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-body",
  preload: true,
  fallback: ["system-ui", "Segoe UI", "Arial"],
});
