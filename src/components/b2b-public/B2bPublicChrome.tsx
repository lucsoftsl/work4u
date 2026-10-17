import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { b2bLocalizedPath, localizedPath } from "@/lib/i18n-routing";
import { B2B_DEMO_PATH, B2B_PUBLIC_HOME, B2B_WORKSPACES, b2bSignInPath } from "@/lib/b2b-paths";
import { buttonClasses } from "@/components/ui/Button";
import { MobileMenu } from "./MobileMenu";
import { SessionAwareLink } from "./SessionAwareLink";
import { B2bLanguageMenu } from "./B2bLanguageMenu";

type T = (key: string, fallback?: string) => string;

const SECTIONS = [
  ["howItWorks", "how-it-works", "How it works"],
  ["features", "features", "Features"],
  ["reliability", "reliability", "Reliability"],
  ["roles", "roles", "Roles"],
  ["faq", "faq", "FAQ"],
] as const;

const navLink = "relative inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-control px-2 text-[0.9375rem] font-bold text-ink-muted transition-colors hover:text-ink xl:px-3";

/**
 * Header of the public B2B pages (the field-service home, the demo page, B2B sign-in and company start), in the marketplace header's
 * style. Plain anchors with the language in the href (it is also used inside client pages, where the locale context is not the page
 * language). Nothing here links to the marketplace.
 * `account`: the signed-in menu, given by pages that run inside the auth provider; it replaces Sign in and the demo button.
 * Without it, Sign in turns into "My workspace" when the session hint cookie is present.
 */
export function B2bPublicHeader({ t, lang, sections = false, account }: { t: T; lang: string; sections?: boolean; account?: ReactNode }) {
  const home = b2bLocalizedPath(lang, B2B_PUBLIC_HOME);
  const links = SECTIONS.map(([k, id, fb]) => ({ href: `${home}#${id}`, label: t(`b2b.mkt.nav.${k}`, fb) }));
  const signIn = { href: b2bSignInPath(), label: t("b2b.mkt.nav.signIn", "Sign in") };
  const workspace = { href: B2B_WORKSPACES, label: t("b2b.mkt.nav.workspace", "My workspace") };
  const cta = { href: b2bLocalizedPath(lang, B2B_DEMO_PATH), label: t("b2b.mkt.nav.cta", "Request a demo") };
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="relative mx-auto flex h-14 max-w-content items-center gap-2 px-[var(--gutter)] md:h-header md:gap-3">
        <a href={home} className="inline-flex min-h-[44px] shrink-0 items-baseline gap-2 font-display text-xl font-bold leading-none tracking-tight text-primary transition-colors hover:text-primary-strong md:text-2xl">
          work4u
          <span className="hidden rounded-full bg-primary-soft px-2 py-0.5 text-micro uppercase text-primary min-[600px]:inline">{t("b2b.mkt.brandLabel", "Field service")}</span>
        </a>
        {sections ? (
          <nav aria-label={t("b2b.mkt.nav.label", "Page sections")} className="ml-4 hidden items-center gap-1 lg:flex">
            {links.map((l) => <a key={l.href} href={l.href} className={navLink}>{l.label}</a>)}
          </nav>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {account ?? (
            <>
              <SessionAwareLink signIn={signIn} workspace={workspace} className={buttonClasses("ghost", "sm", "hidden sm:inline-flex")} />
              <a href={cta.href} className={buttonClasses("primary", "sm", "hidden sm:inline-flex")}>{cta.label}</a>
              <MobileMenu label={t("b2b.mkt.nav.menu", "Menu")} links={sections ? links : []} signIn={signIn} workspace={workspace} cta={cta} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/** Language order and names of the marketplace footer's picker (each name in its own language). */
const LANGUAGES = [["en", "footer.english", "English"], ["es", "footer.spanish", "Español"], ["fr", "footer.french", "Français"], ["hu", "footer.hungarian", "Magyar"], ["ro", "footer.romanian", "Română"]] as const;

/**
 * Footer of the public B2B pages, in the marketplace footer's layout. The wordmark and "work4u home" lead back to the marketplace
 * index; `languagePath` (a field-service page) adds the language picker.
 */
export function B2bPublicFooter({ t, lang, languagePath }: { t: T; lang: string; languagePath?: string }): ReactNode {
  const link = "inline-flex min-h-[44px] items-center text-label font-normal text-ink-muted hover:text-ink";
  // fr / hu have no marketplace URLs: `/fr/…` redirects to the page and remembers the language, so the index opens in French.
  const marketplace = (path: string) => (lang === "fr" || lang === "hu" ? `/${lang}${path === "/" ? "" : path}` : localizedPath(lang, path));
  const indexHome = marketplace("/");
  return (
    <footer className="mt-auto border-t border-line bg-sunken">
      <div className="mx-auto flex max-w-content flex-col gap-6 px-[var(--gutter)] py-8 lg:flex-row lg:items-center lg:justify-between">
        <a href={indexHome} className="inline-flex min-h-[44px] items-center font-display text-xl font-bold text-primary hover:text-primary-strong">work4u</a>
        <nav aria-label={t("b2b.mkt.footer.legal", "Legal")} className="flex flex-wrap gap-x-5 gap-y-1">
          <a href={marketplace("/privacy")} className={link}>{t("b2b.mkt.footer.privacy", "Privacy")}</a>
          <a href={marketplace("/terms")} className={link}>{t("b2b.mkt.footer.terms", "Terms")}</a>
          <a href={b2bLocalizedPath(lang, B2B_DEMO_PATH)} className={link}>{t("b2b.mkt.footer.contact", "Contact")}</a>
          {/* Back to the marketplace: the "work4u for business" hub and the index page (same origin today, like the legal pages). */}
          <a href={marketplace("/business")} className={link}>{t("b2b.mkt.footer.business", "work4u for business")}</a>
          <a href={indexHome} className="inline-flex min-h-[44px] items-center gap-1 text-label text-primary hover:text-primary-strong">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("b2b.mkt.footer.home", "work4u home")}
          </a>
        </nav>
        <div className="flex flex-wrap items-center gap-4">
          {languagePath ? (
            <B2bLanguageMenu
              label={t("b2b.mkt.footer.language", "Language")}
              current={lang}
              options={LANGUAGES.map(([code, key, fb]) => ({ code, label: t(key, fb), href: b2bLocalizedPath(code, languagePath) }))}
            />
          ) : null}
          <p className="text-caption text-ink-muted">{t("b2b.mkt.footer.copy", "© {year} work4u").replace("{year}", String(new Date().getFullYear()))}</p>
        </div>
      </div>
    </footer>
  );
}
