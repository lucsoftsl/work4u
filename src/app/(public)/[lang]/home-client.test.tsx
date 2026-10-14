import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import en from "@/locales/en.json";
import { landingResponseSchema, type LandingResponse } from "@/types/landing";
import HomeClient, { categoryCountLabel } from "./home-client";

const t = (k: string, f?: string) => (en as Record<string, string>)[k] ?? f ?? k;
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t, locale: "en" }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/landing-api", () => ({ fetchLandingContent: vi.fn(() => new Promise(() => undefined)) }));
afterEach(cleanup);

const payload = (): unknown => ({
  hero: { desktopTitleLine1: "Find Help for Any Task.", desktopTitleLine2: "Or Earn by Doing.", desktopSubtitle: "Post a task.", desktopSearchPlaceholder: "Search", desktopImageUrl: "https://img.test/h.png", mobileTitle: "Find Help", mobileBadge: "Badge", mobileSearchPlaceholder: "I need", filterAriaLabel: "Filters" },
  categories: {
    desktopTitle: "Browse by Category", desktopSubtitle: "sub", desktopViewAllLabel: "View all",
    // Real API shape after the fabricated counts were removed: no countLabel, real jobCount.
    desktopItems: [{ slug: "plumbing", name: "Plumbing", iconKey: "wrench", jobCount: 2, professionalCount: 0 }, { slug: "cleaning", name: "Cleaning", iconKey: "sparkles", jobCount: 0 }],
    mobileTitle: "Browse", mobileViewAllLabel: "All", mobileItems: [],
  },
  professionals: { badgeLabel: "b", title: "Top pros", subtitle: "s", verifiedLabel: "v", ctaLabel: "c", items: [] },
  jobs: { title: "Fresh jobs", subtitle: "s", viewAllLabel: "All", items: [{ id: "j1", typeLabel: "Cleaning", typeTone: "cleaning", budgetLabel: "€40", title: "Clean my flat", locationLabel: "Madrid", actionLabel: "View" }] },
  footer: { brand: "Work4U", tagline: "t", copyright: "c", language: "English", currency: "USD", columns: [{ title: "Company", links: [{ label: "About", href: "/about" }] }], mobileLinks: [{ label: "About", href: "/about" }] },
  mobile: { topRatedTitle: "t", topRatedBadge: "b", topRatedJobsCompletedTitle: "j", topRatedResponsivenessTitle: "r", topRatedItems: [], activeJobsTitle: "a", activeJobsFilterLabel: "f", activeJobItems: [], bottomNav: [1, 2, 3, 4].map((n) => ({ label: `n${n}`, iconKey: (["home", "explore", "messages", "profile"] as const)[n - 1] })) },
  actions: { signInLabel: "Sign in", notificationsLabel: "n", joinNowLabel: "Join", searchButtonLabel: "Search", categoryViewAllHref: "/jobs", jobsViewAllHref: "/jobs", signInHref: "/signin", joinNowAuthHref: "/dashboard", joinNowGuestHref: "/signup" },
});

describe("landing payload schema", () => {
  it("accepts the API shape without countLabel (regression: the parse failed and the home page became an empty 'Loading…' shell)", () => {
    expect(landingResponseSchema.safeParse(payload()).success).toBe(true);
  });
  it("still accepts a legacy countLabel and rejects negative counts", () => {
    const p = payload() as { categories: { desktopItems: Array<Record<string, unknown>> } };
    p.categories.desktopItems[0].countLabel = "old";
    expect(landingResponseSchema.safeParse(p).success).toBe(true);
    p.categories.desktopItems[0].jobCount = -1;
    expect(landingResponseSchema.safeParse(p).success).toBe(false);
  });
});

describe("home page HTML (what a crawler gets)", () => {
  const landing = landingResponseSchema.parse(payload()) as LandingResponse;

  it("with the server payload: one h1, the hero text, categories, jobs, and real counts only", () => {
    const html = renderToString(<HomeClient initialLanding={landing} />);
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toContain("Find Help for Any Task.");
    expect(html).toContain("Plumbing");
    expect(html).toContain("Clean my flat");
    expect(html).toContain("2 open jobs");
    expect(html).not.toContain("0 open jobs"); // zero / missing counts are hidden, never invented
    expect(html).not.toMatch(/active gigs|nearby professionals/i);
    expect(html).not.toContain("Loading");
  });
  it("without a payload (API down): still a real page with an h1 and links, not a 'Loading…' shell", () => {
    const html = renderToString(<HomeClient initialLanding={null} />);
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html.length).toBeGreaterThan(1500);
    expect(html).not.toMatch(/>Loading/);
    render(<HomeClient initialLanding={null} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
  it("count labels: singular, plural, hidden", () => {
    expect(categoryCountLabel(1, t)).toBe("1 open job");
    expect(categoryCountLabel(9, t)).toBe("9 open jobs");
    expect(categoryCountLabel(0, t)).toBeUndefined();
    expect(categoryCountLabel(undefined, t)).toBeUndefined();
  });
});
