import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "@/app/globals.css";
import { SiteShell } from "@/components/layout/SiteShell";
import { DEFAULT_LANG, LAUNCH_LANGS, isLaunchLang } from "@/lib/i18n-routing";
import { getServerT, loadServerDictionary } from "@/lib/i18n-server";
import { BRAND, SITE_URL } from "@/lib/seo/site";
import type { Locale } from "@/lib/i18n";

// Root layout of the public pages. `[lang]` is en (served at the unprefixed URL through a proxy rewrite), ro or es.
// Only these three exist: any other value is a 404, never a page.
export const dynamicParams = false;
export const generateStaticParams = () => LAUNCH_LANGS.map((lang) => ({ lang }));

// Site-wide defaults in the page language (pages with their own metadata override them).
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = await getServerT(lang);
  const title = `${BRAND}: ${t("seo.homeTagline")}`;
  const description = t("landing.fallback.subtitle");
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s · ${BRAND}` },
    description,
    applicationName: BRAND,
    openGraph: { type: "website", siteName: BRAND, title, description },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F7F3EA" };

// Everything the client dictionary does not need on a public page: the admin tools and B2B apps are never rendered here.
const PRIVATE_KEY_PREFIXES = ["admin", "b2b.", "ops.", "tech.", "biz.", "schedule.", "roster."];

export default async function PublicRootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLaunchLang(lang)) notFound();
  const full = lang === DEFAULT_LANG ? undefined : await loadServerDictionary(lang);
  const dictionary = full && Object.fromEntries(Object.entries(full).filter(([k]) => !PRIVATE_KEY_PREFIXES.some((p) => k.startsWith(p))));
  return (
    <SiteShell lang={lang} initialLocale={lang as Locale} initialDictionary={dictionary}>
      {children}
    </SiteShell>
  );
}
