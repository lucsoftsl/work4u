import type { Metadata } from "next";
import HomeClient from "./home-client";
import { getServerT } from "@/lib/i18n-server";
import { fetchLandingServer } from "@/lib/seo/landing";
import { pageMetadata } from "@/lib/seo/metadata";
import { BRAND } from "@/lib/seo/site";

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

// Title and description come from the language's dictionary (the same strings as the static landing), never the English constants.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const t = await getServerT(lang);
  const title = `${BRAND}: ${t("seo.homeTagline")}`;
  return {
    ...pageMetadata({ title, description: t("landing.fallback.subtitle"), path: "/", lang }),
    title: { absolute: title },
  };
}

export default async function HomePage({ params }: Props) {
  const { lang } = await params;
  return <HomeClient initialLanding={await fetchLandingServer(lang)} initialLang={lang} />;
}
