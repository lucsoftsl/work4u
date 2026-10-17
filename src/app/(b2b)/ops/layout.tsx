import type { Metadata } from "next";
import { B2bQueryProvider } from "@/b2b/query/QueryProvider";

export const metadata: Metadata = { title: { default: "Ops", template: "%s · Work4U Ops" }, robots: { index: false, follow: false } };

// Query cache for the whole /ops tree, including the sign-in and start pages. The signed-in part adds AuthGate in (gated)/layout.tsx.
export default function OpsRootLayout({ children }: { children: React.ReactNode }) {
  return <B2bQueryProvider>{children}</B2bQueryProvider>;
}
