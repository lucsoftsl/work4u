"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import {
  getSubscriptionStatus,
  createCheckoutSession,
  createPortalSession,
  type SubscriptionStatus,
  type Plan,
} from "@/api/subscriptions";
import {
  Check,
  ChevronDown,
  Lock,
  Zap,
  TrendingUp,
  Clock,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PayablePlan = Exclude<Plan, "free">;

interface Tier {
  id: Plan;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  badge?: string;
  features: string[];
}

function formatEuro(amount: number) {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function PricingPage() {
  const router = useRouter();
  const { isAuthenticated, firebaseToken, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const TIERS: Tier[] = [
    {
      id: "free",
      name: t('pricing.freeTierName'),
      tagline: t('pricing.freeTierTagline'),
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        t('pricing.freeFeature1'),
        t('pricing.freeFeature2'),
        t('pricing.freeFeature3'),
        t('pricing.freeFeature4'),
        t('pricing.freeFeature5'),
      ],
    },
    {
      id: "starter",
      name: t('pricing.starterTierName'),
      tagline: t('pricing.starterTierTagline'),
      monthlyPrice: 9,
      yearlyPrice: 75,
      features: [
        t('pricing.starterFeature1'),
        t('pricing.starterFeature2'),
        t('pricing.starterFeature3'),
      ],
    },
    {
      id: "pro",
      name: t('pricing.proTierName'),
      tagline: t('pricing.proTierTagline'),
      monthlyPrice: 29,
      yearlyPrice: 240,
      badge: t('pricing.mostPopularBadge'),
      features: [
        t('pricing.proFeature1'),
        t('pricing.proFeature2'),
        t('pricing.proFeature3'),
        t('pricing.proFeature4'),
      ],
    },
    {
      id: "business",
      name: t('pricing.businessTierName'),
      tagline: t('pricing.businessTierTagline'),
      monthlyPrice: 59,
      yearlyPrice: 480,
      features: [
        t('pricing.businessFeature1'),
        t('pricing.businessFeature2'),
        t('pricing.businessFeature3'),
      ],
    },
  ];

  const BENEFITS = [
    {
      icon: TrendingUp,
      title: t('pricing.benefit1Title'),
      desc: t('pricing.benefit1Desc'),
    },
    {
      icon: Zap,
      title: t('pricing.benefit2Title'),
      desc: t('pricing.benefit2Desc'),
    },
    {
      icon: Clock,
      title: t('pricing.benefit3Title'),
      desc: t('pricing.benefit3Desc'),
    },
    {
      icon: Building2,
      title: t('pricing.benefit4Title'),
      desc: t('pricing.benefit4Desc'),
    },
  ];

  const FAQS = [
    {
      q: t('pricing.faq1Question'),
      a: t('pricing.faq1Answer'),
    },
    {
      q: t('pricing.faq2Question'),
      a: t('pricing.faq2Answer'),
    },
    {
      q: t('pricing.faq3Question'),
      a: t('pricing.faq3Answer'),
    },
    {
      q: t('pricing.faq4Question'),
      a: t('pricing.faq4Answer'),
    },
  ];

  const [billing, setBilling] = useState<"month" | "year">("month");
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<PayablePlan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [businessIntent, setBusinessIntent] = useState(false);

  const [feedback, setFeedback] = useState<"success" | "canceled" | null>(null);
  useEffect(() => {
    const read = () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (params.get("success")) setFeedback("success");
      else if (params.get("canceled")) setFeedback("canceled");
      if (params.get("intent") === "business") setBusinessIntent(true);
    };
    read();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !firebaseToken) return;

    const load = async () => {
      try {
        setLoadingStatus(true);
        const result = await getSubscriptionStatus(firebaseToken);
        setStatus(result);
      } catch {
        setStatus(null);
      } finally {
        setLoadingStatus(false);
      }
    };
    void load();
  }, [isAuthenticated, firebaseToken]);

  const currentPlan = status?.status === "active" || status?.status === "trialing" ? status.plan : "free";

  async function handleUpgrade(planId: PayablePlan) {
    if (!isAuthenticated) {
      router.push("/signin?redirect=/pricing");
      return;
    }
    if (!firebaseToken) return;
    setCheckoutLoadingPlan(planId);
    try {
      const { url } = await createCheckoutSession(firebaseToken, planId, billing);
      window.location.assign(url);
    } catch {
      setCheckoutLoadingPlan(null);
    }
  }

  async function handlePortal() {
    if (!firebaseToken) return;
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession(firebaseToken);
      window.location.href = url;
    } catch {
      setPortalLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 py-16">
        {/* Feedback banner */}
        {feedback === "success" && (
          <div className="mb-8 rounded-2xl bg-green-50 border border-green-200 px-5 py-4 text-green-800 text-sm font-medium flex items-center gap-2">
            <Check size={16} className="shrink-0" />
            {t('pricing.paymentSuccessBanner')}
          </div>
        )}
        {feedback === "canceled" && (
          <div className="mb-8 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 text-amber-800 text-sm">
            {t('pricing.paymentCanceledBanner')}
          </div>
        )}
        {businessIntent && (
          <div className="mb-8 rounded-2xl bg-brand/10 border border-brand/30 px-5 py-4 text-sm text-ink flex items-center gap-2.5">
            <Building2 size={16} className="shrink-0 text-brand" />
            {t('pricing.businessIntentBannerPrefix')}{" "}
            <span className="font-semibold">{t('pricing.businessTierName')}</span>{" "}
            {t('pricing.businessIntentBannerSuffix')}
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand/10 text-brand rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Zap size={14} />
            {t('pricing.heroBadge')}
          </div>
          <h1 className="text-4xl font-bold text-ink mb-3">{t('pricing.heroTitle')}</h1>
          <p className="text-ink-muted text-lg max-w-md mx-auto">
            {t('pricing.heroSubtitle')}
          </p>
        </div>

        {/* Benefits grid */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-ink mb-2 text-center">{t('pricing.benefitsTitle')}</h2>
          <p className="text-sm text-ink-muted text-center mb-8">
            {t('pricing.benefitsSubtitle')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-3.5 rounded-2xl border border-outline bg-card p-5"
              >
                <div className="shrink-0 mt-0.5 w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Icon size={16} className="text-brand" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink mb-1">{title}</p>
                  <p className="text-xs text-ink-muted leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setBilling("month")}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-medium transition-all",
              billing === "month"
                ? "bg-brand text-white shadow-sm"
                : "text-ink-muted hover:text-ink"
            )}
          >
            {t('pricing.billingMonthly')}
          </button>
          <button
            onClick={() => setBilling("year")}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5",
              billing === "year"
                ? "bg-brand text-white shadow-sm"
                : "text-ink-muted hover:text-ink"
            )}
          >
            {t('pricing.billingYearly')}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                billing === "year"
                  ? "bg-white/20 text-white"
                  : "bg-accent/20 text-accent-foreground"
              )}
            >
              {t('pricing.billingSavePercent')}
            </span>
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {TIERS.map((tier) => {
            const isCurrent = currentPlan === tier.id;
            const isFree = tier.id === "free";
            const isBusiness = tier.id === "business";
            const displayPrice = billing === "month" ? tier.monthlyPrice : Math.round(tier.yearlyPrice / 12);

            return (
              <div
                key={tier.id}
                className={cn(
                  "rounded-2xl bg-card p-6 flex flex-col relative",
                  tier.badge
                    ? "border-2 border-brand shadow-soft"
                    : isBusiness && businessIntent
                      ? "border-2 border-brand shadow-soft"
                      : "border border-outline"
                )}
              >
                {tier.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="whitespace-nowrap bg-brand text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                      {tier.badge}
                    </span>
                  </div>
                )}
                {!tier.badge && isBusiness && businessIntent && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="whitespace-nowrap bg-brand text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                      {t('pricing.recommendedForYouBadge')}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <p className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-2">{tier.name}</p>
                  {isFree ? (
                    <>
                      <p className="text-4xl font-bold text-ink">€0</p>
                      <p className="text-sm text-ink-subtle mt-1">{tier.tagline}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-4xl font-bold text-ink">
                        €{formatEuro(displayPrice)}
                        <span className="text-base font-normal text-ink-muted"> {t('pricing.perMonthSuffix')}</span>
                      </p>
                      <p className="text-sm text-ink-subtle mt-1">
                        {billing === "month" ? tier.tagline : `€${formatEuro(tier.yearlyPrice)} ${t('pricing.billedAnnually')}`}
                      </p>
                    </>
                  )}
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-ink-muted">
                      <Check size={15} className="shrink-0 mt-0.5 text-success" />
                      {f}
                    </li>
                  ))}
                </ul>

                {loadingStatus || authLoading ? (
                  <div className="h-12 rounded-2xl bg-muted animate-pulse w-full" />
                ) : isFree ? (
                  <Button variant="outline" disabled className="w-full">
                    {isAuthenticated ? t('pricing.currentPlanLabel') : t('pricing.getStartedFreeLabel')}
                  </Button>
                ) : isCurrent ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handlePortal}
                    disabled={portalLoading}
                  >
                    {portalLoading ? t('pricing.openingPortalLabel') : t('pricing.manageSubscriptionLabel')}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => handleUpgrade(tier.id as PayablePlan)}
                    disabled={checkoutLoadingPlan !== null}
                  >
                    {checkoutLoadingPlan === tier.id ? t('pricing.redirectingLabel') : `${t('pricing.upgradeToPrefix')} ${tier.name}`}
                  </Button>
                )}

                {isCurrent && status?.cancelAtPeriodEnd && (
                  <p className="text-xs text-center text-ink-subtle mt-2">
                    {t('pricing.cancelsAtPeriodEnd')}
                  </p>
                )}
                {!isCurrent && !isFree && (
                  <p className="text-xs text-center text-ink-subtle mt-2">{t('pricing.cancelAnytimeNote')}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-ink mb-6 text-center">{t('pricing.faqTitle')}</h2>
          <div className="divide-y divide-outline rounded-2xl border border-outline overflow-hidden">
            {FAQS.map((faq, i) => (
              <div key={i}>
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-medium text-ink hover:bg-muted/50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {faq.q}
                  <ChevronDown
                    size={16}
                    className={cn(
                      "shrink-0 text-ink-muted transition-transform",
                      openFaq === i && "rotate-180"
                    )}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-sm text-ink-muted">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trust bar */}
        <div className="flex items-center justify-center gap-2.5 text-sm text-ink-subtle">
          <Lock size={14} className="shrink-0" />
          <span>
            {t('pricing.trustBarPrefix')}{" "}
            <span className="font-semibold text-ink-muted">Stripe</span>. {t('pricing.trustBarSuffix')}
          </span>
        </div>
      </main>
    </div>
  );
}
