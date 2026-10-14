import type { ReactNode } from "react";
import { display, body } from "@/app/fonts";
import Providers from "@/app/providers";
import { DeferredWidgets } from "@/components/DeferredWidgets";
import { AppHeader } from "@/components/AppHeader";
import { BottomTabBar } from "@/components/BottomTabBar";
import { SkipLink } from "@/components/SkipLink";
import Footer from "@/components/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import type { Locale } from "@/lib/i18n";

interface SiteShellProps {
  children: ReactNode;
  /** The <html lang> the server sends: the URL language on public pages, "en" for the private app (it switches client-side). */
  lang: string;
  /** Public pages only: language of the URL and the dictionary the server rendered it with. */
  initialLocale?: Locale;
  initialDictionary?: Record<string, string>;
}

/** The one HTML shell shared by both root layouts ((public)/[lang] and (app)): header, one <main> landmark, footer, providers. */
export function SiteShell({ children, lang, initialLocale, initialDictionary }: SiteShellProps) {
  return (
    <html lang={lang} className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-screen flex-col bg-canvas font-body text-ink antialiased">
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <Providers initialLocale={initialLocale} initialDictionary={initialDictionary}>
          <SkipLink />
          <AppHeader />
          <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
            {children}
          </main>
          <Footer />
          <BottomTabBar />
          <DeferredWidgets />
        </Providers>
      </body>
    </html>
  );
}
