"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { JobCard } from "@/components/JobCard";
import { SearchBar } from "@/components/SearchBar";
import Footer from "@/components/Footer";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const featuredJobs = [
  {
    id: "1",
    title: "Website Design for E-commerce Store",
    category: "Design",
    description: "Need a modern, responsive website design for our online store",
    budget: 800,
    budgetType: "FIXED" as const,
    location: "Remote",
    remote: true,
    applicants: 12,
    poster: {
      name: "Sarah Johnson",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      rating: 4.8,
      reviews: 24,
    },
  },
  {
    id: "2",
    title: "Mobile App Development - iOS",
    category: "Development",
    description: "Build a native iOS app for our fitness tracking platform",
    budget: 5000,
    budgetType: "FIXED" as const,
    location: "Remote",
    remote: true,
    applicants: 8,
    poster: {
      name: "Tech Startup Inc",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tech",
      rating: 4.9,
      reviews: 18,
    },
  },
  {
    id: "3",
    title: "Content Writing - Blog Posts",
    category: "Writing",
    description: "Write 10 SEO-optimized blog posts about digital marketing",
    budget: 25,
    budgetType: "HOURLY" as const,
    location: "Remote",
    remote: true,
    applicants: 24,
    poster: {
      name: "Marketing Agency",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marketing",
      rating: 4.7,
      reviews: 31,
    },
  },
];

export default function HomePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, loading } = useAuth();
  // Avoid hydration mismatch by deferring client-only checks until mounted
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);
  const hasUser = mounted && !loading && isAuthenticated;
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              work4u
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/jobs" className="text-gray-600 hover:text-gray-900">
                {t('nav.findWork')}
              </Link>
              <Link href="/post-job" className="text-gray-600 hover:text-gray-900">
                {t('nav.postJob')}
              </Link>
              <Link href="/how-it-works" className="text-gray-600 hover:text-gray-900">
                {t('nav.howItWorks')}
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {!hasUser && (
                <Button variant="outline" onClick={() => router.push('/signin')}>{t('nav.signIn')}</Button>
              )}
              {/* Show Profile only after mount to match SSR output */}
              {hasUser && (
                <Button variant="outline" onClick={() => router.push('/profile')}>{t('nav.profile')}</Button>
              )}
              {!hasUser && (
                <Button onClick={() => router.push('/signup')}>{t('nav.getStarted')}</Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              {t('home.heroTitle')}
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              {t('home.heroSubtitle')}
            </p>
            <SearchBar />
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">{t('home.browseCategory')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              "Development",
              "Design",
              "Writing",
              "Marketing",
              "Video/Audio",
              "Virtual Assistance",
            ].map((cat) => (
              <Link
                key={cat}
                href={`/jobs?category=${cat.toLowerCase()}`}
                className="p-4 text-center rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <p className="font-medium text-gray-900">{cat}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Jobs Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">{t('home.featuredTitle')}</h2>
            <Link href="/jobs" className="text-blue-600 hover:text-blue-700 font-medium">
              {t('home.viewAll')} →
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">{t('home.ctaTitle')}</h2>
          <p className="text-blue-100 mb-8 text-lg">
            {t('home.ctaSubtitle')}
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="secondary" size="lg" onClick={() => router.push('/jobs')}>
              {t('home.ctaFindWork')}
            </Button>
            <Button variant="outline" size="lg" className="text-white border-white hover:bg-blue-700" onClick={() => router.push('/post-job')}>
              {t('home.ctaPostJob')}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
