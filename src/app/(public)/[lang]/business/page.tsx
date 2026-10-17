"use client";

import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  CircleDollarSign,
  ListChecks,
  Repeat,
  ShieldCheck,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { buttonClasses } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";
import { b2bLocalizedPath } from "@/lib/i18n-routing";
import { B2B_DEMO_PATH, B2B_PUBLIC_HOME, b2bUrl } from "@/lib/b2b-paths";
import { cn } from "@/lib/utils";

const CONTAINER = "mx-auto w-full max-w-content px-[var(--gutter)]";
const ICON_CHIP = "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary";
const DASHBOARD = "/business/dashboard";

interface Item {
  icon: LucideIcon;
  title: string;
  desc: string;
}

/**
 * "work4u for business": the hub for everything offered to companies. Two paths: Field service (own technicians, the separate B2B
 * site, plain anchors because it lives outside the marketplace locale routing) and the marketplace roster/shifts product.
 */
export default function BusinessLandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { t, locale } = useTranslation();

  // The field-service site exists in en/ro/es only.
  // Field service exists in every app language (fr / hu on their own URLs), so the visitor's language carries over.
  const fieldServiceHref = b2bUrl(b2bLocalizedPath(locale, B2B_PUBLIC_HOME));
  const demoHref = b2bUrl(b2bLocalizedPath(locale, B2B_DEMO_PATH));

  const fieldPoints = [
    t("business.hub.field.point1", "A dispatch board that flags overlaps before you save"),
    t("business.hub.field.point2", "A technician app that keeps working offline"),
    t("business.hub.field.point3", "Every job ends with photos, parts and a signature"),
  ];
  const rosterPoints = [t("business.benefit1Title"), t("business.benefit2Title"), t("business.benefit3Title")];

  const benefits: Item[] = [
    { icon: Zap, title: t("business.benefit1Title"), desc: t("business.benefit1Desc") },
    { icon: Repeat, title: t("business.benefit2Title"), desc: t("business.benefit2Desc") },
    { icon: ShieldCheck, title: t("business.benefit3Title"), desc: t("business.benefit3Desc") },
  ];
  const steps: Item[] = [
    { icon: ListChecks, title: t("business.step1Title"), desc: t("business.step1Desc") },
    { icon: CalendarClock, title: t("business.step2Title"), desc: t("business.step2Desc") },
    { icon: CircleDollarSign, title: t("business.step3Title"), desc: t("business.step3Desc") },
  ];

  function handleGetStarted() {
    router.push(isAuthenticated ? DASHBOARD : `/signin?redirect=${DASHBOARD}`);
  }

  const pointList = (points: string[], onFill = false) => (
    <ul className="mt-5 space-y-2.5">
      {points.map((p) => (
        <li key={p} className="flex items-start gap-3 text-body">
          <span
            className={cn(
              "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
              onFill ? "bg-on-fill/15 text-on-fill" : "bg-primary-soft text-primary"
            )}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          {p}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="bg-canvas text-ink">
      {/* Hero */}
      <section aria-labelledby="business-hero-title" className={cn(CONTAINER, "py-10 md:py-16")}>
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-label text-primary">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t("business.badge")}
          </p>
          <h1 id="business-hero-title" className="mt-4 font-display text-display text-ink">
            {t("business.hub.titleLine1", "Tools for companies,")}{" "}
            <span className="block text-primary">{t("business.hub.titleLine2", "whoever does the work.")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-body-lg text-ink-muted">
            {t(
              "business.hub.subtitle",
              "Run your own field team with dispatch and a technician app, or build a roster of vetted marketplace workers and book them directly."
            )}
          </p>
        </div>

        {/* The two paths */}
        <div className="mt-10 grid gap-4 md:grid-cols-2 md:gap-0 md:overflow-hidden md:rounded-card md:border md:border-line md:shadow-stamp">
          <article
            aria-labelledby="business-path-field"
            className="flex flex-col items-start rounded-card bg-primary p-6 text-on-fill md:rounded-none md:p-10"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-on-fill/15">
              <Truck className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-5 text-micro uppercase opacity-80">{t("business.hub.field.eyebrow", "Your own technicians")}</p>
            <h2 id="business-path-field" className="mt-2 font-display text-h2">
              {t("business.hub.field.title", "work4u Field service")}
            </h2>
            <p className="mt-3 max-w-md text-body opacity-90">
              {t(
                "business.hub.field.body",
                "Create, schedule and dispatch jobs to your team, and review every finished job with proof."
              )}
            </p>
            {pointList(fieldPoints, true)}
            <div className="mt-auto flex flex-wrap gap-3 pt-8">
              <a href={fieldServiceHref} className={buttonClasses("secondary", "default", "border-surface")}>
                {t("business.hub.field.cta", "Explore Field service")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href={demoHref}
                className="inline-flex min-h-[44px] items-center rounded-control px-2 text-label text-on-fill underline decoration-2 underline-offset-4 hover:opacity-90"
              >
                {t("business.hub.field.demo", "Request a demo")}
              </a>
            </div>
          </article>

          <article
            aria-labelledby="business-path-roster"
            className="flex flex-col items-start rounded-card border border-line bg-surface p-6 md:rounded-none md:border-0 md:p-10"
          >
            <span className={ICON_CHIP}>
              <Users className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-5 text-micro uppercase text-ink-muted">{t("business.hub.roster.eyebrow", "Marketplace workers")}</p>
            <h2 id="business-path-roster" className="mt-2 font-display text-h2 text-ink">
              {t("business.heroTitle")}
            </h2>
            <p className="mt-3 max-w-md text-body text-ink-muted">{t("business.heroSubtitle")}</p>
            {pointList(rosterPoints)}
            <div className="mt-auto flex flex-wrap gap-3 pt-8">
              <button type="button" onClick={handleGetStarted} className={buttonClasses("primary", "default")}>
                {t("business.createAccount")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <a
                href="#business-roster"
                className="inline-flex min-h-[44px] items-center rounded-control px-2 text-label text-primary hover:underline"
              >
                {t("business.howItWorks")}
              </a>
            </div>
          </article>
        </div>
      </section>

      {/* Marketplace roster: benefits */}
      <section id="business-roster" aria-labelledby="business-benefits-title" className="scroll-mt-20 border-t border-line">
        <div className={cn(CONTAINER, "py-12 md:py-16")}>
          <div className="mb-6 max-w-2xl">
            <h2 id="business-benefits-title" className="font-display text-h2 text-ink">
              {t("business.benefitsTitle")}
            </h2>
            <p className="mt-1 text-body text-ink-muted">{t("business.benefitsSubtitle")}</p>
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <li
                key={title}
                className="rounded-card border border-line bg-surface p-5 transition-[border-color,box-shadow] duration-fast hover:border-line-strong hover:shadow-stamp"
              >
                <span className={ICON_CHIP}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-h3 text-ink">{title}</h3>
                <p className="mt-1 text-body text-ink-muted">{desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Marketplace roster: steps */}
      <section aria-labelledby="business-steps-title" className="border-t border-line">
        <div className={cn(CONTAINER, "py-12 md:py-16")}>
          <div className="mb-6 max-w-2xl">
            <h2 id="business-steps-title" className="font-display text-h2 text-ink">
              {t("business.howItWorks")}
            </h2>
            <p className="mt-1 text-body text-ink-muted">{t("business.howItWorksSubtitle")}</p>
          </div>
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, desc }, i) => (
              <li key={title} className="rounded-card border border-line bg-surface p-6">
                <div className="flex items-center justify-between">
                  <span className={ICON_CHIP}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span aria-hidden="true" className="font-display text-h3 tabular text-ink-subtle">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-h3 text-ink">{title}</h3>
                <p className="mt-1 text-body text-ink-muted">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing */}
      <section aria-labelledby="business-closing-title" className="border-t border-line">
        <div className={cn(CONTAINER, "py-12 md:py-16")}>
          <div className="flex flex-col items-start gap-6 rounded-card border border-line bg-surface p-6 shadow-stamp md:flex-row md:items-center md:justify-between md:p-10">
            <div className="max-w-xl">
              <h2 id="business-closing-title" className="font-display text-h2 text-ink">
                {t("business.closingTitle")}
              </h2>
              <p className="mt-2 text-body text-ink-muted">{t("business.closingDesc")}</p>
            </div>
            <div className="flex flex-wrap gap-3 md:shrink-0 lg:flex-nowrap">
              <button type="button" onClick={handleGetStarted} className={buttonClasses("primary", "lg")}>
                {t("business.createAccount")}
              </button>
              <a href={fieldServiceHref} className={buttonClasses("secondary", "lg")}>
                {t("business.hub.field.cta", "Explore Field service")}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
