import { describe, expect, it } from "vitest";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd, jobPostingJsonLd, serializeJsonLd, workerServicesJsonLd } from "./jsonld";
import { pageMetadata, toDescription } from "./metadata";
import type { PublicArticle, PublicJob, PublicWorker } from "./public-api";

const job = (over: Partial<PublicJob> = {}): PublicJob => ({
  id: "9", slug: "fix-tap", canonicalPath: "fix-tap-9", title: "Warehouse picker", category: "other", description: "Pick and pack orders.",
  budget: 12, budgetType: "HOURLY", budgetCurrency: "EUR", location: "Budapest", remote: false, employerName: "Acme Kft",
  postedByCompany: true, jobPostingEligible: true, validThrough: "2026-12-01T00:00:00Z", createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-02T00:00:00Z", contentLanguage: null, ...over,
});

describe("JobPosting", () => {
  const company = (over: Partial<PublicJob> = {}) => job({ companyName: "Acme Cleaning S.L.", employerName: "Anna Personal", country: "ES", city: "Barcelona", ...over });
  it("is emitted for a complete company job: company name (not the poster), country and city", () => {
    const ld = jobPostingJsonLd(company())!;
    expect(ld["@type"]).toBe("JobPosting");
    expect(ld.hiringOrganization).toEqual({ "@type": "Organization", name: "Acme Cleaning S.L." });
    const json = JSON.stringify(ld);
    expect(json).not.toContain("Anna Personal");
    expect(json).toContain('"addressCountry":"ES"');
    expect(json).toContain('"addressLocality":"Barcelona"');
    expect(json).toContain('"datePosted"');
    expect(json).toContain('"validThrough"');
    expect(json).toContain('"unitText":"HOUR"');
  });
  it("omits validThrough (open-ended posting) and a missing city without inventing them", () => {
    const ld = jobPostingJsonLd(company({ validThrough: null, city: null }))!;
    expect(ld.validThrough).toBeUndefined();
    expect(JSON.stringify(ld)).not.toContain("addressLocality");
  });
  it("never for individual one-off tasks", () => {
    expect(jobPostingJsonLd(company({ postedByCompany: false, jobPostingEligible: false }))).toBeNull();
    expect(jobPostingJsonLd(company({ postedByCompany: true, jobPostingEligible: false }))).toBeNull();
  });
  it("not when a required field is missing: company name (even if the poster has a name), country, description, title", () => {
    expect(jobPostingJsonLd(company({ companyName: null }))).toBeNull();
    expect(jobPostingJsonLd(job({ country: "ES", city: "Barcelona" }))).toBeNull(); // only employerName, no companyName
    expect(jobPostingJsonLd(company({ country: null }))).toBeNull();
    expect(jobPostingJsonLd(company({ country: "Spain" }))).toBeNull();
    expect(jobPostingJsonLd(company({ description: "  " }))).toBeNull();
    expect(jobPostingJsonLd(company({ title: " " }))).toBeNull();
  });
  it("remote jobs use TELECOMMUTE + applicant country; a fixed budget is not presented as salary", () => {
    const ld = jobPostingJsonLd(company({ remote: true, location: "", budgetType: "FIXED" }))!;
    expect(ld.jobLocationType).toBe("TELECOMMUTE");
    expect(JSON.stringify(ld.applicantLocationRequirements)).toContain("ES");
    expect(ld.baseSalary).toBeUndefined();
    expect(ld.jobLocation).toBeUndefined();
    expect(jobPostingJsonLd(company({ remote: true, country: null }))).toBeNull();
  });
});

