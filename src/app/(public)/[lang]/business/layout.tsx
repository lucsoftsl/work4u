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
  return pageMetadata({ title: t("business.heroTitle"), description: t("business.heroSubtitle"), path: "/business", lang });
}

export default async function Layout({ children, params }: { children: React.ReactNode } & Props) {
  const { lang } = await params;
  const t = await getServerT(lang);
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: t("nav.home"), path: "/" }, { name: t("business.heroTitle"), path: "/business" }], lang)} />
      {children}
    </>
  );
}
