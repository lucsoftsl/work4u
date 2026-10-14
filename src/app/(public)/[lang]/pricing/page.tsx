"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Clock, Lock, TrendingUp, Zap, type LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/QueryState";
import { useToast } from "@/components/ui/Toast";
import { formatMoney } from "@/components/ui/MoneyPlate";
import { getSubscriptionStatus, createCheckoutSession, createPortalSession, type SubscriptionStatus, type Plan } from "@/api/subscriptions";
import { billingErrorKey, anyPlanAvailable, isPlanAvailable, showIntervalToggle } from "@/lib/billing-plans";
import { usePlans } from "@/hooks/usePlans";
import { signInPath } from "@/lib/auth-redirect";
import { cn } from "@/lib/utils";
import { usePlanLimits } from "@/lib/plan-entitlements";
import { HomeBackLink } from "@/components/ui/BackLink";

type PayablePlan = Exclude<Plan, "free" | "business">;
type Billing = "month" | "year";

interface Tier {
  id: "free" | PayablePlan;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  emphasised?: boolean;
  features: string[];
}

interface FaqItem {
  q: string;
  a: string;
}

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const baseId = useId();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {items.map((faq, i) => {
        const expanded = open === i;
        return (
          <div key={faq.q}>
            <h3>
              <button
                type="button"
                id={`${baseId}-q${i}`}
                aria-expanded={expanded}
                aria-controls={`${baseId}-a${i}`}
                onClick={() => setOpen(expanded ? null : i)}
                className="flex min-h-[56px] w-full items-center justify-between gap-4 px-5 py-3 text-left text-body font-bold text-ink transition-colors duration-fast hover:bg-sunken"
              >
                <span className="min-w-0">{faq.q}</span>
                <ChevronDown
                  className={cn("h-5 w-5 shrink-0 text-ink-muted transition-transform duration-fast", expanded && "rotate-180")}
                  aria-hidden="true"
                />
              </button>
            </h3>
            <div id={`${baseId}-a${i}`} role="region" aria-labelledby={`${baseId}-q${i}`} hidden={!expanded} className="px-5 pb-4 text-body text-ink-muted">
              {faq.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const { isAuthenticated, firebaseToken, loading: authLoading } = useAuth();
  const { t, locale } = useTranslation();
  const { push } = useToast();
  const { plans, loaded: plansLoaded } = usePlans();
  const planLimits = usePlanLimits();

  // Limit lines come from the admin-editable plan settings, so the copy never contradicts what is enforced.
  const planFeatures = (plan: Plan, extra: string[]): string[] => {
    const limits = planLimits[plan];
    const lines = [
      limits.postLimit === null
        ? t("pricing.feature.unlimitedPosts", "Unlimited active job & service listings")
        : t("pricing.feature.postLimit", "Up to {limit} active job & service listings").replace("{limit}", String(limits.postLimit)),
    ];
    if (plan !== "free") {
      lines.push(
        t("pricing.feature.visibility", "Extended post visibility — {days} days vs {freeDays}")
          .replace("{days}", String(limits.expiryDays))
          .replace("{freeDays}", String(planLimits.free.expiryDays))
      );
    }
    if (limits.boost) lines.push(t("pricing.proFeature2"));
    if (limits.companyFeatures) lines.push(t("pricing.businessFeature1"));
    return [...lines, ...extra];
  };
  const maxPaidDays = Math.max(planLimits.starter.expiryDays, planLimits.pro.expiryDays, planLimits.business.expiryDays);

  const tiers: Tier[] = [
    {
      id: "free",
      name: t("pricing.freeTierName"),
      tagline: t("pricing.freeTierTagline"),
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: planFeatures("free", [3, 4, 5].map((n) => t(`pricing.freeFeature${n}`))),
    },
    {
      id: "starter",
      name: t("pricing.starterTierName"),
      tagline: t("pricing.starterTierTagline"),
      monthlyPrice: 9,
      yearlyPrice: 75,
      features: planFeatures("starter", [t("pricing.starterFeature3")]),
    },
    {
      id: "pro",
      name: t("pricing.proTierName"),
      tagline: t("pricing.proTierTagline"),
      monthlyPrice: 29,
      yearlyPrice: 240,
      emphasised: true,
      features: planFeatures("pro", [t("pricing.proFeature4")]),
    },
  ];

  const benefits: { icon: LucideIcon; title: string; desc: string }[] = [
    { icon: TrendingUp, title: t("pricing.benefit1Title"), desc: t("pricing.benefit1Desc") },
    {
      icon: Zap,
      title: t("pricing.benefit2Title"),
      desc: t("pricing.benefit2DescTemplate", "Free accounts are limited to {limit} active listings — paid plans raise or remove that cap.").replace(
        "{limit}",
        String(planLimits.free.postLimit ?? "∞")
      ),
    },
    {
      icon: Clock,
      title: t("pricing.benefit3Title"),
      desc: t("pricing.benefit3DescTemplate", "Paid listings stay live for up to {days} days vs {freeDays} on free — more time to find the right match.")
        .replace("{days}", String(maxPaidDays))
        .replace("{freeDays}", String(planLimits.free.expiryDays)),
    },
  ];

  const faqs: FaqItem[] = [1, 2, 3, 4].map((n) => ({ q: t(`pricing.faq${n}Question`), a: t(`pricing.faq${n}Answer`) }));

  const [billing, setBilling] = useState<Billing>("month");
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<PayablePlan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [feedback, setFeedback] = useState<"success" | "canceled" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) setFeedback("success");
    else if (params.get("canceled")) setFeedback("canceled");
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !firebaseToken) return;
    let isActive = true;
    const load = async () => {
      try {
        setLoadingStatus(true);
        const result = await getSubscriptionStatus(firebaseToken);
        if (isActive) setStatus(result);
      } catch (error) {
        console.error("Failed to load subscription status:", error);
        if (isActive) setStatus(null);
      } finally {
        if (isActive) setLoadingStatus(false);
      }
    };
    void load();
    return () => {
      isActive = false;
    };
  }, [isAuthenticated, firebaseToken]);

  const currentPlan: Plan = status?.status === "active" || status?.status === "trialing" ? status.plan : "free";

  async function handleUpgrade(planId: PayablePlan) {
    if (!isAuthenticated) {
      router.push(signInPath("/pricing"));
      return;
    }
    if (!firebaseToken) return;
    setCheckoutLoadingPlan(planId);
    try {
      const { url } = await createCheckoutSession(firebaseToken, planId, billing);
      window.location.assign(url);
    } catch (error) {
      console.error("Checkout failed:", error);
      push({ tone: "error", message: t(billingErrorKey(error)) });
      setCheckoutLoadingPlan(null);
    }
  }

  async function handlePortal() {
    if (!firebaseToken) return;
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession(firebaseToken);
      window.location.href = url;
    } catch (error) {
      console.error("Billing portal failed:", error);
      push({ tone: "error", message: t(billingErrorKey(error)) });
      setPortalLoading(false);
    }
  }

  const money = (amount: number) => formatMoney(amount, "EUR", locale);
  const busy = loadingStatus || authLoading || !plansLoaded;

  return (
    <div className="mx-auto w-full max-w-content px-[var(--gutter)] py-8 md:py-12">
      <HomeBackLink className="mb-2" />
      {feedback === "success" ? (
        <p role="status" className="mb-6 flex items-center gap-2 rounded-card border-l-4 border-l-success bg-success-soft px-4 py-3 text-label text-ink">
          <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          {t("pricing.paymentSuccessBanner")}
        </p>
      ) : null}
      {feedback === "canceled" ? (
        <p role="status" className="mb-6 rounded-card border-l-4 border-l-warning bg-warning-soft px-4 py-3 text-label text-ink">
          {t("pricing.paymentCanceledBanner")}
        </p>
      ) : null}

      <header className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-h1 text-ink">{t("pricing.heroTitle")}</h1>
        <p className="mt-3 text-body-lg text-ink-muted">{t("pricing.heroSubtitle")}</p>
        {plansLoaded && !anyPlanAvailable(plans) ? (
          <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-control bg-info-soft px-3 py-2 text-label text-ink">
            <Clock className="h-4 w-4 shrink-0 text-info" aria-hidden="true" />
            {t("pricing.comingSoonNote")}
          </p>
        ) : null}
        {showIntervalToggle(plans, ["starter", "pro"]) ? (
        <div className="mt-6 flex justify-center">
          <SegmentedControl
            label={t("pricing.billingLabel")}
            value={billing}
            onChange={setBilling}
            options={[
              { value: "month", label: t("pricing.billingMonthly") },
              { value: "year", label: `${t("pricing.billingYearly")} · ${t("pricing.billingSavePercent")}` },
            ]}
          />
        </div>
        ) : null}
      </header>

      {currentPlan === "business" && !status?.unlimited ? (
        <div className="mx-auto mt-6 flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-4">
          <p className="text-label font-normal text-ink">{t("pricing.onBusinessPlan")}</p>
          <Button variant="secondary" onClick={handlePortal} loading={portalLoading}>
            {t("pricing.manageSubscriptionLabel")}
          </Button>
        </div>
      ) : null}

      <ul className="mt-10 grid items-stretch gap-6 lg:grid-cols-3 lg:gap-5">
        {tiers.map((tier) => {
          const isCurrent = currentPlan === tier.id;
          const isFree = tier.id === "free";
          const displayPrice = billing === "month" ? tier.monthlyPrice : Math.round(tier.yearlyPrice / 12);
          return (
            <li
              key={tier.id}
              className={cn(
                "relative flex flex-col rounded-card bg-surface p-6",
                tier.emphasised
                  ? "order-first border-2 border-primary shadow-stamp lg:order-none lg:-my-3 lg:p-8"
                  : "border border-line"
              )}
            >
              {tier.emphasised ? (
                <span className="absolute -top-3 left-6 inline-flex h-6 items-center rounded-control bg-primary px-2 text-micro uppercase text-on-fill">
                  {t("pricing.mostPopularBadge")}
                </span>
              ) : null}
              {isCurrent && !isFree ? (
                <span className="mb-3 inline-flex h-7 w-fit items-center gap-1.5 rounded-control bg-success-soft px-2 text-caption font-bold text-success">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("pricing.currentPlanLabel")}
                </span>
              ) : null}

              <h2 className="font-display text-h3 text-ink">{tier.name}</h2>
              <p className="mt-1 text-label font-normal text-ink-muted">{tier.tagline}</p>

              <p className="mt-5 font-display text-display leading-none tabular text-money">
                {money(displayPrice)}
                {isFree ? null : <span className="ml-1 font-body text-label font-normal text-ink-muted">{t("pricing.perMonthSuffix")}</span>}
              </p>
              <p className="mt-2 min-h-[1.25rem] text-caption text-ink-muted">
                {!isFree && billing === "year" ? `${money(tier.yearlyPrice)} ${t("pricing.billedAnnually")}` : ""}
              </p>

              <ul className="mb-8 mt-5 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-body text-ink-muted">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    <span className="min-w-0">{feature}</span>
                  </li>
                ))}
              </ul>

              {busy ? (
                <Skeleton className="h-11 w-full" />
              ) : isFree ? (
                <Button variant="secondary" disabled className="w-full">
                  {isAuthenticated && currentPlan === "free" ? t("pricing.currentPlanLabel") : t("pricing.freeIncluded")}
                </Button>
              ) : isCurrent ? (
                <Button variant="secondary" className="w-full" onClick={handlePortal} loading={portalLoading}>
                  {portalLoading ? t("pricing.openingPortalLabel") : t("pricing.manageSubscriptionLabel")}
                </Button>
              ) : !isPlanAvailable(plans, tier.id as PayablePlan, billing) ? (
                <Button variant="secondary" disabled className="w-full">
                  {t("pricing.comingSoon")}
                </Button>
              ) : (
                <Button
                  variant={tier.emphasised ? "primary" : "secondary"}
                  size={tier.emphasised ? "lg" : "default"}
                  className="w-full"
                  onClick={() => handleUpgrade(tier.id as PayablePlan)}
                  loading={checkoutLoadingPlan === tier.id}
                  disabled={checkoutLoadingPlan !== null}
                >
                  {checkoutLoadingPlan === tier.id ? t("pricing.redirectingLabel") : `${t("pricing.upgradeToPrefix")} ${tier.name}`}
                </Button>
              )}

              {isCurrent && !isFree && status?.cancelAtPeriodEnd ? (
                <p className="mt-2 text-center text-caption text-ink-muted">{t("pricing.cancelsAtPeriodEnd")}</p>
              ) : null}
              {!isCurrent && !isFree && isPlanAvailable(plans, tier.id as PayablePlan, billing) ? <p className="mt-2 text-center text-caption text-ink-muted">{t("pricing.cancelAnytimeNote")}</p> : null}
            </li>
          );
        })}
      </ul>

      <section aria-labelledby="pricing-benefits-heading" className="mt-16">
        <h2 id="pricing-benefits-heading" className="font-display text-h2 text-ink">
          {t("pricing.benefitsTitle")}
        </h2>
        <p className="mt-1 text-body text-ink-muted">{t("pricing.benefitsSubtitleIndividual")}</p>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {benefits.map(({ icon: Icon, title, desc }) => (
            <li key={title} className="flex gap-3.5 rounded-card border border-line bg-surface p-5">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0">
                <h3 className="text-body font-bold text-ink">{title}</h3>
                <p className="mt-1 text-label font-normal text-ink-muted">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pricing-faq-heading" className="mx-auto mt-16 max-w-3xl">
        <h2 id="pricing-faq-heading" className="font-display text-h2 text-ink">
          {t("pricing.faqTitle")}
        </h2>
        <div className="mt-6">
          <FaqAccordion items={faqs} />
        </div>
      </section>

      <p className="mt-12 flex items-center justify-center gap-2.5 text-center text-label font-normal text-ink-muted">
        <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {t("pricing.trustBarPrefix")} <span className="font-bold text-ink">Stripe</span>. {t("pricing.trustBarSuffix")}
        </span>
      </p>
    </div>
  );
}
