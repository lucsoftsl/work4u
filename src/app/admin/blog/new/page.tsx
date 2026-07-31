"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { articlesApi } from "@/lib/articles-api";
import { ArticleForm } from "@/components/admin/ArticleForm";
import type { CreateArticlePayload } from "@/api/types";

export default function NewArticlePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { firebaseToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(payload: CreateArticlePayload) {
    if (!firebaseToken) return;
    setError(null);
    try {
      await articlesApi.createArticle(payload, firebaseToken);
      router.push("/admin/blog");
    } catch (err) {
      console.error("Failed to create article:", err);
      setError(err instanceof Error ? err.message : t("articleForm.createError"));
    }
  }

  return (
    <div className="min-h-screen bg-card">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
          <ArrowLeft className="h-4 w-4" />
          {t("adminBlog.backToList")}
        </Link>
        <h1 className="mt-4 section-heading">{t("adminBlog.newArticle")}</h1>

        <div className="surface-card mt-6 p-6 md:p-8">
          <ArticleForm onSubmit={handleSubmit} submitError={error} />
        </div>
      </div>
    </div>
  );
}
