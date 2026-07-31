"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { articlesApi } from "@/lib/articles-api";
import type { Article } from "@/api/types";

export default function BlogArticlePage() {
  const { t } = useTranslation();
  const params = useParams();
  const articleId = params?.id as string | undefined;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!articleId) return;
    let isActive = true;

    const load = async () => {
      try {
        const data = await articlesApi.getArticle(articleId);
        if (isActive) setArticle(data);
      } catch (error) {
        console.error("Failed to load article:", error);
        if (isActive) setNotFound(true);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void load();
    return () => {
      isActive = false;
    };
  }, [articleId]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="surface-panel h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="surface-card w-full max-w-md space-y-4 p-8 text-center">
          <p className="text-2xl font-semibold text-ink">{t("blog.notFoundTitle")}</p>
          <p className="text-ink-muted">{t("blog.notFoundDesc")}</p>
          <Link href="/blog" className="primary-cta inline-flex">
            {t("blog.backToBlog")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
          <ArrowLeft className="h-4 w-4" />
          {t("blog.backToBlog")}
        </Link>

        {article.coverImageUrl && (
          <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-3xl bg-[#eff7fa]">
            <Image src={article.coverImageUrl} alt={article.title} fill unoptimized className="object-cover" />
          </div>
        )}

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">
          {new Date(article.dateTimeCreated).toLocaleDateString()}
        </p>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">
          {article.title}
        </h1>

        {article.bodyHtml && (
          <div
            className="prose prose-slate mt-8 max-w-none"
            dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
          />
        )}
      </div>
    </div>
  );
}
