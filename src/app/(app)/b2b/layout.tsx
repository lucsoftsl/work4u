import type { Metadata } from "next";

// Invitation links carry a secret token in the URL: never indexed, never sent as a Referer to other sites.
export const metadata: Metadata = { title: "Invitation", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function B2bPublicLayout({ children }: { children: React.ReactNode }) {
  return children;
}
