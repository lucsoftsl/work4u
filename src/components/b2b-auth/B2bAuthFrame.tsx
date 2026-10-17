"use client";

import type { ReactNode } from "react";
import { useTranslation } from "@/lib/i18n";
import { b2bLocalizedPath, isAppLang } from "@/lib/i18n-routing";
import { B2B_DEMO_PATH } from "@/lib/b2b-paths";
import { buttonClasses } from "@/components/ui/Button";
import { B2bPublicFooter, B2bPublicHeader } from "@/components/b2b-public/B2bPublicChrome";
import { B2bAccountMenu } from "@/components/b2b-public/B2bAccountMenu";

/** Page frame of the B2B sign-in and company start: the public B2B header and footer around a centred column. */
export function B2bAuthFrame({ children }: { children: ReactNode }) {
  const { t, locale } = useTranslation();
  const lang = isAppLang(locale) ? locale : "en";
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <B2bPublicHeader
        t={t}
        lang={lang}
        account={
          <B2bAccountMenu
            labels={{ account: t("b2b.mkt.nav.account", "Account"), workspaces: t("b2b.mkt.nav.workspaces", "My workspaces"), signOut: t("b2b.mkt.nav.signOut", "Sign out") }}
            fallback={<a href={b2bLocalizedPath(lang, B2B_DEMO_PATH)} className={buttonClasses("primary", "sm")}>{t("b2b.mkt.nav.cta", "Request a demo")}</a>}
          />
        }
      />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <div className="mx-auto w-full max-w-xl px-[var(--gutter)] py-10 md:py-16">{children}</div>
      </main>
      <B2bPublicFooter t={t} lang={lang} />
    </div>
  );
}

export const fieldCls = "mt-1 block min-h-[48px] w-full rounded-control border border-line-strong bg-surface px-3 text-body text-ink focus:outline-none focus-visible:shadow-focus aria-[invalid=true]:border-ember-text";
export const labelCls = "block text-label font-bold text-ink";
export const primaryBtn = "inline-flex min-h-[52px] w-full items-center justify-center rounded-control bg-primary px-5 text-center text-body font-bold text-on-fill hover:bg-primary-strong focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-45";
export const secondaryBtn = "inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-control border border-line-strong bg-surface px-5 text-center text-body font-bold text-ink hover:bg-sunken focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-45";
