import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { display, body } from "@/app/fonts";
import { RouteTitle } from "@/b2b/components/RouteTitle";
import { B2bProviders } from "@/components/layout/B2bProviders";

// Root layout of the logged-in B2B app (/ops, /tech, /b2b/invite): its own <html>, no marketplace header/footer/widgets/providers.
// Everything here is private: noindex (also sent as X-Robots-Tag by next.config.ts).
export const metadata: Metadata = {
  title: { default: "Work4U for field service", template: "%s · Work4U" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1B1F24" };

export default function B2bRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen bg-ops-canvas font-body text-ops-ink antialiased">
        <B2bProviders>
          <RouteTitle />
          {children}
        </B2bProviders>
      </body>
    </html>
  );
}
