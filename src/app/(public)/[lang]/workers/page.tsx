import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { localizedPath, unavailablePath } from "@/lib/i18n-routing";
import { Suspense } from "react";
import WorkersPageContent from "./workers-content";
import WorkersFallback from "./workers-fallback";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";
import { listPublicWorkers } from "@/lib/seo/public-api";
import { getServerT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic"; // see blog/page.tsx: no API call at build time

const FILTER_PARAMS = ["keywords", "location", "category", "availability", "sort", "page"];

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang } = await params;
  const t = await getServerT(lang);
  const query = await searchParams;
  const variant = FILTER_PARAMS.some((k) => query[k] !== undefined);
  return pageMetadata({ title: t("workers.findPeople"), description: t("workers.subtitle"), path: "/workers", noindex: variant, lang });
}

export default async function WorkersPage({ params }: Pick<Props, "params">) {
  const { lang } = await params;
  const t = await getServerT(lang);
  // API unreachable: 503 (via the proxy) with a Retry button, not a 500 and not an indexable empty list.
  const list = await listPublicWorkers(48).catch(() => null);
  if (!list) redirect(unavailablePath(lang, localizedPath(lang, "/workers")));
  const { items } = list;
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: t("nav.home"), path: "/" }, { name: t("workers.findPeople"), path: "/workers" }], lang)} />
      <Suspense fallback={<WorkersFallback />}>
        <WorkersPageContent initialWorkers={items} />
      </Suspense>
    </>
  );
}
