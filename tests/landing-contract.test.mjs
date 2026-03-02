import test from "node:test";
import assert from "node:assert/strict";
import { validateLandingPayload } from "../scripts/landing-contract-lib.mjs";

const validPayload = {
  hero: {
    desktopTitleLine1: "Find Help for Any Task.",
    desktopTitleLine2: "Or Earn by Doing.",
    desktopSubtitle: "Connect with top-tier freelancers.",
    desktopSearchPlaceholder: "Search for web design",
    desktopImageUrl: "https://example.com/welcome.png",
    mobileTitle: "Find Help for Any Task.",
    mobileBadge: "Gamified Marketplace",
    mobileSearchPlaceholder: "I need help with...",
    filterAriaLabel: "Filters",
  },
  categories: {
    desktopTitle: "Browse by Category",
    desktopSubtitle: "Find help for everything",
    desktopViewAllLabel: "View all",
    desktopItems: [{ slug: "design", name: "Design", countLabel: "1k+", iconKey: "palette" }],
    mobileTitle: "Browse Categories",
    mobileViewAllLabel: "See all",
    mobileItems: [{ slug: "design", name: "Design", iconKey: "design" }],
  },
  professionals: {
    badgeLabel: "Handpicked Talent",
    title: "Featured Professionals",
    subtitle: "Meet experts",
    verifiedLabel: "Verified",
    ctaLabel: "View Profile",
    items: [
      {
        id: "pro-1",
        name: "Alex",
        title: "Designer",
        rating: "4.9",
        distanceLabel: "1km away",
        tags: ["UI/UX"],
        jobsCompleted: 90,
        responsiveness: 88,
        communication: 92,
      },
    ],
  },
  jobs: {
    title: "Featured Jobs",
    subtitle: "Explore jobs",
    viewAllLabel: "Browse all jobs",
    items: [
      {
        id: "job-1",
        typeLabel: "Cleaning",
        typeTone: "cleaning",
        budgetLabel: "$50-$80",
        title: "Apartment Deep Cleaning",
        locationLabel: "Downtown",
        actionLabel: "Bid Now",
      },
    ],
  },
  footer: {
    brand: "Work4U",
    tagline: "Trusted marketplace",
    copyright: "© 2024 Work4U",
    language: "English",
    currency: "USD",
    columns: [{ title: "Company", links: [{ label: "About", href: "/about" }] }],
    mobileLinks: [{ label: "Support", href: "/support" }],
  },
  mobile: {
    topRatedTitle: "Top Rated Pros",
    topRatedBadge: "Top Talent",
    topRatedJobsCompletedTitle: "Jobs Completed",
    topRatedResponsivenessTitle: "Responsiveness",
    topRatedItems: [
      {
        id: "top-1",
        name: "Alex",
        rating: "4.9",
        reviews: "120",
        jobsCompletedLabel: "85/100",
        jobsCompletedPct: 85,
        responsivenessLabel: "98%",
        responsivenessPct: 98,
        distanceLabel: "2.4km away",
        ctaLabel: "View Profile",
      },
    ],
    activeJobsTitle: "Active Jobs",
    activeJobsFilterLabel: "Nearby",
    activeJobItems: [
      {
        id: "mjob-1",
        title: "IKEA Assembly",
        budgetLabel: "$45/hr",
        locationLabel: "Uptown",
        tagLabel: "Urgent",
        tagTone: "info",
        applicantsLabel: "4 Applicants",
        actionLabel: "Apply Now",
      },
    ],
    bottomNav: [
      { label: "Home", iconKey: "home" },
      { label: "Explore", iconKey: "explore" },
      { label: "Messages", iconKey: "messages", badge: "3" },
      { label: "Profile", iconKey: "profile" },
    ],
  },
  actions: {
    signInLabel: "Sign In",
    notificationsLabel: "Notifications",
    joinNowLabel: "Join Now",
    searchButtonLabel: "Search",
    categoryViewAllHref: "/jobs",
    jobsViewAllHref: "/jobs",
    signInHref: "/signin",
    joinNowAuthHref: "/post-job",
    joinNowGuestHref: "/signup",
  },
};

test("landing contract accepts valid payload", () => {
  const errors = validateLandingPayload(validPayload);
  assert.equal(errors.length, 0);
});

test("landing contract rejects missing critical fields", () => {
  const invalid = structuredClone(validPayload);
  delete invalid.hero.desktopTitleLine1;
  invalid.mobile.bottomNav = [{ label: "Home", iconKey: "home" }];

  const errors = validateLandingPayload(invalid);
  assert.ok(errors.some((message) => message.includes("hero.desktopTitleLine1")));
  assert.ok(errors.some((message) => message.includes("mobile.bottomNav")));
});
