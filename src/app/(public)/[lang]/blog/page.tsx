import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { localizedPath, unavailablePath } from "@/lib/i18n-routing";
import { BlogListView } from "@/components/blog/BlogListView";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";
import { listPublicArticles } from "@/lib/seo/public-api";
import { getServerT } from "@/lib/i18n-server";
import { showsUnderLang } from "@/lib/seo/metadata";

// Never prerendered at build (a build must not need the API); the API fetch is cached for minutes, so requests stay cheap and fresh.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const t = await getServerT(lang);
  return pageMetadata({ title: t("blog.title"), description: t("blog.subtitle"), path: "/blog", lang });
}

export default async function BlogPage({ params }: Props) {
  const { lang } = await params;
  const t = await getServerT(lang);
  // API unreachable: 503 (via the proxy) with a Retry button, not a 500 and not an indexable empty list.
  const list = await listPublicArticles().catch(() => null);
  if (!list) redirect(unavailablePath(lang, localizedPath(lang, "/blog")));
  const { items } = list;
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: t("nav.home"), path: "/" }, { name: t("blog.title"), path: "/blog" }], lang)} />
      {/* Articles are single-language: one with a known language is listed only under its own prefix, the rest under every prefix. */}
      <BlogListView articles={items.filter((a) => showsUnderLang(a.contentLanguage, lang))} />
    </>
  );
}
