"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Bell, Globe } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { fetchLandingContent } from "@/lib/landing-api";
import { useTranslation, type Locale } from "@/lib/i18n";
import type { LandingResponse } from "@/types/landing";
import {
  DesktopCategoryCard,
  MobileCategoryCard,
  ProfessionalCard,
  FeaturedJobCard,
  FooterColumn,
  HeroSearch,
  TopProCard,
  ActiveJobCard,
  FooterActions,
  MobileNavItem,
} from "@/components/landing/ui";
import {
  resolveBottomNavIcon,
  resolveCategoryIcon,
  resolveJobToneClass,
  resolveMobileTagClass,
} from "@/components/landing/icon-map";

function LanguageSwitcher() {
  const { t, locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);

  const languages: { code: Locale; label: string }[] = [
    { code: "en", label: t("footer.english") },
    { code: "es", label: t("footer.spanish") },
    { code: "fr", label: t("footer.french") },
    { code: "hu", label: t("footer.hungarian") },
    { code: "ro", label: t("footer.romanian") },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-full border border-outline bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-[#f7fafc]"
      >
        <Globe className="h-3.5 w-3.5" />
        {locale.toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-outline bg-white py-1.5 shadow-soft">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setLocale(lang.code);
                setOpen(false);
              }}
              className={`block w-full px-4 py-2 text-left text-sm ${
                locale === lang.code ? "bg-brand-soft font-semibold text-brand" : "text-ink hover:bg-[#f7fafc]"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { t, locale } = useTranslation();

  const [query, setQuery] = useState("");
  const [landing, setLanding] = useState<LandingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchLandingContent(controller.signal, locale);
        setLanding(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : t('landing.loadError'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [locale, t]);

  const handleSearch = () => {
    const trimmed = query.trim();
    router.push(`/jobs${trimmed ? `?keywords=${encodeURIComponent(trimmed)}` : ""}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef1f4] text-sm text-ink-muted">
        {t('landing.loadingContent')}
      </div>
    );
  }

  if (!landing) {
    return (
      <div className="min-h-screen bg-[#eef1f4] p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">{t('landing.apiNotReady')}</p>
          <p className="mt-1">{error || t('landing.unknownError')}</p>
          <p className="mt-2">Expected endpoint: `GET /api/landing`.</p>
        </div>
      </div>
    );
  }

  const joinNowHref = isAuthenticated ? landing.actions.joinNowAuthHref : landing.actions.joinNowGuestHref;
  const welcomeName = user?.displayName?.trim().split(" ")[0] || user?.email?.split("@")[0] || "there";
  const welcomeInitial = (user?.displayName?.trim()[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    <div className="min-h-screen bg-[#eef1f4] text-ink">
      <header className="sticky top-0 z-40 border-b border-outline bg-[#eef1f4]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandMark label={landing.footer.brand} size="sm" />

          <div className="hidden items-center gap-4 md:flex">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-full border border-outline bg-white py-1.5 pl-1.5 pr-4 text-xs font-semibold text-ink transition-colors hover:border-brand/40 hover:bg-brand/5"
              >
                {user?.photoUrl ? (
                  <Image
                    src={user.photoUrl}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                    {welcomeInitial}
                  </span>
                )}
                <span className="leading-tight">
                  <span className="block text-[10px] font-medium text-ink-subtle">{t('dashboard.welcomeBack')}</span>
                  <span className="block">{welcomeName}</span>
                </span>
              </Link>
            ) : (
              <>
                <button onClick={() => router.push(landing.actions.signInHref)} className="text-xs font-semibold text-ink hover:text-brand">
                  {landing.actions.signInLabel}
                </button>
                <button
                  onClick={() => router.push(joinNowHref)}
                  className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-white"
                >
                  {landing.actions.joinNowLabel}
                </button>
              </>
            )}
            <LanguageSwitcher />
          </div>

          <div className="flex items-center gap-4 md:hidden">
            <button className="relative rounded-full p-2 text-ink-muted" aria-label={landing.actions.notificationsLabel}>
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
            </button>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-bold text-ink-muted shadow-soft">
              U
            </span>
          </div>
        </div>
      </header>

      <main>
        <section className="hidden px-4 py-16 md:block">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h1 className="max-w-xl font-display text-5xl font-black leading-[1.05] tracking-tight text-ink lg:text-6xl">
                {landing.hero.desktopTitleLine1}
                <br />
                <span className="text-brand">{landing.hero.desktopTitleLine2}</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-ink-muted">{landing.hero.desktopSubtitle}</p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSearch();
                }}
                className="mt-8 flex items-center gap-2 rounded-full border border-outline bg-white p-2"
              >
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={landing.hero.desktopSearchPlaceholder}
                  className="w-full border-none bg-transparent px-4 py-2 text-sm text-ink outline-none placeholder:text-ink-subtle"
                />
                <button className="rounded-full bg-brand px-8 py-3 text-sm font-bold text-white">{landing.actions.searchButtonLabel}</button>
              </form>
            </div>

            <div className="rounded-2xl border border-outline bg-[#edf0f2] p-3">
              <div className="h-[460px] overflow-hidden rounded-xl bg-white shadow-soft">
                <div className="relative h-full w-full">
                  <Image
                    src={landing.hero.desktopImageUrl}
                    alt="Landing hero"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[460px] pb-28 md:hidden">
          <div className="px-4 pt-7">
            <div className="overflow-hidden rounded-[2rem] bg-brand text-white shadow-soft">
              <div className="grid grid-cols-3">
                <div className="col-span-2 p-6 pb-4">
                  <h1 className="max-w-[9.8ch] font-display text-[2.45rem] font-black leading-[1.05] tracking-tight">
                    {landing.hero.mobileTitle}
                  </h1>
                  <span className="mt-4 inline-flex rounded-full bg-white/20 px-4 py-1 text-[0.95rem] font-medium">
                    {landing.hero.mobileBadge}
                  </span>
                </div>
                <div className="mt-auto h-[162px] bg-gradient-to-br from-brand-soft via-brand to-brand-strong" />
              </div>

              <div className="p-4 pt-0">
                <HeroSearch
                  value={query}
                  onChange={setQuery}
                  placeholder={landing.hero.mobileSearchPlaceholder}
                  onSubmit={handleSearch}
                  filterLabel={landing.hero.filterAriaLabel}
                />
              </div>
            </div>
          </div>

          <div className="px-4 pt-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-[2.1rem] font-black leading-none text-ink">{landing.categories.mobileTitle}</h2>
              <Link href={landing.actions.categoryViewAllHref} className="text-[1.4rem] font-bold text-brand">
                {landing.categories.mobileViewAllLabel}
              </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-1">
              {landing.categories.mobileItems.map((category) => (
                <MobileCategoryCard
                  key={category.slug}
                  icon={resolveCategoryIcon(category.iconKey)}
                  name={category.name}
                  onClick={() => router.push(`/jobs?category=${encodeURIComponent(category.slug)}`)}
                />
              ))}
            </div>
          </div>

          <div className="px-4 pt-12">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-[2.2rem] font-black leading-none text-ink">{landing.mobile.topRatedTitle}</h2>
              <span className="rounded-full bg-amber-100 px-4 py-1 text-center text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                {landing.mobile.topRatedBadge}
              </span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-1">
              {landing.mobile.topRatedItems.map((professional) => (
                <TopProCard
                  key={professional.id}
                  name={professional.name}
                  rating={professional.rating}
                  reviews={professional.reviews}
                  jobsCompleted={professional.jobsCompletedLabel}
                  jobsCompletedPct={professional.jobsCompletedPct}
                  responsiveness={professional.responsivenessLabel}
                  responsivenessPct={professional.responsivenessPct}
                  distance={professional.distanceLabel}
                  jobsCompletedTitle={landing.mobile.topRatedJobsCompletedTitle}
                  responsivenessTitle={landing.mobile.topRatedResponsivenessTitle}
                  ctaLabel={professional.ctaLabel}
                />
              ))}
            </div>
          </div>

          <div className="mt-10 bg-[#dfe4e8] px-4 py-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-[2.2rem] font-black leading-none text-ink">{landing.mobile.activeJobsTitle}</h2>
              <button className="rounded-full bg-white px-5 py-1.5 text-[0.95rem] font-semibold text-ink">{landing.mobile.activeJobsFilterLabel}</button>
            </div>

            <div className="space-y-4">
              {landing.mobile.activeJobItems.map((job) => (
                <ActiveJobCard
                  key={job.id}
                  title={job.title}
                  budget={job.budgetLabel}
                  location={job.locationLabel}
                  tag={job.tagLabel}
                  tagClass={resolveMobileTagClass(job.tagTone)}
                  applicants={job.applicantsLabel}
                  action={job.actionLabel}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="hidden bg-[#e7ebee] py-16 md:block">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="font-display text-4xl font-black tracking-tight lg:text-5xl">{landing.categories.desktopTitle}</h2>
                <p className="mt-2 text-ink-muted">{landing.categories.desktopSubtitle}</p>
              </div>
              <Link href={landing.actions.categoryViewAllHref} className="text-sm font-bold text-brand hover:underline">
                {landing.categories.desktopViewAllLabel} <span aria-hidden>→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {landing.categories.desktopItems.map((category) => (
                <DesktopCategoryCard
                  key={category.slug}
                  icon={resolveCategoryIcon(category.iconKey)}
                  name={category.name}
                  count={category.countLabel}
                  onClick={() => router.push(`/jobs?category=${encodeURIComponent(category.slug)}`)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="hidden py-20 md:block">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <span className="inline-flex rounded-full bg-accent/15 px-4 py-1 text-xs font-extrabold uppercase tracking-[0.22em] text-accent">
                {landing.professionals.badgeLabel}
              </span>
              <h2 className="mt-4 font-display text-4xl font-black tracking-tight lg:text-5xl">{landing.professionals.title}</h2>
              <p className="mt-2 text-ink-muted">{landing.professionals.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {landing.professionals.items.map((professional) => (
                <ProfessionalCard
                  key={professional.id}
                  name={professional.name}
                  title={professional.title}
                  rating={professional.rating}
                  distance={professional.distanceLabel}
                  tags={professional.tags}
                  jobsCompleted={professional.jobsCompleted}
                  responsiveness={professional.responsiveness}
                  communication={professional.communication}
                  cta={landing.professionals.ctaLabel}
                  verified={landing.professionals.verifiedLabel}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="hidden bg-[#e7ebee] py-16 md:block">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="font-display text-4xl font-black tracking-tight lg:text-5xl">{landing.jobs.title}</h2>
                <p className="mt-2 text-ink-muted">{landing.jobs.subtitle}</p>
              </div>
              <Link href={landing.actions.jobsViewAllHref} className="text-sm font-bold text-brand hover:underline">
                {landing.jobs.viewAllLabel} <span aria-hidden>→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {landing.jobs.items.map((job) => (
                <FeaturedJobCard
                  key={job.id}
                  type={job.typeLabel}
                  typeClass={resolveJobToneClass(job.typeTone)}
                  budget={job.budgetLabel}
                  title={job.title}
                  location={job.locationLabel}
                  action={job.actionLabel}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="hidden border-t border-outline bg-[#eef1f4] py-16 md:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
            <div className="col-span-2">
              <BrandMark label={landing.footer.brand} size="md" />
              <p className="mt-4 max-w-xs text-ink-muted">{landing.footer.tagline}</p>
            </div>

            {landing.footer.columns.map((column) => (
              <FooterColumn
                key={column.title}
                title={column.title}
                links={column.links}
              />
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center gap-4 border-t border-outline pt-6 text-xs text-ink-subtle sm:flex-row sm:justify-between">
            {landing.footer.copyright}
            <LanguageSwitcher />
          </div>
        </div>
      </footer>

      <footer className="pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-10 text-center md:hidden">
        <div className="mx-auto max-w-[460px] px-4">
          <div className="flex items-center justify-center gap-8 text-[1.2rem] font-semibold text-[#7f8fa8]">
            {landing.footer.mobileLinks.map((link) => (
              <Link key={link.label} href={link.href}>{link.label}</Link>
            ))}
          </div>
          <p className="mt-5 text-[0.85rem] font-bold tracking-[0.12em] text-[#8795aa]">{landing.footer.copyright}</p>
          <FooterActions />
          <div className="mt-4 flex justify-center">
            <LanguageSwitcher />
          </div>
        </div>
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline bg-white/95 px-6 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-md md:hidden">
        <div className="mx-auto flex w-full max-w-[460px] items-center justify-between">
          {landing.mobile.bottomNav.map((item, index) => (
            <MobileNavItem
              key={`${item.iconKey}-${item.label}`}
              label={item.label}
              icon={resolveBottomNavIcon(item.iconKey)}
              badge={item.badge}
              active={index === 0}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
