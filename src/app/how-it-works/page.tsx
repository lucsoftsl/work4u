"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import Footer from "@/components/Footer";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

export default function HowItWorksPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const steps = [
    {
      number: 1,
      title: "Create Your Account",
      description: "Sign up as a worker or employer in seconds",
      image: "🚀",
    },
    {
      number: 2,
      title: "Find or Post Work",
      description: "Browse available jobs or post your own work",
      image: "🔍",
    },
    {
      number: 3,
      title: "Apply or Hire",
      description: "Apply to jobs or review applications from talented workers",
      image: "📋",
    },
    {
      number: 4,
      title: "Collaborate & Complete",
      description: "Work together, communicate, and deliver great results",
      image: "💬",
    },
    {
      number: 5,
      title: "Get Paid",
      description: "Secure payments and instant transfers",
      image: "💰",
    },
    {
      number: 6,
      title: "Rate & Review",
      description: "Build your reputation with reviews and ratings",
      image: "⭐",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            work4u
          </Link>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.push('/signin')}>{t('nav.signIn')}</Button>
            <Button onClick={() => router.push('/signup')}>{t('nav.getStarted')}</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('how.title')}</h1>
          <p className="text-xl text-gray-600">Simple, secure, and straightforward</p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="text-5xl mb-4">{step.image}</div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Why Choose work4u?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { icon: "🔒", title: "Safe & Secure", desc: "Protected payments and verified users" },
              { icon: "💬", title: "Easy Communication", desc: "Built-in messaging for collaboration" },
              { icon: "⭐", title: "Ratings & Reviews", desc: "Build trust through feedback" },
              { icon: "🌍", title: "Global Marketplace", desc: "Find work from anywhere" },
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 p-6 bg-white rounded-lg border border-gray-200">
                <span className="text-4xl">{feature.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('home.ctaTitle')}</h2>
          <Link href="/jobs">
            <Button size="lg" className="gap-2">
              {t('jobs.title')} <ChevronRight size={20} />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
