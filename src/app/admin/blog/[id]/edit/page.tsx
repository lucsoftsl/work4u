"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { articlesApi } from "@/lib/articles-api";
import { ArticleForm } from "@/components/admin/ArticleForm";
import type { Article, CreateArticlePayload } from "@/api/types";

export default function EditArticlePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const articleId = params?.id as string | undefined;
  const { firebaseToken } = useAuth();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!articleId || !firebaseToken) return;
    let isActive = true;

    const load = async () => {
      try {
        const articles = await articlesApi.adminListArticles(firebaseToken);
        const found = articles.find((a) => a.id === articleId);
        if (!isActive) return;
        if (!found) {
          setNotFound(true);
        } else {
          setArticle(found);
        }
      } catch (err) {
        console.error("Failed to load article:", err);
        if (isActive) setNotFound(true);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void load();
    return () => {
      isActive = false;
    };
  }, [articleId, firebaseToken]);

  async function handleSubmit(payload: CreateArticlePayload) {
    if (!firebaseToken || !articleId) return;
    setError(null);
    try {
      await articlesApi.updateArticle(articleId, payload, firebaseToken);
      router.push("/admin/blog");
    } catch (err) {
      console.error("Failed to update article:", err);
      setError(err instanceof Error ? err.message : t("articleForm.updateError"));
    }
  }

  return (
    <div className="min-h-screen bg-card">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
          <ArrowLeft className="h-4 w-4" />
          {t("adminBlog.backToList")}
        </Link>

        {loading ? (
          <div className="surface-panel mt-6 h-64 animate-pulse" />
        ) : notFound || !article ? (
          <p className="mt-6 text-sm font-semibold text-red-600">{t("adminBlog.notFound")}</p>
        ) : (
          <>
            <h1 className="mt-4 section-heading">{article.title}</h1>
            <div className="surface-card mt-6 p-6 md:p-8">
              <ArticleForm initial={article} onSubmit={handleSubmit} submitError={error} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
