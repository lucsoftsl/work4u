import type { Metadata } from "next";
import { getServerT } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo/metadata";
import TermsContent from "./TermsContent";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const t = await getServerT(lang);
  return pageMetadata({ title: t("terms.title", "Terms and conditions"), description: t("terms.intro"), path: "/terms", lang });
}

export default function TermsPage() {
  return <TermsContent />;
}
