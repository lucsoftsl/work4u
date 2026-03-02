# Landing API Schema (Design-Driven + TDD)

## Endpoint
- `GET /api/landing`

## Source of truth
- Frontend runtime schema: `src/types/landing.ts`
- Runtime fetch + validation: `src/lib/landing-api.ts`
- Contract smoke check script: `npm run check:landing-api`
- Contract unit tests: `npm run test:landing-contract`

## Required shape
```ts
{
  hero: {
    desktopTitleLine1: string;
    desktopTitleLine2: string;
    desktopSubtitle: string;
    desktopSearchPlaceholder: string;
    desktopImageUrl: string;
    mobileTitle: string;
    mobileBadge: string;
    mobileSearchPlaceholder: string;
    filterAriaLabel: string;
  };
  categories: {
    desktopTitle: string;
    desktopSubtitle: string;
    desktopViewAllLabel: string;
    desktopItems: Array<{ slug: string; name: string; countLabel: string; iconKey: string }>;
    mobileTitle: string;
    mobileViewAllLabel: string;
    mobileItems: Array<{ slug: string; name: string; iconKey: string }>;
  };
  professionals: {
    badgeLabel: string;
    title: string;
    subtitle: string;
    verifiedLabel: string;
    ctaLabel: string;
    items: Array<{
      id: string;
      name: string;
      title: string;
      rating: string;
      distanceLabel: string;
      tags: string[];
      jobsCompleted: number; // 0..100
      responsiveness: number; // 0..100
      communication: number; // 0..100
    }>;
  };
  jobs: {
    title: string;
    subtitle: string;
    viewAllLabel: string;
    items: Array<{
      id: string;
      typeLabel: string;
      typeTone: "cleaning" | "assembly" | "delivery" | "neutral";
      budgetLabel: string;
      title: string;
      locationLabel: string;
      actionLabel: string;
    }>;
  };
  footer: {
    brand: string;
    tagline: string;
    copyright: string;
    language: string;
    currency: string;
    columns: Array<{ title: string; links: Array<{ label: string; href: string }> }>;
    mobileLinks: Array<{ label: string; href: string }>;
  };
  mobile: {
    topRatedTitle: string;
    topRatedBadge: string;
    topRatedJobsCompletedTitle: string;
    topRatedResponsivenessTitle: string;
    topRatedItems: Array<{
      id: string;
      name: string;
      rating: string;
      reviews: string;
      jobsCompletedLabel: string;
      jobsCompletedPct: number; // 0..100
      responsivenessLabel: string;
      responsivenessPct: number; // 0..100
      distanceLabel: string;
      ctaLabel: string;
    }>;
    activeJobsTitle: string;
    activeJobsFilterLabel: string;
    activeJobItems: Array<{
      id: string;
      title: string;
      budgetLabel: string;
      locationLabel: string;
      tagLabel: string;
      tagTone: "success" | "info" | "warning" | "neutral";
      applicantsLabel: string;
      actionLabel: string;
    }>;
    bottomNav: Array<{ label: string; iconKey: "home" | "explore" | "messages" | "profile"; badge?: string }>;
  };
  actions: {
    signInLabel: string;
    notificationsLabel: string;
    joinNowLabel: string;
    searchButtonLabel: string;
    categoryViewAllHref: string;
    jobsViewAllHref: string;
    signInHref: string;
    joinNowAuthHref: string;
    joinNowGuestHref: string;
  };
}
```

## Backend acceptance criteria
1. `GET /api/landing` returns HTTP 200 with the exact required fields.
2. No missing fields for any desktop/mobile section.
3. Numeric metric fields stay in 0..100.
4. Endpoint is backed by MySQL data, not in-code constants.
5. `npm run check:landing-api` passes against local backend.
