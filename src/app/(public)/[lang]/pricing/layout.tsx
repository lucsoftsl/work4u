import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { getServerT } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ lang: string }> };

// Server layout: unique title, description and canonical (+ hreflang) for this marketing page (the page body is a client component).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const t = await getServerT(lang);
  return pageMetadata({ title: t("pricing.heroTitle"), description: t("pricing.heroSubtitle"), path: "/pricing", lang });
}

export default async function Layout({ children, params }: { children: React.ReactNode } & Props) {
  const { lang } = await params;
  const t = await getServerT(lang);
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: t("nav.home"), path: "/" }, { name: t("pricing.heroTitle"), path: "/pricing" }], lang),
          ...[faqJsonLd([1, 2, 3, 4].map((n) => ({ question: t(`pricing.faq${n}Question`, ""), answer: t(`pricing.faq${n}Answer`, "") })))].filter((x): x is NonNullable<typeof x> => x !== null),
        ]}
      />
      {children}
    </>
  );
}