describe("other JSON-LD", () => {
  const article: PublicArticle = { id: "a1", slug: "tips", canonicalPath: "tips-a1", title: "Tips", excerpt: "Short", coverImageUrl: "https://img/x.jpg", publishedAt: "2026-10-01", updatedAt: "2026-10-02", contentLanguage: null };
  it("Article carries dates, image and canonical URL", () => {
    const ld = articleJsonLd(article);
    expect(ld.datePublished).toBe("2026-10-01");
    expect(JSON.stringify(ld)).toContain("/blog/tips-a1");
  });
  it("BreadcrumbList numbers items and uses absolute URLs", () => {
    const ld = breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }]);
    expect(JSON.stringify(ld)).toMatch(/"position":2.*"item":"http/);
  });
  it("FAQPage only with real Q&A", () => {
    expect(faqJsonLd([])).toBeNull();
    expect(faqJsonLd([{ question: " ", answer: "x" }])).toBeNull();
    expect(faqJsonLd([{ question: "Q?", answer: "A" }])?.["@type"]).toBe("FAQPage");
  });
  it("worker markup: services only, no Person, nothing when opted out", () => {
    const w: PublicWorker = { id: "w1", slug: "ana", canonicalPath: "ana-w1", name: "Ana", photoUrl: null, rating: 4.8, reviewCount: 3, listingCount: 1, categories: ["cleaning"], updatedAt: "", indexable: true,
      listings: [{ id: "l1", title: "House cleaning", category: "cleaning", description: "Thorough", pricingModel: "HOURLY", rate: 15, rateCurrency: "EUR", serviceRadiusKm: 10, availability: null, imageUrl: null, updatedAt: "" }] };
    const json = JSON.stringify(workerServicesJsonLd(w));
    expect(json).toContain('"@type":"Service"');
    expect(json).not.toContain("Person");
    expect(json).not.toContain("Ana");
    expect(workerServicesJsonLd({ ...w, indexable: false })).toBeNull();
  });
  it("serialization can never close the script tag", () => {
    expect(serializeJsonLd({ a: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});

describe("page metadata", () => {
  it("builds canonical, OG and Twitter with a fallback image and the brand", () => {
    const m = pageMetadata({ title: "Fix a tap", description: "d", path: "/jobs/fix-a-tap-9" });
    expect(m.alternates?.canonical).toMatch(/\/jobs\/fix-a-tap-9$/);
    expect((m.openGraph as { siteName: string }).siteName).toBe("Work4U");
    expect(JSON.stringify(m.openGraph)).toContain("/opengraph-image");
    expect((m.twitter as { card: string }).card).toBe("summary_large_image");
    expect(m.robots).toBeUndefined();
  });
  it("noindex pages say so", () => {
    expect(pageMetadata({ title: "x", path: "/x", noindex: true }).robots).toEqual({ index: false, follow: false });
  });
  it("descriptions are plain text, trimmed at a word, with a fallback for empty input", () => {
    expect(toDescription("<p>Hello&nbsp;<b>world</b></p>")).toBe("Hello world");
    const long = toDescription("word ".repeat(100));
    expect(long.length).toBeLessThanOrEqual(160);
    expect(long.endsWith("…")).toBe(true);
    expect(toDescription("   ")).toMatch(/Post a task/);
  });
});

import { toTitle } from "./metadata";
describe("titles and article markup (QA findings)", () => {
  it("long titles are cut at a word, never mid-word, and short ones are untouched", () => {
    const long = "[QA] SEO company job: office cleaning Barcelona, Gràcia district, evenings and weekends";
    const t = toTitle(long);
    expect(t.length).toBeLessThanOrEqual(58);
    expect(t.endsWith("…")).toBe(true);
    expect(long.startsWith(t.slice(0, -1))).toBe(true);
    expect(`${t} · Work4U`.length).toBeLessThanOrEqual(70);
    expect(toTitle("Fix a tap")).toBe("Fix a tap");
    expect(pageMetadata({ title: long, path: "/jobs/x" }).title).toBe(t);
  });
  it("Article JSON-LD always has an author and an image (cover, else the site share image)", () => {
    const base: PublicArticle = { id: "a1", slug: "tips", canonicalPath: "tips-a1", title: "Tips", excerpt: null, coverImageUrl: null, publishedAt: "2026-10-01", updatedAt: "2026-10-02", contentLanguage: null };
    const withoutCover = articleJsonLd(base);
    expect(withoutCover.author).toMatchObject({ "@type": "Organization", name: "Work4U" });
    expect(JSON.stringify(withoutCover.image)).toContain("/opengraph-image");
    expect(JSON.stringify(articleJsonLd({ ...base, coverImageUrl: "https://img.test/c.jpg" }).image)).toContain("https://img.test/c.jpg");
  });
});
