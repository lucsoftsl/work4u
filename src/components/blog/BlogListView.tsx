"use client";

import { Newspaper } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { ArticleCard, type ArticleCardData } from "@/components/blog/ArticleCard";
import { HomeBackLink } from "@/components/ui/BackLink";

/** Presentational: the server page fetches the articles, so the list is in the first HTML. */
export function BlogListView({ articles }: { articles: ArticleCardData[] }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <HomeBackLink className="mb-2" />
        <div className="mb-8">
          <h1 className="font-display text-h1 text-ink">{t("blog.title")}</h1>
          <p className="mt-3 text-sm leading-6 text-ink-muted">{t("blog.subtitle")}</p>
        </div>

        {articles.length === 0 ? (
          <div className="rounded-card border border-line bg-surface p-10 text-center">
            <Newspaper className="mx-auto mb-3 h-8 w-8 text-ink-subtle" aria-hidden="true" />
            <p className="text-base font-semibold text-ink">{t("blog.emptyTitle")}</p>
            <p className="mt-2 text-sm text-ink-muted">{t("blog.emptyDesc")}</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, i) => (
              <ArticleCard key={article.canonicalPath} article={article} priority={i < 3} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
