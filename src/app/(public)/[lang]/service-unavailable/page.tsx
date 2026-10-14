import type { Metadata } from "next";
import { UnavailableView } from "@/components/public/UnavailableView";
import { retryTarget } from "@/lib/i18n-routing";
import { getServerT } from "@/lib/i18n-server";
import { NOINDEX } from "@/lib/seo/metadata";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const t = await getServerT(lang);
  return { title: t("unavailable.title"), ...NOINDEX };
}

// Reached through a redirect from a public page whose API call failed; the proxy gives this URL its 503 status (see src/proxy.ts).
export default async function ServiceUnavailablePage({ searchParams }: Pick<Props, "searchParams">) {
  const { from } = await searchParams;
  return <UnavailableView retryHref={retryTarget(from)} />;
}
