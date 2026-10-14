import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { SiteShell } from "@/components/layout/SiteShell";
import { BRAND, DEFAULT_DESCRIPTION, SITE_URL, TAGLINE } from "@/lib/seo/site";

// Root layout of the private app (signed-in pages, admin, B2B apps, auth, invite links). Public pages have their own root
// layout under (public)/[lang]. Server root layout: real <title>/<meta> per route (route segments add their own titles via
// layout.tsx metadata), self-hosted fonts, one <main> landmark.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND}: ${TAGLINE}`,
    template: `%s · ${BRAND}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: BRAND,
  openGraph: { type: "website", siteName: BRAND, title: `${BRAND}: ${TAGLINE}`, description: DEFAULT_DESCRIPTION },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F7F3EA",
};

export default function AppRootLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell lang="en">{children}</SiteShell>;
}
