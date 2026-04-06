"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import {
  getSubscriptionStatus,
  createCheckoutSession,
  createPortalSession,
  type SubscriptionStatus,
} from "@/api/subscriptions";
import {
  Check,
  ChevronDown,
  Lock,
  Zap,
  TrendingUp,
  ShieldCheck,
  BarChart3,
  MessageCircle,
  Globe,
  EyeOff,
  Star,
  Clock,
  Award,
  Gift,
  Headphones,
} from "lucide-react";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  "Post up to 3 active job listings",
  "Browse and apply to all listings",
  "Standard profile visibility",
  "Community support",
];

const PRO_FEATURES = [
  "Unlimited active job posts",
  "Boost posts to the top of search results",
  "Extended post visibility — 90 days vs 14 days",
  "Priority profile visibility across the platform",
  "Verified Pro badge & gold crown on your profile",
  "Analytics — track views, saves & applications",
  "Direct message candidates and employers",
  "Custom public profile URL slug",
  "Ad-free browsing experience",
  "Access to exclusive passive talent pool",
  "Referral rewards — earn credits for every Pro invite",
  "Priority support from the work4u team",
  "Early access to new features",
];

const BENEFITS = [
  {
    icon: TrendingUp,
    title: "Boost to the Top",
    desc: "Pin your post to the top of search results and get seen first by every job seeker and employer on the platform.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Pro Badge",
    desc: "Stand out with a gold verified crown on your profile — instantly signal trust to employers and candidates.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    desc: "See how many people viewed, saved, or applied to your posts. Make data-driven hiring decisions.",
  },
  {
    icon: MessageCircle,
    title: "Direct Messaging",
    desc: "Reach out to candidates or employers directly without waiting for applications to come to you.",
  },
  {
    icon: Zap,
    title: "Unlimited Posts",
    desc: "Post as many job listings as you need with no cap. Free users are limited to 3 active posts at a time.",
  },
  {
    icon: Clock,
    title: "Extended Visibility",
    desc: "Pro posts stay live for 90 days vs 14 days on free — 6x more time to find the right match.",
  },
  {
    icon: Globe,
    title: "Custom Profile URL",
    desc: "Claim your own slug like work4u.ph/yourname instead of a random ID. Perfect for resumes and socials.",
  },
  {
    icon: Star,
    title: "Exclusive Talent Pool",
    desc: "Get access to passive job seekers who only appear to Pro members — high-quality candidates not visible to others.",
  },
  {
    icon: EyeOff,
    title: "Ad-Free Experience",
    desc: "Browse and manage listings without any ads or interruptions. A cleaner, faster experience end to end.",
  },
  {
    icon: Award,
    title: "Featured Employer Spotlight",
    desc: "Your company logo appears in the featured employers section on the homepage, building brand recognition.",
  },
  {
    icon: Gift,
    title: "Referral Rewards",
    desc: "Invite friends to go Pro and earn subscription credits. The more you share, the more you save.",
  },
  {
    icon: Headphones,
    title: "Dev Team Support",
    desc: "Direct access to the work4u development team. Got a feature request or bug? Pro members get prioritized.",
  },
];

const FAQS = [
  {
    q: "Can I cancel anytime?",
    a: "Yes — cancel with one click from your billing portal. Your Pro access stays active until the end of the current billing period, no questions asked.",
  },
  {
    q: "Is there a free trial?",
    a: "New Pro subscribers get a 7-day free trial. Cancel before it ends and you won't be charged a thing.",
  },
  {
    q: "What payment methods are accepted?",
    a: "Payments are handled by Stripe. We accept Visa, Mastercard, and GCash-linked cards. We never store your card details.",
  },
  {
    q: "Will my boosted posts reset each month?",
    a: "Yes. Boost credits refresh at the start of every billing cycle (monthly or yearly), so your posts stay competitive.",
  },
  {
    q: "What happens to my posts if I cancel?",
    a: "Your boosted posts return to standard visibility at the end of your billing period. All your posts and data stay intact — nothing gets deleted.",
  },
  {
    q: "Can I switch from monthly to yearly?",
    a: "Yes. Head to the billing portal anytime to switch plans. We'll prorate the difference so you only pay for what you use.",
  },
];

const STATS = [
  { value: "500+", label: "Pro members" },
  { value: "10k+", label: "jobs posted" },
  { value: "3×", label: "faster hire rate" },
  { value: "90 days", label: "post visibility" },
];

