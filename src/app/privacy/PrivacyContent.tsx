"use client";

import Link from "next/link";
import { TERMS_VERSION, TERMS_EFFECTIVE_DATE } from "@/lib/legal";
import { useTranslation } from "@/lib/i18n";

const SECTION_IDS = [
  "controller",
  "whatWeCollect",
  "legalBases",
  "howWeUse",
  "sharing",
  "transfers",
  "retention",
  "rights",
  "cookies",
  "children",
  "security",
  "changes",
  "contact",
] as const;

export default function PrivacyContent() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <span className="eyebrow">{t("legal.eyebrow")}</span>
          <h1 className="mt-5 font-display text-4xl font-black tracking-tight text-ink md:text-5xl">
            {t("privacy.title")}
          </h1>
          <p className="mt-4 text-base leading-7 text-ink-muted">{t("privacy.intro")}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-subtle">
            <span>{t("legal.version")} {TERMS_VERSION}</span>
            <span>{t("legal.effective")} {TERMS_EFFECTIVE_DATE}</span>
            <Link href="/terms" className="font-semibold text-brand underline">
              {t("privacy.seeTermsLink")}
            </Link>
          </div>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-12">
          <nav aria-label="Table of contents" className="hidden lg:block">
            <div className="sticky top-24 surface-panel p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">{t("legal.onThisPage")}</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {SECTION_IDS.map((id) => (
                  <li key={id}>
                    <a href={`#${id}`} className="block rounded-lg px-2 py-1 text-ink-muted hover:bg-brand-soft hover:text-brand">
                      {t(`privacy.sections.${id}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <article className="surface-card max-w-none p-6 md:p-10">
            <div className="space-y-12 text-[15px] leading-7 text-ink">
              {SECTION_IDS.map((id) => (
                <section key={id} id={id} className="scroll-mt-24">
                  <h2 className="section-heading text-2xl md:text-3xl">{t(`privacy.sections.${id}`)}</h2>
                  <div dangerouslySetInnerHTML={{ __html: t(`privacy.body.${id}`) }} />
                  {id === "contact" && (
                    <p className="mt-1 text-sm text-ink-subtle">{t("legal.placeholderContactNote")}</p>
                  )}
                </section>
              ))}
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
