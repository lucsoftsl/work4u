import type { Metadata } from "next";
import { getServerT } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo/metadata";
import PrivacyContent from "./PrivacyContent";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const t = await getServerT(lang);
  return pageMetadata({ title: t("privacy.title", "Privacy Policy"), description: t("privacy.intro"), path: "/privacy", lang });
}

export default function PrivacyPage() {
  return <PrivacyContent />;
}
