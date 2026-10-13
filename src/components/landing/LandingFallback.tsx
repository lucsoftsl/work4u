"use client";

import { useTranslation } from "@/lib/i18n";
import { HireWorkBand, HowItWorksSteps, LandingSection, PersonaSearch } from "@/components/landing/ui";

/**
 * Static landing shown when /api/landing fails or returns nothing to list. Built only from bundled
 * translations so visitors always get a working front door (search, post, browse), never an error box.
 * The global AppHeader/Footer and the single <main> come from the root layout.
 */
export function LandingFallback() {
  const { t } = useTranslation();

  return (
    <div className="bg-canvas text-ink">
      <section aria-labelledby="landing-hero-title" className="mx-auto w-full max-w-content px-[var(--gutter)] py-12 text-center md:py-20">
        <h1 id="landing-hero-title" className="mx-auto max-w-3xl font-display text-display text-ink">
          {t("landing.hero.line1")} <span className="block text-primary">{t("landing.hero.line2")}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-body-lg text-ink-muted">{t("landing.fallback.subtitle")}</p>
        <PersonaSearch centered className="mx-auto mt-8 max-w-3xl" />
      </section>

      <HireWorkBand />

      <LandingSection id="landing-how-title" title={t("how.title")} subtitle={t("how.subtitle")}>
        <HowItWorksSteps />
      </LandingSection>
    </div>
  );
}
