import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "@/app/globals.css";
import { display, body } from "@/app/fonts";
import { ALL_LANGS, isAppLang } from "@/lib/i18n-routing";
import { B2B_SITE_URL, BRAND } from "@/lib/seo/site";

// Root layout of the public B2B pages (/field-service and its demo page): its own <html lang>, the B2B header/footer in each page,
// and no marketplace providers, header, footer, widgets or language banner. Languages: en (unprefixed), ro, es (indexed), fr, hu (own URLs, noindex: see b2bLocalizedPath).
export const dynamicParams = false;
export const generateStaticParams = () => ALL_LANGS.map((lang) => ({ lang }));

export const metadata: Metadata = {
  metadataBase: new URL(B2B_SITE_URL),
  title: { default: `${BRAND} for field service`, template: `%s · ${BRAND}` },
  applicationName: BRAND,
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F7F3EA" };

export default async function B2bPublicRootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isAppLang(lang)) notFound();
  return (
    <html lang={lang} className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-screen flex-col bg-canvas font-body text-ink antialiased">{children}</body>
    </html>
  );
}
