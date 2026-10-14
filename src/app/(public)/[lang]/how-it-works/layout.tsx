import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { getServerT } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ lang: string }> };

// Server layout: unique title, description and canonical (+ hreflang) for this marketing page (the page body is a client component).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const t = await getServerT(lang);
  return pageMetadata({ title: t("how.title"), description: `${t("how.title")}: ${t("how.step1Title")}, ${t("how.step2Title")}, ${t("how.step3Title")}, ${t("how.step5Title")}, ${t("how.step6Title")}. ${t("how.subtitle")}.`, path: "/how-it-works", lang });
}

export default async function Layout({ children, params }: { children: React.ReactNode } & Props) {
  const { lang } = await params;
  const t = await getServerT(lang);
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: t("nav.home"), path: "/" }, { name: t("how.title"), path: "/how-it-works" }], lang)} />
      {children}
    </>
  );
}
