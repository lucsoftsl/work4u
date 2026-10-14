import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { localizedPath, unavailablePath } from "@/lib/i18n-routing";
import { Suspense } from "react";
import JobsPageContent from "./jobs-content";
import JobsFallback from "./jobs-fallback";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata, showsUnderLang } from "@/lib/seo/metadata";
import { listPublicJobs } from "@/lib/seo/public-api";
import { toJobCard } from "@/lib/seo/mappers";
import { getServerT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic"; // see blog/page.tsx: no API call at build time

const FILTER_PARAMS = ["keywords", "location", "category", "type", "sort", "open", "page"];

// Filtered / sorted / paged views are the same list in a different order: one canonical /jobs, the variants are noindex.
type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang } = await params;
  const t = await getServerT(lang);
  const query = await searchParams;
  const variant = FILTER_PARAMS.some((k) => query[k] !== undefined);
  return pageMetadata({ title: t("jobs.heading"), description: t("jobs.lede"), path: "/jobs", noindex: variant, lang });
}

export default async function JobsPage({ params }: Pick<Props, "params">) {
  const { lang } = await params;
  const t = await getServerT(lang);
  // API unreachable: 503 (via the proxy) with a Retry button, not a 500 and not an indexable empty list.
  const list = await listPublicJobs(100).catch(() => null);
  if (!list) redirect(unavailablePath(lang, localizedPath(lang, "/jobs")));
  const { items } = list;
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: t("nav.home"), path: "/" }, { name: t("jobs.heading"), path: "/jobs" }], lang)} />
      <Suspense fallback={<JobsFallback />}>
        <JobsPageContent initialJobs={items.filter((j) => showsUnderLang(j.contentLanguage, lang)).map(toJobCard)} />
      </Suspense>
    </>
  );
}
