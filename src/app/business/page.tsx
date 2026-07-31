"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";
import {
  Building2,
  Zap,
  Repeat,
  ShieldCheck,
  ListChecks,
  CalendarClock,
  CircleDollarSign,
  ArrowRight,
} from "lucide-react";

export default function BusinessLandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const BENEFITS = [
    { icon: Zap, title: t('business.benefit1Title'), desc: t('business.benefit1Desc') },
    { icon: Repeat, title: t('business.benefit2Title'), desc: t('business.benefit2Desc') },
    { icon: ShieldCheck, title: t('business.benefit3Title'), desc: t('business.benefit3Desc') },
  ];

  const STEPS = [
    { number: 1, icon: ListChecks, title: t('business.step1Title'), desc: t('business.step1Desc') },
    { number: 2, icon: CalendarClock, title: t('business.step2Title'), desc: t('business.step2Desc') },
    { number: 3, icon: CircleDollarSign, title: t('business.step3Title'), desc: t('business.step3Desc') },
  ];

  function handleGetStarted() {
    router.push(isAuthenticated ? "/business/dashboard" : "/signin?redirect=/business/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-brand-soft text-brand rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Building2 size={14} />
            {t('business.badge')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-ink mb-4 tracking-tight max-w-2xl mx-auto">
            {t('business.heroTitle')}
          </h1>
          <p className="text-ink-muted text-lg max-w-xl mx-auto mb-8">
            {t('business.heroSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={handleGetStarted} className="px-8">
              {t('business.createAccount')}
            </Button>
          </div>
        </div>

        {/* Benefits grid */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-ink mb-2 text-center">
            {t('business.benefitsTitle')}
          </h2>
          <p className="text-sm text-ink-muted text-center mb-8">
            {t('business.benefitsSubtitle')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3.5 rounded-2xl border border-outline bg-card p-5">
                <div className="shrink-0 mt-0.5 w-8 h-8 rounded-xl bg-brand-soft flex items-center justify-center">
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

        {/* How it works */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-ink mb-2 text-center">{t('business.howItWorks')}</h2>
          <p className="text-sm text-ink-muted text-center mb-10">
            {t('business.howItWorksSubtitle')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
            {STEPS.map(({ number, icon: Icon, title, desc }, i) => (
              <div key={number} className="relative text-center">
                <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_14px_32px_rgba(30,109,138,0.2)]">
                  <Icon size={22} />
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-brand shadow-soft ring-1 ring-outline">
                    {number}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-ink mb-1.5">{title}</h3>
                <p className="text-xs text-ink-muted leading-relaxed max-w-[220px] mx-auto">{desc}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight
                    size={16}
                    className="hidden sm:block absolute top-6 -right-3 text-ink-subtle"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Closing CTA */}
        <div className="rounded-2xl bg-card border border-outline p-8 sm:p-10 text-center shadow-soft">
          <h2 className="text-2xl font-bold text-ink mb-2">{t('business.closingTitle')}</h2>
          <p className="text-ink-muted text-sm mb-6 max-w-md mx-auto">
            {t('business.closingDesc')}
          </p>
          <Button size="lg" onClick={handleGetStarted} className="px-8">
            {t('business.createAccount')}
          </Button>
        </div>
      </main>

    </div>
  );
}
