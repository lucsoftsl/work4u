import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { cache } from "react";
import { BlogArticleView } from "@/components/blog/BlogArticleView";
import { JsonLd } from "@/components/seo/JsonLd";
import { canonicalRedirectPath } from "@/lib/seo/canonical";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { NOINDEX, itemCanonicalLang, pageMetadata, toDescription } from "@/lib/seo/metadata";
import { getPublicArticle } from "@/lib/seo/public-api";
import { getServerT } from "@/lib/i18n-server";
import { localizedPath, unavailablePath } from "@/lib/i18n-routing";

export const revalidate = 600;

type Props = { params: Promise<{ lang: string; id: string }> };

// One API request per render even though metadata and page both need the article.
const load = cache(getPublicArticle);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  const t = await getServerT(lang);
  const result = await load(id);
  if (result.status === "unavailable") return { title: t("unavailable.title"), ...NOINDEX };
  if (result.status !== "ok") return { title: t("errors.notFoundTitle"), robots: { index: false, follow: false } };
  const a = result.data;
  return pageMetadata({
    title: a.title,
    description: toDescription(a.excerpt ?? a.bodyHtml),
    path: `/blog/${a.canonicalPath}`,
    image: a.coverImageUrl,
    type: "article",
    lang,
    alternates: "item",
    contentLang: a.contentLanguage,
    publishedTime: a.publishedAt,
    modifiedTime: a.updatedAt,
  });
}

export default async function BlogArticlePage({ params }: Props) {
  const { lang, id } = await params;
  const t = await getServerT(lang);
  const result = await load(id);
  // API unreachable: 503 (via the proxy) with a Retry button, never a 404 that would make crawlers drop the URL.
  if (result.status === "unavailable") redirect(unavailablePath(lang, localizedPath(lang, `/blog/${encodeURIComponent(id)}`)));
  if (result.status !== "ok") notFound(); // real 404 (a gone article is also a hard not-found)
  const a = result.data;
  const redirectTo = canonicalRedirectPath(localizedPath(lang, "/blog"), id, a.canonicalPath);
  if (redirectTo) permanentRedirect(redirectTo);
  return (
    <>
      <JsonLd data={[articleJsonLd(a, itemCanonicalLang(a.contentLanguage)), breadcrumbJsonLd([{ name: t("nav.home"), path: "/" }, { name: t("blog.title"), path: "/blog" }, { name: a.title, path: `/blog/${a.canonicalPath}`, lang: itemCanonicalLang(a.contentLanguage) }], lang)]} />
      <BlogArticleView article={{ title: a.title, coverImageUrl: a.coverImageUrl, publishedAt: a.publishedAt, bodyHtml: a.bodyHtml ?? null }} />
    </>
  );
}
