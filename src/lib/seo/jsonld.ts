import type { PublicArticle, PublicJob, PublicWorker } from "./public-api";
import { BRAND, absoluteUrl, SITE_URL } from "./site";
import { toDescription } from "./metadata";
import { LAUNCH_LANGS, localizedPath } from "../i18n-routing";

export type JsonLdObject = Record<string, unknown>;
const CONTEXT = "https://schema.org";

export const organizationJsonLd = (): JsonLdObject => ({
  "@context": CONTEXT, "@type": "Organization", name: BRAND, url: SITE_URL, logo: absoluteUrl("/icon.svg"),
});

export const websiteJsonLd = (): JsonLdObject => ({
  "@context": CONTEXT, "@type": "WebSite", name: BRAND, url: SITE_URL, inLanguage: [...LAUNCH_LANGS],
});

/** `lang` localizes the URLs (the page's language); an item's own `lang` overrides it (user content canonicalizes to one language). */
export function breadcrumbJsonLd(items: ReadonlyArray<{ name: string; path: string; lang?: string }>, lang?: string): JsonLdObject {
  return {
    "@context": CONTEXT, "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(localizedPath(it.lang ?? lang, it.path)) })),
  };
}

/** `canonicalLang`: the one language version search engines index for this article (see itemCanonicalLang). inLanguage only when known. */
export function articleJsonLd(a: PublicArticle, canonicalLang?: string): JsonLdObject {
  return {
    "@context": CONTEXT, "@type": "Article",
    headline: a.title.slice(0, 110),
    ...(a.excerpt ? { description: toDescription(a.excerpt) } : {}),
    // Always an image (the cover, else the site share image) and an author: articles are published by the Work4U team (admin-authored).
    image: [a.coverImageUrl ?? absoluteUrl("/opengraph-image")],
    author: { "@type": "Organization", name: BRAND, url: SITE_URL },
    datePublished: a.publishedAt, dateModified: a.updatedAt,
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(localizedPath(canonicalLang, `/blog/${a.canonicalPath}`)) },
    ...(a.contentLanguage ? { inLanguage: a.contentLanguage } : {}),
    publisher: { "@type": "Organization", name: BRAND, logo: { "@type": "ImageObject", url: absoluteUrl("/icon.svg") } },
  };
}

const isoCountry = (c: string | null | undefined) => (c && /^[A-Za-z]{2}$/.test(c.trim()) ? c.trim().toUpperCase() : null);

/**
 * JobPosting only for company (Business) jobs, and only when Google's required fields are all present:
 *  - title, description, datePosted
 *  - hiringOrganization = the COMPANY name (`companyName`); the poster's personal name (`employerName`) is never used
 *  - a location with a country: `jobLocation.address.addressCountry` (+ city when known), or, for remote jobs, `jobLocationType`
 *    TELECOMMUTE with `applicantLocationRequirements` (country)
 * `validThrough` is included when the job expires; an open-ended posting simply has none (Google treats it as optional).
 * `employmentType` is omitted: the API does not know it. Returns null when anything required is missing: no partial markup.
 */
export function jobPostingJsonLd(job: PublicJob): JsonLdObject | null {
  if (!job.jobPostingEligible || !job.postedByCompany) return null;
  const description = job.description?.trim();
  const company = job.companyName?.trim();
  const country = isoCountry(job.country);
  if (!job.title.trim() || !description || !company || !job.createdAt || !country) return null;
  const city = job.city?.trim();
  return {
    "@context": CONTEXT, "@type": "JobPosting",
    title: job.title, description, datePosted: job.createdAt,
    ...(job.validThrough ? { validThrough: job.validThrough } : {}),
    hiringOrganization: { "@type": "Organization", name: company },
    ...(job.remote
      ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: country } }
      : { jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", ...(city ? { addressLocality: city } : {}), addressCountry: country } } }),
    // Only an hourly rate maps to Google's baseSalary (unitText); a fixed one-off budget is not a salary.
    ...(job.budgetType === "HOURLY" && job.budget > 0 && job.budgetCurrency
      ? { baseSalary: { "@type": "MonetaryAmount", currency: job.budgetCurrency, value: { "@type": "QuantitativeValue", value: job.budget, unitText: "HOUR" } } }
      : {}),
  };
}

export interface Faq { question: string; answer: string }

/** FAQPage only when real Q&A pairs exist. */
export function faqJsonLd(items: ReadonlyArray<Faq>): JsonLdObject | null {
  const valid = items.filter((i) => i.question.trim() && i.answer.trim());
  if (valid.length === 0) return null;
  return {
    "@context": CONTEXT, "@type": "FAQPage",
    mainEntity: valid.map((i) => ({ "@type": "Question", name: i.question, acceptedAnswer: { "@type": "Answer", text: i.answer } })),
  };
}

/**
 * Conservative worker-profile markup: no Person, no contact data, nothing that is not already on the page.
 * One `Service` per listing; nothing at all when the owner opted out (`indexable === false`).
 */
export function workerServicesJsonLd(w: PublicWorker): JsonLdObject | null {
  if (w.indexable === false || !w.listings?.length) return null;
  return {
    "@context": CONTEXT, "@type": "ItemList",
    itemListElement: w.listings.map((l, i) => ({
      "@type": "ListItem", position: i + 1,
      item: {
        "@type": "Service", name: l.title, serviceType: l.category, description: toDescription(l.description),
        ...(l.rate && l.rateCurrency ? { offers: { "@type": "Offer", price: l.rate, priceCurrency: l.rateCurrency } } : {}),
      },
    })),
  };
}

/** Safe for <script type="application/ld+json">: "<" can never close the tag. */
export const serializeJsonLd = (data: JsonLdObject | JsonLdObject[]): string => JSON.stringify(data).replace(/</g, "\\u003c");
