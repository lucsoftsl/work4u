"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function HowItWorksPage() {
  const { t } = useTranslation();
  const steps = [
    {
      number: 1,
      title: t('how.step1Title'),
      description: t('how.step1Desc'),
      image: "🚀",
    },
    {
      number: 2,
      title: t('how.step2Title'),
      description: t('how.step2Desc'),
      image: "🔍",
    },
    {
      number: 3,
      title: t('how.step3Title'),
      description: t('how.step3Desc'),
      image: "📋",
    },
    {
      number: 4,
      title: t('how.step4Title'),
      description: t('how.step4Desc'),
      image: "💬",
    },
    {
      number: 5,
      title: t('how.step5Title'),
      description: t('how.step5Desc'),
      image: "💰",
    },
    {
      number: 6,
      title: t('how.step6Title'),
      description: t('how.step6Desc'),
      image: "⭐",
    },
  ];

  const features = [
    { icon: "🔒", title: t('how.feature1Title'), desc: t('how.feature1Desc') },
    { icon: "💬", title: t('how.feature2Title'), desc: t('how.feature2Desc') },
    { icon: "⭐", title: t('how.feature3Title'), desc: t('how.feature3Desc') },
    { icon: "🌍", title: t('how.feature4Title'), desc: t('how.feature4Desc') },
  ];

  return (
    <div className="min-h-screen bg-card">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/20 to-primary/5 py-16 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">{t('how.title')}</h1>
          <p className="text-xl text-muted-foreground">{t('how.subtitle')}</p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="text-5xl mb-4">{step.image}</div>
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground mb-12 text-center">{t('how.whyChoose')}</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="flex gap-4 p-6 bg-card rounded-lg border border-border">
                <span className="text-4xl">{feature.icon}</span>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">{t('home.ctaTitle')}</h2>
          <Link href="/jobs">
            <Button size="lg" className="gap-2">
              {t('jobs.title')} <ChevronRight size={20} />
            </Button>
          </Link>
        </div>
      </section>

    </div>
  );
}
