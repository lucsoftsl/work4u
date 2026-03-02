import { z } from "zod";

const linkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

const categoryDesktopSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  countLabel: z.string().min(1),
  iconKey: z.string().min(1),
});

const categoryMobileSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  iconKey: z.string().min(1),
});

const professionalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  title: z.string().min(1),
  rating: z.string().min(1),
  distanceLabel: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
  jobsCompleted: z.number().int().min(0).max(100),
  responsiveness: z.number().int().min(0).max(100),
  communication: z.number().int().min(0).max(100),
});

const featuredJobSchema = z.object({
  id: z.string().min(1),
  typeLabel: z.string().min(1),
  typeTone: z.enum(["cleaning", "assembly", "delivery", "neutral"]),
  budgetLabel: z.string().min(1),
  title: z.string().min(1),
  locationLabel: z.string().min(1),
  actionLabel: z.string().min(1),
});

const mobileTopRatedSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rating: z.string().min(1),
  reviews: z.string().min(1),
  jobsCompletedLabel: z.string().min(1),
  jobsCompletedPct: z.number().int().min(0).max(100),
  responsivenessLabel: z.string().min(1),
  responsivenessPct: z.number().int().min(0).max(100),
  distanceLabel: z.string().min(1),
  ctaLabel: z.string().min(1),
});

const mobileActiveJobSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  budgetLabel: z.string().min(1),
  locationLabel: z.string().min(1),
  tagLabel: z.string().min(1),
  tagTone: z.enum(["success", "info", "warning", "neutral"]),
  applicantsLabel: z.string().min(1),
  actionLabel: z.string().min(1),
});

const bottomNavSchema = z.object({
  label: z.string().min(1),
  iconKey: z.enum(["home", "explore", "messages", "profile"]),
  badge: z.string().optional(),
});

export const landingResponseSchema = z.object({
  hero: z.object({
    desktopTitleLine1: z.string().min(1),
    desktopTitleLine2: z.string().min(1),
    desktopSubtitle: z.string().min(1),
    desktopSearchPlaceholder: z.string().min(1),
    desktopImageUrl: z.string().min(1),
    mobileTitle: z.string().min(1),
    mobileBadge: z.string().min(1),
    mobileSearchPlaceholder: z.string().min(1),
    filterAriaLabel: z.string().min(1),
  }),
  categories: z.object({
    desktopTitle: z.string().min(1),
    desktopSubtitle: z.string().min(1),
    desktopViewAllLabel: z.string().min(1),
    desktopItems: z.array(categoryDesktopSchema).min(1),
    mobileTitle: z.string().min(1),
    mobileViewAllLabel: z.string().min(1),
    mobileItems: z.array(categoryMobileSchema).min(1),
  }),
  professionals: z.object({
    badgeLabel: z.string().min(1),
    title: z.string().min(1),
    subtitle: z.string().min(1),
    verifiedLabel: z.string().min(1),
    ctaLabel: z.string().min(1),
    items: z.array(professionalSchema).min(1),
  }),
  jobs: z.object({
    title: z.string().min(1),
    subtitle: z.string().min(1),
    viewAllLabel: z.string().min(1),
    items: z.array(featuredJobSchema).min(1),
  }),
  footer: z.object({
    brand: z.string().min(1),
    tagline: z.string().min(1),
    copyright: z.string().min(1),
    language: z.string().min(1),
    currency: z.string().min(1),
    columns: z.array(z.object({ title: z.string().min(1), links: z.array(linkSchema).min(1) })).min(1),
    mobileLinks: z.array(linkSchema).min(1),
  }),
  mobile: z.object({
    topRatedTitle: z.string().min(1),
    topRatedBadge: z.string().min(1),
    topRatedJobsCompletedTitle: z.string().min(1),
    topRatedResponsivenessTitle: z.string().min(1),
    topRatedItems: z.array(mobileTopRatedSchema).min(1),
    activeJobsTitle: z.string().min(1),
    activeJobsFilterLabel: z.string().min(1),
    activeJobItems: z.array(mobileActiveJobSchema).min(1),
    bottomNav: z.array(bottomNavSchema).length(4),
  }),
  actions: z.object({
    signInLabel: z.string().min(1),
    notificationsLabel: z.string().min(1),
    joinNowLabel: z.string().min(1),
    searchButtonLabel: z.string().min(1),
    categoryViewAllHref: z.string().min(1),
    jobsViewAllHref: z.string().min(1),
    signInHref: z.string().min(1),
    joinNowAuthHref: z.string().min(1),
    joinNowGuestHref: z.string().min(1),
  }),
});

export type LandingResponse = z.infer<typeof landingResponseSchema>;
export type LandingProfessional = z.infer<typeof professionalSchema>;
export type LandingFeaturedJob = z.infer<typeof featuredJobSchema>;
export type LandingDesktopCategory = z.infer<typeof categoryDesktopSchema>;
export type LandingMobileCategory = z.infer<typeof categoryMobileSchema>;
export type LandingFooterLink = z.infer<typeof linkSchema>;
