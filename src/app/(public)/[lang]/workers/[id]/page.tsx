import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { cache } from "react";
import WorkerDetailClient from "./worker-detail-client";
import { JsonLd } from "@/components/seo/JsonLd";
import { canonicalRedirectPath } from "@/lib/seo/canonical";
import { breadcrumbJsonLd, workerServicesJsonLd } from "@/lib/seo/jsonld";
import { toWorkerSeedListings } from "@/lib/seo/mappers";
import { NOINDEX, pageMetadata, toDescription } from "@/lib/seo/metadata";
import { getPublicWorker } from "@/lib/seo/public-api";
import { getServerT } from "@/lib/i18n-server";
import { localizedPath, unavailablePath } from "@/lib/i18n-routing";

export const revalidate = 60; // an opt-out or deletion must reach search engines quickly

type Props = { params: Promise<{ lang: string; id: string }> };

const load = cache(getPublicWorker);

async function looksSignedIn() {
  return (await cookies()).get("work4u_auth")?.value === "1";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  const t = await getServerT(lang);
  const result = await load(id);
  if (result.status === "unavailable") return { title: t("unavailable.title"), ...NOINDEX };
  if (result.status !== "ok") return { title: t("workers.profileNotFound"), ...NOINDEX };
  const w = result.data;
  const first = w.listings?.[0];
  return pageMetadata({
    title: `${w.name}${first ? `: ${first.title}` : ""}`,
    description: toDescription(first?.description, t("workers.subtitle")),
    path: `/workers/${w.canonicalPath}`,
    image: w.photoUrl,
    // The profile page stays public in the app; an owner who opted out (or an unverified account) is simply not indexed.
    noindex: w.indexable === false,
    modifiedTime: w.updatedAt,
    lang,
    alternates: "item",
  });
}

export default async function WorkerProfilePage({ params }: Props) {
  const { lang, id } = await params;
  const t = await getServerT(lang);
  const result = await load(id);
  // API unreachable: 503 (via the proxy) with a Retry button, never a 404 that would make crawlers drop the URL.
  if (result.status === "unavailable") redirect(unavailablePath(lang, localizedPath(lang, `/workers/${encodeURIComponent(id)}`)));
  if (result.status !== "ok") {
    if (await looksSignedIn()) return <WorkerDetailClient workerId={id} />;
    notFound();
  }
  const w = result.data;
  const redirectTo = canonicalRedirectPath(localizedPath(lang, "/workers"), id, w.canonicalPath);
  if (redirectTo) permanentRedirect(redirectTo);
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: t("nav.home"), path: "/" }, { name: t("workers.findPeople"), path: "/workers" }, { name: w.name, path: `/workers/${w.canonicalPath}`, lang: "en" }], lang),
          ...[w.indexable === false ? null : workerServicesJsonLd(w)].filter((x): x is NonNullable<typeof x> => x !== null),
        ]}
      />
      <WorkerDetailClient workerId={w.id} initialListings={toWorkerSeedListings(w)} />
    </>
  );
}
