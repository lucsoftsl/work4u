import type { Metadata, Viewport } from "next";
import { B2bQueryProvider } from "@/b2b/query/QueryProvider";
import { AuthGate } from "@/b2b/components/shell/AuthGate";
import { ServiceWorkerRegister } from "@/b2b/components/tech/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: { default: "Field app", template: "%s · work4u Field" },
  manifest: "/tech/manifest.webmanifest",
  appleWebApp: { capable: true, title: "work4u Field", statusBarStyle: "default" },
  icons: { apple: "/tech/icon-192.png" },
};
export const viewport: Viewport = { themeColor: "#1B1F24" };

export default function TechRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <B2bQueryProvider>
      <ServiceWorkerRegister />
      <AuthGate>{children}</AuthGate>
    </B2bQueryProvider>
  );
}
