import type { Metadata } from "next";
import { B2bQueryProvider } from "@/b2b/query/QueryProvider";
import { AuthGate } from "@/b2b/components/shell/AuthGate";

export const metadata: Metadata = { title: { default: "Ops", template: "%s · Work4U Ops" }, robots: { index: false, follow: false } };

export default function OpsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <B2bQueryProvider>
      <AuthGate>{children}</AuthGate>
    </B2bQueryProvider>
  );
}
