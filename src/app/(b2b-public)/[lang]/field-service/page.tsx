import type { Metadata } from "next";
import { B2bPublicFooter, B2bPublicHeader } from "@/components/b2b-public/B2bPublicChrome";
import { FieldServiceHome, faqPairs } from "@/components/b2b-public/FieldServiceHome";
import { JsonLd } from "@/components/seo/JsonLd";
import { B2B_PUBLIC_HOME } from "@/lib/b2b-paths";
import { getServerT } from "@/lib/i18n-server";
import { isLaunchLang } from "@/lib/i18n-routing";
import { breadcrumbJsonLd, faqJsonLd, organizationJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ lang: string }> };

// Static per language (revalidated with the deploy): no API calls, nothing user-specific.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const t = await getServerT(lang);
  return pageMetadata({
    title: t("b2b.mkt.meta.title", "Field service management software for dispatch and technicians"),
    description: t("b2b.mkt.meta.description", ""),
    path: B2B_PUBLIC_HOME,
    lang,
    site: "b2b",
    noindex: !isLaunchLang(lang), // fr / hu: readable, but the canonical is the English page
  });
}

export default async function FieldServicePage({ params }: Props) {
  const { lang } = await params;
  const t = await getServerT(lang);
  const faq = faqJsonLd(faqPairs(t));
  return (
    <>
      <JsonLd data={[organizationJsonLd(), breadcrumbJsonLd([{ name: t("b2b.mkt.brandLabel", "Field service"), path: B2B_PUBLIC_HOME }], lang), ...(faq ? [faq] : [])]} />
      <B2bPublicHeader t={t} lang={lang} sections />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <FieldServiceHome t={t} lang={lang} />
      </main>
      <B2bPublicFooter t={t} lang={lang} languagePath={B2B_PUBLIC_HOME} />
    </>
  );
}
