import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { cache } from "react";
import JobDetailClient from "./job-detail-client";
import { JsonLd } from "@/components/seo/JsonLd";
import { canonicalRedirectPath } from "@/lib/seo/canonical";
import { breadcrumbJsonLd, jobPostingJsonLd } from "@/lib/seo/jsonld";
import { toJobSeed } from "@/lib/seo/mappers";
import { NOINDEX, itemCanonicalLang, pageMetadata, toDescription } from "@/lib/seo/metadata";
import { getPublicJob } from "@/lib/seo/public-api";
import { getServerT } from "@/lib/i18n-server";
import { localizedPath, unavailablePath } from "@/lib/i18n-routing";

type Props = { params: Promise<{ lang: string; id: string }> };

const load = cache(getPublicJob);

/** The "signed in" UX cookie (set by the client on login). It is not authentication: it only decides whether a non-public job
 *  (in progress, completed, own listing…) renders the app instead of a hard 404, so participants can still open it. */
async function looksSignedIn() {
  return (await cookies()).get("work4u_auth")?.value === "1";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  const t = await getServerT(lang);
  const result = await load(id);
  if (result.status === "unavailable") return { title: t("unavailable.title"), ...NOINDEX };
  if (result.status !== "ok") return { title: t("jobDetail.pageTitle"), ...NOINDEX };
  const j = result.data;
  const place = j.remote ? t("jobDetail.remote") : j.location;
  return pageMetadata({
    title: [j.title, place].filter(Boolean).join(" · "),
    description: toDescription(j.description ?? j.summary),
    path: `/jobs/${j.canonicalPath}`,
    modifiedTime: j.updatedAt,
    lang,
    alternates: "item",
    contentLang: j.contentLanguage,
  });
}

export default async function JobDetailPage({ params }: Props) {
  const { lang, id } = await params;
  const t = await getServerT(lang);
  const result = await load(id);
  // API unreachable: 503 (via the proxy) with a Retry button, never a 404 that would make crawlers drop the URL.
  if (result.status === "unavailable") redirect(unavailablePath(lang, localizedPath(lang, `/jobs/${encodeURIComponent(id)}`)));
  if (result.status !== "ok") {
    if (await looksSignedIn()) return <JobDetailClient jobId={id} />; // the client decides (own job / hired / really missing)
    notFound();
  }
  const j = result.data;
  const redirectTo = canonicalRedirectPath(localizedPath(lang, "/jobs"), id, j.canonicalPath);
  if (redirectTo) permanentRedirect(redirectTo);
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: t("nav.home"), path: "/" }, { name: t("jobs.heading"), path: "/jobs" }, { name: j.title, path: `/jobs/${j.canonicalPath}`, lang: itemCanonicalLang(j.contentLanguage) }], lang),
          ...[jobPostingJsonLd(j)].filter((x): x is NonNullable<typeof x> => x !== null),
        ]}
      />
      <JobDetailClient jobId={j.id} initialJob={toJobSeed(j)} />
    </>
  );
}
