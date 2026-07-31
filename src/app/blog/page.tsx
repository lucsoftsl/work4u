"use client";

import { useEffect, useState } from "react";
import { Newspaper } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { articlesApi } from "@/lib/articles-api";
import { ArticleCard } from "@/components/blog/ArticleCard";
import type { Article } from "@/api/types";

export default function BlogPage() {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        const data = await articlesApi.listArticles();
        if (isActive) setArticles(data);
      } catch (error) {
        console.error("Failed to load articles:", error);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void load();
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="section-heading">{t("blog.title")}</h1>
          <p className="mt-3 text-sm leading-6 text-ink-muted">{t("blog.subtitle")}</p>
        </div>

        {loading ? (
          <div className="surface-panel p-10 text-center text-ink-muted">{t("blog.loading")}</div>
        ) : articles.length === 0 ? (
          <div className="surface-panel p-10 text-center">
            <Newspaper className="mx-auto mb-3 h-8 w-8 text-ink-subtle" />
            <p className="text-base font-semibold text-ink">{t("blog.emptyTitle")}</p>
            <p className="mt-2 text-sm text-ink-muted">{t("blog.emptyDesc")}</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