export default function PricingPage() {
  const router = useRouter();
  const { user, isAuthenticated, firebaseToken, loading: authLoading } = useAuth();

  const [billing, setBilling] = useState<"month" | "year">("month");
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [feedback, setFeedback] = useState<"success" | "canceled" | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) setFeedback("success");
    else if (params.get("canceled")) setFeedback("canceled");
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !firebaseToken) return;
    setLoadingStatus(true);
    getSubscriptionStatus(firebaseToken)
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoadingStatus(false));
  }, [isAuthenticated, firebaseToken]);

  const isPro = status?.plan === "pro" && status.status === "active";

  async function handleUpgrade() {
    if (!isAuthenticated) {
      router.push("/signin?redirect=/pricing");
      return;
    }
    if (!firebaseToken) return;
    setCheckoutLoading(true);
    try {
      const { url } = await createCheckoutSession(firebaseToken, billing);
      window.location.href = url;
    } catch {
      setCheckoutLoading(false);
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

  const monthlyPrice = 299;
  const yearlyPrice = 2499;
  const yearlySaving = Math.round(100 - (yearlyPrice / (monthlyPrice * 12)) * 100);

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-4 py-16">
        {/* Feedback banner */}
        {feedback === "success" && (
          <div className="mb-8 rounded-2xl bg-green-50 border border-green-200 px-5 py-4 text-green-800 text-sm font-medium flex items-center gap-2">
            <Check size={16} className="shrink-0" />
            Payment successful — welcome to work4u Pro!
          </div>
        )}
        {feedback === "canceled" && (
          <div className="mb-8 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 text-amber-800 text-sm">
            Checkout was canceled. You can upgrade anytime.
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand/10 text-brand rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Zap size={14} />
            work4u Pro
          </div>
          <h1 className="text-4xl font-bold text-ink mb-3">Unlock Premium Features</h1>
          <p className="text-ink-muted text-lg max-w-md mx-auto">
            Supercharge your work4u experience and get ahead of the competition.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center justify-center rounded-2xl border border-outline bg-card py-5 px-3"
            >
              <span className="text-2xl font-bold text-brand">{s.value}</span>
              <span className="text-xs text-ink-subtle mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Benefits grid */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-ink mb-2 text-center">Everything you unlock with Pro</h2>
          <p className="text-sm text-ink-muted text-center mb-8">
            One plan. No hidden limits. Every feature, all at once.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            Monthly
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
            Yearly
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                billing === "year"
                  ? "bg-white/20 text-white"
                  : "bg-accent/20 text-accent-foreground"
              )}
            >
              Save {yearlySaving}%
            </span>
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {/* Free */}
          <div className="rounded-2xl border border-outline bg-card p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-2">Free</p>
              <p className="text-4xl font-bold text-ink">₱0</p>
              <p className="text-sm text-ink-subtle mt-1">Free forever</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink-muted">
                  <Check size={15} className="shrink-0 mt-0.5 text-success" />
                  {f}
                </li>
              ))}
            </ul>
            <Button variant="outline" disabled className="w-full">
              {isAuthenticated ? "Current Plan" : "Get Started Free"}
            </Button>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border-2 border-brand bg-card p-8 flex flex-col relative shadow-soft">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-brand text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                Most Popular
              </span>
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold text-brand uppercase tracking-wider mb-2">Pro</p>
              {billing === "month" ? (
                <>
                  <p className="text-4xl font-bold text-ink">
                    ₱{monthlyPrice.toLocaleString()}
                    <span className="text-base font-normal text-ink-muted"> / mo</span>
                  </p>
                  <p className="text-sm text-ink-subtle mt-1">Billed monthly · 7-day free trial</p>
                </>
              ) : (
                <>
                  <p className="text-4xl font-bold text-ink">
                    ₱{Math.round(yearlyPrice / 12).toLocaleString()}
                    <span className="text-base font-normal text-ink-muted"> / mo</span>
                  </p>
                  <p className="text-sm text-ink-subtle mt-1">
                    ₱{yearlyPrice.toLocaleString()} billed annually · 7-day free trial
                  </p>
                </>
              )}
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                  <Check size={15} className="shrink-0 mt-0.5 text-brand" />
                  {f}
                </li>
              ))}
            </ul>

            {loadingStatus || authLoading ? (
              <div className="h-12 rounded-2xl bg-muted animate-pulse w-full" />
            ) : isPro ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={handlePortal}
                disabled={portalLoading}
              >
                {portalLoading ? "Opening portal…" : "Manage Subscription"}
              </Button>
            ) : (
              <Button
                className="w-full"
                size="lg"
                onClick={handleUpgrade}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? "Redirecting…" : "Start Free Trial"}
              </Button>
            )}

            {isPro && status?.cancelAtPeriodEnd && (
              <p className="text-xs text-center text-ink-subtle mt-2">
                Cancels at end of billing period
              </p>
            )}

            {!isPro && (
              <p className="text-xs text-center text-ink-subtle mt-2">
                7-day free trial · Cancel anytime
              </p>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-ink mb-6 text-center">Frequently Asked Questions</h2>
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
            Payments are securely processed by{" "}
            <span className="font-semibold text-ink-muted">Stripe</span>. We never store your card
            details.
          </span>
        </div>
      </main>

      <Footer />
    </div>
  );
}
