"use client";

import Image from "next/image";
import Link from "@/components/LocaleLink";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { formatPublishedDate } from "@/components/blog/ArticleCard";

export interface ArticleViewData { title: string; coverImageUrl: string | null; publishedAt: string; bodyHtml: string | null }

/** Presentational article page. `bodyHtml` is sanitised by the API at write time. */
export function BlogArticleView({ article }: { article: ArticleViewData }) {
  const { t, locale } = useTranslation();
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("blog.backToBlog")}
        </Link>

        {article.coverImageUrl && (
          <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-3xl bg-primary-soft">
            <Image src={article.coverImageUrl} alt={article.title} fill unoptimized loading="eager" fetchPriority="high" sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
          </div>
        )}

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">
          <time dateTime={article.publishedAt}>{formatPublishedDate(article.publishedAt, locale)}</time>
        </p>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">{article.title}</h1>

        {article.bodyHtml && <div className="prose prose-slate mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: article.bodyHtml }} />}
      </div>
    </div>
  );
}
